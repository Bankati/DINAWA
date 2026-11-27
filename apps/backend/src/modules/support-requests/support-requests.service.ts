import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SupportRequest, SupportRequestStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotifyService } from '../notify/notify.service';
import { compressPhoto } from '../storage/image-processor';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import {
  canActOnProperty,
  propertyVisibilityWhere,
  resolveResponsibleUserId,
} from '../../common/permissions/property-access';
import { formatPropertyLocation } from '../../common/utils/format-property-location';
import { toWhatsappNumber } from '../../common/utils/phone';
import {
  MAX_OPEN_SUPPORT_REQUESTS_PER_TENANT,
  MAX_PHOTOS_PER_SUPPORT_REQUEST,
} from '../../common/constants';
import { supportReference } from '../artisans/artisan-utils';
import { tradeLabel } from '../artisans/artisan-trades';
import {
  AssignArtisanDto,
  CreateSupportRequestDto,
  ListSupportRequestsQueryDto,
  ReviewArtisanDto,
  UpdateSupportRequestStatusDto,
} from './dto/support-request.dto';
import {
  PaginatedSupportRequests,
  SupportRequestDetail,
  SupportRequestSummary,
} from './support-requests.types';

// Les photos des pannes vont dans le bucket privé des photos de biens, sous
// un dossier dédié : pas de nouveau bucket à créer côté Supabase. Accès
// uniquement par URL signée 15 min (invariant #19).
const PHOTO_BUCKET = 'property-photos' as const;
const photoPath = (requestId: string): string => `support-requests/${requestId}/${randomUUID()}.webp`;

const OPEN_STATUSES: SupportRequestStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS'];

// Transitions décidées par le responsable : état visé → états de départ.
const ALLOWED_FROM: Record<'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED', SupportRequestStatus[]> = {
  IN_PROGRESS: ['ASSIGNED'],
  RESOLVED: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'],
  CANCELLED: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'],
};

const DETAIL_INCLUDE = {
  property: true,
  tenant: { select: { firstName: true, lastName: true, phone: true } },
  artisan: { select: { id: true, displayName: true, phone: true, trades: true, verifiedAt: true } },
  photos: { orderBy: { position: 'asc' }, select: { id: true, storagePath: true } },
  review: { select: { rating: true, comment: true, createdAt: true } },
  _count: { select: { photos: true } },
} satisfies Prisma.SupportRequestInclude;

type DetailRow = Prisma.SupportRequestGetPayload<{ include: typeof DETAIL_INCLUDE }>;

const SUMMARY_INCLUDE = {
  property: { select: { id: true, address: true, neighborhood: true, city: true } },
  tenant: { select: { firstName: true, lastName: true } },
  artisan: { select: { id: true, displayName: true, phone: true, trades: true, verifiedAt: true } },
  _count: { select: { photos: true } },
} satisfies Prisma.SupportRequestInclude;

type SummaryRow = Prisma.SupportRequestGetPayload<{ include: typeof SUMMARY_INCLUDE }>;

// Pannes (Phase 13, unité 53 = unité 39 « signalements » construite avec
// les artisans ; unité 54 pour les avis). Toute action du responsable passe
// par canActOnProperty() (invariant #2) ; les notifications par
// NotifyService (invariant #6).
@Injectable()
export class SupportRequestsService {
  private readonly logger = new Logger(SupportRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notify: NotifyService,
  ) {}

  // ── Locataire ────────────────────────────────────────────────────────

  async createForTenant(
    user: AuthenticatedUser,
    dto: CreateSupportRequestDto,
    files: Express.Multer.File[] = [],
  ): Promise<SupportRequestDetail> {
    if (files.length > MAX_PHOTOS_PER_SUPPORT_REQUEST) {
      throw new BadRequestException(`${MAX_PHOTOS_PER_SUPPORT_REQUEST} photos au plus`);
    }
    const lease = await this.prisma.lease.findFirst({
      where: { tenantUserId: user.id, status: 'ACTIVE' },
      include: { property: true },
    });
    if (!lease) throw new ConflictException("Vous n'avez pas de bail actif : impossible de signaler une panne.");

    const openCount = await this.prisma.supportRequest.count({
      where: { tenantUserId: user.id, status: { in: OPEN_STATUSES } },
    });
    if (openCount >= MAX_OPEN_SUPPORT_REQUESTS_PER_TENANT) {
      throw new ConflictException(
        `Vous avez déjà ${openCount} pannes en cours : attendez qu'elles soient traitées.`,
      );
    }

    // Photos compressées AVANT de créer la panne : une photo illisible
    // refuse le signalement entier, sans ligne à moitié créée.
    const compressed: Buffer[] = [];
    for (const file of files) {
      try {
        compressed.push(await compressPhoto(file.buffer));
      } catch {
        throw new BadRequestException(`Photo invalide ou corrompue (${file.originalname})`);
      }
    }

    const request = await this.createWithReference({
      propertyId: lease.propertyId,
      leaseId: lease.id,
      tenantUserId: user.id,
      channel: 'WEB',
      description: dto.description,
      trade: dto.trade ?? null,
      urgency: dto.urgency ?? 'NORMAL',
    });

    // Les photos déjà envoyées restent si une suivante échoue : la panne
    // existe, le locataire peut en parler au responsable.
    for (const [position, buffer] of compressed.entries()) {
      const storagePath = photoPath(request.id);
      try {
        await this.storage.upload(PHOTO_BUCKET, storagePath, buffer, 'image/webp');
        await this.prisma.supportRequestPhoto.create({
          data: { supportRequestId: request.id, storagePath, position },
        });
      } catch (error) {
        this.logger.error(`[support-requests] photo ${position} non enregistrée pour ${request.reference}`, error);
      }
    }

    await this.safeNotify(async () => {
      const responsibleUserId = await resolveResponsibleUserId(this.prisma, lease.property);
      await this.notify.notifyUser({
        userId: responsibleUserId,
        event: 'support-request-created',
        variables: {
          tenantName: `${user.firstName} ${user.lastName}`.trim(),
          propertyAddress: formatPropertyLocation(lease.property),
          reference: request.reference,
          tradeLabel: tradeLabel(request.trade),
          urgency: request.urgency,
          description: request.description,
        },
      });
    }, request.reference);

    return this.getForTenant(user, request.id);
  }

  async listForTenant(
    user: AuthenticatedUser,
    query: ListSupportRequestsQueryDto,
  ): Promise<PaginatedSupportRequests> {
    return this.paginate({ tenantUserId: user.id, ...(query.status ? { status: query.status } : {}) }, query);
  }

  async getForTenant(user: AuthenticatedUser, id: string): Promise<SupportRequestDetail> {
    const row = await this.prisma.supportRequest.findFirst({
      where: { id, tenantUserId: user.id },
      include: DETAIL_INCLUDE,
    });
    if (!row) throw new NotFoundException('Panne introuvable');
    return this.toDetail(row, false);
  }

  async cancelForTenant(user: AuthenticatedUser, id: string): Promise<SupportRequestDetail> {
    const { count } = await this.prisma.supportRequest.updateMany({
      where: { id, tenantUserId: user.id, status: { in: ['OPEN', 'ASSIGNED'] } },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    if (count === 0) {
      await this.getForTenant(user, id); // 404 si elle n'est pas à lui
      throw new ConflictException('Cette panne est déjà en cours de réparation ou terminée.');
    }
    return this.getForTenant(user, id);
  }

  // ── Responsable du bien (propriétaire, gestionnaire mandaté, admin) ──

  async list(user: AuthenticatedUser, query: ListSupportRequestsQueryDto): Promise<PaginatedSupportRequests> {
    return this.paginate(
      {
        property: propertyVisibilityWhere(user),
        ...(query.status ? { status: query.status } : {}),
        ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      },
      query,
    );
  }

  async get(user: AuthenticatedUser, id: string): Promise<SupportRequestDetail> {
    const row = await this.getRowOrThrow(id);
    const access = await canActOnProperty(this.prisma, user, row.property);
    if (!access.canRead) throw new ForbiddenException('Accès refusé à ce bien');
    return this.toDetail(row, access.canMutate);
  }

  // Choisir (ou changer) l'artisan tant que la réparation n'a pas commencé.
  // L'artisan doit être dans le carnet de l'utilisateur ou dans l'annuaire.
  async assign(user: AuthenticatedUser, id: string, dto: AssignArtisanDto): Promise<SupportRequestDetail> {
    const row = await this.getRowOrThrow(id);
    await this.assertCanMutate(user, row);

    const artisan = await this.prisma.artisan.findFirst({
      where: {
        id: dto.artisanId,
        directoryStatus: { not: 'SUSPENDED' },
        OR: [{ directoryStatus: 'PUBLIC' }, { contacts: { some: { userId: user.id } } }],
      },
      select: { id: true, displayName: true, phone: true },
    });
    if (!artisan) throw new NotFoundException('Artisan introuvable dans votre carnet ou dans l’annuaire');

    const { count } = await this.prisma.supportRequest.updateMany({
      where: { id, status: { in: ['OPEN', 'ASSIGNED'] } },
      data: { artisanId: artisan.id, status: 'ASSIGNED', assignedAt: new Date(), assignedById: user.id },
    });
    if (count === 0) throw new ConflictException('La réparation a déjà commencé ou la panne est close.');

    await this.safeNotify(
      () =>
        this.notify.notifyUser({
          userId: row.tenantUserId,
          event: 'support-request-assigned',
          variables: {
            reference: row.reference,
            artisanName: artisan.displayName,
            artisanPhone: artisan.phone,
            propertyAddress: formatPropertyLocation(row.property),
          },
        }),
      row.reference,
    );
    return this.get(user, id);
  }

  async updateStatus(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateSupportRequestStatusDto,
  ): Promise<SupportRequestDetail> {
    const row = await this.getRowOrThrow(id);
    await this.assertCanMutate(user, row);

    const now = new Date();
    const data: Prisma.SupportRequestUpdateManyMutationInput = { status: dto.status };
    if (dto.status === 'IN_PROGRESS') data.startedAt = now;
    if (dto.status === 'CANCELLED') data.cancelledAt = now;
    if (dto.status === 'RESOLVED') {
      data.resolvedAt = now;
      data.costAmount = dto.costAmount ?? null;
      data.costPaidBy = dto.costAmount ? (dto.costPaidBy ?? 'OWNER') : null;
    }
    if (dto.note !== undefined) data.resolutionNote = dto.note || null;

    const { count } = await this.prisma.supportRequest.updateMany({
      where: { id, status: { in: ALLOWED_FROM[dto.status] } },
      data,
    });
    if (count === 0) {
      throw new ConflictException(
        dto.status === 'IN_PROGRESS'
          ? "Choisissez d'abord un artisan."
          : 'Cette panne est déjà close.',
      );
    }

    if (dto.status === 'RESOLVED') {
      await this.safeNotify(
        () =>
          this.notify.notifyUser({
            userId: row.tenantUserId,
            event: 'support-request-resolved',
            variables: { reference: row.reference, propertyAddress: formatPropertyLocation(row.property) },
          }),
        row.reference,
      );
    }
    return this.get(user, id);
  }

  // Un avis par panne terminée, par le responsable du bien (unité 54).
  async review(user: AuthenticatedUser, id: string, dto: ReviewArtisanDto): Promise<SupportRequestDetail> {
    const row = await this.getRowOrThrow(id);
    const access = await canActOnProperty(this.prisma, user, row.property);
    if (!access.canRead || (!access.isOwner && !access.isMandatedManager)) {
      throw new ForbiddenException('Seul le propriétaire ou le gestionnaire du bien peut noter l’artisan');
    }
    if (row.status !== 'RESOLVED' || !row.artisanId) {
      throw new ConflictException("On ne note un artisan qu'après une réparation terminée.");
    }
    const artisanId = row.artisanId;

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.artisanReview.create({
          data: {
            artisanId,
            authorId: user.id,
            supportRequestId: id,
            rating: dto.rating,
            comment: dto.comment || null,
          },
        });
        await recomputeArtisanRating(tx, artisanId);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Cette intervention a déjà été notée.');
      }
      throw error;
    }
    return this.get(user, id);
  }

  // Modération admin d'un avis (masqué = exclu de la note moyenne).
  async setReviewHidden(reviewId: string, isHidden: boolean): Promise<{ id: string; isHidden: boolean }> {
    const review = await this.prisma.artisanReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Avis introuvable');
    await this.prisma.$transaction(async (tx) => {
      await tx.artisanReview.update({ where: { id: reviewId }, data: { isHidden } });
      await recomputeArtisanRating(tx, review.artisanId);
    });
    return { id: reviewId, isHidden };
  }

  // ── Interne ──────────────────────────────────────────────────────────

  private async paginate(
    where: Prisma.SupportRequestWhereInput,
    query: ListSupportRequestsQueryDto,
  ): Promise<PaginatedSupportRequests> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [rows, total] = await Promise.all([
      this.prisma.supportRequest.findMany({
        where,
        include: SUMMARY_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supportRequest.count({ where }),
    ]);
    return { data: rows.map(toSummary), page, limit, total };
  }

  // La référence est tirée au hasard : on réessaie sur collision (rare).
  private async createWithReference(
    data: Omit<Prisma.SupportRequestUncheckedCreateInput, 'reference'>,
  ): Promise<SupportRequest> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await this.prisma.supportRequest.create({ data: { ...data, reference: supportReference() } });
      } catch (error) {
        const target = (error as Prisma.PrismaClientKnownRequestError).meta?.['target'];
        const onReference = Array.isArray(target)
          ? target.includes('reference')
          : typeof target === 'string' && target.includes('reference');
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && onReference)) {
          throw error;
        }
      }
    }
    throw new ConflictException('Réessayez dans un instant.');
  }

  private async getRowOrThrow(id: string): Promise<DetailRow> {
    const row = await this.prisma.supportRequest.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!row) throw new NotFoundException('Panne introuvable');
    return row;
  }

  private async assertCanMutate(user: AuthenticatedUser, row: DetailRow): Promise<void> {
    const access = await canActOnProperty(this.prisma, user, row.property);
    if (!access.canMutate) {
      throw new ForbiddenException(
        access.canRead
          ? 'Ce bien est confié à un gestionnaire : c’est lui qui traite les pannes.'
          : 'Accès refusé à ce bien',
      );
    }
  }

  // Une notification ratée ne doit jamais annuler l'action déjà faite.
  private async safeNotify(send: () => Promise<void>, reference: string): Promise<void> {
    try {
      await send();
    } catch (error) {
      this.logger.error(`[support-requests] notification échouée pour ${reference}`, error);
    }
  }

  private async toDetail(row: DetailRow, canManage: boolean): Promise<SupportRequestDetail> {
    const urlMap = await this.storage
      .getSignedUrls(PHOTO_BUCKET, row.photos.map((p) => p.storagePath))
      .catch(() => new Map<string, string>());
    return {
      ...toSummary(row),
      tenantPhone: row.tenant.phone,
      photos: row.photos.map((p) => ({ id: p.id, url: urlMap.get(p.storagePath) ?? '' })),
      startedAt: row.startedAt,
      cancelledAt: row.cancelledAt,
      costAmount: row.costAmount,
      costPaidBy: row.costPaidBy,
      resolutionNote: row.resolutionNote,
      review: row.review,
      canManage,
      artisanWhatsappUrl: canManage ? artisanWhatsappUrl(row) : null,
    };
  }
}

function toSummary(row: SummaryRow | DetailRow): SupportRequestSummary {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    urgency: row.urgency,
    channel: row.channel,
    trade: row.trade,
    description: row.description,
    property: { id: row.property.id, label: formatPropertyLocation(row.property) },
    tenantName: `${row.tenant.firstName} ${row.tenant.lastName}`.trim(),
    artisan: row.artisan
      ? {
          id: row.artisan.id,
          displayName: row.artisan.displayName,
          phone: row.artisan.phone,
          trades: row.artisan.trades,
          verified: row.artisan.verifiedAt !== null,
        }
      : null,
    photosCount: row._count.photos,
    createdAt: row.createdAt,
    assignedAt: row.assignedAt,
    resolvedAt: row.resolvedAt,
  };
}

// Message prérempli que le responsable envoie à l'artisan depuis SON
// WhatsApp (WARAH n'écrit pas en premier à un artisan, règle Meta).
function artisanWhatsappUrl(row: DetailRow): string | null {
  if (!row.artisan || !['ASSIGNED', 'IN_PROGRESS'].includes(row.status)) return null;
  const number = toWhatsappNumber(row.artisan.phone);
  if (!number) return null;
  const tenant = `${row.tenant.firstName} ${row.tenant.lastName}`.trim();
  const lines = [
    `Bonjour ${row.artisan.displayName}, j'ai besoin de vous pour une intervention (${tradeLabel(row.trade)}).`,
    `Lieu : ${formatPropertyLocation(row.property)}`,
    `Problème : ${row.description}`,
    `Locataire : ${tenant}${row.tenant.phone ? ` — ${row.tenant.phone}` : ''}`,
    `Référence WARAH : ${row.reference}`,
  ];
  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`;
}

// Note moyenne recalculée dans la même transaction que l'avis (avis
// masqués exclus), comme pour les gestionnaires.
async function recomputeArtisanRating(tx: Prisma.TransactionClient, artisanId: string): Promise<void> {
  const aggregate = await tx.artisanReview.aggregate({
    where: { artisanId, isHidden: false },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await tx.artisan.update({
    where: { id: artisanId },
    data: { ratingAverage: aggregate._avg.rating ?? 0, ratingCount: aggregate._count._all },
  });
}
