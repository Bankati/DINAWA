import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeaseStatus,
  PaymentFrequency,
  Prisma,
  Property,
  TenantPropertyBlock,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { canActOnProperty } from '../../common/permissions/property-access';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { BlockTenantDto } from './dto/block-tenant.dto';
import { LeaseHistoryQueryDto } from './dto/lease-history-query.dto';

export type LeaseHistoryEntry = {
  id: string;
  propertyId: string;
  property: { id: string; address: string; neighborhood: string; city: string };
  tenantUserId: string;
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  };
  monthlyRent: number;
  monthlyCharges: number;
  paymentFrequency: PaymentFrequency;
  startDate: Date;
  endDate: Date | null;
  securityDeposit: number;
  status: LeaseStatus;
  terminatedAt: Date | null;
  terminationReason: string | null;
  createdAt: Date;
};

export type PaginatedLeaseHistory = {
  data: LeaseHistoryEntry[];
  page: number;
  limit: number;
  total: number;
};

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  // Blocage scopé à (propertyId, tenantUserId) — voir /architect unité 14.
  // Jamais global au compte, jamais à l'échelle du propriétaire. Refusé si
  // un bail non résilié existe encore entre ce locataire et ce bien (ACTIVE
  // ou EXPIRED — seul TERMINATED signifie que le locataire a formellement
  // quitté le bien, voir /review unité 14) : il faut le résilier d'abord
  // (unité 15), pour éviter de bloquer quelqu'un qui y vit potentiellement
  // encore.
  async blockTenant(
    user: AuthenticatedUser,
    propertyId: string,
    tenantUserId: string,
    dto: BlockTenantDto,
  ): Promise<TenantPropertyBlock> {
    const property = await this.getPropertyOrThrow(propertyId);
    const access = await canActOnProperty(this.prisma, user, property);
    if (!access.canMutate) throw new ForbiddenException('Accès refusé à ce bien');

    const tenant = await this.prisma.user.findUnique({ where: { id: tenantUserId } });
    if (!tenant || tenant.role !== 'TENANT') {
      throw new NotFoundException('Locataire introuvable');
    }

    const unterminatedLease = await this.prisma.lease.findFirst({
      where: { propertyId, tenantUserId, status: { in: ['ACTIVE', 'EXPIRED'] } },
    });
    if (unterminatedLease) {
      throw new ConflictException(
        "Impossible de bloquer ce locataire — un bail non résilié existe encore sur ce bien, résiliez-le d'abord",
      );
    }

    const alreadyBlocked = await this.prisma.tenantPropertyBlock.findUnique({
      where: { propertyId_tenantUserId: { propertyId, tenantUserId } },
    });
    if (alreadyBlocked) {
      throw new ConflictException('Ce locataire est déjà bloqué pour ce bien');
    }

    // La vérification ci-dessus ne protège pas contre deux appels
    // concurrents sur le même couple (propertyId, tenantUserId) — la
    // contrainte @@unique en base est la vraie garantie (voir
    // code-standards.md, "deux locataires invités simultanément sur le même
    // bien" — même principe). Le P2002 qui en résulterait ici est capturé et
    // remappé en 409 propre, jamais un 500 brut (voir /review unité 14).
    try {
      return await this.prisma.tenantPropertyBlock.create({
        data: {
          propertyId,
          tenantUserId,
          blockedByUserId: user.id,
          reason: dto.reason,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ce locataire est déjà bloqué pour ce bien');
      }
      throw error;
    }
  }

  // Historique des baux d'un bien — aucun bilan financier pour l'instant
  // (module Payment pas encore construit, voir /architect unité 14) : la
  // forme de réponse est pensée pour accueillir ces données plus tard sans
  // rupture de contrat, jamais de valeurs à zéro simulées aujourd'hui.
  async getPropertyTenantsHistory(
    user: AuthenticatedUser,
    propertyId: string,
    query: LeaseHistoryQueryDto,
  ): Promise<PaginatedLeaseHistory> {
    const property = await this.getPropertyOrThrow(propertyId);
    const access = await canActOnProperty(this.prisma, user, property);
    if (!access.canRead) throw new ForbiddenException('Accès refusé à ce bien');

    return this.paginateLeaseHistory({ propertyId }, query);
  }

  // Historique des baux d'un locataire, tous biens confondus — accessible
  // au locataire lui-même, à un admin (voient tout), ou à tout
  // propriétaire/gestionnaire ayant eu au moins un bail (actif ou passé)
  // avec ce locataire — mais uniquement SES propres baux avec lui, jamais
  // ceux liés à un propriétaire tiers sans aucun rapport (voir /review
  // unité 14 : la relation est un filtre sur la requête elle-même, pas une
  // simple porte d'entrée tout-ou-rien — même principe que
  // propertyVisibilityWhere()).
  async getTenantLeasesHistory(
    user: AuthenticatedUser,
    tenantUserId: string,
    query: LeaseHistoryQueryDto,
  ): Promise<PaginatedLeaseHistory> {
    const tenant = await this.prisma.user.findUnique({ where: { id: tenantUserId } });
    if (!tenant || tenant.role !== 'TENANT') {
      throw new NotFoundException('Locataire introuvable');
    }

    const isAdmin = user.role === 'ADMIN';
    const isSelf = user.id === tenantUserId;

    const relationFilter: Prisma.LeaseWhereInput = {
      OR: [{ ownerId: user.id }, { property: { mandates: { some: { managerId: user.id } } } }],
    };

    if (!isAdmin && !isSelf) {
      const hasRelation = await this.prisma.lease.findFirst({
        where: { tenantUserId, ...relationFilter },
        select: { id: true },
      });
      if (!hasRelation) throw new ForbiddenException('Accès refusé à cet historique');
    }

    const where: Prisma.LeaseWhereInput = {
      tenantUserId,
      ...(isAdmin || isSelf ? {} : relationFilter),
    };

    return this.paginateLeaseHistory(where, query);
  }

  private async paginateLeaseHistory(
    where: Prisma.LeaseWhereInput,
    query: LeaseHistoryQueryDto,
  ): Promise<PaginatedLeaseHistory> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [leases, total] = await Promise.all([
      this.prisma.lease.findMany({
        where,
        include: {
          property: { select: { id: true, address: true, neighborhood: true, city: true } },
          tenant: {
            select: { id: true, firstName: true, lastName: true, phone: true, email: true },
          },
        },
        orderBy: { startDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lease.count({ where }),
    ]);

    const data: LeaseHistoryEntry[] = leases.map((lease) => ({
      id: lease.id,
      propertyId: lease.propertyId,
      property: lease.property,
      tenantUserId: lease.tenantUserId,
      tenant: lease.tenant,
      monthlyRent: lease.monthlyRent,
      monthlyCharges: lease.monthlyCharges,
      paymentFrequency: lease.paymentFrequency,
      startDate: lease.startDate,
      endDate: lease.endDate,
      securityDeposit: lease.securityDeposit,
      status: lease.status,
      terminatedAt: lease.terminatedAt,
      terminationReason: lease.terminationReason,
      createdAt: lease.createdAt,
    }));

    return { data, page, limit, total };
  }

  private async getPropertyOrThrow(id: string): Promise<Property> {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException('Bien introuvable');
    return property;
  }
}
