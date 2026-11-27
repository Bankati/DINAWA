import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SupportRequestsService } from './support-requests.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';

const property = { id: 'prop-1', ownerId: 'owner-1', address: null, neighborhood: 'Bè', city: 'Lomé' };

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sr-1',
    reference: 'SR-ABCDEF',
    status: 'OPEN',
    urgency: 'NORMAL',
    channel: 'WEB',
    trade: 'PLUMBER',
    description: "Fuite sous l'évier",
    propertyId: 'prop-1',
    tenantUserId: 'tenant-1',
    artisanId: null,
    property,
    tenant: { firstName: 'Sena', lastName: 'Agbeko', phone: '91223344' },
    artisan: null,
    photos: [],
    review: null,
    _count: { photos: 0 },
    createdAt: new Date(),
    assignedAt: null,
    resolvedAt: null,
    startedAt: null,
    cancelledAt: null,
    costAmount: null,
    costPaidBy: null,
    resolutionNote: null,
    ...overrides,
  };
}

describe('SupportRequestsService', () => {
  let service: SupportRequestsService;
  let prisma: {
    $transaction: jest.Mock;
    lease: { findFirst: jest.Mock };
    mandate: { findFirst: jest.Mock };
    supportRequest: Record<'count' | 'create' | 'findFirst' | 'findUnique' | 'findMany' | 'updateMany', jest.Mock>;
    supportRequestPhoto: { create: jest.Mock };
    artisan: { findFirst: jest.Mock; update: jest.Mock };
    artisanReview: Record<'create' | 'aggregate' | 'findUnique' | 'update', jest.Mock>;
  };
  let storage: { upload: jest.Mock; getSignedUrls: jest.Mock };
  let notify: { notifyUser: jest.Mock };

  const tenant = { id: 'tenant-1', role: 'TENANT', firstName: 'Sena', lastName: 'Agbeko' } as AuthenticatedUser;
  const owner = { id: 'owner-1', role: 'OWNER' } as AuthenticatedUser;
  const stranger = { id: 'owner-9', role: 'OWNER' } as AuthenticatedUser;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
      lease: { findFirst: jest.fn() },
      mandate: { findFirst: jest.fn().mockResolvedValue(null) },
      supportRequest: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      supportRequestPhoto: { create: jest.fn() },
      artisan: { findFirst: jest.fn(), update: jest.fn() },
      artisanReview: {
        create: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 4 }, _count: { _all: 1 } }),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    storage = { upload: jest.fn(), getSignedUrls: jest.fn().mockResolvedValue(new Map()) };
    notify = { notifyUser: jest.fn() };
    service = new SupportRequestsService(prisma as never, storage as never, notify as never);
  });

  describe('signalement par le locataire', () => {
    const dto = { description: "Fuite sous l'évier de la cuisine", trade: 'PLUMBER' as const };

    it('refuse un locataire sans bail actif', async () => {
      prisma.lease.findFirst.mockResolvedValueOnce(null);
      await expect(service.createForTenant(tenant, dto)).rejects.toThrow(ConflictException);
    });

    it('crée la panne sur le bien du bail et prévient le responsable', async () => {
      prisma.lease.findFirst.mockResolvedValueOnce({ id: 'lease-1', propertyId: 'prop-1', property });
      prisma.supportRequest.create.mockResolvedValueOnce(row());
      prisma.supportRequest.findFirst.mockResolvedValueOnce(row());

      const detail = await service.createForTenant(tenant, dto);

      const [args] = prisma.supportRequest.create.mock.calls[0] as [{ data: Record<string, unknown> }];
      expect(args.data).toMatchObject({ propertyId: 'prop-1', leaseId: 'lease-1', tenantUserId: 'tenant-1' });
      expect(args.data['reference']).toMatch(/^SR-/);
      expect(notify.notifyUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'owner-1', event: 'support-request-created' }),
      );
      expect(detail.canManage).toBe(false);
      expect(detail.artisanWhatsappUrl).toBeNull();
    });

    it('réessaie la référence en cas de collision', async () => {
      prisma.lease.findFirst.mockResolvedValueOnce({ id: 'lease-1', propertyId: 'prop-1', property });
      prisma.supportRequest.create
        .mockRejectedValueOnce(
          new Prisma.PrismaClientKnownRequestError('unique', {
            code: 'P2002',
            clientVersion: 'test',
            meta: { target: ['reference'] },
          }),
        )
        .mockResolvedValueOnce(row());
      prisma.supportRequest.findFirst.mockResolvedValueOnce(row());
      await service.createForTenant(tenant, dto);
      expect(prisma.supportRequest.create).toHaveBeenCalledTimes(2);
    });

    it("une notification ratée n'annule pas le signalement", async () => {
      prisma.lease.findFirst.mockResolvedValueOnce({ id: 'lease-1', propertyId: 'prop-1', property });
      prisma.supportRequest.create.mockResolvedValueOnce(row());
      prisma.supportRequest.findFirst.mockResolvedValueOnce(row());
      notify.notifyUser.mockRejectedValueOnce(new Error('email en panne'));
      await expect(service.createForTenant(tenant, dto)).resolves.toBeDefined();
    });
  });

  describe('responsable du bien', () => {
    it('refuse un propriétaire étranger au bien', async () => {
      prisma.supportRequest.findUnique.mockResolvedValueOnce(row());
      await expect(service.get(stranger, 'sr-1')).rejects.toThrow(ForbiddenException);
    });

    it("n'assigne qu'un artisan du carnet ou de l'annuaire, jamais un artisan retiré", async () => {
      prisma.supportRequest.findUnique.mockResolvedValueOnce(row());
      prisma.artisan.findFirst.mockResolvedValueOnce(null);
      await expect(service.assign(owner, 'sr-1', { artisanId: 'art-9' })).rejects.toThrow(NotFoundException);
      const [args] = prisma.artisan.findFirst.mock.calls[0] as [{ where: Record<string, unknown> }];
      expect(args.where).toMatchObject({
        id: 'art-9',
        directoryStatus: { not: 'SUSPENDED' },
        OR: [{ directoryStatus: 'PUBLIC' }, { contacts: { some: { userId: 'owner-1' } } }],
      });
    });

    it("assigne, prévient le locataire et propose le message WhatsApp pour l'artisan", async () => {
      const assigned = row({
        status: 'ASSIGNED',
        artisanId: 'art-1',
        artisan: { id: 'art-1', displayName: 'Kossi', phone: '90123456', trades: ['PLUMBER'], verifiedAt: null },
      });
      prisma.supportRequest.findUnique.mockResolvedValueOnce(row()).mockResolvedValueOnce(assigned);
      prisma.artisan.findFirst.mockResolvedValueOnce({ id: 'art-1', displayName: 'Kossi', phone: '90123456' });
      prisma.supportRequest.updateMany.mockResolvedValueOnce({ count: 1 });

      const detail = await service.assign(owner, 'sr-1', { artisanId: 'art-1' });

      expect(notify.notifyUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'tenant-1', event: 'support-request-assigned' }),
      );
      expect(detail.artisanWhatsappUrl).toMatch(/^https:\/\/wa\.me\/22890123456\?text=/);
      expect(decodeURIComponent(detail.artisanWhatsappUrl ?? '')).toContain('SR-ABCDEF');
    });

    it("le propriétaire d'un bien confié à un gestionnaire ne peut que lire", async () => {
      prisma.mandate.findFirst.mockResolvedValue({ managerId: 'manager-1' });
      prisma.supportRequest.findUnique.mockResolvedValueOnce(row());
      await expect(
        service.updateStatus(owner, 'sr-1', { status: 'CANCELLED' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("refuse « en cours » sans artisan choisi", async () => {
      prisma.supportRequest.findUnique.mockResolvedValueOnce(row());
      prisma.supportRequest.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.updateStatus(owner, 'sr-1', { status: 'IN_PROGRESS' })).rejects.toThrow(
        ConflictException,
      );
      const [args] = prisma.supportRequest.updateMany.mock.calls[0] as [{ where: { status: { in: string[] } } }];
      expect(args.where.status.in).toEqual(['ASSIGNED']);
    });

    it('clôture avec le coût et prévient le locataire', async () => {
      prisma.supportRequest.findUnique.mockResolvedValueOnce(row({ status: 'IN_PROGRESS' })).mockResolvedValueOnce(row({ status: 'RESOLVED' }));
      prisma.supportRequest.updateMany.mockResolvedValueOnce({ count: 1 });
      await service.updateStatus(owner, 'sr-1', { status: 'RESOLVED', costAmount: 15000 });
      const [args] = prisma.supportRequest.updateMany.mock.calls[0] as [{ data: Record<string, unknown> }];
      expect(args.data).toMatchObject({ status: 'RESOLVED', costAmount: 15000, costPaidBy: 'OWNER' });
      expect(notify.notifyUser).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'support-request-resolved' }),
      );
    });
  });

  describe('avis', () => {
    it("refuse un avis avant la fin de la réparation", async () => {
      prisma.supportRequest.findUnique.mockResolvedValueOnce(row({ status: 'IN_PROGRESS', artisanId: 'art-1' }));
      await expect(service.review(owner, 'sr-1', { rating: 5 })).rejects.toThrow(ConflictException);
    });

    it('enregistre un avis et recalcule la note de l’artisan', async () => {
      const resolved = row({ status: 'RESOLVED', artisanId: 'art-1' });
      prisma.supportRequest.findUnique.mockResolvedValueOnce(resolved).mockResolvedValueOnce(resolved);
      await service.review(owner, 'sr-1', { rating: 4, comment: 'Rapide' });
      expect(prisma.artisanReview.create).toHaveBeenCalledWith({
        data: { artisanId: 'art-1', authorId: 'owner-1', supportRequestId: 'sr-1', rating: 4, comment: 'Rapide' },
      });
      expect(prisma.artisan.update).toHaveBeenCalledWith({
        where: { id: 'art-1' },
        data: { ratingAverage: 4, ratingCount: 1 },
      });
    });

    it('un seul avis par intervention (409)', async () => {
      prisma.supportRequest.findUnique.mockResolvedValueOnce(row({ status: 'RESOLVED', artisanId: 'art-1' }));
      prisma.artisanReview.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' }),
      );
      await expect(service.review(owner, 'sr-1', { rating: 4 })).rejects.toThrow(ConflictException);
    });
  });
});
