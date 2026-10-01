import { SubscriptionBillingTask } from './subscription-billing.task';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';

jest.mock('../../common/utils/advisory-lock', () => ({
  withAdvisoryLock: jest.fn((_prisma: unknown, _key: string, task: () => Promise<unknown>) =>
    task(),
  ),
}));

describe('SubscriptionBillingTask', () => {
  let task: SubscriptionBillingTask;
  let prisma: {
    subscription: { updateMany: jest.Mock; findMany: jest.Mock; update: jest.Mock };
    subscriptionInvoice: { create: jest.Mock; findMany: jest.Mock; update: jest.Mock };
    user: { update: jest.Mock };
  };
  let notify: { notifyUser: jest.Mock };
  let platformSettings: { billingEnabled: jest.Mock };

  beforeEach(() => {
    prisma = {
      subscription: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      subscriptionInvoice: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      user: { update: jest.fn().mockResolvedValue({}) },
    };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };
    platformSettings = { billingEnabled: jest.fn().mockResolvedValue(true) };
    task = new SubscriptionBillingTask(prisma as never, notify as never, platformSettings as never);
    (withAdvisoryLock as jest.Mock).mockClear();
  });

  describe('runMonthlyBilling', () => {
    it('ne fait rien si la facturation est désactivée (super-admin, PlatformSettings)', async () => {
      platformSettings.billingEnabled.mockResolvedValueOnce(false);

      await task.runMonthlyBilling();

      expect(withAdvisoryLock).not.toHaveBeenCalled();
    });

    it('finalise les PENDING_CANCELLATION dont cancelAt est dépassé', async () => {
      await task.runMonthlyBilling();

      expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { status: 'PENDING_CANCELLATION', cancelAt: { lte: expect.any(Date) as Date } },
        data: { status: 'CANCELLED' },
      });
    });

    it('crée une facture, met à jour currentPeriodEnd, et notifie — pour un abonnement éligible', async () => {
      prisma.subscription.findMany.mockResolvedValueOnce([
        { id: 'sub-1', userId: 'owner-1', tier: 'STARTER' },
      ]);

      await task.runMonthlyBilling();

      const [createArgs] = prisma.subscriptionInvoice.create.mock.calls[0] as [
        { data: { subscriptionId: string; amount: number } },
      ];
      expect(createArgs.data.subscriptionId).toBe('sub-1');
      expect(createArgs.data.amount).toBe(2000);
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { currentPeriodEnd: expect.any(Date) as Date },
      });
      expect(notify.notifyUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'owner-1', event: 'subscription-invoice-due' }),
      );
    });

    it('interroge uniquement ACTIVE ou PENDING_CANCELLATION non expiré, hors bêta, sans facture PENDING déjà ouverte', async () => {
      await task.runMonthlyBilling();

      const [args] = prisma.subscription.findMany.mock.calls[0] as [{ where: { AND: unknown[] } }];
      expect(args.where.AND).toContainEqual({
        OR: [
          { status: 'ACTIVE' },
          { status: 'PENDING_CANCELLATION', cancelAt: { gt: expect.any(Date) as Date } },
        ],
      });
      expect(args.where.AND).toContainEqual({
        OR: [{ betaUntil: null }, { betaUntil: { lt: expect.any(Date) as Date } }],
      });
      expect(args.where.AND).toContainEqual({ invoices: { none: { status: 'PENDING' } } });
    });

    it('continue sur les autres candidats si un échoue', async () => {
      prisma.subscription.findMany.mockResolvedValueOnce([
        { id: 'sub-1', userId: 'owner-1', tier: 'STARTER' },
        { id: 'sub-2', userId: 'owner-2', tier: 'PRO' },
      ]);
      prisma.subscriptionInvoice.create.mockRejectedValueOnce(new Error('boom'));

      await expect(task.runMonthlyBilling()).resolves.toBeUndefined();
      expect(prisma.subscriptionInvoice.create).toHaveBeenCalledTimes(2);
    });

    it('pagine par curseur au-delà d’une page — aucun abonnement éligible laissé de côté (voir /review abonnements)', async () => {
      const page1 = Array.from({ length: 100 }, (_, i) => ({
        id: `sub-${i}`,
        userId: `owner-${i}`,
        tier: 'STARTER' as const,
      }));
      const page2 = [{ id: 'sub-100', userId: 'owner-100', tier: 'STARTER' as const }];
      prisma.subscription.findMany.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);

      await task.runMonthlyBilling();

      expect(prisma.subscription.findMany).toHaveBeenCalledTimes(2);
      const [secondCallArgs] = prisma.subscription.findMany.mock.calls[1] as [
        { cursor?: { id: string }; skip?: number },
      ];
      expect(secondCallArgs.cursor).toEqual({ id: 'sub-99' });
      expect(secondCallArgs.skip).toBe(1);
      expect(prisma.subscriptionInvoice.create).toHaveBeenCalledTimes(101);
    });
  });

  describe('runReminders', () => {
    it('ne fait rien si la facturation est désactivée', async () => {
      platformSettings.billingEnabled.mockResolvedValueOnce(false);

      await task.runReminders();

      expect(withAdvisoryLock).not.toHaveBeenCalled();
    });

    it('envoie la relance J+3 et marque reminder3SentAt, sans toucher reminder7SentAt', async () => {
      prisma.subscriptionInvoice.findMany
        .mockResolvedValueOnce([
          {
            id: 'invoice-1',
            amount: 2000,
            periodStart: new Date('2026-10-01'),
            subscription: { userId: 'owner-1', tier: 'STARTER' },
          },
        ])
        .mockResolvedValueOnce([]);

      await task.runReminders();

      expect(notify.notifyUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'owner-1', event: 'subscription-invoice-due' }),
      );
      expect(prisma.subscriptionInvoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
        data: { reminder3SentAt: expect.any(Date) as Date },
      });
    });

    it('suspend (SUSPENDED_PAYMENT) un compte ACTIVE avec une facture PENDING au-delà du délai de suspension', async () => {
      prisma.subscriptionInvoice.findMany
        .mockResolvedValueOnce([]) // J+3
        .mockResolvedValueOnce([]) // J+7
        .mockResolvedValueOnce([
          {
            id: 'invoice-1',
            subscription: {
              userId: 'owner-1',
              user: { accountStatus: 'ACTIVE' },
            },
          },
        ]);

      await task.runReminders();

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'owner-1' },
        data: { accountStatus: 'SUSPENDED_PAYMENT' },
      });
      expect(notify.notifyUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'owner-1', event: 'account-suspended' }),
      );
    });

    it('ne suspend pas deux fois un compte déjà suspendu', async () => {
      prisma.subscriptionInvoice.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'invoice-1',
            subscription: {
              userId: 'owner-1',
              user: { accountStatus: 'SUSPENDED_PAYMENT' },
            },
          },
        ]);

      await task.runReminders();

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
