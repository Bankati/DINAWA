import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prisma: {
    subscription: { findUnique: jest.Mock; update: jest.Mock };
    subscriptionInvoice: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    user: { updateMany: jest.Mock };
    property: { count: jest.Mock };
    $executeRaw: jest.Mock;
  };
  let platformSettings: { quotasSuspended: jest.Mock; get: jest.Mock };
  let paydunya: { createInvoice: jest.Mock; confirmInvoiceStatus: jest.Mock };
  let config: { getOrThrow: jest.Mock };
  let notify: { notifyUser: jest.Mock };

  const owner = { id: 'owner-1', role: 'OWNER' } as AuthenticatedUser;

  function makeSubscription(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'sub-1',
      userId: 'owner-1',
      tier: 'STARTER',
      status: 'ACTIVE',
      betaUntil: new Date('2026-11-01'),
      currentPeriodEnd: null,
      cancelAt: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      subscription: { findUnique: jest.fn(), update: jest.fn() },
      subscriptionInvoice: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      user: { updateMany: jest.fn() },
      property: { count: jest.fn() },
      $executeRaw: jest.fn().mockResolvedValue(undefined),
    };
    platformSettings = {
      quotasSuspended: jest.fn().mockResolvedValue(false),
      get: jest.fn().mockResolvedValue({
        subscriptionQuotasSuspended: false,
        subscriptionBillingEnabled: false,
        freePromotionEndsAt: null,
      }),
    };
    paydunya = { createInvoice: jest.fn(), confirmInvoiceStatus: jest.fn() };
    config = {
      getOrThrow: jest.fn((key: string) =>
        key === 'API_BASE_URL' ? 'https://api.warahcontact.com' : 'https://www.warahcontact.com',
      ),
    };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };
    service = new SubscriptionsService(
      prisma as never,
      platformSettings as never,
      paydunya as never,
      config as never,
      notify as never,
    );
  });

  describe('countBillableProperties', () => {
    it('interroge locataire actif OU annonce active OU RENOVATION, jamais les biens archivés', async () => {
      prisma.property.count.mockResolvedValueOnce(3);

      const result = await service.countBillableProperties('owner-1');

      expect(result).toBe(3);
      const [args] = prisma.property.count.mock.calls[0] as [
        { where: { ownerId: string; archivedAt: null; OR: unknown[] } },
      ];
      expect(args.where.ownerId).toBe('owner-1');
      expect(args.where.archivedAt).toBeNull();
      expect(args.where.OR).toEqual([
        { leases: { some: { status: 'ACTIVE' } } },
        { listings: { some: { status: 'ACTIVE' } } },
        { status: 'RENOVATION' },
      ]);
    });
  });

  describe('getQuotaStatus', () => {
    it('lève NotFoundException si aucun abonnement (ne devrait jamais arriver — voir /architect unité 35)', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(null);
      await expect(service.getQuotaStatus(owner)).rejects.toThrow(NotFoundException);
    });

    it('calcule le restant pour un forfait limité', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(makeSubscription({ tier: 'STARTER' }));
      prisma.property.count.mockResolvedValueOnce(3);

      const result = await service.getQuotaStatus(owner);

      expect(result.managedPropertiesQuota).toBe(5);
      expect(result.billablePropertiesCount).toBe(3);
      expect(result.remaining).toBe(2);
    });

    it('renvoie null (illimité) pour Premium, jamais un nombre négatif au-delà du quota', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(makeSubscription({ tier: 'PREMIUM' }));
      prisma.property.count.mockResolvedValueOnce(999);

      const result = await service.getQuotaStatus(owner);

      expect(result.managedPropertiesQuota).toBeNull();
      expect(result.remaining).toBeNull();
    });

    it('ne renvoie jamais un restant négatif si le quota est déjà dépassé', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(makeSubscription({ tier: 'STARTER' }));
      prisma.property.count.mockResolvedValueOnce(9);

      const result = await service.getQuotaStatus(owner);

      expect(result.remaining).toBe(0);
    });

    it('renvoie un quota illimité si le super-admin a suspendu les quotas (voir /architect abonnements)', async () => {
      platformSettings.get.mockResolvedValueOnce({
        subscriptionQuotasSuspended: true,
        subscriptionBillingEnabled: false,
        freePromotionEndsAt: null,
      });
      prisma.subscription.findUnique.mockResolvedValueOnce(makeSubscription({ tier: 'STARTER' }));
      prisma.property.count.mockResolvedValueOnce(9);

      const result = await service.getQuotaStatus(owner);

      expect(result.managedPropertiesQuota).toBeNull();
      expect(result.remaining).toBeNull();
    });

    it('renvoie freePromotionEndsAt tel que renvoyé par PlatformSettings (voir /architect bandeau promotionnel)', async () => {
      const endsAt = new Date('2027-04-01');
      platformSettings.get.mockResolvedValueOnce({
        subscriptionQuotasSuspended: true,
        subscriptionBillingEnabled: false,
        freePromotionEndsAt: endsAt,
      });
      prisma.subscription.findUnique.mockResolvedValueOnce(makeSubscription());
      prisma.property.count.mockResolvedValueOnce(1);

      const result = await service.getQuotaStatus(owner);

      expect(result.freePromotionEndsAt).toBe(endsAt);
    });

    it('renvoie pendingInvoice=null si aucune facture en attente', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(makeSubscription());
      prisma.property.count.mockResolvedValueOnce(1);
      prisma.subscriptionInvoice.findFirst.mockResolvedValueOnce(null);

      const result = await service.getQuotaStatus(owner);

      expect(result.pendingInvoice).toBeNull();
    });

    it('renvoie le montant et la période de la facture PENDING la plus ancienne', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(makeSubscription());
      prisma.property.count.mockResolvedValueOnce(1);
      prisma.subscriptionInvoice.findFirst.mockResolvedValueOnce({
        amount: 2000,
        periodStart: new Date('2026-10-01'),
      });

      const result = await service.getQuotaStatus(owner);

      expect(result.pendingInvoice).toEqual({
        amount: 2000,
        periodLabel: expect.any(String) as string,
      });
    });
  });

  describe('assertQuotaAvailable', () => {
    it('acquiert le verrou consultatif par owner avant toute lecture (voir /review unité 35)', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(makeSubscription({ tier: 'PREMIUM' }));
      await service.assertQuotaAvailable(prisma as never, 'owner-1');
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('ne lève rien pour un forfait Premium (illimité)', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(makeSubscription({ tier: 'PREMIUM' }));
      await expect(
        service.assertQuotaAvailable(prisma as never, 'owner-1'),
      ).resolves.toBeUndefined();
      expect(prisma.property.count).not.toHaveBeenCalled();
    });

    it('lève ConflictException si le quota Starter (5) est déjà atteint', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(makeSubscription({ tier: 'STARTER' }));
      prisma.property.count.mockResolvedValueOnce(5);

      await expect(service.assertQuotaAvailable(prisma as never, 'owner-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('ne lève rien si le quota Starter (5) n’est pas encore atteint', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(makeSubscription({ tier: 'STARTER' }));
      prisma.property.count.mockResolvedValueOnce(4);

      await expect(
        service.assertQuotaAvailable(prisma as never, 'owner-1'),
      ).resolves.toBeUndefined();
    });

    it('ne lève rien et ne verrouille/ne lit rien si le super-admin a suspendu les quotas', async () => {
      platformSettings.quotasSuspended.mockResolvedValueOnce(true);

      await expect(
        service.assertQuotaAvailable(prisma as never, 'owner-1'),
      ).resolves.toBeUndefined();
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
      expect(prisma.subscription.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('upgrade', () => {
    it('lève ForbiddenException pour un forfait identique ou inférieur (jamais de downgrade via cet endpoint)', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(makeSubscription({ tier: 'PRO' }));
      await expect(service.upgrade(owner, { tier: 'STARTER' })).rejects.toThrow(ForbiddenException);

      prisma.subscription.findUnique.mockResolvedValueOnce(makeSubscription({ tier: 'PRO' }));
      await expect(service.upgrade(owner, { tier: 'PRO' })).rejects.toThrow(ForbiddenException);
    });

    it('migre instantanément vers un forfait strictement supérieur', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(makeSubscription({ tier: 'STARTER' }));
      prisma.subscription.update.mockResolvedValueOnce(makeSubscription({ tier: 'PRO' }));

      await service.upgrade(owner, { tier: 'PRO' });

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { userId: 'owner-1' },
        data: { tier: 'PRO', status: 'ACTIVE' },
      });
    });
  });

  describe('cancel', () => {
    it('utilise currentPeriodEnd si connu, sinon maintenant', async () => {
      const periodEnd = new Date('2026-09-01');
      prisma.subscription.findUnique.mockResolvedValueOnce(
        makeSubscription({ currentPeriodEnd: periodEnd }),
      );

      await service.cancel(owner);

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { userId: 'owner-1' },
        data: { status: 'PENDING_CANCELLATION', cancelAt: periodEnd },
      });
    });

    it('utilise la date courante si currentPeriodEnd est inconnu', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(
        makeSubscription({ currentPeriodEnd: null }),
      );

      await service.cancel(owner);

      const [args] = prisma.subscription.update.mock.calls[0] as [{ data: { cancelAt: Date } }];
      expect(args.data.cancelAt).toBeInstanceOf(Date);
    });
  });

  describe('payCurrentInvoice', () => {
    it('lève NotFoundException si aucune facture PENDING', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(makeSubscription());
      prisma.subscriptionInvoice.findFirst.mockResolvedValueOnce(null);

      await expect(service.payCurrentInvoice(owner)).rejects.toThrow(NotFoundException);
    });

    it('réutilise la référence PayDunya déjà créée plutôt que d’en recréer une (même pattern que PaymentsService.initiate())', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(makeSubscription());
      prisma.subscriptionInvoice.findFirst.mockResolvedValueOnce({
        id: 'invoice-1',
        transactionId: 'token-1',
        checkoutUrl: 'https://paydunya.test/checkout/token-1',
      });

      const result = await service.payCurrentInvoice(owner);

      expect(paydunya.createInvoice).not.toHaveBeenCalled();
      expect(result).toEqual({
        invoiceId: 'invoice-1',
        checkoutUrl: 'https://paydunya.test/checkout/token-1',
      });
    });

    it('crée une facture PayDunya à la demande si aucun essai précédent', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(makeSubscription());
      prisma.subscriptionInvoice.findFirst.mockResolvedValueOnce({
        id: 'invoice-1',
        amount: 2000,
        periodStart: new Date('2026-10-01'),
        transactionId: null,
        checkoutUrl: null,
      });
      paydunya.createInvoice.mockResolvedValueOnce({
        token: 'token-2',
        checkoutUrl: 'https://paydunya.test/checkout/token-2',
      });
      prisma.subscriptionInvoice.update.mockResolvedValueOnce({});

      const result = await service.payCurrentInvoice(owner);

      expect(paydunya.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 2000,
          paymentId: 'invoice-1',
          callbackUrl: expect.stringContaining('subscriptionInvoiceId=invoice-1') as string,
        }),
      );
      expect(prisma.subscriptionInvoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
        data: {
          transactionId: 'token-2',
          checkoutUrl: 'https://paydunya.test/checkout/token-2',
          attemptCount: { increment: 1 },
        },
      });
      expect(result).toEqual({
        invoiceId: 'invoice-1',
        checkoutUrl: 'https://paydunya.test/checkout/token-2',
      });
    });

    it('lève ServiceUnavailableException "incident technique" si la persistance de la référence échoue après création de la facture (jamais l’erreur brute, voir /review abonnements)', async () => {
      prisma.subscription.findUnique.mockResolvedValueOnce(makeSubscription());
      prisma.subscriptionInvoice.findFirst.mockResolvedValueOnce({
        id: 'invoice-1',
        amount: 2000,
        periodStart: new Date('2026-10-01'),
        transactionId: null,
        checkoutUrl: null,
      });
      paydunya.createInvoice.mockResolvedValueOnce({
        token: 'token-2',
        checkoutUrl: 'https://paydunya.test/checkout/token-2',
      });
      prisma.subscriptionInvoice.update.mockRejectedValue(new Error('DB down'));

      await expect(service.payCurrentInvoice(owner)).rejects.toThrow('incident technique');
      expect(paydunya.createInvoice).toHaveBeenCalled();
    });
  });

  describe('handleSubscriptionInvoiceCallback', () => {
    it('renvoie "ignored" sans rien appeler si subscriptionInvoiceId est absent', async () => {
      const result = await service.handleSubscriptionInvoiceCallback(undefined);

      expect(result).toEqual({ status: 'ignored' });
      expect(prisma.subscriptionInvoice.findUnique).not.toHaveBeenCalled();
    });

    it('réconcilie puis renvoie "ok"', async () => {
      prisma.subscriptionInvoice.findUnique.mockResolvedValueOnce(null);

      const result = await service.handleSubscriptionInvoiceCallback('invoice-1');

      expect(prisma.subscriptionInvoice.findUnique).toHaveBeenCalled();
      expect(result).toEqual({ status: 'ok' });
    });

    it('renvoie toujours "ok" même si la réconciliation échoue de façon inattendue (jamais faire échouer l’accusé de réception webhook, voir /review abonnements)', async () => {
      prisma.subscriptionInvoice.findUnique.mockRejectedValueOnce(new Error('boom'));

      const result = await service.handleSubscriptionInvoiceCallback('invoice-1');

      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('reconcilePaydunyaSubscriptionInvoice', () => {
    it('ne fait rien si la facture est introuvable, déjà payée, ou sans transactionId', async () => {
      prisma.subscriptionInvoice.findUnique.mockResolvedValueOnce(null);
      await service.reconcilePaydunyaSubscriptionInvoice('invoice-1');
      expect(paydunya.confirmInvoiceStatus).not.toHaveBeenCalled();
    });

    it('marque PAID et réactive un compte SUSPENDED_PAYMENT si PayDunya confirme "completed"', async () => {
      prisma.subscriptionInvoice.findUnique.mockResolvedValueOnce({
        id: 'invoice-1',
        status: 'PENDING',
        transactionId: 'token-1',
        subscription: { userId: 'owner-1' },
      });
      paydunya.confirmInvoiceStatus.mockResolvedValueOnce({ status: 'completed', amount: 2000 });
      prisma.subscriptionInvoice.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.user.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.reconcilePaydunyaSubscriptionInvoice('invoice-1');

      expect(prisma.subscriptionInvoice.updateMany).toHaveBeenCalledWith({
        where: { id: 'invoice-1', status: 'PENDING' },
        data: { status: 'PAID', paidAt: expect.any(Date) as Date },
      });
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'owner-1', accountStatus: 'SUSPENDED_PAYMENT' },
        data: { accountStatus: 'ACTIVE' },
      });
      expect(notify.notifyUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'owner-1', event: 'account-reactivated' }),
      );
    });

    it('ne réactive rien si le compte n’était pas suspendu pour impayé', async () => {
      prisma.subscriptionInvoice.findUnique.mockResolvedValueOnce({
        id: 'invoice-1',
        status: 'PENDING',
        transactionId: 'token-1',
        subscription: { userId: 'owner-1' },
      });
      paydunya.confirmInvoiceStatus.mockResolvedValueOnce({ status: 'completed', amount: 2000 });
      prisma.subscriptionInvoice.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.user.updateMany.mockResolvedValueOnce({ count: 0 });

      await service.reconcilePaydunyaSubscriptionInvoice('invoice-1');

      expect(notify.notifyUser).not.toHaveBeenCalled();
    });

    it('ne touche à rien si PayDunya renvoie "pending"', async () => {
      prisma.subscriptionInvoice.findUnique.mockResolvedValueOnce({
        id: 'invoice-1',
        status: 'PENDING',
        transactionId: 'token-1',
        subscription: { userId: 'owner-1' },
      });
      paydunya.confirmInvoiceStatus.mockResolvedValueOnce({ status: 'pending', amount: null });

      await service.reconcilePaydunyaSubscriptionInvoice('invoice-1');

      expect(prisma.subscriptionInvoice.updateMany).not.toHaveBeenCalled();
    });

    it('laisse la facture PENDING si PayDunya renvoie "cancelled"/"failed" — la relance/suspension s’en occupe, pas la réconciliation', async () => {
      prisma.subscriptionInvoice.findUnique.mockResolvedValueOnce({
        id: 'invoice-1',
        status: 'PENDING',
        transactionId: 'token-1',
        subscription: { userId: 'owner-1' },
      });
      paydunya.confirmInvoiceStatus.mockResolvedValueOnce({ status: 'failed', amount: null });

      await service.reconcilePaydunyaSubscriptionInvoice('invoice-1');

      expect(prisma.subscriptionInvoice.updateMany).not.toHaveBeenCalled();
    });
  });
});
