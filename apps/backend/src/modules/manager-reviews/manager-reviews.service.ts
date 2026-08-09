import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ManagerReview, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CreateManagerReviewDto } from './dto/create-manager-review.dto';
import { UpdateManagerReviewDto } from './dto/update-manager-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { ListPublicManagersQueryDto } from './dto/list-public-managers-query.dto';
import {
  PaginatedPublicManagers,
  PublicManagerDetail,
  PublicManagerSummary,
} from './manager-reviews.types';

// Un avis par relation propriétaire↔gestionnaire, jamais par mandat
// individuel (contrainte unique en base, voir /architect unité 34).
// ManagerProfile.ratingAverage/ratingCount sont recalculés de façon
// synchrone à chaque création/modification/modération — jamais un cron,
// le volume par gestionnaire reste toujours modeste.
@Injectable()
export class ManagerReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: AuthenticatedUser,
    managerId: string,
    dto: CreateManagerReviewDto,
  ): Promise<ManagerReview> {
    if (managerId === user.id) {
      throw new ForbiddenException('Impossible de laisser un avis sur soi-même');
    }

    const manager = await this.prisma.user.findUnique({ where: { id: managerId } });
    if (!manager || manager.role !== UserRole.MANAGER) {
      throw new NotFoundException('Gestionnaire introuvable');
    }

    // « Ayant ou ayant eu un mandat actif » (build-plan.md unité 34) — le
    // mandat doit avoir été accepté à un moment donné, qu'il soit encore
    // ACTIVE ou révoqué depuis. Un mandat resté PENDING (jamais accepté)
    // ne donne aucun droit d'avis.
    const acceptedMandate = await this.prisma.mandate.findFirst({
      where: { ownerId: user.id, managerId, acceptedAt: { not: null } },
      select: { id: true },
    });
    if (!acceptedMandate) {
      throw new ForbiddenException("Vous n'avez jamais eu de mandat accepté avec ce gestionnaire");
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const review = await tx.managerReview.create({
          data: {
            managerId,
            ownerId: user.id,
            mandateId: acceptedMandate.id,
            rating: dto.rating,
            comment: dto.comment,
          },
        });
        await this.recomputeRating(tx, managerId);
        return review;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Vous avez déjà laissé un avis pour ce gestionnaire');
      }
      throw error;
    }
  }

  async update(
    user: AuthenticatedUser,
    managerId: string,
    reviewId: string,
    dto: UpdateManagerReviewDto,
  ): Promise<ManagerReview> {
    const review = await this.getReviewOrThrow(reviewId);
    // L'avis doit réellement appartenir au gestionnaire indiqué dans l'URL
    // — sans ce contrôle, PATCH /managers/N_IMPORTE_QUOI/reviews/:reviewId
    // fonctionnerait pour l'auteur peu importe le managerId indiqué (voir
    // /review unité 34).
    if (review.managerId !== managerId) {
      throw new NotFoundException('Avis introuvable pour ce gestionnaire');
    }
    if (review.ownerId !== user.id) {
      throw new ForbiddenException('Vous ne pouvez modifier que votre propre avis');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.managerReview.update({
        where: { id: reviewId },
        data: { rating: dto.rating, comment: dto.comment },
      });
      await this.recomputeRating(tx, review.managerId);
      return updated;
    });
  }

  // Réservé à l'admin (@Roles au niveau du controller) — aucune vérification
  // de propriété supplémentaire nécessaire ici.
  async moderate(reviewId: string, dto: ModerateReviewDto): Promise<ManagerReview> {
    const review = await this.getReviewOrThrow(reviewId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.managerReview.update({
        where: { id: reviewId },
        data: { isHidden: dto.isHidden },
      });
      await this.recomputeRating(tx, review.managerId);
      return updated;
    });
  }

  async findAllPublic(query: ListPublicManagersQueryDto): Promise<PaginatedPublicManagers> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.UserWhereInput = {
      role: UserRole.MANAGER,
      anonymizedAt: null,
      managerProfile: {
        ...(query.zone ? { zonesOfIntervention: { has: query.zone } } : {}),
        ...(query.minRating ? { ratingAverage: { gte: query.minRating } } : {}),
      },
    };

    const [managers, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { managerProfile: { ratingAverage: 'desc' } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          city: true,
          createdAt: true,
          managerProfile: {
            select: { zonesOfIntervention: true, ratingAverage: true, ratingCount: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const data: PublicManagerSummary[] = managers.map((m) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      city: m.city,
      memberSince: m.createdAt,
      zonesOfIntervention: m.managerProfile?.zonesOfIntervention ?? [],
      ratingAverage: m.managerProfile?.ratingAverage ?? 0,
      ratingCount: m.managerProfile?.ratingCount ?? 0,
    }));

    return { data, page, limit, total };
  }

  async findOnePublic(managerId: string): Promise<PublicManagerDetail> {
    const manager = await this.prisma.user.findFirst({
      where: { id: managerId, role: UserRole.MANAGER, anonymizedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        city: true,
        createdAt: true,
        managerProfile: {
          select: {
            zonesOfIntervention: true,
            pricingNote: true,
            ratingAverage: true,
            ratingCount: true,
          },
        },
      },
    });
    if (!manager) throw new NotFoundException('Gestionnaire introuvable');

    const [byType, reviews] = await Promise.all([
      this.prisma.property.groupBy({
        by: ['type'],
        where: { mandates: { some: { managerId, status: 'ACTIVE' } } },
        _count: { _all: true },
      }),
      this.prisma.managerReview.findMany({
        where: { managerId, isHidden: false },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          owner: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      id: manager.id,
      firstName: manager.firstName,
      lastName: manager.lastName,
      city: manager.city,
      memberSince: manager.createdAt,
      zonesOfIntervention: manager.managerProfile?.zonesOfIntervention ?? [],
      pricingNote: manager.managerProfile?.pricingNote ?? null,
      ratingAverage: manager.managerProfile?.ratingAverage ?? 0,
      ratingCount: manager.managerProfile?.ratingCount ?? 0,
      portfolio: {
        totalManagedProperties: byType.reduce((sum, row) => sum + row._count._all, 0),
        byType: byType.map((row) => ({ type: row.type, count: row._count._all })),
      },
      // Jamais le nom de famille complet d'un propriétaire sur une page
      // publique — seule l'initiale, même réflexe que les avis grand public
      // habituels (Google/Airbnb).
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        ownerName: `${r.owner.firstName} ${r.owner.lastName.charAt(0)}.`,
      })),
    };
  }

  private async getReviewOrThrow(id: string): Promise<ManagerReview> {
    const review = await this.prisma.managerReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Avis introuvable');
    return review;
  }

  private async recomputeRating(tx: Prisma.TransactionClient, managerId: string): Promise<void> {
    const aggregate = await tx.managerReview.aggregate({
      where: { managerId, isHidden: false },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await tx.managerProfile.update({
      where: { userId: managerId },
      data: {
        ratingAverage: aggregate._avg.rating ?? 0,
        ratingCount: aggregate._count._all,
      },
    });
  }
}
