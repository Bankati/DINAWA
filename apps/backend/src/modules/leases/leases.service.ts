import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { addMonths, format } from 'date-fns';
import { Lease, PaymentFrequency, Prisma, Property } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { canActOnProperty } from '../../common/permissions/property-access';
import { assertTenantNotBlocked } from '../../common/permissions/tenant-block';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { NotifyService } from '../notify/notify.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { TerminateLeaseDto } from './dto/terminate-lease.dto';

// Nombre de mois couverts par une période selon la fréquence — voir
// build-plan.md unité 15 : "montant = (monthlyRent + monthlyCharges) ×
// nombreDeMoisDansLaPeriode".
const PERIOD_MONTHS: Record<PaymentFrequency, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  BIANNUAL: 6,
  ANNUAL: 12,
};

// Fenêtre initiale d'un bail ouvert (sans endDate) — voir /architect unité
// 15 : pas de cron dédié, la prolongation se fera à la demande (unité 16)
// en complétant les échéances manquantes jusqu'à 12 mois à partir
// d'aujourd'hui.
const ROLLING_WINDOW_MONTHS = 12;

type ScheduleEntryInput = Prisma.PaymentScheduleEntryCreateManyInput;

@Injectable()
export class LeasesService {
  private readonly logger = new Logger(LeasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
  ) {}

  // Le bien passe à OCCUPIED et les échéances sont générées dans la même
  // transaction que la création du bail (voir code-standards.md, exemple
  // explicite de cas nécessitant `$transaction`). La contrainte "un seul
  // Lease ACTIVE par locataire" (déjà en base depuis l'unité 02) est
  // capturée en 409 propre, jamais un 500 brut — même réflexe que le
  // blocage locataire (unité 14).
  async create(user: AuthenticatedUser, dto: CreateLeaseDto): Promise<Lease> {
    const property = await this.getPropertyOrThrow(dto.propertyId);
    const access = await canActOnProperty(this.prisma, user, property);
    if (!access.canMutate) throw new ForbiddenException('Accès refusé à ce bien');

    const tenant = await this.prisma.user.findUnique({ where: { id: dto.tenantId } });
    if (!tenant || tenant.role !== 'TENANT') {
      throw new NotFoundException('Locataire introuvable');
    }

    // Referme le gap laissé ouvert à l'unité 14 : sans cette vérification,
    // un blocage locataire↔bien pouvait être contourné en créant
    // directement un bail avec un tenantId existant (voir /architect unité
    // 15).
    await assertTenantNotBlocked(this.prisma, dto.propertyId, dto.tenantId);

    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    const scheduleEndDate = endDate ?? addMonths(startDate, ROLLING_WINDOW_MONTHS);

    let lease: Lease;
    try {
      lease = await this.prisma.$transaction(async (tx) => {
        const created = await tx.lease.create({
          data: {
            propertyId: dto.propertyId,
            ownerId: property.ownerId,
            tenantUserId: dto.tenantId,
            monthlyRent: dto.monthlyRent,
            monthlyCharges: dto.monthlyCharges,
            paymentFrequency: dto.paymentFrequency,
            startDate,
            endDate,
            securityDeposit: dto.securityDeposit,
            depositReturnConditions: dto.depositReturnConditions,
            reminderDaysBefore: dto.reminderDaysBefore,
            overdueAlertWindowDays: dto.overdueAlertWindowDays,
          },
        });

        const entries = this.buildScheduleEntries(
          created.id,
          startDate,
          scheduleEndDate,
          dto.paymentFrequency,
          dto.monthlyRent,
          dto.monthlyCharges,
        );
        if (entries.length > 0) {
          await tx.paymentScheduleEntry.createMany({ data: entries });
        }

        // Jamais via PropertiesService.update() — le passage à OCCUPIED est
        // exclusivement piloté par la création d'un bail, PATCH /properties
        // le refuse explicitement (voir assertValidTransition()).
        await tx.property.update({ where: { id: dto.propertyId }, data: { status: 'OCCUPIED' } });

        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          "Ce locataire a déjà un bail actif — un locataire ne peut avoir qu'un seul bail actif à la fois",
        );
      }
      throw error;
    }

    // Événement métier, jamais un email direct (voir architecture.md,
    // invariant #7 — l'exception ne couvre que les emails d'authentification).
    // Une notification manquée (locataire sans email/push actif) ne doit
    // jamais faire échouer la création du bail elle-même.
    try {
      await this.notify.notifyUser({
        userId: dto.tenantId,
        event: 'lease-created',
        variables: {
          propertyAddress: property.address,
          ownerName: `${user.firstName} ${user.lastName}`,
          startDate: format(startDate, 'dd/MM/yyyy'),
          monthlyAmount: dto.monthlyRent + dto.monthlyCharges,
        },
      });
    } catch (error) {
      this.logger.error(`[lease-created] notification échouée pour tenant=${dto.tenantId}`, error);
    }

    return lease;
  }

  // Libère le bien et purge les échéances futures jamais touchées par un
  // paiement — évite de laisser des PENDING fantômes sur un bail résilié
  // (voir /architect unité 15). Les échéances passées ou en cours restent
  // intactes, y compris celles avec un paiement partiel : les quittances
  // passées doivent rester générables à la volée (build-plan.md unité 15).
  async terminate(user: AuthenticatedUser, id: string, dto: TerminateLeaseDto): Promise<Lease> {
    const lease = await this.getLeaseOrThrow(id);
    const property = await this.getPropertyOrThrow(lease.propertyId);
    const access = await canActOnProperty(this.prisma, user, property);
    if (!access.canMutate) throw new ForbiddenException('Accès refusé à ce bien');

    if (lease.status === 'TERMINATED') {
      throw new ConflictException('Ce bail est déjà résilié');
    }

    const terminatedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lease.update({
        where: { id },
        data: { status: 'TERMINATED', terminatedAt, terminationReason: dto.terminationReason },
      });

      await tx.paymentScheduleEntry.deleteMany({
        where: { leaseId: id, periodStart: { gte: terminatedAt }, payments: { none: {} } },
      });

      await tx.property.update({ where: { id: lease.propertyId }, data: { status: 'VACANT' } });

      return updated;
    });
  }

  // Pas de prorata sur la première période même si `startDate` ne tombe pas
  // en début de mois calendaire — le build-plan ne mentionne aucune règle
  // de prorata, chaque période court une durée pleine à partir de
  // `startDate` (voir /architect unité 15). `dueDate` = début de période :
  // le loyer est dû au début de chaque période, pas à la fin.
  private buildScheduleEntries(
    leaseId: string,
    startDate: Date,
    scheduleEndDate: Date,
    frequency: PaymentFrequency,
    monthlyRent: number,
    monthlyCharges: number,
  ): ScheduleEntryInput[] {
    const periodMonths = PERIOD_MONTHS[frequency];
    const expectedAmount = (monthlyRent + monthlyCharges) * periodMonths;

    const entries: ScheduleEntryInput[] = [];
    let periodStart = startDate;
    while (periodStart < scheduleEndDate) {
      const periodEnd = addMonths(periodStart, periodMonths);
      entries.push({
        leaseId,
        periodStart,
        periodEnd,
        dueDate: periodStart,
        expectedAmount,
      });
      periodStart = periodEnd;
    }

    return entries;
  }

  private async getPropertyOrThrow(id: string): Promise<Property> {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException('Bien introuvable');
    return property;
  }

  private async getLeaseOrThrow(id: string): Promise<Lease> {
    const lease = await this.prisma.lease.findUnique({ where: { id } });
    if (!lease) throw new NotFoundException('Bail introuvable');
    return lease;
  }
}
