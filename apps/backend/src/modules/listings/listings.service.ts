import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Listing, Prisma, PropertyType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { resolveResponsibleUserId } from '../../common/permissions/property-access';
import { ListPublicListingsQueryDto } from './dto/list-public-listings-query.dto';

export type PublicListingSummary = {
  id: string;
  slug: string;
  type: PropertyType;
  neighborhood: string;
  city: string;
  surfaceArea: number | null;
  roomsCount: number | null;
  monthlyRent: number;
  monthlyCharges: number;
  publishedAt: Date;
  photo: string | null;
};

export type PublicListingDetail = Omit<PublicListingSummary, 'photo'> & {
  address: string;
  description: string | null;
  photos: string[];
  contactName: string;
  contactPhone: string | null;
};

export type PaginatedPublicListings = {
  data: PublicListingSummary[];
  page: number;
  limit: number;
  total: number;
};

// Bien minimal requis pour publier une annonce — accepté en paramètre plutôt
// que le modèle Property complet, pour rester appelable depuis n'importe
// quel point d'accroche (PropertiesService.create(), LeasesService.terminate())
// sans dépendre de leur forme exacte de retour.
type PublishableProperty = { id: string; type: PropertyType; neighborhood: string };

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // Une nouvelle ligne à chaque publication — jamais de réactivation d'une
  // ancienne ligne (voir /architect module Annonces, 2026-07-28) : conserve
  // l'historique complet de toutes les périodes de publication d'un bien.
  // Toujours appelé à l'intérieur d'une transaction déjà ouverte par
  // l'appelant (même convention que AuthService.createLeaseWithinTransaction()).
  async publishForProperty(
    tx: Prisma.TransactionClient,
    property: PublishableProperty,
    publishedByUserId: string,
  ): Promise<Listing> {
    const slug = await this.generateUniqueSlug(tx, property);
    return tx.listing.create({
      data: {
        propertyId: property.id,
        publishedByUserId,
        slug,
        status: 'ACTIVE',
      },
    });
  }

  // Désactive la ligne active courante (il ne peut y en avoir qu'une par
  // bien à un instant donné, même si rien ne l'impose au niveau schéma —
  // garanti par construction : chaque publish désactive d'abord l'ancienne
  // via ce même appelant). updateMany plutôt que update : no-op silencieux
  // si aucune ligne ACTIVE (ex. bien jamais publié faute de photo/erreur
  // passée), jamais une 404 qui ferait échouer la transaction appelante.
  async deactivateForProperty(tx: Prisma.TransactionClient, propertyId: string): Promise<void> {
    await tx.listing.updateMany({
      where: { propertyId, status: 'ACTIVE' },
      data: { status: 'DISABLED', deactivatedAt: new Date() },
    });
  }

  async findAllPublic(query: ListPublicListingsQueryDto): Promise<PaginatedPublicListings> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ListingWhereInput = {
      status: 'ACTIVE',
      property: {
        ...(query.type ? { type: query.type } : {}),
        ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
        ...(query.neighborhood
          ? { neighborhood: { equals: query.neighborhood, mode: 'insensitive' } }
          : {}),
        ...(query.roomsCount !== undefined ? { roomsCount: query.roomsCount } : {}),
        ...(query.minRent !== undefined || query.maxRent !== undefined
          ? {
              monthlyRent: {
                ...(query.minRent !== undefined ? { gte: query.minRent } : {}),
                ...(query.maxRent !== undefined ? { lte: query.maxRent } : {}),
              },
            }
          : {}),
      },
    };

    const [raw, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          property: { include: { photos: { orderBy: { position: 'asc' }, take: 1 } } },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    const allPaths = raw.flatMap((l) => l.property.photos.map((p) => p.storagePath));
    const urlMap = await this.storage.getSignedUrls('property-photos', allPaths);

    const data: PublicListingSummary[] = raw.map((l) => ({
      id: l.id,
      slug: l.slug,
      type: l.property.type,
      neighborhood: l.property.neighborhood,
      city: l.property.city,
      surfaceArea: l.property.surfaceArea,
      roomsCount: l.property.roomsCount,
      monthlyRent: l.property.monthlyRent,
      monthlyCharges: l.property.monthlyCharges,
      publishedAt: l.publishedAt,
      photo: l.property.photos[0] ? (urlMap.get(l.property.photos[0].storagePath) ?? null) : null,
    }));

    return { data, page, limit, total };
  }

  // Une annonce désactivée/suspendue n'est jamais visible publiquement, même
  // avec le slug exact — 404 générique, pas de distinction "inexistante" vs
  // "plus disponible" (évite de renseigner un visiteur sur l'historique d'un bien).
  async findOnePublic(slug: string): Promise<PublicListingDetail> {
    const listing = await this.prisma.listing.findUnique({
      where: { slug },
      include: {
        property: {
          include: { photos: { orderBy: { position: 'asc' } }, owner: true },
        },
      },
    });
    if (!listing || listing.status !== 'ACTIVE') {
      throw new NotFoundException('Annonce introuvable');
    }

    const property = listing.property;
    const responsibleUserId = await resolveResponsibleUserId(this.prisma, property);
    const responsible = await this.prisma.user.findUnique({
      where: { id: responsibleUserId },
      select: { firstName: true, lastName: true, phone: true },
    });

    const paths = property.photos.map((p) => p.storagePath);
    const urlMap = await this.storage.getSignedUrls('property-photos', paths);

    return {
      id: listing.id,
      slug: listing.slug,
      type: property.type,
      neighborhood: property.neighborhood,
      city: property.city,
      address: property.address,
      surfaceArea: property.surfaceArea,
      roomsCount: property.roomsCount,
      monthlyRent: property.monthlyRent,
      monthlyCharges: property.monthlyCharges,
      description: property.description,
      publishedAt: listing.publishedAt,
      photos: property.photos.map((p) => urlMap.get(p.storagePath) ?? '').filter(Boolean),
      contactName: responsible ? `${responsible.firstName} ${responsible.lastName}` : 'WARAH',
      contactPhone: responsible?.phone ?? null,
    };
  }

  // Base lisible (quartier + type) + suffixe aléatoire — retry sur collision
  // improbable plutôt qu'une contrainte de format imposée par une maquette
  // (aucune fournie, voir /architect module Annonces).
  private async generateUniqueSlug(
    tx: Prisma.TransactionClient,
    property: PublishableProperty,
  ): Promise<string> {
    const base = slugify(`${property.neighborhood}-${property.type}`);
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `${base}-${randomSuffix()}`;
      const exists = await tx.listing.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    throw new InternalServerErrorException("Impossible de générer un slug unique pour l'annonce");
  }
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}
