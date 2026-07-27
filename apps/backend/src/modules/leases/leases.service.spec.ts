import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeasesService } from './leases.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';

describe('LeasesService', () => {
  let service: LeasesService;
  let prisma: {
    $transaction: jest.Mock;
    property: { findUnique: jest.Mock };
    mandate: { findFirst: jest.Mock };
    lease: { findUnique: jest.Mock };
    paymentScheduleEntry: { findMany: jest.Mock };
  };
  let tx: {
    lease: { update: jest.Mock };
    paymentScheduleEntry: { deleteMany: jest.Mock };
    property: { update: jest.Mock };
  };

  const owner = {
    id: 'owner-1',
    role: 'OWNER',
    firstName: 'Jean',
    lastName: 'Dupont',
  } as AuthenticatedUser;
  const manager = {
    id: 'manager-1',
    role: 'MANAGER',
    firstName: 'M',
    lastName: 'N',
  } as AuthenticatedUser;
  const tenant = {
    id: 'tenant-1',
    role: 'TENANT',
    firstName: 'Ama',
    lastName: 'Kodjo',
  } as AuthenticatedUser;

  function makeProperty(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'prop-1',
      ownerId: 'owner-1',
      address: '1 Rue Test',
      status: 'VACANT',
      ...overrides,
    };
  }

  function makeLease(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'lease-1',
      propertyId: 'prop-1',
      tenantUserId: 'tenant-1',
      status: 'ACTIVE',
      ...overrides,
    };
  }

  beforeEach(() => {
    tx = {
      lease: {
        update: jest.fn().mockResolvedValue({ id: 'lease-1', status: 'TERMINATED' }),
      },
      paymentScheduleEntry: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      property: { update: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(tx)),
      property: { findUnique: jest.fn() },
      mandate: { findFirst: jest.fn().mockResolvedValue(null) },
      lease: { findUnique: jest.fn() },
      paymentScheduleEntry: { findMany: jest.fn().mockResolvedValue([]) },
    };

    service = new LeasesService(prisma as never);
  });

  describe('terminate', () => {
    it('lève NotFoundException si le bail est introuvable', async () => {
      prisma.lease.findUnique.mockResolvedValueOnce(null);
      await expect(service.terminate(owner, 'lease-1', {})).rejects.toThrow(NotFoundException);
    });

    it('lève ForbiddenException si canMutate est faux', async () => {
      prisma.lease.findUnique.mockResolvedValueOnce(makeLease());
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.mandate.findFirst.mockResolvedValueOnce({ managerId: 'manager-1' });
      await expect(service.terminate(owner, 'lease-1', {})).rejects.toThrow(ForbiddenException);
    });

    it('lève ConflictException si le bail est déjà résilié', async () => {
      prisma.lease.findUnique.mockResolvedValueOnce(makeLease({ status: 'TERMINATED' }));
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      await expect(service.terminate(owner, 'lease-1', {})).rejects.toThrow(ConflictException);
    });

    it('résilie le bail, libère le bien et purge les échéances futures non payées', async () => {
      prisma.lease.findUnique.mockResolvedValueOnce(makeLease());
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty({ status: 'OCCUPIED' }));

      await service.terminate(owner, 'lease-1', { terminationReason: 'Fin anticipée' });

      const [updateArgs] = tx.lease.update.mock.calls[0] as [
        { where: { id: string }; data: { status: string; terminationReason: string } },
      ];
      expect(updateArgs.where).toEqual({ id: 'lease-1' });
      expect(updateArgs.data.status).toBe('TERMINATED');
      expect(updateArgs.data.terminationReason).toBe('Fin anticipée');

      expect(tx.property.update).toHaveBeenCalledWith({
        where: { id: 'prop-1' },
        data: { status: 'VACANT' },
      });

      const [deleteManyArgs] = tx.paymentScheduleEntry.deleteMany.mock.calls[0] as [
        { where: { leaseId: string; payments: { none: Record<string, never> } } },
      ];
      expect(deleteManyArgs.where.leaseId).toBe('lease-1');
      expect(deleteManyArgs.where.payments).toEqual({ none: {} });
    });

    it('permet au gestionnaire mandaté de résilier', async () => {
      prisma.lease.findUnique.mockResolvedValueOnce(makeLease());
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.mandate.findFirst.mockResolvedValueOnce({ managerId: 'manager-1' });

      await expect(service.terminate(manager, 'lease-1', {})).resolves.toBeDefined();
    });
  });

  describe('getSchedule', () => {
    it('lève NotFoundException si le bail est introuvable', async () => {
      prisma.lease.findUnique.mockResolvedValueOnce(null);
      await expect(service.getSchedule(owner, 'lease-1')).rejects.toThrow(NotFoundException);
    });

    it('permet au locataire lui-même de lire son propre échéancier sans passer par canActOnProperty', async () => {
      prisma.lease.findUnique.mockResolvedValueOnce(makeLease());

      await expect(service.getSchedule(tenant, 'lease-1')).resolves.toBeDefined();
      expect(prisma.property.findUnique).not.toHaveBeenCalled();
    });

    it("lève ForbiddenException si un autre locataire tente d'accéder à un bail qui n'est pas le sien", async () => {
      prisma.lease.findUnique.mockResolvedValueOnce(makeLease({ tenantUserId: 'other-tenant' }));
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());

      await expect(service.getSchedule(tenant, 'lease-1')).rejects.toThrow(ForbiddenException);
    });

    it('permet au propriétaire (canRead via canActOnProperty) de lire l’échéancier', async () => {
      prisma.lease.findUnique.mockResolvedValueOnce(makeLease());
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());

      await expect(service.getSchedule(owner, 'lease-1')).resolves.toBeDefined();
    });

    it('lève ForbiddenException si canRead est faux', async () => {
      prisma.lease.findUnique.mockResolvedValueOnce(makeLease());
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty({ ownerId: 'someone-else' }));

      const stranger = { id: 'stranger-1', role: 'OWNER' } as AuthenticatedUser;
      await expect(service.getSchedule(stranger, 'lease-1')).rejects.toThrow(ForbiddenException);
    });

    it('renvoie les échéances triées par periodStart croissant', async () => {
      prisma.lease.findUnique.mockResolvedValueOnce(makeLease());

      await service.getSchedule(tenant, 'lease-1');

      expect(prisma.paymentScheduleEntry.findMany).toHaveBeenCalledWith({
        where: { leaseId: 'lease-1' },
        orderBy: { periodStart: 'asc' },
      });
    });
  });
});
