import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ManagerReviewsService } from './manager-reviews.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';

describe('ManagerReviewsService', () => {
  let service: ManagerReviewsService;
  let prisma: {
    $transaction: jest.Mock;
    user: { findUnique: jest.Mock; findMany: jest.Mock; count: jest.Mock; findFirst: jest.Mock };
    mandate: { findFirst: jest.Mock };
    managerReview: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      aggregate: jest.Mock;
    };
    property: { groupBy: jest.Mock };
  };
  let tx: {
    managerReview: { create: jest.Mock; update: jest.Mock; aggregate: jest.Mock };
    managerProfile: { update: jest.Mock };
  };

  const owner = { id: 'owner-1', role: 'OWNER' } as AuthenticatedUser;

  beforeEach(() => {
    tx = {
      managerReview: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'review-1', managerId: 'manager-1', ownerId: 'owner-1' }),
        update: jest.fn().mockResolvedValue({ id: 'review-1' }),
        aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 4 }, _count: { _all: 1 } }),
      },
      managerProfile: { update: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(tx)),
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      mandate: { findFirst: jest.fn() },
      managerReview: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
      property: { groupBy: jest.fn() },
    };
    service = new ManagerReviewsService(prisma as never);
  });

  describe('create', () => {
    const dto = { rating: 4, comment: 'Très professionnel' };

    it('lève ForbiddenException si le propriétaire tente de se noter lui-même', async () => {
      await expect(service.create(owner, 'owner-1', dto)).rejects.toThrow(ForbiddenException);
    });

    it('lève NotFoundException si le "gestionnaire" est introuvable ou n’a pas le rôle MANAGER', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'manager-1', role: 'OWNER' });
      await expect(service.create(owner, 'manager-1', dto)).rejects.toThrow(NotFoundException);
    });

    it("lève ForbiddenException si aucun mandat n'a jamais été accepté avec ce gestionnaire", async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'manager-1', role: 'MANAGER' });
      prisma.mandate.findFirst.mockResolvedValueOnce(null);
      await expect(service.create(owner, 'manager-1', dto)).rejects.toThrow(ForbiddenException);

      const [args] = prisma.mandate.findFirst.mock.calls[0] as [
        { where: { acceptedAt: { not: null } } },
      ];
      expect(args.where.acceptedAt).toEqual({ not: null });
    });

    it('crée l’avis et recalcule la note moyenne du gestionnaire (avis masqués exclus)', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'manager-1', role: 'MANAGER' });
      prisma.mandate.findFirst.mockResolvedValueOnce({ id: 'mandate-1' });

      await service.create(owner, 'manager-1', dto);

      const [createArgs] = tx.managerReview.create.mock.calls[0] as [
        { data: { managerId: string; ownerId: string; rating: number } },
      ];
      expect(createArgs.data.managerId).toBe('manager-1');
      expect(createArgs.data.ownerId).toBe('owner-1');
      expect(createArgs.data.rating).toBe(4);
      const [aggregateArgs] = tx.managerReview.aggregate.mock.calls[0] as [
        { where: { managerId: string; isHidden: boolean } },
      ];
      expect(aggregateArgs.where).toEqual({ managerId: 'manager-1', isHidden: false });
      expect(tx.managerProfile.update).toHaveBeenCalledWith({
        where: { userId: 'manager-1' },
        data: { ratingAverage: 4, ratingCount: 1 },
      });
    });

    it('lève ConflictException (409 propre) si un avis existe déjà pour cette relation (P2002)', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'manager-1', role: 'MANAGER' });
      prisma.mandate.findFirst.mockResolvedValueOnce({ id: 'mandate-1' });
      tx.managerReview.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
          meta: { target: ['ownerId', 'managerId'] },
        }),
      );

      await expect(service.create(owner, 'manager-1', dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findMine', () => {
    it('retourne null si le propriétaire connecté n’a laissé aucun avis pour ce gestionnaire', async () => {
      prisma.managerReview.findFirst.mockResolvedValueOnce(null);

      const result = await service.findMine(owner, 'manager-1');

      expect(result).toBeNull();
      expect(prisma.managerReview.findFirst).toHaveBeenCalledWith({
        where: { managerId: 'manager-1', ownerId: 'owner-1' },
      });
    });

    it('retourne l’avis existant du propriétaire connecté pour ce gestionnaire', async () => {
      const existing = { id: 'review-1', managerId: 'manager-1', ownerId: 'owner-1', rating: 5 };
      prisma.managerReview.findFirst.mockResolvedValueOnce(existing);

      const result = await service.findMine(owner, 'manager-1');

      expect(result).toEqual(existing);
    });
  });

  describe('update', () => {
    it('lève NotFoundException si l’avis est introuvable', async () => {
      prisma.managerReview.findUnique.mockResolvedValueOnce(null);
      await expect(service.update(owner, 'manager-1', 'review-1', { rating: 5 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("lève NotFoundException si l'avis n'appartient pas au gestionnaire indiqué dans l'URL", async () => {
      prisma.managerReview.findUnique.mockResolvedValueOnce({
        id: 'review-1',
        ownerId: 'owner-1',
        managerId: 'manager-1',
      });
      await expect(
        service.update(owner, 'un-autre-manager', 'review-1', { rating: 5 }),
      ).rejects.toThrow(NotFoundException);
    });

    it("lève ForbiddenException si l'appelant n'est pas l'auteur de l'avis", async () => {
      prisma.managerReview.findUnique.mockResolvedValueOnce({
        id: 'review-1',
        ownerId: 'someone-else',
        managerId: 'manager-1',
      });
      await expect(service.update(owner, 'manager-1', 'review-1', { rating: 5 })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('met à jour l’avis et recalcule la note moyenne', async () => {
      prisma.managerReview.findUnique.mockResolvedValueOnce({
        id: 'review-1',
        ownerId: 'owner-1',
        managerId: 'manager-1',
      });

      await service.update(owner, 'manager-1', 'review-1', { rating: 5 });

      expect(tx.managerReview.update).toHaveBeenCalledWith({
        where: { id: 'review-1' },
        data: { rating: 5, comment: undefined },
      });
      expect(tx.managerProfile.update).toHaveBeenCalledWith({
        where: { userId: 'manager-1' },
        data: { ratingAverage: 4, ratingCount: 1 },
      });
    });
  });

  describe('moderate', () => {
    it('lève NotFoundException si l’avis est introuvable', async () => {
      prisma.managerReview.findUnique.mockResolvedValueOnce(null);
      await expect(service.moderate('review-1', { isHidden: true })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('masque l’avis et recalcule la note moyenne sans lui', async () => {
      prisma.managerReview.findUnique.mockResolvedValueOnce({
        id: 'review-1',
        ownerId: 'owner-1',
        managerId: 'manager-1',
      });
      tx.managerReview.aggregate.mockResolvedValueOnce({
        _avg: { rating: null },
        _count: { _all: 0 },
      });

      await service.moderate('review-1', { isHidden: true });

      expect(tx.managerReview.update).toHaveBeenCalledWith({
        where: { id: 'review-1' },
        data: { isHidden: true },
      });
      expect(tx.managerProfile.update).toHaveBeenCalledWith({
        where: { userId: 'manager-1' },
        data: { ratingAverage: 0, ratingCount: 0 },
      });
    });
  });

  describe('findAllPublic', () => {
    it('filtre par zone et note minimale, ventile la pagination', async () => {
      prisma.user.findMany.mockResolvedValueOnce([
        {
          id: 'manager-1',
          firstName: 'Ama',
          lastName: 'Kodjo',
          city: 'Lome',
          createdAt: new Date('2026-01-01'),
          managerProfile: { zonesOfIntervention: ['Lome'], ratingAverage: 4.5, ratingCount: 2 },
        },
      ]);
      prisma.user.count.mockResolvedValueOnce(1);

      const result = await service.findAllPublic({
        page: 1,
        limit: 20,
        zone: 'Lome',
        minRating: 4,
      });

      expect(result.total).toBe(1);
      expect(result.data[0].ratingAverage).toBe(4.5);
      const [findManyArgs] = prisma.user.findMany.mock.calls[0] as [
        {
          where: {
            managerProfile: {
              zonesOfIntervention: { has: string };
              ratingAverage: { gte: number };
            };
          };
        },
      ];
      expect(findManyArgs.where.managerProfile.zonesOfIntervention).toEqual({ has: 'Lome' });
      expect(findManyArgs.where.managerProfile.ratingAverage).toEqual({ gte: 4 });
    });

    it('filtre par recherche textuelle sur prénom/nom', async () => {
      prisma.user.findMany.mockResolvedValueOnce([]);
      prisma.user.count.mockResolvedValueOnce(0);

      await service.findAllPublic({ page: 1, limit: 20, search: 'Kodjo' });

      const [findManyArgs] = prisma.user.findMany.mock.calls[0] as [
        { where: { OR: Array<{ firstName?: unknown; lastName?: unknown }> } },
      ];
      expect(findManyArgs.where.OR).toEqual([
        { firstName: { contains: 'Kodjo', mode: 'insensitive' } },
        { lastName: { contains: 'Kodjo', mode: 'insensitive' } },
      ]);
    });
  });

  describe('findOnePublic', () => {
    it('lève NotFoundException si le gestionnaire est introuvable', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);
      await expect(service.findOnePublic('manager-1')).rejects.toThrow(NotFoundException);
    });

    it('agrège le portfolio par type et tronque le nom des auteurs d’avis', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        id: 'manager-1',
        firstName: 'Ama',
        lastName: 'Kodjo',
        email: 'ama.kodjo@example.com',
        city: 'Lome',
        createdAt: new Date('2026-01-01'),
        managerProfile: {
          zonesOfIntervention: ['Lome'],
          pricingNote: '10% des loyers',
          ratingAverage: 4.5,
          ratingCount: 1,
        },
      });
      prisma.property.groupBy.mockResolvedValueOnce([
        { type: 'APARTMENT', _count: { _all: 2 } },
        { type: 'VILLA', _count: { _all: 1 } },
      ]);
      prisma.managerReview.findMany.mockResolvedValueOnce([
        {
          id: 'review-1',
          rating: 5,
          comment: 'Top',
          createdAt: new Date('2026-08-01'),
          owner: { firstName: 'Jean', lastName: 'Dupont' },
        },
      ]);

      const result = await service.findOnePublic('manager-1');

      // Email exposé uniquement à ce niveau (appelant authentifié
      // OWNER/MANAGER, voir public-managers.controller.ts) — c'est celui que
      // le propriétaire utilise pour créer une délégation (POST /mandates).
      expect(result.email).toBe('ama.kodjo@example.com');
      expect(result.portfolio.totalManagedProperties).toBe(3);
      expect(result.portfolio.byType).toEqual([
        { type: 'APARTMENT', count: 2 },
        { type: 'VILLA', count: 1 },
      ]);
      expect(result.reviews[0].ownerName).toBe('Jean D.');

      const [reviewArgs] = prisma.managerReview.findMany.mock.calls[0] as [
        { where: { isHidden: boolean } },
      ];
      expect(reviewArgs.where.isHidden).toBe(false);
    });
  });
});
