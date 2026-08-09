import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prisma: {
    subscription: { findUnique: jest.Mock; update: jest.Mock };
    property: { count: jest.Mock };
    $executeRaw: jest.Mock;
  };

  const owner = { id: 'owner-1', role: 'OWNER' } as AuthenticatedUser;

  function makeSubscription(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
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
      property: { count: jest.fn() },
      $executeRaw: jest.fn().mockResolvedValue(undefined),
    };
    service = new SubscriptionsService(prisma as never);
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
});
