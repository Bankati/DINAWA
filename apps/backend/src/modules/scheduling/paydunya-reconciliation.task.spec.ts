import { PaydunyaReconciliationTask } from './paydunya-reconciliation.task';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';

jest.mock('../../common/utils/advisory-lock', () => ({
  withAdvisoryLock: jest.fn((_prisma: unknown, _key: string, task: () => Promise<unknown>) =>
    task(),
  ),
}));

describe('PaydunyaReconciliationTask', () => {
  let task: PaydunyaReconciliationTask;
  let prisma: {
    payment: { findMany: jest.Mock };
    subscriptionInvoice: { findMany: jest.Mock };
  };
  let paymentsService: { reconcilePaydunyaPayment: jest.Mock };
  let subscriptionsService: { reconcilePaydunyaSubscriptionInvoice: jest.Mock };

  beforeEach(() => {
    prisma = {
      payment: { findMany: jest.fn().mockResolvedValue([]) },
      subscriptionInvoice: { findMany: jest.fn().mockResolvedValue([]) },
    };
    paymentsService = { reconcilePaydunyaPayment: jest.fn().mockResolvedValue(undefined) };
    subscriptionsService = {
      reconcilePaydunyaSubscriptionInvoice: jest.fn().mockResolvedValue(undefined),
    };
    task = new PaydunyaReconciliationTask(
      prisma as never,
      paymentsService as never,
      subscriptionsService as never,
    );
    (withAdvisoryLock as jest.Mock).mockClear();
  });

  it('pose un verrou applicatif avant de tourner', async () => {
    await task.run();
    expect(withAdvisoryLock).toHaveBeenCalledWith(
      prisma,
      'paydunya-reconciliation-task',
      expect.any(Function),
    );
  });

  it('cible les Payment PAYDUNYA_API PENDING bloqués au-delà du seuil, sans filtre transactionId (orphelins inclus), batch borné', async () => {
    await task.run();

    const [findManyArgs] = prisma.payment.findMany.mock.calls[0] as [
      { where: { source: string; status: string; createdAt: { lt: Date } }; take: number },
    ];
    expect(findManyArgs.where.source).toBe('PAYDUNYA_API');
    expect(findManyArgs.where.status).toBe('PENDING');
    expect(findManyArgs.where.createdAt.lt).toBeInstanceOf(Date);
    expect(findManyArgs.where).not.toHaveProperty('transactionId');
    expect(findManyArgs.take).toBe(30);
  });

  it('réconcilie chaque candidat trouvé', async () => {
    prisma.payment.findMany.mockResolvedValue([{ id: 'payment-1' }, { id: 'payment-2' }]);

    await task.run();

    expect(paymentsService.reconcilePaydunyaPayment).toHaveBeenCalledWith('payment-1');
    expect(paymentsService.reconcilePaydunyaPayment).toHaveBeenCalledWith('payment-2');
  });

  it("continue sur les autres candidats si l'un échoue", async () => {
    prisma.payment.findMany.mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => ({ id: `payment-${i}` })),
    );
    paymentsService.reconcilePaydunyaPayment.mockRejectedValueOnce(new Error('boom'));

    await expect(task.run()).resolves.toBeUndefined();
    expect(paymentsService.reconcilePaydunyaPayment).toHaveBeenCalledTimes(8);
  });

  it('cible aussi les SubscriptionInvoice PENDING avec transactionId, bloquées au-delà du seuil (voir /architect abonnements)', async () => {
    await task.run();

    const [findManyArgs] = prisma.subscriptionInvoice.findMany.mock.calls[0] as [
      {
        where: { status: string; transactionId: { not: null }; createdAt: { lt: Date } };
        take: number;
      },
    ];
    expect(findManyArgs.where.status).toBe('PENDING');
    expect(findManyArgs.where.transactionId).toEqual({ not: null });
    expect(findManyArgs.where.createdAt.lt).toBeInstanceOf(Date);
    expect(findManyArgs.take).toBe(30);
  });

  it('réconcilie chaque facture d’abonnement trouvée', async () => {
    prisma.subscriptionInvoice.findMany.mockResolvedValue([
      { id: 'invoice-1' },
      { id: 'invoice-2' },
    ]);

    await task.run();

    expect(subscriptionsService.reconcilePaydunyaSubscriptionInvoice).toHaveBeenCalledWith(
      'invoice-1',
    );
    expect(subscriptionsService.reconcilePaydunyaSubscriptionInvoice).toHaveBeenCalledWith(
      'invoice-2',
    );
  });
});
