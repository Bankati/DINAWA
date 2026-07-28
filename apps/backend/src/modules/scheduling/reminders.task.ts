import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotifyService } from '../notify/notify.service';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';
import { CRON_PAYMENT_REMINDERS } from '../../common/constants';

const ADVISORY_LOCK_KEY = 'payment-reminders-task';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Plafond du délai de rappel côté DTO (InviteTenantDto.reminderDaysBefore,
// @Max(90)) — borne large de la fenêtre candidate interrogée en base ; le
// filtrage précis par bail se fait ensuite en mémoire (voir resolveReminderDays).
const MAX_REMINDER_WINDOW_DAYS = 90;

// Rappel de loyer au locataire avant échéance (voir build-plan.md unité 24,
// /architect 2026-07-28). Le délai se résout bail → propriétaire (jamais
// "aucun rappel" par défaut) : Lease.reminderDaysBefore prime s'il est
// renseigné, sinon repli sur User.reminderDaysBefore (défaut 5j, unité 10).
// Templates/événement push "payment-reminder" déjà posés depuis l'unité 04.
@Injectable()
export class RemindersTask {
  private readonly logger = new Logger(RemindersTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
  ) {}

  @Cron(CRON_PAYMENT_REMINDERS)
  async run(): Promise<void> {
    const ran = await withAdvisoryLock(this.prisma, ADVISORY_LOCK_KEY, () => this.execute());
    if (ran === null) {
      this.logger.warn(
        '[payment-reminders] exécution ignorée — une instance détient déjà le verrou',
      );
    }
  }

  private async execute(): Promise<void> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + MAX_REMINDER_WINDOW_DAYS * MS_PER_DAY);

    const candidates = await this.prisma.paymentScheduleEntry.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL'] },
        reminderSentAt: null,
        dueDate: { gte: now, lte: windowEnd },
      },
      include: {
        lease: {
          include: {
            owner: { select: { reminderDaysBefore: true } },
            tenant: { select: { id: true } },
            property: { select: { address: true } },
          },
        },
      },
      take: 200,
    });

    for (const entry of candidates) {
      try {
        const reminderDays = entry.lease.reminderDaysBefore ?? entry.lease.owner.reminderDaysBefore;
        const daysUntilDue = Math.floor((entry.dueDate.getTime() - now.getTime()) / MS_PER_DAY);
        if (daysUntilDue > reminderDays) continue;

        await this.notify.notifyUser({
          userId: entry.lease.tenant.id,
          event: 'payment-reminder',
          variables: {
            period: this.formatPeriod(entry.periodStart, entry.periodEnd),
            dueDate: entry.dueDate.toISOString().slice(0, 10),
            propertyAddress: entry.lease.property.address,
            amount: entry.expectedAmount - entry.paidAmount,
          },
        });
        await this.prisma.paymentScheduleEntry.update({
          where: { id: entry.id },
          data: { reminderSentAt: new Date() },
        });
      } catch (error) {
        this.logger.error(`[payment-reminders] échec pour entry=${entry.id}`, error);
      }
    }
  }

  private formatPeriod(start: Date, end: Date): string {
    const fmt = (d: Date): string => d.toISOString().slice(0, 10);
    return `${fmt(start)} — ${fmt(end)}`;
  }
}
