import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma, ScheduleEntryStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotifyService } from '../notify/notify.service';
import { PayLinksService } from '../pay-links/pay-links.service';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';
import { formatPropertyLocation } from '../../common/utils/format-property-location';
import { CRON_OVERDUE_ALERTS } from '../../common/constants';
import { isTenantNotificationHour } from '../../common/utils/tenant-notification-hours';

const ADVISORY_LOCK_KEY = 'overdue-alerts-task';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Plafond du délai de grâce côté DTO (InviteTenantDto.overdueAlertWindowDays,
// @Max(90)) — borne large de la fenêtre candidate ; le filtrage précis par
// bail se fait ensuite en mémoire (voir resolveGraceDays).
const MAX_GRACE_WINDOW_DAYS = 90;
// Échéance non soldée : PENDING / PARTIAL avant l'alerte agence, OVERDUE après.
const UNPAID_STATUSES: ScheduleEntryStatus[] = ['PENDING', 'PARTIAL', 'OVERDUE'];

// Alerte d'impayé au propriétaire/gestionnaire mandaté quand une échéance
// dépasse le délai de grâce (voir build-plan.md unité 25, /architect
// 2026-07-28). Passe l'échéance à OVERDUE (jamais posé ailleurs — voir
// computeEntryStatus() dans payments.service.ts). Anti-doublon strict :
// overdueAlertSentAt une fois posé, plus jamais renotifié pour cette
// échéance précise, même si son statut oscille ensuite (ex. paiement
// partiel). Le délai se résout bail → propriétaire, même principe que
// RemindersTask : Lease.overdueAlertWindowDays prime s'il est renseigné,
// sinon repli sur User.overdueGraceDays (défaut 3j, unité 10).
//
// Unité 46 : au même délai, une relance UNIQUE au locataire lui-même
// (email « tenant-overdue » + WhatsApp « loyer_en_retard », bouton de
// paiement). Indépendante de l'alerte agence : l'échec de l'une ne bloque
// pas l'autre. La relance part au premier passage de la tâche après la fin
// du délai de tolérance, pas à une heure précise.
@Injectable()
export class OverdueAlertsTask {
  private readonly logger = new Logger(OverdueAlertsTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
    private readonly payLinks: PayLinksService,
  ) {}

  @Cron(CRON_OVERDUE_ALERTS)
  async run(): Promise<void> {
    const ran = await withAdvisoryLock(this.prisma, ADVISORY_LOCK_KEY, () => this.execute());
    if (ran === null) {
      this.logger.warn('[overdue-alerts] exécution ignorée — une instance détient déjà le verrou');
    }
  }

  private async execute(): Promise<void> {
    const now = new Date();
    const earliestDueDate = new Date(now.getTime() - MAX_GRACE_WINDOW_DAYS * MS_PER_DAY);

    const candidates = await this.prisma.paymentScheduleEntry.findMany({
      where: {
        dueDate: { gte: earliestDueDate, lt: now },
        OR: [
          { status: { in: ['PENDING', 'PARTIAL'] }, overdueAlertSentAt: null },
          // Une échéance déjà signalée à l'agence (donc OVERDUE) peut encore
          // attendre la relance du locataire (ex. erreur au passage précédent).
          { status: { in: UNPAID_STATUSES }, tenantOverdueSentAt: null },
        ],
      },
      include: {
        lease: {
          include: {
            owner: { select: { overdueGraceDays: true } },
            tenant: { select: { id: true, firstName: true, lastName: true } },
            property: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 100,
    });

    // Un seul aller-retour DB pour tous les mandats actifs des biens candidats,
    // plutôt qu'un resolveResponsibleUserId() (donc un findFirst) par itération
    // (voir /review — N+1 corrigé).
    const propertyIds = [...new Set(candidates.map((entry) => entry.lease.property.id))];
    const activeMandates = await this.prisma.mandate.findMany({
      where: { propertyId: { in: propertyIds }, status: 'ACTIVE' },
      select: { propertyId: true, managerId: true },
    });
    const responsibleUserByPropertyId = new Map(
      activeMandates.map((m) => [m.propertyId, m.managerId]),
    );

    for (const entry of candidates) {
      const graceDays = entry.lease.overdueAlertWindowDays ?? entry.lease.owner.overdueGraceDays;
      const daysOverdue = Math.floor((now.getTime() - entry.dueDate.getTime()) / MS_PER_DAY);
      if (daysOverdue < graceDays) continue;

      if (entry.overdueAlertSentAt === null && (entry.status === 'PENDING' || entry.status === 'PARTIAL')) {
        await this.alertAgency(entry, responsibleUserByPropertyId);
      }
      // Le locataire n'est relancé qu'entre 7 h et 21 h (heure de Lomé) ;
      // hors plage, rien n'est réservé et le passage de 7 h s'en charge.
      // L'alerte à l'agence, elle, part à toute heure comme avant.
      if (entry.tenantOverdueSentAt === null && isTenantNotificationHour()) {
        await this.remindTenant(entry);
      }
    }
  }

  private async alertAgency(entry: Candidate, responsibleUserByPropertyId: Map<string, string>): Promise<void> {
    try {
      const responsibleUserId =
        responsibleUserByPropertyId.get(entry.lease.property.id) ?? entry.lease.property.ownerId;

      await this.notify.notifyUser({
        userId: responsibleUserId,
        event: 'overdue-alert',
        variables: {
          tenantName: `${entry.lease.tenant.firstName} ${entry.lease.tenant.lastName}`,
          propertyAddress: formatPropertyLocation(entry.lease.property),
          period: this.formatPeriod(entry.periodStart, entry.periodEnd),
          amount: entry.expectedAmount - entry.paidAmount,
        },
      });
      await this.prisma.paymentScheduleEntry.update({
        where: { id: entry.id },
        data: { status: 'OVERDUE', overdueAlertSentAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`[overdue-alerts] échec pour entry=${entry.id}`, error);
    }
  }

  // Réservation conditionnelle JUSTE avant l'envoi (décision 3) : elle ne
  // réussit que si l'échéance est encore impayée à cet instant et pas déjà
  // relancée — vérification du paiement et anti-doublon en une écriture.
  // NotifyService ne lève que si rien n'est parti (base indisponible avant
  // tout envoi) : la réservation est alors effacée pour le prochain passage.
  // Risque résiduel assumé : arrêt du serveur entre la réservation et
  // l'envoi → relance perdue (préférée à un doublon).
  private async remindTenant(entry: Candidate): Promise<void> {
    try {
      const { count } = await this.prisma.paymentScheduleEntry.updateMany({
        where: { id: entry.id, tenantOverdueSentAt: null, status: { in: UNPAID_STATUSES } },
        data: { tenantOverdueSentAt: new Date() },
      });
      if (count === 0) return; // payé entre-temps, ou déjà relancé
    } catch (error) {
      this.logger.error(`[overdue-alerts] relance locataire non réservée pour entry=${entry.id}`, error);
      return;
    }

    try {
      const payLink = this.payLinks.payLinkFor(entry);
      await this.notify.notifyUser({
        userId: entry.lease.tenant.id,
        event: 'tenant-overdue',
        relatedTo: { scheduleEntryId: entry.id },
        variables: {
          tenantFirstName: entry.lease.tenant.firstName,
          propertyAddress: formatPropertyLocation(entry.lease.property),
          period: this.formatPeriod(entry.periodStart, entry.periodEnd),
          dueDate: entry.dueDate.toISOString().slice(0, 10),
          amount: entry.expectedAmount - entry.paidAmount,
          payToken: payLink.token,
          payLinkUrl: payLink.url,
        },
      });
    } catch (error) {
      this.logger.error(`[overdue-alerts] relance locataire impossible pour entry=${entry.id}`, error);
      await this.prisma.paymentScheduleEntry
        .updateMany({ where: { id: entry.id }, data: { tenantOverdueSentAt: null } })
        .catch((resetError: unknown) =>
          this.logger.error(`[overdue-alerts] réservation non effacée pour entry=${entry.id}`, resetError),
        );
    }
  }

  private formatPeriod(start: Date, end: Date): string {
    const fmt = (d: Date): string => d.toISOString().slice(0, 10);
    return `${fmt(start)} — ${fmt(end)}`;
  }
}

type Candidate = Prisma.PaymentScheduleEntryGetPayload<{
  include: {
    lease: {
      include: {
        owner: { select: { overdueGraceDays: true } };
        tenant: { select: { id: true; firstName: true; lastName: true } };
        property: true;
      };
    };
  };
}>;
