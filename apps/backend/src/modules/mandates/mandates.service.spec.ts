import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MandatesService } from './mandates.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';

describe('MandatesService', () => {
  let service: MandatesService;
  let prisma: {
    $transaction: jest.Mock;
    user: { findUnique: jest.Mock; findFirst: jest.Mock };
    property: { findMany: jest.Mock };
    mandate: {
      count: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let tx: { mandate: { create: jest.Mock } };
  let accountActivation: { reactivateIfEligible: jest.Mock };
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
  } as AuthenticatedUser;

  function makeProperty(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return { id: 'prop-1', ownerId: 'owner-1', address: '1 Rue Test', ...overrides };
  }

  type MandateCreateArgs = {
    data: {
      propertyId: string;
      ownerId: string;
      managerId: string;
      feeType: string;
      feeValue: number;
    };
  };

  function makeManagerUser(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return { id: 'manager-1', role: 'MANAGER', accountStatus: 'ACTIVE', ...overrides };
  }

  function makeMandate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'mandate-1',
      propertyId: 'prop-1',
      ownerId: 'owner-1',
      managerId: 'manager-1',
      status: 'PENDING',
      ...overrides,
    };
  }

  beforeEach(() => {
    tx = {
      mandate: {
        create: jest.fn((args: MandateCreateArgs) =>
          Promise.resolve({ id: `mandate-${args.data.propertyId}`, ...args.data }),
        ),
      },
    };
    prisma = {
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(tx)),
      user: { findUnique: jest.fn(), findFirst: jest.fn() },
      property: { findMany: jest.fn() },
      mandate: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };
    accountActivation = { reactivateIfEligible: jest.fn().mockResolvedValue(true) };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };

    service = new MandatesService(prisma as never, accountActivation as never, notify as never);
  });

  describe('create', () => {
    const dto = {
      propertyIds: ['prop-1'],
      managerId: 'manager-1',
      feeType: 'PERCENTAGE' as const,
      feeValue: 10,
      startDate: '2026-08-01',
    };

    it('lève ForbiddenException si le propriétaire tente de se mandater lui-même', async () => {
      await expect(service.create(owner, { ...dto, managerId: 'owner-1' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lève BadRequestException si feeType=PERCENTAGE et feeValue > 100', async () => {
      await expect(service.create(owner, { ...dto, feeValue: 150 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lève NotFoundException si le gestionnaire désigné est introuvable', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.create(owner, dto)).rejects.toThrow(NotFoundException);
    });

    it('lève NotFoundException si le "gestionnaire" désigné n’a pas le rôle MANAGER', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(makeManagerUser({ role: 'OWNER' }));
      await expect(service.create(owner, dto)).rejects.toThrow(NotFoundException);
    });

    it('lève ConflictException si le gestionnaire désigné est SUSPENDED_ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(
        makeManagerUser({ accountStatus: 'SUSPENDED_ADMIN' }),
      );
      await expect(service.create(owner, dto)).rejects.toThrow(ConflictException);
    });

    it('lève NotFoundException si un des biens listés est introuvable', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(makeManagerUser());
      prisma.property.findMany.mockResolvedValueOnce([]);
      await expect(service.create(owner, dto)).rejects.toThrow(NotFoundException);
    });

    it("lève ForbiddenException si l'appelant n'est pas le propriétaire réel d'un des biens", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(makeManagerUser());
      prisma.property.findMany.mockResolvedValueOnce([makeProperty({ ownerId: 'someone-else' })]);
      await expect(service.create(owner, dto)).rejects.toThrow(ForbiddenException);
    });

    it('lève ConflictException si un bien a déjà un mandat ACTIVE', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(makeManagerUser());
      prisma.property.findMany.mockResolvedValueOnce([makeProperty()]);
      prisma.mandate.count.mockResolvedValueOnce(1);
      await expect(service.create(owner, dto)).rejects.toThrow(ConflictException);
    });

    it('crée un mandat PENDING par bien et notifie le gestionnaire (échec de notification non bloquant)', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(makeManagerUser());
      prisma.property.findMany.mockResolvedValueOnce([makeProperty()]);
      notify.notifyUser.mockRejectedValueOnce(new Error('resend down'));

      const result = await service.create(owner, dto);

      expect(result).toHaveLength(1);
      const [createArgs] = tx.mandate.create.mock.calls[0] as [MandateCreateArgs];
      expect(createArgs.data.propertyId).toBe('prop-1');
      expect(createArgs.data.ownerId).toBe('owner-1');
      expect(createArgs.data.managerId).toBe('manager-1');
      expect(createArgs.data.feeType).toBe('PERCENTAGE');
      expect(createArgs.data.feeValue).toBe(10);
      expect(notify.notifyUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'manager-1', event: 'mandate-created' }),
      );
    });

    it('crée une ligne Mandate distincte par bien pour un lot de plusieurs biens, en séquence (jamais via Promise.all sur le même tx)', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(makeManagerUser());
      prisma.property.findMany.mockResolvedValueOnce([
        makeProperty({ id: 'prop-1' }),
        makeProperty({ id: 'prop-2' }),
        makeProperty({ id: 'prop-3' }),
      ]);

      const result = await service.create(owner, {
        ...dto,
        propertyIds: ['prop-1', 'prop-2', 'prop-3'],
      });

      expect(result).toHaveLength(3);
      expect(tx.mandate.create).toHaveBeenCalledTimes(3);
      const calls = tx.mandate.create.mock.calls as [MandateCreateArgs][];
      const propertyIdsCreated = calls.map(([createArgs]) => createArgs.data.propertyId);
      expect(propertyIdsCreated).toEqual(['prop-1', 'prop-2', 'prop-3']);
    });

    it('déduplique les propertyIds répétés avant vérification — pas de faux NotFoundException, un seul mandat créé', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(makeManagerUser());
      prisma.property.findMany.mockResolvedValueOnce([makeProperty()]);

      const result = await service.create(owner, { ...dto, propertyIds: ['prop-1', 'prop-1'] });

      expect(result).toHaveLength(1);
      expect(tx.mandate.create).toHaveBeenCalledTimes(1);
      const [findManyArgs] = prisma.property.findMany.mock.calls[0] as [
        { where: { id: { in: string[] } } },
      ];
      expect(findManyArgs.where.id.in).toEqual(['prop-1']);
    });

    it('lève BadRequestException si endDate <= startDate', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(makeManagerUser());
      prisma.property.findMany.mockResolvedValueOnce([makeProperty()]);

      await expect(
        service.create(owner, { ...dto, startDate: '2026-08-10', endDate: '2026-08-01' }),
      ).rejects.toThrow(BadRequestException);
      expect(tx.mandate.create).not.toHaveBeenCalled();
    });
  });

  describe('accept', () => {
    it('lève NotFoundException si le mandat est introuvable', async () => {
      prisma.mandate.findUnique.mockResolvedValueOnce(null);
      await expect(service.accept(manager, 'mandate-1')).rejects.toThrow(NotFoundException);
    });

    it("lève ForbiddenException si l'appelant n'est pas le gestionnaire destinataire", async () => {
      prisma.mandate.findUnique.mockResolvedValueOnce(makeMandate({ managerId: 'other-manager' }));
      await expect(service.accept(manager, 'mandate-1')).rejects.toThrow(ForbiddenException);
    });

    it("lève ConflictException si le mandat n'est plus PENDING", async () => {
      prisma.mandate.findUnique.mockResolvedValueOnce(makeMandate({ status: 'ACTIVE' }));
      await expect(service.accept(manager, 'mandate-1')).rejects.toThrow(ConflictException);
    });

    it('lève ConflictException (409 propre) si un autre mandat est devenu ACTIVE entre-temps (P2002)', async () => {
      prisma.mandate.findUnique.mockResolvedValueOnce(makeMandate());
      prisma.mandate.update.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
          meta: { target: ['propertyId'] },
        }),
      );
      await expect(service.accept(manager, 'mandate-1')).rejects.toThrow(ConflictException);
    });

    it('active le mandat et déclenche la réactivation de compte (fire-and-forget)', async () => {
      prisma.mandate.findUnique.mockResolvedValueOnce(makeMandate());
      prisma.mandate.update.mockResolvedValueOnce(makeMandate({ status: 'ACTIVE' }));

      const result = await service.accept(manager, 'mandate-1');

      expect(result.status).toBe('ACTIVE');
      expect(accountActivation.reactivateIfEligible).toHaveBeenCalledWith('manager-1');
    });
  });

  describe('revoke', () => {
    it('lève NotFoundException si le mandat est introuvable', async () => {
      prisma.mandate.findUnique.mockResolvedValueOnce(null);
      await expect(service.revoke(owner, 'mandate-1', {})).rejects.toThrow(NotFoundException);
    });

    it("lève ForbiddenException si l'appelant n'est ni le propriétaire ni le gestionnaire du mandat", async () => {
      prisma.mandate.findUnique.mockResolvedValueOnce(makeMandate());
      const stranger = { id: 'stranger-1', role: 'OWNER' } as AuthenticatedUser;
      await expect(service.revoke(stranger, 'mandate-1', {})).rejects.toThrow(ForbiddenException);
    });

    it('lève ConflictException si le mandat est déjà REVOKED', async () => {
      prisma.mandate.findUnique.mockResolvedValueOnce(makeMandate({ status: 'REVOKED' }));
      await expect(service.revoke(owner, 'mandate-1', {})).rejects.toThrow(ConflictException);
    });

    it('permet au gestionnaire de refuser un mandat encore PENDING', async () => {
      prisma.mandate.findUnique.mockResolvedValueOnce(makeMandate());
      prisma.mandate.update.mockResolvedValueOnce(makeMandate({ status: 'REVOKED' }));

      await expect(
        service.revoke(manager, 'mandate-1', { reason: 'Pas disponible' }),
      ).resolves.toBeDefined();
      const [updateArgs] = prisma.mandate.update.mock.calls[0] as [
        { where: { id: string }; data: { status: string; revokedReason: string } },
      ];
      expect(updateArgs.where).toEqual({ id: 'mandate-1' });
      expect(updateArgs.data.status).toBe('REVOKED');
      expect(updateArgs.data.revokedReason).toBe('Pas disponible');
    });
  });

  describe('searchManagers', () => {
    it('lève BadRequestException si ni email ni téléphone ne sont fournis', async () => {
      await expect(service.searchManagers({})).rejects.toThrow(BadRequestException);
    });

    it('renvoie un tableau vide si aucun gestionnaire ne correspond', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);
      await expect(service.searchManagers({ email: 'x@x.com' })).resolves.toEqual([]);
    });

    it('renvoie le résumé du gestionnaire trouvé', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        id: 'manager-1',
        firstName: 'M',
        lastName: 'N',
      });
      await expect(service.searchManagers({ phone: '+22890000000' })).resolves.toEqual([
        { id: 'manager-1', firstName: 'M', lastName: 'N' },
      ]);
    });
  });
});
