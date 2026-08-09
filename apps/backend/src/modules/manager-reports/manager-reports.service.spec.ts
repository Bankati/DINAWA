import { NotFoundException } from '@nestjs/common';
import {
  ManagerReportsService,
  currentMonthRange,
  previousMonthRange,
} from './manager-reports.service';

describe('ManagerReportsService', () => {
  let service: ManagerReportsService;
  let prisma: {
    mandate: { findMany: jest.Mock };
    user: { findUnique: jest.Mock };
    payment: { findMany: jest.Mock };
    paymentScheduleEntry: { findMany: jest.Mock };
  };

  const period = {
    start: new Date('2026-08-01T00:00:00.000Z'),
    end: new Date('2026-08-31T23:59:59.999Z'),
    label: '2026-08',
  };

  function makeMandate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      propertyId: 'prop-1',
      acceptedAt: new Date('2026-07-01T00:00:00.000Z'),
      property: { id: 'prop-1', address: 'Adresse 1' },
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      mandate: { findMany: jest.fn() },
      user: { findUnique: jest.fn() },
      payment: { findMany: jest.fn() },
      paymentScheduleEntry: { findMany: jest.fn() },
    };
    service = new ManagerReportsService(prisma as never);
  });

  describe('getConsolidatedReportData', () => {
    it("lève NotFoundException si aucun mandat ACTIVE n'existe pour cette paire", async () => {
      prisma.mandate.findMany.mockResolvedValueOnce([]);
      await expect(
        service.getConsolidatedReportData('manager-1', 'owner-1', period),
      ).rejects.toThrow(NotFoundException);
    });

    it('agrège les paiements par bien et calcule le total global', async () => {
      prisma.mandate.findMany.mockResolvedValueOnce([
        makeMandate({ propertyId: 'prop-1', property: { id: 'prop-1', address: 'Adresse 1' } }),
        makeMandate({ propertyId: 'prop-2', property: { id: 'prop-2', address: 'Adresse 2' } }),
      ]);
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'manager-1', firstName: 'M', lastName: 'N' })
        .mockResolvedValueOnce({ id: 'owner-1', firstName: 'O', lastName: 'W', email: 'o@w.com' });
      prisma.payment.findMany
        .mockResolvedValueOnce([
          {
            id: 'pay-1',
            paidAmount: 75000,
            paidAt: new Date('2026-08-05'),
            paymentMethod: 'CASH',
            lease: { propertyId: 'prop-1' },
          },
          {
            id: 'pay-2',
            paidAmount: 35000,
            paidAt: new Date('2026-08-10'),
            paymentMethod: 'BANK_TRANSFER',
            lease: { propertyId: 'prop-2' },
          },
        ])
        .mockResolvedValueOnce([]);
      prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([]);

      const result = await service.getConsolidatedReportData('manager-1', 'owner-1', period);

      expect(result.totalReceived).toBe(110000);
      expect(result.paymentsByProperty.find((p) => p.property.id === 'prop-1')?.totalReceived).toBe(
        75000,
      );
      expect(result.paymentsByProperty.find((p) => p.property.id === 'prop-2')?.totalReceived).toBe(
        35000,
      );
    });

    it('exclut les paiements antérieurs à la date d’acceptation du mandat (mandat accepté en cours de mois)', async () => {
      prisma.mandate.findMany.mockResolvedValueOnce([
        makeMandate({ acceptedAt: new Date('2026-08-15T00:00:00.000Z') }),
      ]);
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'manager-1', firstName: 'M', lastName: 'N' })
        .mockResolvedValueOnce({ id: 'owner-1', firstName: 'O', lastName: 'W', email: null });
      prisma.payment.findMany
        .mockResolvedValueOnce([
          {
            id: 'pay-before',
            paidAmount: 50000,
            paidAt: new Date('2026-08-05'), // avant acceptedAt
            paymentMethod: 'CASH',
            lease: { propertyId: 'prop-1' },
          },
          {
            id: 'pay-after',
            paidAmount: 60000,
            paidAt: new Date('2026-08-20'), // après acceptedAt
            paymentMethod: 'CASH',
            lease: { propertyId: 'prop-1' },
          },
        ])
        .mockResolvedValueOnce([]);
      prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([]);

      const result = await service.getConsolidatedReportData('manager-1', 'owner-1', period);

      expect(result.totalReceived).toBe(60000);
      expect(result.paymentsByProperty[0].payments).toHaveLength(1);
      expect(result.paymentsByProperty[0].payments[0].id).toBe('pay-after');
    });

    it('inclut les échéances impayées en cours même si elles précèdent l’acceptation du mandat', async () => {
      prisma.mandate.findMany.mockResolvedValueOnce([
        makeMandate({ acceptedAt: new Date('2026-08-15T00:00:00.000Z') }),
      ]);
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'manager-1', firstName: 'M', lastName: 'N' })
        .mockResolvedValueOnce({ id: 'owner-1', firstName: 'O', lastName: 'W', email: null });
      prisma.payment.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
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

      const result = await service.getConsolidatedReportData('manager-1', 'owner-1', period);

      expect(result.overdueEntries).toHaveLength(1);
    });

    it('sépare les déclarations confirmées et rejetées, en excluant celles traitées avant l’acceptation du mandat', async () => {
      prisma.mandate.findMany.mockResolvedValueOnce([
        makeMandate({ acceptedAt: new Date('2026-08-10T00:00:00.000Z') }),
      ]);
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'manager-1', firstName: 'M', lastName: 'N' })
        .mockResolvedValueOnce({ id: 'owner-1', firstName: 'O', lastName: 'W', email: null });
      prisma.payment.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
        {
          id: 'decl-before',
          status: 'PAID',
          paidAmount: 40000,
          confirmedAt: new Date('2026-08-05'), // avant acceptedAt
          updatedAt: new Date('2026-08-05'),
          lease: {
            propertyId: 'prop-1',
            property: { id: 'prop-1', address: 'Adresse 1' },
            tenant: { id: 'tenant-1', firstName: 'Ama', lastName: 'Kodjo' },
          },
        },
        {
          id: 'decl-after',
          status: 'REJECTED',
          paidAmount: 20000,
          confirmedAt: null,
          updatedAt: new Date('2026-08-20'), // après acceptedAt
          lease: {
            propertyId: 'prop-1',
            property: { id: 'prop-1', address: 'Adresse 1' },
            tenant: { id: 'tenant-1', firstName: 'Ama', lastName: 'Kodjo' },
          },
        },
      ]);
      prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([]);

      const result = await service.getConsolidatedReportData('manager-1', 'owner-1', period);

      expect(result.processedDeclarations).toHaveLength(1);
      expect(result.processedDeclarations[0].id).toBe('decl-after');
      expect(result.processedDeclarations[0].status).toBe('REJECTED');
    });
  });
});

describe('currentMonthRange / previousMonthRange', () => {
  it('renvoie des bornes UTC cohérentes et le mois précédent attendu', () => {
    const current = currentMonthRange();
    const previous = previousMonthRange();

    expect(current.start.getUTCDate()).toBe(1);
    expect(current.start.getUTCHours()).toBe(0);
    expect(previous.end.getTime()).toBeLessThan(current.start.getTime());
    expect(previous.label).not.toBe(current.label);
  });
});
