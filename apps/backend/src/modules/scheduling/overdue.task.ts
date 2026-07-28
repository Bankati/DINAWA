import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotifyService } from '../notify/notify.service';
import { resolveResponsibleUserId } from '../../common/permissions/property-access';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';
import { CRON_OVERDUE_ALERTS } from '../../common/constants';

const ADVISORY_LOCK_KEY = 'overdue-alerts-task';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Plafond du délai de grâce côté DTO (InviteTenantDto.overdueAlertWindowDays,
// @Max(90)) — borne large de la fenêtre candidate ; le filtrage précis par
// bail se fait ensuite en mémoire (voir resolveGraceDays).
const MAX_GRACE_WINDOW_DAYS = 90;

// Alerte d'impayé au propriétaire/gestionnaire mandaté quand une échéance
// dépasse le délai de grâce (voir build-plan.md unité 25, /architect
// 2026-07-28). Passe l'échéance à OVERDUE (jamais posé ailleurs — voir
// computeEntryStatus() dans payments.service.ts). Anti-doublon strict :
// overdueAlertSentAt une fois posé, plus jamais renotifié pour cette
// échéance précise, même si son statut oscille ensuite (ex. paiement
// partiel). Le délai se résout bail → propriétaire, même principe que
// RemindersTask : Lease.overdueAlertWindowDays prime s'il est renseigné,
// sinon repli sur User.overdueGraceDays (défaut 3j, unité 10).
@Injectable()
export class OverdueAlertsTask {
  private readonly logger = new Logger(OverdueAlertsTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
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
        status: { in: ['PENDING', 'PARTIAL'] },
        overdueAlertSentAt: null,
        dueDate: { gte: earliestDueDate, lt: now },
      },
      include: {
        lease: {
          include: {
            owner: { select: { overdueGraceDays: true } },
            tenant: { select: { firstName: true, lastName: true } },
            property: true,
          },
        },
      },
      take: 200,
    });

    for (const entry of candidates) {
      try {
        const graceDays = entry.lease.overdueAlertWindowDays ?? entry.lease.owner.overdueGraceDays;
        const daysOverdue = Math.floor((now.getTime() - entry.dueDate.getTime()) / MS_PER_DAY);
        if (daysOverdue < graceDays) continue;

        const responsibleUserId = await resolveResponsibleUserId(this.prisma, entry.lease.property);

        await this.notify.notifyUser({
          userId: responsibleUserId,
          event: 'overdue-alert',
          variables: {
            tenantName: `${entry.lease.tenant.firstName} ${entry.lease.tenant.lastName}`,
            propertyAddress: entry.lease.property.address,
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
  }

  private formatPeriod(start: Date, end: Date): string {
    const fmt = (d: Date): string => d.toISOString().slice(0, 10);
    return `${fmt(start)} — ${fmt(end)}`;
  }
}
