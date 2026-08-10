import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { format } from 'date-fns';
import { Mandate, MandateFeeType, MandateStatus, Prisma, Property, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AccountActivationService } from '../account/account-activation.service';
import { NotifyService } from '../notify/notify.service';
import { CreateMandateDto } from './dto/create-mandate.dto';
import { RevokeMandateDto } from './dto/revoke-mandate.dto';
import { SearchManagerQueryDto } from './dto/search-manager-query.dto';

export interface ManagerSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export type MandateWithProperty = Mandate & { property: Property };

export interface MandatePartySummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

// Utilisé par GET /mandates (findAllForUser) — visible aux deux parties, qui
// ont chacune besoin de l'identité de l'autre (le propriétaire pour afficher
// son gestionnaire dans dashboard/delegation, le gestionnaire pour afficher
// le propriétaire mandant dans gestionnaire/dashboard et /portefeuille).
export type MandateWithParties = MandateWithProperty & {
  owner: MandatePartySummary;
  manager: MandatePartySummary;
};

// Gestion des liens propriétaire ↔ gestionnaire ↔ bien (voir build-plan.md
// unité 31). canActOnProperty()/resolveResponsibleUserId() (property-access.ts)
// lisent déjà les mandats ACTIVE — ce service ne fait que produire/modifier
// les lignes Mandate, jamais de vérification d'accès dupliquée ici pour les
// opérations *sur les biens eux-mêmes* (ça reste l'autorité des services
// biens/baux/paiements).
@Injectable()
export class MandatesService {
  private readonly logger = new Logger(MandatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountActivation: AccountActivationService,
    private readonly notify: NotifyService,
  ) {}

  // Un mandat est toujours créé par le propriétaire réel des biens listés
  // (Property.ownerId === user.id) — jamais par un gestionnaire agissant sur
  // un bien qu'il gère seulement via un mandat existant (voir /architect
  // unité 31, « un mandat est créé par un propriétaire »). Tout ou rien :
  // si un seul bien de la liste échoue une vérification, aucun mandat n'est
  // créé pour les autres.
  async create(user: AuthenticatedUser, dto: CreateMandateDto): Promise<MandateWithProperty[]> {
    if (dto.managerId === user.id) {
      throw new ForbiddenException('Impossible de se mandater soi-même');
    }
    if (dto.feeType === MandateFeeType.PERCENTAGE && dto.feeValue > 100) {
      throw new BadRequestException('Un pourcentage ne peut pas dépasser 100');
    }

    const manager = await this.prisma.user.findUnique({ where: { id: dto.managerId } });
    if (!manager || manager.role !== UserRole.MANAGER) {
      throw new NotFoundException('Gestionnaire introuvable');
    }
    if (manager.accountStatus === 'SUSPENDED_ADMIN') {
      throw new ConflictException('Ce gestionnaire ne peut pas recevoir de nouveau mandat');
    }

    // Dédupliqué avant toute vérification — sinon un doublon dans le
    // tableau fait échouer le comptage ci-dessous avec un message trompeur
    // ("bien introuvable") alors que le vrai souci est un ID répété.
    const propertyIds = [...new Set(dto.propertyIds)];

    const properties = await this.prisma.property.findMany({
      where: { id: { in: propertyIds } },
    });
    if (properties.length !== propertyIds.length) {
      throw new NotFoundException('Un ou plusieurs biens sont introuvables');
    }
    for (const property of properties) {
      if (property.ownerId !== user.id) {
        throw new ForbiddenException('Vous ne pouvez mandater que vos propres biens');
      }
    }

    const activeMandateCount = await this.prisma.mandate.count({
      where: { propertyId: { in: propertyIds }, status: MandateStatus.ACTIVE },
    });
    if (activeMandateCount > 0) {
      throw new ConflictException('Un ou plusieurs biens ont déjà un gestionnaire mandaté actif');
    }

    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (endDate && endDate <= startDate) {
      throw new BadRequestException('endDate doit être postérieure à startDate');
    }

    // Créations séquentielles, jamais en parallèle sur le même client `tx` —
    // une transaction interactive Prisma tient une connexion unique, des
    // requêtes concurrentes dessus (Promise.all) ont un comportement non
    // garanti (voir /review unité 31). Même principe que partout ailleurs
    // dans le projet (ex. createMany dans auth.service.ts).
    const mandates = await this.prisma.$transaction(async (tx) => {
      const created: MandateWithProperty[] = [];
      for (const property of properties) {
        created.push(
          await tx.mandate.create({
            data: {
              propertyId: property.id,
              ownerId: user.id,
              managerId: manager.id,
              feeType: dto.feeType,
              feeValue: dto.feeValue,
              startDate,
              endDate,
            },
            include: { property: true },
          }),
        );
      }
      return created;
    });

    try {
      await this.notify.notifyUser({
        userId: manager.id,
        event: 'mandate-created',
        variables: {
          ownerName: `${user.firstName} ${user.lastName}`,
          propertySummary: this.buildPropertySummary(properties),
          feeLabel: this.buildFeeLabel(dto.feeType, dto.feeValue),
          startDate: format(startDate, 'dd/MM/yyyy'),
        },
      });
    } catch (notifyError) {
      this.logger.error(
        `[mandate-created] notification échouée pour manager=${manager.id}`,
        notifyError,
      );
    }

    return mandates;
  }

  // Réservé au gestionnaire destinataire — le mandat ne devient ACTIVE
  // qu'après acceptation explicite (build-plan.md unité 31). Le controller
  // porte @AllowWhileSuspended() : c'est précisément cette action qui doit
  // pouvoir réactiver un compte SUSPENDED_INACTIVITY.
  async accept(user: AuthenticatedUser, mandateId: string): Promise<Mandate> {
    const mandate = await this.getMandateOrThrow(mandateId);
    if (mandate.managerId !== user.id) {
      throw new ForbiddenException('Ce mandat ne vous est pas destiné');
    }
    if (mandate.status !== MandateStatus.PENDING) {
      throw new ConflictException("Ce mandat n'est plus en attente");
    }

    let accepted: Mandate;
    try {
      accepted = await this.prisma.mandate.update({
        where: { id: mandateId },
        data: { status: MandateStatus.ACTIVE, acceptedAt: new Date() },
      });
    } catch (error) {
      // La vérification ci-dessus ne protège pas contre deux mandats PENDING
      // concurrents acceptés en même temps sur le même bien — la contrainte
      // unique partielle `mandates_property_active_unique` en base est la
      // vraie garantie. Le P2002 qui en résulterait est capturé et remappé
      // en 409 propre, jamais un 500 brut (même principe que /review unité 14).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ce bien a déjà un gestionnaire mandaté actif');
      }
      throw error;
    }

    // Fire-and-forget — la réactivation d'un compte SUSPENDED_INACTIVITY
    // n'affecte pas la réponse HTTP ; pas besoin de faire attendre l'appelant.
    this.accountActivation.reactivateIfEligible(user.id).catch(() => {});

    return accepted;
  }

  // Révocable à tout moment par le propriétaire ou le gestionnaire, avec
  // motif — sert aussi bien au refus d'un mandat PENDING (avant acceptation)
  // qu'à la révocation d'un mandat ACTIVE (build-plan.md unité 31).
  async revoke(
    user: AuthenticatedUser,
    mandateId: string,
    dto: RevokeMandateDto,
  ): Promise<Mandate> {
    const mandate = await this.getMandateOrThrow(mandateId);
    const isParty = mandate.ownerId === user.id || mandate.managerId === user.id;
    if (!isParty) {
      throw new ForbiddenException("Vous n'êtes pas partie à ce mandat");
    }
    if (mandate.status === MandateStatus.REVOKED || mandate.status === MandateStatus.EXPIRED) {
      throw new ConflictException('Ce mandat est déjà terminé');
    }

    return this.prisma.mandate.update({
      where: { id: mandateId },
      data: { status: MandateStatus.REVOKED, revokedAt: new Date(), revokedReason: dto.reason },
    });
  }

  // Pas décrit explicitement dans build-plan.md unité 31, mais nécessaire :
  // sans lister ses mandats, un gestionnaire n'a aucun moyen de découvrir un
  // mandat PENDING à accepter/refuser. Visible pour les deux parties.
  async findAllForUser(
    user: AuthenticatedUser,
    status?: MandateStatus,
  ): Promise<MandateWithParties[]> {
    const partySelect = { id: true, firstName: true, lastName: true, email: true, phone: true };
    return this.prisma.mandate.findMany({
      where: {
        OR: [{ ownerId: user.id }, { managerId: user.id }],
        ...(status ? { status } : {}),
      },
      include: { property: true, owner: { select: partySelect }, manager: { select: partySelect } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // GET /api/manager/portfolio — biens sous mandat actif du gestionnaire
  // connecté, distincts de ses propres biens (build-plan.md unité 31).
  async getManagerPortfolio(user: AuthenticatedUser): Promise<Property[]> {
    return this.prisma.property.findMany({
      where: { mandates: { some: { managerId: user.id, status: MandateStatus.ACTIVE } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // Permet à un propriétaire de retrouver le managerId d'un gestionnaire par
  // email ou téléphone exact, pour composer CreateMandateDto.managerId —
  // jamais d'annuaire complet, au plus une correspondance retournée.
  async searchManagers(query: SearchManagerQueryDto): Promise<ManagerSummary[]> {
    if (!query.email && !query.phone) {
      throw new BadRequestException('Fournir un email ou un téléphone');
    }

    const filters: Prisma.UserWhereInput[] = [];
    if (query.email) filters.push({ email: query.email });
    if (query.phone) filters.push({ phone: query.phone });

    const manager = await this.prisma.user.findFirst({
      where: { role: UserRole.MANAGER, OR: filters },
      select: { id: true, firstName: true, lastName: true },
    });

    return manager ? [manager] : [];
  }

  private async getMandateOrThrow(id: string): Promise<Mandate> {
    const mandate = await this.prisma.mandate.findUnique({ where: { id } });
    if (!mandate) throw new NotFoundException('Mandat introuvable');
    return mandate;
  }

  private buildPropertySummary(properties: Property[]): string {
    const [first, ...rest] = properties;
    if (rest.length === 0) return first.address;
    return `${first.address} et ${rest.length} autre${rest.length > 1 ? 's' : ''} bien${rest.length > 1 ? 's' : ''}`;
  }

  private buildFeeLabel(feeType: MandateFeeType, feeValue: number): string {
    return feeType === MandateFeeType.PERCENTAGE
      ? `${feeValue}% des loyers encaissés`
      : `${feeValue.toLocaleString('fr-FR')} FCFA / mois`;
  }
}
