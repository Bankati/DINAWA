import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: {
    user: { count: jest.Mock };
    property: { count: jest.Mock; groupBy: jest.Mock };
    lease: { count: jest.Mock };
    payment: { aggregate: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      user: { count: jest.fn().mockResolvedValue(0) },
      property: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
      lease: { count: jest.fn().mockResolvedValue(0) },
      payment: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { paidAmount: 0 } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    service = new AdminService(prisma as never, {} as never);
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
      // Pas de `where` scopant à un portefeuille précis — vue admin = toute la plateforme.
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
  });
});
