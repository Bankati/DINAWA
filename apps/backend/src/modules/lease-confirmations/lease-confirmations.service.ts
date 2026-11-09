import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LeaseConfirmationChannel,
  LeaseConfirmationStatus,
  Prisma,
} from '@prisma/client';
import { addDays, addMonths } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import {
  canActOnProperty,
  propertyVisibilityWhere,
  responsibleUserIdFor,
} from '../../common/permissions/property-access';
import {
  LEASE_CONFIRMATION_MAX_REFUSALS,
  LEASE_CONFIRMATION_REMINDER_DAYS,
} from '../../common/constants';
import { isTenantNotificationHour } from '../../common/utils/tenant-notification-hours';
import { AuthService, InviteTenantResponse } from '../auth/auth.service';
import { InviteTenantDto } from '../auth/dto/invite-tenant.dto';
import { ListingsService } from '../listings/listings.service';
import { NotifyService, NotifyUserParams } from '../notify/notify.service';
import {
  ROLLING_WINDOW_MONTHS,
  buildScheduleEntries,
  dueDateAfterAcceptance,
  shiftDueDatesToAcceptance,
} from '../leases/schedule-builder';
import {
  leaseConfirmationOutcomeNotification,
  leaseConfirmationRequestNotification,
} from './lease-confirmation-notifications';
import { ResendLeaseConfirmationDto } from './dto/resend-lease-confirmation.dto';

// ─── Réponses de l'API (contrat d'API du 09/11/2026) ───────────────────

// Par où la demande est partie. EMAIL et IN_APP partent toujours (contrat) ;
// WHATSAPP seulement si Meta a accepté au moins un message de la demande.
export type LeaseConfirmationSendChannel = 'EMAIL' | 'IN_APP' | 'WHATSAPP';

export function confirmationChannels(whatsappSentAt: Date | null): LeaseConfirmationSendChannel[] {
  return whatsappSentAt ? ['EMAIL', 'IN_APP', 'WHATSAPP'] : ['EMAIL', 'IN_APP'];
}

// Dates des 2 rappels prévus (2 et 5 jours après l'envoi), qu'ils soient
// partis ou non.
export function reminderSchedule(sentAt: Date): Date[] {
  return LEASE_CONFIRMATION_REMINDER_DAYS.map((days) => addDays(sentAt, days));
}

export type InviterLeaseConfirmationView = {
  id: string;
  status: LeaseConfirmationStatus;
  channels: LeaseConfirmationSendChannel[];
  // Toujours le nom tapé par l'inviteur, jamais celui du compte.
  tenantDisplayName: string;
  phone: string | null;
  email: string | null;
  lease: {
    id: string;
    monthlyRent: number;
    startDate: Date;
    property: { id: string; address: string | null; neighborhood: string; city: string };
  };
  sentAt: Date;
  remindersSentAt: Date[];
  reminderSchedule: Date[];
  nextReminderAt: Date | null;
  expiresAt: Date;
  respondedAt: Date | null;
  refusalCount: number;
  canResend: boolean;
};

export type TenantLeaseConfirmationView = {
  id: string;
  inviterDisplayName: string;
  sentAt: Date;
  lease: {
    monthlyRent: number;
    startDate: Date;
    property: { address: string | null; neighborhood: string; city: string };
  };
  expiresAt: Date;
};

export type ConfirmationDecision = 'ACCEPT' | 'REFUSE';

// Résultat d'un appui sur un bouton WhatsApp, pour le texte de la réponse
// du robot. UNKNOWN : demande introuvable ou d'un autre locataire → silence.
export type WhatsappDecisionResult =
  | { outcome: 'UNKNOWN' }
  | {
      outcome: 'ACCEPTED' | 'REFUSED' | 'ACTIVE_LEASE_EXISTS' | 'CLOSED';
      propertyId: string;
      tenantFirstName: string;
      inviterName: string;
      propertyLabel: { address: string | null; neighborhood: string; city: string };
      monthlyRent: number;
      firstDueDate: Date;
    };

// ─── Interne ─────────────────────────────────────────────────────────

const CONFIRMATION_INCLUDE = {
  lease: true,
  property: true,
  inviter: { select: { firstName: true, lastName: true } },
  tenant: { select: { firstName: true } },
} satisfies Prisma.LeaseConfirmationInclude;

type LoadedConfirmation = Prisma.LeaseConfirmationGetPayload<{ include: typeof CONFIRMATION_INCLUDE }>;

// changed : la transition vient d'être faite par CET appel (sinon l'état
// était déjà celui-là : réponse idempotente, aucune notification).
type DecisionResult =
  | { kind: 'NOT_FOUND' }
  | { kind: 'ACCEPTED' | 'REFUSED'; changed: boolean; confirmation: LoadedConfirmation }
  | { kind: 'ACTIVE_LEASE_EXISTS' | 'EXPIRED' | 'CLOSED'; confirmation: LoadedConfirmation };

type CloseStatus = 'REFUSED' | 'EXPIRED' | 'CANCELLED';

const ACTIVE_LEASE_EXISTS_MESSAGE = 'Votre bail actuel doit d’abord être terminé par votre propriétaire.';
const CLOSED_MESSAGE = "Cette demande n'est plus en cours. Rien n'a changé sur votre compte.";
const EXPIRED_MESSAGE = "Cette demande a expiré. Rien n'a été ajouté à votre compte.";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LIST_LIMIT = 100;
const TASK_BATCH = 100;

// Erreurs à code stable, lues par l'écran (contrat d'API du 09/11/2026).
function conflict(code: string, message: string): ConflictException {
  return new ConflictException({ statusCode: 409, error: 'Conflict', code, message });
}

function gone(code: string, message: string): GoneException {
  return new GoneException({ statusCode: 410, error: 'Gone', code, message });
}

// Accord du locataire déjà inscrit (registre des décisions et contrat d'API
// du 09/11/2026). Toutes les transitions de la demande sont des écritures
// conditionnelles sur son statut, dans une transaction qui touche ensuite le
// bail (lui aussi conditionnel) puis le bien : deux réponses simultanées
// (deux appuis, application + WhatsApp, réponse + annulation, réponse +
// expiration) n'en appliquent qu'une, et un bail annulé n'est jamais activé.
// Les verrous sont toujours pris dans le même ordre (demande, bail, bien) :
// pas d'interblocage entre ces chemins.
@Injectable()
export class LeaseConfirmationsService {
  private readonly logger = new Logger(LeaseConfirmationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notify: NotifyService,
    private readonly listings: ListingsService,
    private readonly auth: AuthService,
  ) {}

  // ─── Propriétaire ou gestionnaire ─────────────────────────────────

  // Les demandes faites par l'appelant, ou sur ses biens (propriétaire, ou
  // gestionnaire avec un mandat ACTIVE). Une demande renvoyée est remplacée
  // par la nouvelle : elle disparaît de la liste.
  async listForInviter(user: AuthenticatedUser): Promise<InviterLeaseConfirmationView[]> {
    const rows = await this.prisma.leaseConfirmation.findMany({
      where: {
        resentAt: null,
        OR: [{ inviterUserId: user.id }, { property: propertyVisibilityWhere(user) }],
      },
      include: {
        lease: { select: { id: true, monthlyRent: true, startDate: true } },
        property: {
          select: {
            id: true,
            ownerId: true,
            address: true,
            neighborhood: true,
            city: true,
            mandates: { where: { status: 'ACTIVE' }, select: { managerId: true }, take: 1 },
          },
        },
      },
      orderBy: { sentAt: 'desc' },
      take: LIST_LIMIT,
    });
    if (rows.length === 0) return [];

    const refusals = await this.refusalCounts(
      rows.map((row) => ({ inviterUserId: row.inviterUserId, tenantUserId: row.tenantUserId })),
    );

    return rows.map((row) => {
      const refusalCount = refusals.get(pairKey(row.inviterUserId, row.tenantUserId)) ?? 0;
      const isResponsible =
        responsibleUserIdFor(row.property, row.property.mandates[0]) === user.id;
      return {
        id: row.id,
        status: row.status,
        channels: confirmationChannels(row.whatsappSentAt),
        tenantDisplayName: `${row.typedFirstName} ${row.typedLastName}`,
        phone: row.typedPhone,
        email: row.typedEmail,
        lease: {
          ...row.lease,
          property: {
            id: row.property.id,
            address: row.property.address,
            neighborhood: row.property.neighborhood,
            city: row.property.city,
          },
        },
        sentAt: row.sentAt,
        remindersSentAt: [row.reminder1SentAt, row.reminder2SentAt].filter(
          (date): date is Date => date !== null,
        ),
        reminderSchedule: reminderSchedule(row.sentAt),
        nextReminderAt: nextReminderAt(row),
        expiresAt: row.expiresAt,
        respondedAt: row.respondedAt,
        refusalCount,
        canResend:
          (row.status === 'REFUSED' || row.status === 'EXPIRED') &&
          refusalCount < LEASE_CONFIRMATION_MAX_REFUSALS &&
          isResponsible,
      };
    });
  }

  // Accepté seulement si la demande est en attente (contrat). Le bien et
  // l'annonce reviennent à leur état d'avant.
  async cancel(user: AuthenticatedUser, id: string): Promise<{ status: 'CANCELLED' }> {
    const confirmation = await this.loadForAgency(user, id);
    if (confirmation.status !== 'PENDING') {
      throw conflict('CONFIRMATION_NOT_PENDING', "Cette demande n'est plus en attente");
    }
    const { changed } = await this.close(confirmation, 'CANCELLED', new Date(), user.id);
    if (!changed) throw conflict('CONFIRMATION_NOT_PENDING', "Cette demande n'est plus en attente");
    return { status: 'CANCELLED' };
  }

  // Après un refus ou une expiration, avec un numéro ou un email corrigé si
  // besoin. Refait exactement le parcours d'invitation (AuthService) avec
  // les conditions du bail d'origine : si le contact ne correspond à aucun
  // compte activé, c'est une invitation classique, comme aujourd'hui.
  async resend(
    user: AuthenticatedUser,
    id: string,
    dto: ResendLeaseConfirmationDto,
  ): Promise<InviteTenantResponse> {
    const confirmation = await this.loadForAgency(user, id);
    if (
      (confirmation.status !== 'REFUSED' && confirmation.status !== 'EXPIRED') ||
      confirmation.resentAt !== null
    ) {
      throw conflict(
        'CONFIRMATION_NOT_RESENDABLE',
        'Seule une demande refusée ou expirée peut être renvoyée, une seule fois',
      );
    }
    const refusals = await this.prisma.leaseConfirmation.count({
      where: {
        inviterUserId: confirmation.inviterUserId,
        tenantUserId: confirmation.tenantUserId,
        status: 'REFUSED',
      },
    });
    if (refusals >= LEASE_CONFIRMATION_MAX_REFUSALS) {
      throw conflict(
        'CONFIRMATION_BLOCKED',
        "Cette personne a refusé 3 fois : la demande ne peut plus être renvoyée. Si c'est une erreur, contactez le support WARAH.",
      );
    }

    // Réservée avant l'envoi : deux clics sur « Renvoyer » ne créent qu'une
    // seule nouvelle demande. Rendue si l'invitation échoue.
    const claimed = await this.prisma.leaseConfirmation.updateMany({
      where: { id, resentAt: null, status: { in: ['REFUSED', 'EXPIRED'] } },
      data: { resentAt: new Date() },
    });
    if (claimed.count === 0) {
      throw conflict(
        'CONFIRMATION_NOT_RESENDABLE',
        'Seule une demande refusée ou expirée peut être renvoyée, une seule fois',
      );
    }

    const { lease } = confirmation;
    const inviteDto: InviteTenantDto = {
      propertyId: confirmation.propertyId,
      email: dto.email ?? confirmation.typedEmail,
      phone: dto.phone ?? confirmation.typedPhone,
      firstName: confirmation.typedFirstName,
      lastName: confirmation.typedLastName,
      monthlyRent: lease.monthlyRent,
      monthlyCharges: lease.monthlyCharges,
      paymentFrequency: lease.paymentFrequency,
      startDate: lease.startDate.toISOString(),
      ...(lease.endDate ? { endDate: lease.endDate.toISOString() } : {}),
      securityDeposit: lease.securityDeposit,
      ...(lease.depositReturnConditions ? { depositReturnConditions: lease.depositReturnConditions } : {}),
      ...(lease.reminderDaysBefore !== null ? { reminderDaysBefore: lease.reminderDaysBefore } : {}),
      ...(lease.overdueAlertWindowDays !== null
        ? { overdueAlertWindowDays: lease.overdueAlertWindowDays }
        : {}),
    };

    try {
      return await this.auth.inviteTenant(user, inviteDto);
    } catch (error) {
      await this.prisma.leaseConfirmation
        .updateMany({ where: { id }, data: { resentAt: null } })
        .catch((releaseError: unknown) =>
          this.logger.error(`[lease-confirmation] renvoi non libéré id=${id}`, releaseError),
        );
      throw error;
    }
  }

  // ─── Locataire ────────────────────────────────────────────────────

  async listForTenant(user: AuthenticatedUser): Promise<TenantLeaseConfirmationView[]> {
    const rows = await this.prisma.leaseConfirmation.findMany({
      where: { tenantUserId: user.id, status: 'PENDING', expiresAt: { gt: new Date() } },
      select: {
        id: true,
        sentAt: true,
        expiresAt: true,
        inviter: { select: { firstName: true, lastName: true } },
        lease: { select: { monthlyRent: true, startDate: true } },
        property: { select: { address: true, neighborhood: true, city: true } },
      },
      orderBy: { sentAt: 'asc' },
      take: LIST_LIMIT,
    });
    return rows.map((row) => ({
      id: row.id,
      inviterDisplayName: `${row.inviter.firstName} ${row.inviter.lastName}`,
      sentAt: row.sentAt,
      lease: { ...row.lease, property: row.property },
      expiresAt: row.expiresAt,
    }));
  }

  // Idempotent : un deuxième appui renvoie le même résultat.
  async accept(user: AuthenticatedUser, id: string): Promise<{ status: 'ACCEPTED'; leaseId: string }> {
    const result = await this.decide(user.id, id, 'ACCEPT', 'APP');
    switch (result.kind) {
      case 'ACCEPTED':
        return { status: 'ACCEPTED', leaseId: result.confirmation.leaseId };
      case 'ACTIVE_LEASE_EXISTS':
        throw conflict('ACTIVE_LEASE_EXISTS', ACTIVE_LEASE_EXISTS_MESSAGE);
      default:
        throw this.toHttpError(result);
    }
  }

  async refuse(user: AuthenticatedUser, id: string): Promise<{ status: 'REFUSED' }> {
    const result = await this.decide(user.id, id, 'REFUSE', 'APP');
    if (result.kind === 'REFUSED') return { status: 'REFUSED' };
    throw this.toHttpError(result);
  }

  // Bouton WhatsApp (LC_ACCEPT:<id> / LC_REFUSE:<id>), mêmes règles que les
  // routes. Le numéro qui a appuyé a été authentifié par Meta et rattaché au
  // compte par le webhook : la demande doit être celle de CE locataire.
  async respondFromWhatsapp(
    tenantUserId: string,
    id: string,
    decision: ConfirmationDecision,
  ): Promise<WhatsappDecisionResult> {
    const result = await this.decide(tenantUserId, id, decision, 'WHATSAPP');
    if (result.kind === 'NOT_FOUND') return { outcome: 'UNKNOWN' };
    const c = result.confirmation;
    const outcome =
      (result.kind === 'ACCEPTED' || result.kind === 'REFUSED') && result.changed
        ? result.kind
        : result.kind === 'ACTIVE_LEASE_EXISTS'
          ? 'ACTIVE_LEASE_EXISTS'
          : 'CLOSED';
    return {
      outcome,
      propertyId: c.propertyId,
      tenantFirstName: c.tenant.firstName,
      inviterName: `${c.inviter.firstName} ${c.inviter.lastName}`,
      propertyLabel: c.property,
      monthlyRent: c.lease.monthlyRent,
      firstDueDate: dueDateAfterAcceptance(c.lease.startDate, c.respondedAt ?? new Date()),
    };
  }

  // ─── Tâche automatique (scheduling/lease-confirmations.task.ts) ──────

  // Expiration 7 jours après l'envoi : la demande et le bail en attente
  // sont annulés, le bien et l'annonce reviennent à leur état d'avant.
  async expireDue(now: Date): Promise<number> {
    const due = await this.prisma.leaseConfirmation.findMany({
      where: { status: 'PENDING', expiresAt: { lte: now } },
      include: CONFIRMATION_INCLUDE,
      orderBy: { expiresAt: 'asc' },
      take: TASK_BATCH,
    });
    let expired = 0;
    for (const confirmation of due) {
      try {
        const { changed } = await this.close(confirmation, 'EXPIRED', now, confirmation.inviterUserId);
        if (changed) expired += 1;
      } catch (error) {
        this.logger.error(`[lease-confirmations/expire] confirmation=${confirmation.id}`, error);
      }
    }
    return expired;
  }

  // Rappels à 2 et 5 jours (mêmes canaux que la demande). Plage 7 h – 21 h
  // des locataires vérifiée au moment de chaque envoi : hors plage, le
  // rappel reste à faire et le passage suivant le reprend. Chaque rappel est
  // réservé par une écriture conditionnelle juste avant l'envoi et rendu si
  // l'envoi lève (rien n'est parti) — jamais deux fois le même.
  async sendDueReminders(now: Date): Promise<number> {
    const [firstDelay, secondDelay] = LEASE_CONFIRMATION_REMINDER_DAYS;
    const candidates = await this.prisma.leaseConfirmation.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { gt: now },
        OR: [
          { reminder1SentAt: null, sentAt: { lte: new Date(now.getTime() - firstDelay * MS_PER_DAY) } },
          { reminder2SentAt: null, sentAt: { lte: new Date(now.getTime() - secondDelay * MS_PER_DAY) } },
        ],
      },
      include: CONFIRMATION_INCLUDE,
      orderBy: { sentAt: 'asc' },
      take: TASK_BATCH,
    });

    let sent = 0;
    for (const confirmation of candidates) {
      if (!isTenantNotificationHour(now)) break;
      const age = now.getTime() - confirmation.sentAt.getTime();
      // Après une coupure, seul le rappel le plus récent part (pas deux d'un coup).
      const second = age >= secondDelay * MS_PER_DAY && confirmation.reminder2SentAt === null;
      const reservation: Prisma.LeaseConfirmationUpdateManyMutationInput = second
        ? { reminder2SentAt: now, ...(confirmation.reminder1SentAt === null ? { reminder1SentAt: now } : {}) }
        : { reminder1SentAt: now };
      const claimed = await this.prisma.leaseConfirmation.updateMany({
        where: {
          id: confirmation.id,
          status: 'PENDING',
          ...(second ? { reminder2SentAt: null } : { reminder1SentAt: null }),
        },
        data: reservation,
      });
      if (claimed.count === 0) continue;

      try {
        const { whatsappSent } = await this.notify.notifyUserWithOutcome(
          this.requestNotification(confirmation, true),
        );
        if (whatsappSent) await this.markWhatsappSent(confirmation.id, now);
        sent += 1;
      } catch (error) {
        this.logger.error(`[lease-confirmations/reminder] confirmation=${confirmation.id}`, error);
        await this.prisma.leaseConfirmation
          .updateMany({
            where: { id: confirmation.id },
            data: second
              ? { reminder2SentAt: null, ...(confirmation.reminder1SentAt === null ? { reminder1SentAt: null } : {}) }
              : { reminder1SentAt: null },
          })
          .catch((releaseError: unknown) =>
            this.logger.error(`[lease-confirmations/reminder] réservation non rendue ${confirmation.id}`, releaseError),
          );
      }
    }
    return sent;
  }

  // ─── Cœur des décisions ──────────────────────────────────────────

  private async decide(
    tenantUserId: string,
    id: string,
    decision: ConfirmationDecision,
    via: LeaseConfirmationChannel,
  ): Promise<DecisionResult> {
    const confirmation = await this.prisma.leaseConfirmation.findUnique({
      where: { id },
      include: CONFIRMATION_INCLUDE,
    });
    // Jamais la demande d'un autre : 404, comme une demande inexistante.
    if (!confirmation || confirmation.tenantUserId !== tenantUserId) return { kind: 'NOT_FOUND' };

    const now = new Date();
    const settled = await this.settledOutcome(confirmation, decision, now);
    if (settled) return settled;

    if (decision === 'REFUSE') {
      const { changed } = await this.close(confirmation, 'REFUSED', now, confirmation.inviterUserId, via);
      return changed ? { kind: 'REFUSED', changed: true, confirmation } : this.reloadOutcome(id, decision);
    }

    // « Bail actif ailleurs » (choix 2 du boss) : refusé, l'ancien bail
    // n'est jamais terminé automatiquement. La demande reste en attente.
    const activeElsewhere = await this.prisma.lease.findFirst({
      where: { tenantUserId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (activeElsewhere) return { kind: 'ACTIVE_LEASE_EXISTS', confirmation };

    let changed: boolean;
    try {
      changed = await this.activate(confirmation, now, via);
    } catch (error) {
      // Un autre bail est devenu actif entre la vérification et l'écriture :
      // l'index leases_tenant_active_unique a refusé, tout est annulé.
      if (isUniqueViolation(error, 'leases_tenant_active_unique')) {
        return { kind: 'ACTIVE_LEASE_EXISTS', confirmation };
      }
      throw error;
    }
    if (!changed) return this.reloadOutcome(id, decision);

    await this.notifyInviter(confirmation, 'lease-confirmation-accepted', false);
    return { kind: 'ACCEPTED', changed: true, confirmation };
  }

  // État déjà tranché (ou délai dépassé) avant toute écriture.
  private async settledOutcome(
    confirmation: LoadedConfirmation,
    decision: ConfirmationDecision,
    now: Date,
  ): Promise<DecisionResult | null> {
    const wanted = decision === 'ACCEPT' ? 'ACCEPTED' : 'REFUSED';
    if (confirmation.status === wanted) return { kind: wanted, changed: false, confirmation };
    if (confirmation.status === 'EXPIRED') return { kind: 'EXPIRED', confirmation };
    if (confirmation.status !== 'PENDING') return { kind: 'CLOSED', confirmation };
    if (confirmation.expiresAt <= now) {
      // La tâche n'est pas encore passée : on expire tout de suite (même
      // écriture conditionnelle que la tâche, une seule des deux gagne).
      await this.close(confirmation, 'EXPIRED', now, confirmation.inviterUserId);
      return { kind: 'EXPIRED', confirmation };
    }
    return null;
  }

  // Course perdue contre une autre écriture : on relit et on répond selon
  // l'état gagnant, sans rien réessayer.
  private async reloadOutcome(id: string, decision: ConfirmationDecision): Promise<DecisionResult> {
    const current = await this.prisma.leaseConfirmation.findUnique({ where: { id }, include: CONFIRMATION_INCLUDE });
    if (!current) return { kind: 'NOT_FOUND' };
    const wanted = decision === 'ACCEPT' ? 'ACCEPTED' : 'REFUSED';
    if (current.status === wanted) return { kind: wanted, changed: false, confirmation: current };
    if (current.status === 'EXPIRED') return { kind: 'EXPIRED', confirmation: current };
    return { kind: 'CLOSED', confirmation: current };
  }

  // « Oui » : demande ACCEPTED, bail ACTIVE et échéancier créé à partir de
  // la date de début, dans une seule transaction. Le bien est déjà réservé
  // (OCCUPIED) et l'annonce déjà retirée depuis l'invitation.
  private async activate(
    confirmation: LoadedConfirmation,
    now: Date,
    via: LeaseConfirmationChannel,
  ): Promise<boolean> {
    const { lease } = confirmation;
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.leaseConfirmation.updateMany({
        where: { id: confirmation.id, status: 'PENDING', expiresAt: { gt: now } },
        data: { status: 'ACCEPTED', respondedAt: now, respondedVia: via },
      });
      if (claimed.count === 0) return false;

      const activated = await tx.lease.updateMany({
        where: { id: lease.id, status: 'PENDING_TENANT' },
        data: { status: 'ACTIVE' },
      });
      // Bail qui n'est plus en attente alors que sa demande l'était :
      // incohérence, on annule tout plutôt que d'activer quoi que ce soit.
      if (activated.count === 0) {
        throw new ConflictException("Ce bail n'est plus en attente de confirmation");
      }

      const scheduleEndDate = lease.endDate ?? addMonths(lease.startDate, ROLLING_WINDOW_MONTHS);
      const entries = shiftDueDatesToAcceptance(
        buildScheduleEntries(
          lease.id,
          lease.startDate,
          scheduleEndDate,
          lease.paymentFrequency,
          lease.monthlyRent,
          lease.monthlyCharges,
        ),
        now,
      );
      if (entries.length > 0) await tx.paymentScheduleEntry.createMany({ data: entries });
      return true;
    });
  }

  // Refus, expiration ou annulation : demande close, bail en attente
  // CANCELLED, bien et annonce rétablis — une seule transaction. Le bien
  // n'est rétabli que s'il est toujours réservé (OCCUPIED) ; l'annonce n'est
  // republiée (nouvelle ligne, comme à la résiliation) que si elle était en
  // ligne avant et que le bien redevient libre.
  private async close(
    confirmation: LoadedConfirmation,
    status: CloseStatus,
    now: Date,
    actorUserId: string,
    via?: LeaseConfirmationChannel,
  ): Promise<{ changed: boolean; listingRepublished: boolean }> {
    const result = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.leaseConfirmation.updateMany({
        where: {
          id: confirmation.id,
          status: 'PENDING',
          // Un refus arrivé après la limite ne vaut pas : c'est une expiration.
          ...(status === 'REFUSED' ? { expiresAt: { gt: now } } : {}),
        },
        data: {
          status,
          ...(status === 'EXPIRED' ? {} : { respondedAt: now }),
          ...(via ? { respondedVia: via } : {}),
        },
      });
      if (claimed.count === 0) return { changed: false, listingRepublished: false };

      const cancelled = await tx.lease.updateMany({
        where: { id: confirmation.leaseId, status: 'PENDING_TENANT' },
        data: { status: 'CANCELLED' },
      });
      if (cancelled.count === 0) {
        throw new ConflictException("Ce bail n'est plus en attente de confirmation");
      }

      const restored = await tx.property.updateMany({
        where: { id: confirmation.propertyId, status: 'OCCUPIED' },
        data: { status: confirmation.previousPropertyStatus },
      });
      const republish =
        restored.count > 0 && confirmation.listingWasActive && confirmation.previousPropertyStatus === 'VACANT';
      if (republish) await this.listings.publishForProperty(tx, confirmation.property, actorUserId);
      return { changed: true, listingRepublished: republish };
    });

    if (result.changed && status !== 'CANCELLED') {
      await this.notifyInviter(
        confirmation,
        status === 'REFUSED' ? 'lease-confirmation-refused' : 'lease-confirmation-expired',
        result.listingRepublished,
      );
    }
    return result;
  }

  // Écriture seule (pas de conditions métier) : jamais un échec d'envoi.
  async markWhatsappSent(id: string, at: Date): Promise<void> {
    await this.prisma.leaseConfirmation
      .updateMany({ where: { id, whatsappSentAt: null }, data: { whatsappSentAt: at } })
      .catch((error: unknown) => this.logger.error(`[lease-confirmation] whatsappSentAt non noté id=${id}`, error));
  }

  private async notifyInviter(
    confirmation: LoadedConfirmation,
    event: 'lease-confirmation-accepted' | 'lease-confirmation-refused' | 'lease-confirmation-expired',
    listingRepublished: boolean,
  ): Promise<void> {
    try {
      await this.notify.notifyUser(
        leaseConfirmationOutcomeNotification({
          event,
          inviterUserId: confirmation.inviterUserId,
          typedFirstName: confirmation.typedFirstName,
          typedLastName: confirmation.typedLastName,
          property: confirmation.property,
          listingRepublished,
        }),
      );
    } catch (error) {
      // La décision est enregistrée ; seule la notification manque. La
      // liste des demandes de l'inviteur montre de toute façon le statut.
      this.logger.error(`[lease-confirmation/${event}] confirmation=${confirmation.id}`, error);
    }
  }

  private requestNotification(confirmation: LoadedConfirmation, isReminder: boolean): NotifyUserParams {
    return leaseConfirmationRequestNotification({
      confirmationId: confirmation.id,
      tenantUserId: confirmation.tenantUserId,
      tenantFirstName: confirmation.tenant.firstName,
      inviterName: `${confirmation.inviter.firstName} ${confirmation.inviter.lastName}`,
      property: confirmation.property,
      monthlyRent: confirmation.lease.monthlyRent,
      startDate: confirmation.lease.startDate,
      expiresAt: confirmation.expiresAt,
      frontendUrl: this.config.getOrThrow<string>('FRONTEND_URL'),
      isReminder,
    });
  }

  // Lecture par le propriétaire ou le gestionnaire : canActOnProperty() est
  // la seule autorité. Une demande sur un bien qu'il ne voit pas répond 404
  // (on ne confirme pas son existence) ; en lecture seule (mandat actif
  // confié à un autre), 403.
  private async loadForAgency(user: AuthenticatedUser, id: string): Promise<LoadedConfirmation> {
    const confirmation = await this.prisma.leaseConfirmation.findUnique({
      where: { id },
      include: CONFIRMATION_INCLUDE,
    });
    if (!confirmation) throw new NotFoundException('Demande introuvable');
    const access = await canActOnProperty(this.prisma, user, confirmation.property);
    if (!access.canRead) throw new NotFoundException('Demande introuvable');
    if (!access.canMutate) {
      throw new ForbiddenException("Vous n'avez pas les droits pour modifier cette demande");
    }
    return confirmation;
  }

  private toHttpError(result: DecisionResult): NotFoundException | ConflictException | GoneException {
    if (result.kind === 'NOT_FOUND') return new NotFoundException('Demande introuvable');
    if (result.kind === 'EXPIRED') {
      return gone('CONFIRMATION_EXPIRED', EXPIRED_MESSAGE);
    }
    return conflict('CONFIRMATION_CLOSED', CLOSED_MESSAGE);
  }

  // Refus par couple (inviteur, locataire), en une seule requête pour la liste.
  private async refusalCounts(
    pairs: { inviterUserId: string; tenantUserId: string }[],
  ): Promise<Map<string, number>> {
    const unique = [...new Map(pairs.map((pair) => [pairKey(pair.inviterUserId, pair.tenantUserId), pair])).values()];
    const groups = await this.prisma.leaseConfirmation.groupBy({
      by: ['inviterUserId', 'tenantUserId'],
      where: { status: 'REFUSED', OR: unique },
      _count: { _all: true },
    });
    return new Map(groups.map((group) => [pairKey(group.inviterUserId, group.tenantUserId), group._count._all]));
  }
}

function pairKey(inviterUserId: string, tenantUserId: string): string {
  return `${inviterUserId}:${tenantUserId}`;
}

// Prochain rappel prévu (2 puis 5 jours après l'envoi), null s'il n'y en a
// plus ou si la demande est close.
function nextReminderAt(row: {
  status: LeaseConfirmationStatus;
  sentAt: Date;
  expiresAt: Date;
  reminder1SentAt: Date | null;
  reminder2SentAt: Date | null;
}): Date | null {
  if (row.status !== 'PENDING') return null;
  const [firstDelay, secondDelay] = LEASE_CONFIRMATION_REMINDER_DAYS;
  const next =
    row.reminder1SentAt === null
      ? addDays(row.sentAt, firstDelay)
      : row.reminder2SentAt === null
        ? addDays(row.sentAt, secondDelay)
        : null;
  return next && next < row.expiresAt ? next : null;
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    error.message.includes(constraint)
  );
}
