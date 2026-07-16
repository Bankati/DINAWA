import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LeasesService } from './leases.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';

describe('LeasesService', () => {
  let service: LeasesService;
  let prisma: {
    $transaction: jest.Mock;
    property: { findUnique: jest.Mock };
    mandate: { findFirst: jest.Mock };
    user: { findUnique: jest.Mock };
    tenantPropertyBlock: { findUnique: jest.Mock };
    lease: { findUnique: jest.Mock };
  };
  let tx: {
    lease: { create: jest.Mock; update: jest.Mock };
    paymentScheduleEntry: { createMany: jest.Mock; deleteMany: jest.Mock };
    property: { update: jest.Mock };
  };
  let notify: { notifyUser: jest.Mock };

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

  function makeProperty(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'prop-1',
      ownerId: 'owner-1',
      address: '1 Rue Test',
      status: 'VACANT',
      ...overrides,
    };
  }

  function makeTenant(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return { id: 'tenant-1', role: 'TENANT', ...overrides };
  }

  function makeCreateDto(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      propertyId: 'prop-1',
      tenantId: 'tenant-1',
      monthlyRent: 50000,
      monthlyCharges: 5000,
      paymentFrequency: 'MONTHLY',
      startDate: '2026-01-01',
      securityDeposit: 100000,
      ...overrides,
    };
  }

  beforeEach(() => {
    tx = {
      lease: {
        create: jest.fn().mockResolvedValue({ id: 'lease-1' }),
        update: jest.fn().mockResolvedValue({ id: 'lease-1', status: 'TERMINATED' }),
      },
      paymentScheduleEntry: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      property: { update: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(tx)),
      property: { findUnique: jest.fn() },
      mandate: { findFirst: jest.fn().mockResolvedValue(null) },
      user: { findUnique: jest.fn() },
      tenantPropertyBlock: { findUnique: jest.fn().mockResolvedValue(null) },
      lease: { findUnique: jest.fn() },
    };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };

    service = new LeasesService(prisma as never, notify as never);
  });

  describe('create', () => {
    it('lève NotFoundException si le bien est introuvable', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(null);
      await expect(service.create(owner, makeCreateDto() as never)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lève ForbiddenException si canMutate est faux (propriétaire en lecture seule)', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.mandate.findFirst.mockResolvedValueOnce({ managerId: 'manager-1' });
      await expect(service.create(owner, makeCreateDto() as never)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("lève NotFoundException si le locataire est introuvable ou n'est pas TENANT", async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.create(owner, makeCreateDto() as never)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lève ForbiddenException si le locataire est bloqué sur ce bien (referme le gap unité 14)', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());
      prisma.tenantPropertyBlock.findUnique.mockResolvedValueOnce({
        id: 'block-1',
        reason: 'Dégâts',
      });
      await expect(service.create(owner, makeCreateDto() as never)).rejects.toThrow(
        ForbiddenException,
      );
      expect(tx.lease.create).not.toHaveBeenCalled();
    });

    it('crée le bail avec ownerId dérivé du bien, jamais du DTO', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());

      await service.create(owner, makeCreateDto() as never);

      const [createArgs] = tx.lease.create.mock.calls[0] as [
        { data: { ownerId: string; tenantUserId: string } },
      ];
      expect(createArgs.data.ownerId).toBe('owner-1');
      expect(createArgs.data.tenantUserId).toBe('tenant-1');
    });

    it('passe le bien à OCCUPIED dans la même transaction', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());

      await service.create(owner, makeCreateDto() as never);

      expect(tx.property.update).toHaveBeenCalledWith({
        where: { id: 'prop-1' },
        data: { status: 'OCCUPIED' },
      });
    });

    it('génère 3 échéances mensuelles pour un bail de 3 mois à durée fixe', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());

      await service.create(
        owner,
        makeCreateDto({ startDate: '2026-01-01', endDate: '2026-04-01' }) as never,
      );

      const [createManyArgs] = tx.paymentScheduleEntry.createMany.mock.calls[0] as [
        { data: { periodStart: Date; periodEnd: Date; dueDate: Date; expectedAmount: number }[] },
      ];
      expect(createManyArgs.data).toHaveLength(3);
      expect(createManyArgs.data[0].expectedAmount).toBe(55000); // (50000+5000) * 1
      expect(createManyArgs.data[0].periodStart).toEqual(new Date('2026-01-01'));
      expect(createManyArgs.data[0].dueDate).toEqual(new Date('2026-01-01'));
      expect(createManyArgs.data[2].periodStart).toEqual(new Date('2026-03-01'));
    });

    it('génère 2 échéances trimestrielles pour un bail de 6 mois — montant = loyer total × 3 mois', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());

      await service.create(
        owner,
        makeCreateDto({
          startDate: '2026-01-01',
          endDate: '2026-07-01',
          paymentFrequency: 'QUARTERLY',
        }) as never,
      );

      const [createManyArgs] = tx.paymentScheduleEntry.createMany.mock.calls[0] as [
        { data: { expectedAmount: number }[] },
      ];
      expect(createManyArgs.data).toHaveLength(2);
      expect(createManyArgs.data[0].expectedAmount).toBe(165000); // (50000+5000) * 3
    });

    it('génère 12 échéances mensuelles pour un bail ouvert (sans endDate)', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());

      await service.create(owner, makeCreateDto({ startDate: '2026-01-01' }) as never);

      const [createManyArgs] = tx.paymentScheduleEntry.createMany.mock.calls[0] as [
        { data: unknown[] },
      ];
      expect(createManyArgs.data).toHaveLength(12);
    });

    it('lève ConflictException (409 propre) si le locataire a déjà un bail actif (P2002)', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());
      prisma.$transaction.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
          meta: { target: ['tenantUserId'] },
        }),
      );

      await expect(service.create(owner, makeCreateDto() as never)).rejects.toThrow(
        ConflictException,
      );
    });

    it('permet au gestionnaire mandaté de créer un bail', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.mandate.findFirst.mockResolvedValueOnce({ managerId: 'manager-1' });
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());

      await expect(service.create(manager, makeCreateDto() as never)).resolves.toBeDefined();
    });

    it('notifie le locataire via NotifyService avec les bonnes variables', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());

      await service.create(owner, makeCreateDto() as never);

      expect(notify.notifyUser).toHaveBeenCalledWith({
        userId: 'tenant-1',
        event: 'lease-created',
        variables: {
          propertyAddress: '1 Rue Test',
          ownerName: 'Jean Dupont',
          startDate: '01/01/2026',
          monthlyAmount: 55000,
        },
      });
    });

    it('ne fait pas échouer la création si la notification échoue', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());
      notify.notifyUser.mockRejectedValueOnce(new Error('push down'));

      await expect(service.create(owner, makeCreateDto() as never)).resolves.toBeDefined();
    });
  });

  describe('terminate', () => {
    function makeLease(overrides: Record<string, unknown> = {}): Record<string, unknown> {
      return { id: 'lease-1', propertyId: 'prop-1', status: 'ACTIVE', ...overrides };
    }

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
});
