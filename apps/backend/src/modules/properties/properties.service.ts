import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Property, PropertyDocumentType, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  canActOnProperty,
  propertyVisibilityWhere,
} from '../../common/permissions/property-access';
import { assertIdentityVerified } from '../../common/permissions/identity-verified';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { StorageService } from '../storage/storage.service';
import { compressPhoto } from '../storage/image-processor';
import { MAX_DOCUMENTS_PER_PROPERTY, MAX_PHOTOS_PER_PROPERTY } from '../../common/constants';
import { AccountActivationService } from '../account/account-activation.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { ListPropertiesQueryDto } from './dto/list-properties-query.dto';

export type PaginatedProperties = {
  data: Property[];
  page: number;
  limit: number;
  total: number;
};

export type PropertyPhotoResponse = {
  id: string;
  url: string;
  position: number;
};

export type PropertyWithPhotos = Property & { photos: PropertyPhotoResponse[] };

export type PropertyDocumentResponse = {
  id: string;
  type: PropertyDocumentType;
  url: string;
  createdAt: Date;
};

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountActivation: AccountActivationService,
    private readonly storage: StorageService,
  ) {}

  // `status` et `ownerId` ne viennent jamais du DTO — voir /architect unité
  // 12 : un bien démarre toujours VACANT, et n'appartient jamais qu'à
  // l'utilisateur authentifié.
  async create(user: AuthenticatedUser, dto: CreatePropertyDto): Promise<Property> {
    // CNI facultative à l'inscription (voir /architect révision inscription
    // owner/manager) — c'est ici, à la création du premier bien, que la
    // vérification devient bloquante.
    await assertIdentityVerified(this.prisma, user);

    const property = await this.prisma.property.create({
      data: {
        ownerId: user.id,
        type: dto.type,
        status: 'VACANT',
        address: dto.address,
        neighborhood: dto.neighborhood,
        city: dto.city,
        surfaceArea: dto.surfaceArea,
        roomsCount: dto.roomsCount,
        monthlyRent: dto.monthlyRent,
        monthlyCharges: dto.monthlyCharges ?? 0,
        description: dto.description,
      },
    });

    // Referme la dépendance laissée en suspens à l'étape 11 : un compte
    // SUSPENDED_INACTIVITY redevient ACTIVE dès qu'un bien est enregistré.
    await this.accountActivation.reactivateIfEligible(user.id);

    return property;
  }

  async findAll(
    user: AuthenticatedUser,
    query: ListPropertiesQueryDto,
  ): Promise<PaginatedProperties> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.PropertyWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      // Dérivé de canActOnProperty().canRead — voir propertyVisibilityWhere()
      // pour ne jamais dupliquer cette règle (voir /review unité 12).
      ...propertyVisibilityWhere(user),
    };

    const [data, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.property.count({ where }),
    ]);

    return { data, page, limit, total };
  }

  // Les photos sont embarquées ici (avec URLs signées) — pas de GET dédié
  // (voir /architect unité 13). GET /properties (la liste) n'embarque rien
  // pour rester légère (jusqu'à 10 URLs signées × N biens serait coûteux).
  async findOne(user: AuthenticatedUser, id: string): Promise<PropertyWithPhotos> {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: { photos: { orderBy: { position: 'asc' } } },
    });
    if (!property) throw new NotFoundException('Bien introuvable');

    const access = await canActOnProperty(this.prisma, user, property);
    if (!access.canRead) throw new ForbiddenException('Accès refusé à ce bien');

    const photos = await Promise.all(
      property.photos.map(async (photo) => ({
        id: photo.id,
        position: photo.position,
        url: await this.storage.getSignedUrl('property-photos', photo.storagePath),
      })),
    );

    return { ...property, photos };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdatePropertyDto): Promise<Property> {
    const property = await this.getPropertyOrThrow(id);
    const access = await canActOnProperty(this.prisma, user, property);
    if (!access.canMutate) throw new ForbiddenException('Accès refusé à ce bien');

    if (dto.status && dto.status !== property.status) {
      await this.assertValidTransition(property, dto.status);
    }

    return this.prisma.property.update({
      where: { id },
      data: {
        type: dto.type,
        status: dto.status,
        address: dto.address,
        neighborhood: dto.neighborhood,
        city: dto.city,
        surfaceArea: dto.surfaceArea,
        roomsCount: dto.roomsCount,
        monthlyRent: dto.monthlyRent,
        monthlyCharges: dto.monthlyCharges,
        description: dto.description,
      },
    });
  }

  // Archivage logique uniquement — jamais de suppression physique (voir
  // build-plan.md unité 12). Bloqué si un bail actif existe encore : la
  // traçabilité complète du bail (statut TERMINATED, jamais supprimé) reste
  // garantie par le schéma, mais son cycle de vie doit être clos avant
  // d'archiver le bien.
  async remove(user: AuthenticatedUser, id: string): Promise<Property> {
    const property = await this.getPropertyOrThrow(id);
    const access = await canActOnProperty(this.prisma, user, property);
    if (!access.canMutate) throw new ForbiddenException('Accès refusé à ce bien');

    const activeLease = await this.prisma.lease.findFirst({
      where: { propertyId: id, status: 'ACTIVE' },
    });
    if (activeLease) {
      throw new ConflictException(
        "Impossible d'archiver un bien avec un bail actif — résiliez le bail d'abord",
      );
    }

    return this.prisma.property.update({
      where: { id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    });
  }

  // Rejet total si le plafond serait dépassé — jamais d'acceptation
  // partielle silencieuse (voir /architect unité 13). Toutes les photos du
  // lot sont compressées avant la moindre écriture Storage/Prisma : une
  // photo corrompue au milieu du lot ne doit jamais laisser les précédentes
  // déjà en place (même famille de garde que ProfileService, étape 10).
  async addPhotos(
    user: AuthenticatedUser,
    propertyId: string,
    files: Express.Multer.File[],
  ): Promise<PropertyPhotoResponse[]> {
    if (!files || files.length === 0) throw new BadRequestException('Aucune photo fournie');

    const property = await this.getPropertyOrThrow(propertyId);
    const access = await canActOnProperty(this.prisma, user, property);
    if (!access.canMutate) throw new ForbiddenException('Accès refusé à ce bien');

    const existingCount = await this.prisma.propertyPhoto.count({ where: { propertyId } });
    if (existingCount + files.length > MAX_PHOTOS_PER_PROPERTY) {
      throw new BadRequestException(
        `Plafond de ${MAX_PHOTOS_PER_PROPERTY} photos par bien dépassé (${existingCount} déjà présentes)`,
      );
    }

    const compressed: Buffer[] = [];
    for (const file of files) {
      try {
        compressed.push(await compressPhoto(file.buffer));
      } catch {
        throw new BadRequestException(`Photo invalide ou corrompue (${file.originalname})`);
      }
    }

    const created: PropertyPhotoResponse[] = [];
    for (const [index, buffer] of compressed.entries()) {
      const storagePath = `${propertyId}/${randomUUID()}.webp`;
      await this.storage.upload('property-photos', storagePath, buffer, 'image/webp');

      const photo = await this.prisma.propertyPhoto.create({
        data: { propertyId, storagePath, position: existingCount + index },
      });

      created.push({
        id: photo.id,
        position: photo.position,
        url: await this.storage.getSignedUrl('property-photos', photo.storagePath),
      });
    }

    return created;
  }

  // Suppression Storage puis Prisma, jamais l'inverse — une ligne ne doit
  // jamais pointer vers un fichier déjà supprimé (voir /architect unité 13).
  async removePhoto(user: AuthenticatedUser, propertyId: string, photoId: string): Promise<void> {
    const property = await this.getPropertyOrThrow(propertyId);
    const access = await canActOnProperty(this.prisma, user, property);
    if (!access.canMutate) throw new ForbiddenException('Accès refusé à ce bien');

    const photo = await this.prisma.propertyPhoto.findUnique({ where: { id: photoId } });
    if (!photo || photo.propertyId !== propertyId) {
      throw new NotFoundException('Photo introuvable');
    }

    await this.storage.remove('property-photos', photo.storagePath);
    await this.prisma.propertyPhoto.delete({ where: { id: photoId } });
  }

  // Jamais de compression — un document (état des lieux, titre, assurance)
  // doit garder sa qualité d'origine, contrairement à une photo.
  async addDocuments(
    user: AuthenticatedUser,
    propertyId: string,
    type: PropertyDocumentType,
    files: Express.Multer.File[],
  ): Promise<PropertyDocumentResponse[]> {
    if (!files || files.length === 0) throw new BadRequestException('Aucun document fourni');

    const property = await this.getPropertyOrThrow(propertyId);
    const access = await canActOnProperty(this.prisma, user, property);
    if (!access.canMutate) throw new ForbiddenException('Accès refusé à ce bien');

    const existingCount = await this.prisma.propertyDocument.count({ where: { propertyId } });
    if (existingCount + files.length > MAX_DOCUMENTS_PER_PROPERTY) {
      throw new BadRequestException(
        `Plafond de ${MAX_DOCUMENTS_PER_PROPERTY} documents par bien dépassé (${existingCount} déjà présents)`,
      );
    }

    const created: PropertyDocumentResponse[] = [];
    for (const file of files) {
      const extension = file.mimetype.split('/')[1];
      const storagePath = `${propertyId}/${randomUUID()}.${extension}`;
      await this.storage.upload('property-documents', storagePath, file.buffer, file.mimetype);

      const document = await this.prisma.propertyDocument.create({
        data: { propertyId, type, storagePath },
      });

      created.push({
        id: document.id,
        type: document.type,
        createdAt: document.createdAt,
        url: await this.storage.getSignedUrl('property-documents', document.storagePath),
      });
    }

    return created;
  }

  // Toutes les URLs servies au client sont signées, jamais un chemin
  // Storage brut (voir architecture.md, invariant #19).
  async listDocuments(
    user: AuthenticatedUser,
    propertyId: string,
  ): Promise<PropertyDocumentResponse[]> {
    const property = await this.getPropertyOrThrow(propertyId);
    const access = await canActOnProperty(this.prisma, user, property);
    if (!access.canRead) throw new ForbiddenException('Accès refusé à ce bien');

    const documents = await this.prisma.propertyDocument.findMany({
      where: { propertyId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return Promise.all(
      documents.map(async (document) => ({
        id: document.id,
        type: document.type,
        createdAt: document.createdAt,
        url: await this.storage.getSignedUrl('property-documents', document.storagePath),
      })),
    );
  }

  async removeDocument(
    user: AuthenticatedUser,
    propertyId: string,
    documentId: string,
  ): Promise<void> {
    const property = await this.getPropertyOrThrow(propertyId);
    const access = await canActOnProperty(this.prisma, user, property);
    if (!access.canMutate) throw new ForbiddenException('Accès refusé à ce bien');

    const document = await this.prisma.propertyDocument.findUnique({ where: { id: documentId } });
    if (!document || document.propertyId !== propertyId) {
      throw new NotFoundException('Document introuvable');
    }

    await this.storage.remove('property-documents', document.storagePath);
    await this.prisma.propertyDocument.delete({ where: { id: documentId } });
  }

  private async getPropertyOrThrow(id: string): Promise<Property> {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException('Bien introuvable');
    return property;
  }

  // Seule autorité pour les transitions de statut (voir /architect unité
  // 12) — OCCUPIED est piloté exclusivement par LeasesService.create()
  // (unité 15), jamais via ce PATCH ; ARCHIVED n'est atteignable que via
  // remove().
  private async assertValidTransition(property: Property, next: PropertyStatus): Promise<void> {
    if (property.status === 'ARCHIVED') {
      throw new BadRequestException('Un bien archivé ne peut plus changer de statut');
    }
    if (next === 'ARCHIVED') {
      throw new BadRequestException('Utilisez DELETE /properties/:id pour archiver un bien');
    }
    if (next === 'OCCUPIED') {
      throw new BadRequestException(
        "Le statut OCCUPIED est déterminé automatiquement à la création d'un bail — voir POST /api/leases",
      );
    }
    if (property.status === 'OCCUPIED' && next === 'VACANT') {
      const activeLease = await this.prisma.lease.findFirst({
        where: { propertyId: property.id, status: 'ACTIVE' },
      });
      if (activeLease) {
        throw new BadRequestException(
          'Impossible de repasser en VACANT — un bail actif existe encore sur ce bien',
        );
      }
    }
  }
}
