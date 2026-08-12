import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: {
    user: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    property: { count: jest.Mock; groupBy: jest.Mock };
    lease: { count: jest.Mock };
    payment: { aggregate: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    mandate: { groupBy: jest.Mock };
    subscription: { findMany: jest.Mock };
    auditLog: { findMany: jest.Mock; count: jest.Mock };
  };
  let notify: { notifyUser: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      property: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
      lease: { count: jest.fn().mockResolvedValue(0) },
      payment: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { paidAmount: 0 } }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      mandate: { groupBy: jest.fn().mockResolvedValue([]) },
      subscription: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };
    service = new AdminService(prisma as never, {} as never, notify as never);
  });

  describe('getStats', () => {
    it('agrège le parc immobilier plateforme par type, sans filtre de portefeuille', async () => {
      prisma.property.groupBy.mockResolvedValueOnce([
        { type: 'VILLA', _sum: { monthlyRent: 900000 }, _count: { _all: 3 } },
      ]);

      const result = await service.getStats(2026, 6);

      expect(result.repartitionBiensParType).toEqual([
        { type: 'VILLA', montant: 900000, nombreBiens: 3 },
      ]);
      expect(prisma.property.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ by: ['type'] }),
      );
      const [callArgs] = prisma.property.groupBy.mock.calls[0] as [{ where?: unknown }];
      expect(callArgs.where).toBeUndefined();
    });

    it('bucket les revenus payés sur les 12 mois de l’année demandée', async () => {
      prisma.payment.findMany.mockResolvedValueOnce([
        { paidAmount: 100000, paidAt: new Date(Date.UTC(2026, 1, 10)) },
        { paidAmount: 50000, paidAt: new Date(Date.UTC(2026, 1, 20)) },
      ]);

      const result = await service.getStats(2026, 6);

      expect(result.revenusMensuels).toHaveLength(12);
      expect(result.revenusMensuels[1]).toEqual({ mois: '2026-02', montant: 150000 });
      expect(result.revenusMensuels[0]).toEqual({ mois: '2026-01', montant: 0 });
    });

    it('calcule le volume de transactions pour le mois/année filtrés, pas seulement le mois courant', async () => {
      prisma.payment.aggregate.mockResolvedValueOnce({ _sum: { paidAmount: 250000 } });

      const result = await service.getStats(2025, 3);

      expect(result.volumeTransactionsMois).toBe(250000);
      const [aggArgs] = prisma.payment.aggregate.mock.calls[0] as [
        { where: { paidAt: { gte: Date; lte: Date } } },
      ];
      expect(aggArgs.where.paidAt.gte.getUTCFullYear()).toBe(2025);
      expect(aggArgs.where.paidAt.gte.getUTCMonth()).toBe(2);
    });

    it('compte les comptes non ACTIVE (tous types de suspension confondus)', async () => {
      prisma.user.count.mockImplementation((args: { where?: { accountStatus?: unknown } }) => {
        if (args?.where?.accountStatus) return Promise.resolve(4);
        return Promise.resolve(0);
      });

      const result = await service.getStats(2026, 6);

      expect(result.comptesSuspendus).toBe(4);
    });

    it('calcule le MRR à partir des abonnements actifs, en excluant ceux encore en bêta', async () => {
      prisma.subscription.findMany.mockResolvedValueOnce([{ tier: 'PRO' }, { tier: 'STARTER' }]);

      const result = await service.getStats(2026, 6);

      expect(result.mrr).toBe(5000 + 2000);
      const [callArgs] = prisma.subscription.findMany.mock.calls[0] as [{ where: unknown }];
      expect(callArgs.where).toEqual(
        expect.objectContaining({ status: { in: ['ACTIVE', 'PENDING_CANCELLATION'] } }),
      );
    });

    it("n'expose plus commissionsMois (retiré, incohérent avec l'invariant aucune commission)", async () => {
      const result = await service.getStats(2026, 6);
      expect(result).not.toHaveProperty('commissionsMois');
    });
  });

  describe('listUsers', () => {
    it('applique le filtre status en plus de role/search', async () => {
      await service.listUsers({ status: 'SUSPENDED_ADMIN', page: 1, limit: 50 });

      const [callArgs] = prisma.user.findMany.mock.calls[0] as [
        { where: { accountStatus?: unknown } },
      ];
      expect(callArgs.where.accountStatus).toBe('SUSPENDED_ADMIN');
    });
  });

  describe('getUserDetail', () => {
    it('lève une NotFoundException explicite si le compte est introuvable', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.getUserDetail('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('renvoie le compte avec suspensionReason inclus', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'u1', suspensionReason: 'motif' });
      const result = await service.getUserDetail('u1');
      expect(result.suspensionReason).toBe('motif');
    });
  });

  describe('suspendUser', () => {
    it('rejette la suspension d’un compte ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'a1',
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
      });
      await expect(service.suspendUser('a1', { reason: 'test' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('lève une NotFoundException si le compte est introuvable', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.suspendUser('missing', { reason: 'test' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('passe le compte à SUSPENDED_ADMIN avec le motif, et notifie l’utilisateur', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        role: 'OWNER',
        accountStatus: 'ACTIVE',
      });

      await service.suspendUser('u1', { reason: 'fraude suspectée' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { accountStatus: 'SUSPENDED_ADMIN', suspensionReason: 'fraude suspectée' },
      });
      expect(notify.notifyUser).toHaveBeenCalledWith({
        userId: 'u1',
        event: 'account-suspended',
        variables: { reason: 'fraude suspectée' },
      });
    });

    it('ne fait pas échouer la suspension si la notification échoue', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        role: 'OWNER',
        accountStatus: 'ACTIVE',
      });
      notify.notifyUser.mockRejectedValueOnce(new Error('smtp down'));

      await expect(service.suspendUser('u1', { reason: 'x' })).resolves.toEqual({
        message: 'Compte suspendu',
      });
    });
  });

  describe('reactivateUser', () => {
    it('rejette si le compte est déjà ACTIVE', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'u1', accountStatus: 'ACTIVE' });
      await expect(service.reactivateUser('u1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lève une NotFoundException si le compte est introuvable', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.reactivateUser('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('repasse le compte à ACTIVE, vide suspensionReason et notifie', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'u1', accountStatus: 'SUSPENDED_ADMIN' });

      await service.reactivateUser('u1');

      const [callArgs] = prisma.user.update.mock.calls[0] as [
        { where: { id: string }; data: { accountStatus: string; suspensionReason: unknown } },
      ];
      expect(callArgs.where).toEqual({ id: 'u1' });
      expect(callArgs.data.accountStatus).toBe('ACTIVE');
      expect(callArgs.data.suspensionReason).toBeNull();
      expect(notify.notifyUser).toHaveBeenCalledWith({
        userId: 'u1',
        event: 'account-reactivated',
        variables: {},
      });
    });
  });

  describe('listTransactions', () => {
    it('filtre par source/status/paymentMethod/période', async () => {
      await service.listTransactions({
        source: 'MANUAL_OWNER',
        status: 'PAID',
        paymentMethod: 'CASH',
        from: '2026-01-01',
        to: '2026-01-31',
        page: 1,
        limit: 50,
      });

      const [callArgs] = prisma.payment.findMany.mock.calls[0] as [
        { where: Record<string, unknown> },
      ];
      expect(callArgs.where).toEqual(
        expect.objectContaining({ source: 'MANUAL_OWNER', status: 'PAID', paymentMethod: 'CASH' }),
      );
    });
  });

  describe('listAuditLogs', () => {
    it('filtre par actorUserId/action/entityType/période', async () => {
      await service.listAuditLogs({
        actorUserId: 'admin1',
        action: 'suspend',
        entityType: 'users',
        page: 1,
        limit: 50,
      });

      const [callArgs] = prisma.auditLog.findMany.mock.calls[0] as [
        { where: Record<string, unknown> },
      ];
      expect(callArgs.where).toEqual(
        expect.objectContaining({
          actorUserId: 'admin1',
          entityType: 'users',
          action: { contains: 'suspend', mode: 'insensitive' },
        }),
      );
    });
  });

  describe('topOwners', () => {
    it('agrège le montant payé par propriétaire et trie décroissant', async () => {
      prisma.payment.findMany.mockResolvedValueOnce([
        { paidAmount: 100, lease: { owner: { id: 'o1', firstName: 'Ama', lastName: 'K' } } },
        { paidAmount: 300, lease: { owner: { id: 'o2', firstName: 'Koffi', lastName: 'D' } } },
        { paidAmount: 50, lease: { owner: { id: 'o1', firstName: 'Ama', lastName: 'K' } } },
      ]);

      const result = await service.topOwners(10);

      expect(result[0]).toEqual({
        id: 'o2',
        firstName: 'Koffi',
        lastName: 'D',
        totalPaidAmount: 300,
      });
      expect(result[1]).toEqual({
        id: 'o1',
        firstName: 'Ama',
        lastName: 'K',
        totalPaidAmount: 150,
      });
    });
  });

  describe('topManagers', () => {
    it('classe par nombre de mandats actifs et enrichit avec le nom du gestionnaire', async () => {
      prisma.mandate.groupBy.mockResolvedValueOnce([{ managerId: 'm1', _count: { _all: 5 } }]);
      prisma.user.findMany.mockResolvedValueOnce([{ id: 'm1', firstName: 'Ama', lastName: 'K' }]);

      const result = await service.topManagers(10);

      expect(result).toEqual([
        { id: 'm1', firstName: 'Ama', lastName: 'K', activeMandatesCount: 5 },
      ]);
    });

    it('ne fait pas de requête user si aucun mandat actif', async () => {
      prisma.mandate.groupBy.mockResolvedValueOnce([]);
      const result = await service.topManagers(10);
      expect(result).toEqual([]);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });
  });
});
