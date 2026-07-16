import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantsService } from './tenants.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';

describe('TenantsService', () => {
  let service: TenantsService;
  let prisma: {
    property: { findUnique: jest.Mock };
    mandate: { findFirst: jest.Mock };
    lease: { findFirst: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    user: { findUnique: jest.Mock };
    tenantPropertyBlock: { findUnique: jest.Mock; create: jest.Mock };
  };

  const owner = { id: 'owner-1', role: 'OWNER' } as AuthenticatedUser;
  const manager = { id: 'manager-1', role: 'MANAGER' } as AuthenticatedUser;
  const stranger = { id: 'stranger-1', role: 'OWNER' } as AuthenticatedUser;
  const admin = { id: 'admin-1', role: 'ADMIN' } as AuthenticatedUser;
  const tenantUser = { id: 'tenant-1', role: 'TENANT' } as AuthenticatedUser;

  function makeProperty(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return { id: 'prop-1', ownerId: 'owner-1', ...overrides };
  }

  function makeTenant(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return { id: 'tenant-1', role: 'TENANT', firstName: 'Awa', lastName: 'Koné', ...overrides };
  }

  beforeEach(() => {
    prisma = {
      property: { findUnique: jest.fn() },
      mandate: { findFirst: jest.fn().mockResolvedValue(null) },
      lease: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      user: { findUnique: jest.fn() },
      tenantPropertyBlock: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
    };

    service = new TenantsService(prisma as never);
  });

  describe('blockTenant', () => {
    it('lève NotFoundException si le bien est introuvable', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.blockTenant(owner, 'prop-1', 'tenant-1', { reason: 'conflit' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève ForbiddenException si canMutate est faux (propriétaire en lecture seule)', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.mandate.findFirst.mockResolvedValueOnce({ managerId: 'manager-1' });
      await expect(
        service.blockTenant(owner, 'prop-1', 'tenant-1', { reason: 'conflit' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lève NotFoundException si le locataire est introuvable ou n'est pas TENANT", async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.blockTenant(owner, 'prop-1', 'tenant-1', { reason: 'conflit' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève ConflictException si un bail ACTIVE existe encore entre ce locataire et ce bien', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());
      prisma.lease.findFirst.mockResolvedValueOnce({ id: 'lease-1', status: 'ACTIVE' });
      await expect(
        service.blockTenant(owner, 'prop-1', 'tenant-1', { reason: 'conflit' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.tenantPropertyBlock.create).not.toHaveBeenCalled();
    });

    it('lève ConflictException si un bail EXPIRED (pas encore résilié) existe encore — seul TERMINATED libère', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());
      prisma.lease.findFirst.mockResolvedValueOnce({ id: 'lease-1', status: 'EXPIRED' });
      await expect(
        service.blockTenant(owner, 'prop-1', 'tenant-1', { reason: 'conflit' }),
      ).rejects.toThrow(ConflictException);

      const [findFirstArgs] = prisma.lease.findFirst.mock.calls[0] as [
        { where: { status: { in: string[] } } },
      ];
      expect(findFirstArgs.where.status).toEqual({ in: ['ACTIVE', 'EXPIRED'] });
    });

    it('lève ConflictException (409 propre, pas 500) si une requête concurrente a déjà créé le blocage (P2002)', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());
      prisma.tenantPropertyBlock.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
          meta: { target: ['propertyId', 'tenantUserId'] },
        }),
      );
      await expect(
        service.blockTenant(owner, 'prop-1', 'tenant-1', { reason: 'conflit' }),
      ).rejects.toThrow(ConflictException);
    });

    it('lève ConflictException si déjà bloqué pour ce bien', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());
      prisma.tenantPropertyBlock.findUnique.mockResolvedValueOnce({ id: 'block-1' });
      await expect(
        service.blockTenant(owner, 'prop-1', 'tenant-1', { reason: 'conflit' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.tenantPropertyBlock.create).not.toHaveBeenCalled();
    });

    it("crée le blocage avec la justification et l'auteur corrects", async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());
      prisma.tenantPropertyBlock.create.mockResolvedValueOnce({ id: 'block-1' });

      await service.blockTenant(owner, 'prop-1', 'tenant-1', { reason: 'Dégâts constatés' });

      const [createArgs] = prisma.tenantPropertyBlock.create.mock.calls[0] as [
        {
          data: {
            propertyId: string;
            tenantUserId: string;
            blockedByUserId: string;
            reason: string;
          };
        },
      ];
      expect(createArgs.data).toEqual({
        propertyId: 'prop-1',
        tenantUserId: 'tenant-1',
        blockedByUserId: 'owner-1',
        reason: 'Dégâts constatés',
      });
    });

    it('permet au gestionnaire mandaté de bloquer', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.mandate.findFirst.mockResolvedValueOnce({ managerId: 'manager-1' });
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());
      prisma.tenantPropertyBlock.create.mockResolvedValueOnce({ id: 'block-1' });

      await service.blockTenant(manager, 'prop-1', 'tenant-1', { reason: 'conflit' });
      expect(prisma.tenantPropertyBlock.create).toHaveBeenCalled();
    });
  });

  describe('getPropertyTenantsHistory', () => {
    it('lève ForbiddenException si canRead est faux', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      await expect(service.getPropertyTenantsHistory(stranger, 'prop-1', {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('filtre par propertyId et pagine correctement', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.lease.count.mockResolvedValueOnce(42);

      const result = await service.getPropertyTenantsHistory(owner, 'prop-1', {
        page: 2,
        limit: 10,
      });

      const [findManyArgs] = prisma.lease.findMany.mock.calls[0] as [
        { where: { propertyId: string }; skip: number; take: number },
      ];
      expect(findManyArgs.where).toEqual({ propertyId: 'prop-1' });
      expect(findManyArgs.skip).toBe(10);
      expect(findManyArgs.take).toBe(10);
      expect(result).toMatchObject({ page: 2, limit: 10, total: 42 });
    });
  });

  describe('getTenantLeasesHistory', () => {
    it('lève NotFoundException si le locataire est introuvable', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.getTenantLeasesHistory(owner, 'tenant-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('autorise un ADMIN sans vérification de relation', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());
      await expect(service.getTenantLeasesHistory(admin, 'tenant-1', {})).resolves.toBeDefined();
      expect(prisma.lease.findFirst).not.toHaveBeenCalled();
    });

    it('autorise le locataire à consulter son propre historique', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());
      await expect(
        service.getTenantLeasesHistory(tenantUser, 'tenant-1', {}),
      ).resolves.toBeDefined();
      expect(prisma.lease.findFirst).not.toHaveBeenCalled();
    });

    it('lève ForbiddenException pour un propriétaire sans aucun bail avec ce locataire', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());
      prisma.lease.findFirst.mockResolvedValueOnce(null);
      await expect(service.getTenantLeasesHistory(stranger, 'tenant-1', {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('autorise un propriétaire ayant eu un bail (même passé) avec ce locataire', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());
      prisma.lease.findFirst.mockResolvedValueOnce({ id: 'lease-1', status: 'TERMINATED' });
      await expect(service.getTenantLeasesHistory(owner, 'tenant-1', {})).resolves.toBeDefined();

      const [findFirstArgs] = prisma.lease.findFirst.mock.calls[0] as [
        { where: { tenantUserId: string; OR: unknown[] } },
      ];
      expect(findFirstArgs.where.tenantUserId).toBe('tenant-1');
    });

    // Voir /review unité 14 : la relation ne doit être qu'une porte d'entrée,
    // jamais donner accès à la totalité de l'historique du locataire — un
    // propriétaire lié ne doit voir QUE ses propres baux avec ce locataire,
    // jamais ceux d'un propriétaire tiers sans aucun rapport.
    it("un propriétaire lié ne voit que SES baux avec ce locataire — jamais ceux d'un tiers", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());
      prisma.lease.findFirst.mockResolvedValueOnce({ id: 'lease-1', status: 'TERMINATED' });
      prisma.lease.count.mockResolvedValueOnce(1);

      await service.getTenantLeasesHistory(owner, 'tenant-1', {});

      const [findManyArgs] = prisma.lease.findMany.mock.calls[0] as [
        { where: { tenantUserId: string; OR: unknown[] } },
      ];
      expect(findManyArgs.where).toEqual({
        tenantUserId: 'tenant-1',
        OR: [
          { ownerId: 'owner-1' },
          { property: { mandates: { some: { managerId: 'owner-1' } } } },
        ],
      });
    });

    it('un ADMIN voit tous les baux du locataire, sans filtre de relation', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());
      prisma.lease.count.mockResolvedValueOnce(7);

      const result = await service.getTenantLeasesHistory(admin, 'tenant-1', { page: 1, limit: 5 });

      const [findManyArgs] = prisma.lease.findMany.mock.calls[0] as [
        { where: { tenantUserId: string } },
      ];
      expect(findManyArgs.where).toEqual({ tenantUserId: 'tenant-1' });
      expect(result).toMatchObject({ page: 1, limit: 5, total: 7 });
    });

    it('le locataire lui-même voit tous ses baux, sans filtre de relation', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(makeTenant());
      prisma.lease.count.mockResolvedValueOnce(3);

      await service.getTenantLeasesHistory(tenantUser, 'tenant-1', {});

      const [findManyArgs] = prisma.lease.findMany.mock.calls[0] as [
        { where: { tenantUserId: string } },
      ];
      expect(findManyArgs.where).toEqual({ tenantUserId: 'tenant-1' });
    });
  });
});
