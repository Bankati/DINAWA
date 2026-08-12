import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DashboardManagerService } from './dashboard-manager.service';
import { DashboardScope } from './dashboard.types';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';

describe('DashboardManagerService', () => {
  let service: DashboardManagerService;
  let prisma: {
    property: { groupBy: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock };
    mandate: { findMany: jest.Mock; findFirst: jest.Mock };
    payment: { aggregate: jest.Mock; findMany: jest.Mock };
    paymentScheduleEntry: { findMany: jest.Mock };
    lease: { findMany: jest.Mock };
  };

  const manager = { id: 'manager-1', role: 'MANAGER' } as AuthenticatedUser;

  beforeEach(() => {
    prisma = {
      property: { groupBy: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
      mandate: { findMany: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
      payment: { aggregate: jest.fn(), findMany: jest.fn() },
      paymentScheduleEntry: { findMany: jest.fn() },
      lease: { findMany: jest.fn() },
    };
    service = new DashboardManagerService(prisma as never);
  });

  describe('getSummary', () => {
    it('agrège la répartition par statut et le nombre de propriétaires mandants distincts', async () => {
      prisma.property.groupBy.mockResolvedValueOnce([
        { status: 'OCCUPIED', _count: { _all: 2 } },
        { status: 'VACANT', _count: { _all: 1 } },
      ]);
      prisma.mandate.findMany.mockResolvedValueOnce([
        { ownerId: 'owner-1' },
        { ownerId: 'owner-2' },
      ]);

      const result = await service.getSummary(manager);

      expect(result.totalManagedProperties).toBe(3);
      expect(result.byStatus).toEqual({ OCCUPIED: 2, VACANT: 1, RENOVATION: 0, ARCHIVED: 0 });
      expect(result.mandatingOwnersCount).toBe(2);
    });
  });

  describe('getRevenue', () => {
    it('ventile les encaissements biens propres / sous mandat et calcule la variation', async () => {
      prisma.property.findMany
        .mockResolvedValueOnce([{ id: 'own-1' }])
        .mockResolvedValueOnce([{ id: 'managed-1' }]);
      prisma.payment.aggregate
        .mockResolvedValueOnce({ _sum: { paidAmount: 100000 } }) // own current
        .mockResolvedValueOnce({ _sum: { paidAmount: 50000 } }) // own previous
        .mockResolvedValueOnce({ _sum: { paidAmount: 200000 } }) // managed current
        .mockResolvedValueOnce({ _sum: { paidAmount: 200000 } }); // managed previous

      const result = await service.getRevenue(manager, { month: 8, year: 2026 });

      expect(result.ownProperties).toEqual({
        current: 100000,
        previous: 50000,
        changePercent: 100,
      });
      expect(result.managedProperties).toEqual({
        current: 200000,
        previous: 200000,
        changePercent: 0,
      });
      expect(result.total.current).toBe(300000);
      expect(result.period.label).toBe('2026-08');
    });

    it('ne requête pas payment.aggregate pour un volet sans aucun bien (évite une requête inutile)', async () => {
      prisma.property.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'managed-1' }]);
      prisma.payment.aggregate.mockResolvedValue({ _sum: { paidAmount: 0 } });

      const result = await service.getRevenue(manager, {});

      expect(result.ownProperties).toEqual({ current: 0, previous: 0, changePercent: 0 });
      // Seulement 2 appels (managed current + previous), pas 4 — le volet
      // "own" est vide et court-circuité sans requête.
      expect(prisma.payment.aggregate).toHaveBeenCalledTimes(2);
    });

    it('restreint le volet "sous mandat" au propriétaire demandé via ownerId', async () => {
      prisma.property.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      prisma.payment.aggregate.mockResolvedValue({ _sum: { paidAmount: 0 } });

      await service.getRevenue(manager, { ownerId: 'owner-42' });

      const [, managedCallArgs] = prisma.property.findMany.mock.calls as [
        unknown,
        [{ where: { ownerId?: string } }],
      ];
      expect(managedCallArgs[0].where.ownerId).toBe('owner-42');
    });
  });

  describe('getPropertyTypeBreakdown', () => {
    it('agrège les loyers par type sur le périmètre demandé', async () => {
      prisma.property.groupBy.mockResolvedValueOnce([
        { type: 'APARTMENT', _sum: { monthlyRent: 300000 }, _count: { _all: 4 } },
      ]);

      const result = await service.getPropertyTypeBreakdown(manager, DashboardScope.MANAGED);

      expect(result).toEqual([{ type: 'APARTMENT', montant: 300000, nombreBiens: 4 }]);
    });
  });

  describe('getMonthlyRevenue', () => {
    it("bucket les encaissements payés sur les 12 mois de l'année demandée", async () => {
      prisma.payment.findMany.mockResolvedValueOnce([
        { paidAmount: 100000, paidAt: new Date(Date.UTC(2026, 0, 15)) },
        { paidAmount: 50000, paidAt: new Date(Date.UTC(2026, 0, 20)) },
        { paidAmount: 75000, paidAt: new Date(Date.UTC(2026, 11, 5)) },
      ]);

      const result = await service.getMonthlyRevenue(manager, DashboardScope.ALL, 2026);

      expect(result).toHaveLength(12);
      expect(result[0]).toEqual({ mois: '2026-01', montant: 150000 });
      expect(result[11]).toEqual({ mois: '2026-12', montant: 75000 });
      expect(result[5]).toEqual({ mois: '2026-06', montant: 0 });
    });
  });

  describe('getAlerts', () => {
    it('renvoie les 3 listes correctement mises en forme', async () => {
      prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([
        {
          id: 'entry-1',
          dueDate: new Date('2026-08-01'),
          expectedAmount: 50000,
          paidAmount: 0,
          lease: {
            property: { id: 'prop-1', address: 'Adresse 1' },
            tenant: { id: 'tenant-1', firstName: 'Ama', lastName: 'Kodjo' },
          },
        },
      ]);
      prisma.lease.findMany.mockResolvedValueOnce([
        {
          id: 'lease-1',
          endDate: new Date('2026-08-20'),
          property: { id: 'prop-2', address: 'Adresse 2' },
          tenant: { id: 'tenant-2', firstName: 'Koffi', lastName: 'Adjo' },
        },
      ]);
      prisma.payment.findMany.mockResolvedValueOnce([
        {
          id: 'payment-1',
          paidAmount: 30000,
          createdAt: new Date('2026-08-05'),
          lease: {
            property: { id: 'prop-3', address: 'Adresse 3' },
            tenant: { id: 'tenant-3', firstName: 'Yawa', lastName: 'Bakoa' },
          },
        },
      ]);

      const result = await service.getAlerts(manager, DashboardScope.ALL);

      expect(result.overdueEntries).toEqual([
        {
          id: 'entry-1',
          dueDate: new Date('2026-08-01'),
          expectedAmount: 50000,
          paidAmount: 0,
          property: { id: 'prop-1', address: 'Adresse 1' },
          tenant: { id: 'tenant-1', firstName: 'Ama', lastName: 'Kodjo' },
        },
      ]);
      expect(result.expiringLeases).toHaveLength(1);
      expect(result.pendingDeclarations).toHaveLength(1);

      const [overdueArgs] = prisma.paymentScheduleEntry.findMany.mock.calls[0] as [
        { where: { status: string } },
      ];
      expect(overdueArgs.where.status).toBe('OVERDUE');
      const [pendingArgs] = prisma.payment.findMany.mock.calls[0] as [
        { where: { status: string } },
      ];
      expect(pendingArgs.where.status).toBe('PENDING_CONFIRMATION');
    });
  });

  describe('getOwners', () => {
    it('regroupe les mandats par propriétaire et compte les biens confiés', async () => {
      const ownerA = {
        id: 'owner-a',
        firstName: 'A',
        lastName: 'A',
        email: 'a@a.com',
        phone: null,
      };
      const ownerB = {
        id: 'owner-b',
        firstName: 'B',
        lastName: 'B',
        email: null,
        phone: '90000000',
      };
      prisma.mandate.findMany.mockResolvedValueOnce([
        { ownerId: 'owner-a', owner: ownerA },
        { ownerId: 'owner-a', owner: ownerA },
        { ownerId: 'owner-b', owner: ownerB },
      ]);

      const result = await service.getOwners(manager);

      expect(result).toHaveLength(2);
      expect(result.find((o) => o.id === 'owner-a')?.managedPropertiesCount).toBe(2);
      expect(result.find((o) => o.id === 'owner-b')?.managedPropertiesCount).toBe(1);
    });
  });

  describe('getUpcomingPayments', () => {
    it('renvoie les échéances à venir triées, correctement mises en forme', async () => {
      prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([
        {
          id: 'entry-1',
          dueDate: new Date('2026-09-01'),
          expectedAmount: 50000,
          paidAmount: 0,
          lease: {
            property: { id: 'prop-1', address: 'Adresse 1' },
            tenant: { id: 'tenant-1', firstName: 'Ama', lastName: 'Kodjo' },
          },
        },
      ]);

      const result = await service.getUpcomingPayments(manager, DashboardScope.MANAGED);

      expect(result).toEqual([
        {
          id: 'entry-1',
          dueDate: new Date('2026-09-01'),
          expectedAmount: 50000,
          paidAmount: 0,
          property: { id: 'prop-1', address: 'Adresse 1' },
          tenant: { id: 'tenant-1', firstName: 'Ama', lastName: 'Kodjo' },
        },
      ]);
      const [args] = prisma.paymentScheduleEntry.findMany.mock.calls[0] as [
        { orderBy: unknown; take: number },
      ];
      expect(args.orderBy).toEqual({ dueDate: 'asc' });
      expect(args.take).toBe(100);
    });
  });

  describe('getPropertyPerformance', () => {
    it('lève NotFoundException si le bien est introuvable', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(null);
      await expect(service.getPropertyPerformance(manager, 'prop-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it("lève ForbiddenException si l'appelant n'a ni la propriété ni un mandat actif sur ce bien", async () => {
      prisma.property.findUnique.mockResolvedValueOnce({ id: 'prop-1', ownerId: 'someone-else' });
      prisma.mandate.findFirst.mockResolvedValueOnce(null);
      await expect(service.getPropertyPerformance(manager, 'prop-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('calcule le taux de recouvrement à temps sur les échéances déjà échues', async () => {
      prisma.property.findUnique.mockResolvedValueOnce({ id: 'prop-1', ownerId: 'manager-1' });
      prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([
        { status: 'PAID', overdueAlertSentAt: null }, // à l'heure
        { status: 'PAID', overdueAlertSentAt: new Date() }, // payé mais après relance
        { status: 'OVERDUE', overdueAlertSentAt: new Date() }, // toujours impayé
        { status: 'PENDING', overdueAlertSentAt: null }, // échue non payée
      ]);

      const result = await service.getPropertyPerformance(manager, 'prop-1');

      expect(result.totalDueEntries).toBe(4);
      expect(result.onTimeCount).toBe(1);
      expect(result.onTimeRatePercent).toBe(25);
    });

    it("renvoie un taux nul (pas d'échéance échue) plutôt qu'une division par zéro", async () => {
      prisma.property.findUnique.mockResolvedValueOnce({ id: 'prop-1', ownerId: 'manager-1' });
      prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([]);

      const result = await service.getPropertyPerformance(manager, 'prop-1');

      expect(result.totalDueEntries).toBe(0);
      expect(result.onTimeRatePercent).toBeNull();
    });
  });
});
