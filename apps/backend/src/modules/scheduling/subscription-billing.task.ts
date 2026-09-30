import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { addMonths } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { NotifyService } from '../notify/notify.service';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { formatPeriodLabel } from '../subscriptions/format-period-label';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';
import {
  CRON_SUBSCRIPTION_BILLING,
  CRON_SUBSCRIPTION_REMINDERS,
  SUBSCRIPTION_SUSPENSION_DAYS,
  SUBSCRIPTION_TIERS,
} from '../../common/constants';

const MONTHLY_LOCK_KEY = 'subscription-billing-monthly-task';
const REMINDERS_LOCK_KEY = 'subscription-billing-reminders-task';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const TIER_LABELS: Record<keyof typeof SUBSCRIPTION_TIERS, string> = {
  STARTER: 'Starter',
  PRO: 'Pro',
  PREMIUM: 'Premium',
};

// Facturation d'abonnement (unité 36, ressuscitée — voir /architect
// abonnements, 2026-09-30). Deux crons distincts dans la même tâche : la
// création de facture est mensuelle, mais les relances J+3/J+7 exigent une
// granularité quotidienne (même principe que
// PaymentDeclarationRemindersTask). Les deux sont no-op tant que le
// super-admin n'a pas activé PlatformSettings.subscriptionBillingEnabled —
// jamais actif par défaut au déploiement.
@Injectable()
export class SubscriptionBillingTask {
  private readonly logger = new Logger(SubscriptionBillingTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
    private readonly platformSettings: PlatformSettingsService,
  ) {}

  @Cron(CRON_SUBSCRIPTION_BILLING)
  async runMonthlyBilling(): Promise<void> {
    if (!(await this.platformSettings.billingEnabled())) return;
    const ran = await withAdvisoryLock(this.prisma, MONTHLY_LOCK_KEY, () =>
      this.executeMonthlyBilling(),
    );
    if (ran === null) {
      this.logger.warn(
        '[subscription-billing/monthly] exécution ignorée — une instance détient déjà le verrou',
      );
    }
  }

  @Cron(CRON_SUBSCRIPTION_REMINDERS)
  async runReminders(): Promise<void> {
    if (!(await this.platformSettings.billingEnabled())) return;
    const ran = await withAdvisoryLock(this.prisma, REMINDERS_LOCK_KEY, () =>
      this.executeReminders(),
    );
    if (ran === null) {
      this.logger.warn(
        '[subscription-billing/reminders] exécution ignorée — une instance détient déjà le verrou',
      );
    }
  }

  private async executeMonthlyBilling(): Promise<void> {
    await this.finalizeCancellations();
    await this.createDueInvoices();
  }

  // Ferme la boucle laissée ouverte par SubscriptionsService.cancel() —
  // aucun autre code ne consommait `cancelAt` jusqu'ici (voir /architect
  // abonnements, 2026-09-30).
  private async finalizeCancellations(): Promise<void> {
    await this.prisma.subscription.updateMany({
      where: { status: 'PENDING_CANCELLATION', cancelAt: { lte: new Date() } },
      data: { status: 'CANCELLED' },
    });
  }

  private async createDueInvoices(): Promise<void> {
    const now = new Date();

    // Facturé : ACTIVE, ou PENDING_CANCELLATION tant que la période payée
    // n'est pas terminée (résiliation effective seulement à cancelAt, voir
    // SubscriptionsService.cancel()). Jamais en bêta (betaUntil futur).
    // `invoices: { none: { status: 'PENDING' } }` évite d'empiler une 2e
    // facture sur un abonnement déjà suspendu pour impayé.
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        AND: [
          { OR: [{ status: 'ACTIVE' }, { status: 'PENDING_CANCELLATION', cancelAt: { gt: now } }] },
          { OR: [{ betaUntil: null }, { betaUntil: { lt: now } }] },
          { invoices: { none: { status: 'PENDING' } } },
        ],
      },
      take: 200,
    });

    const periodEnd = addMonths(now, 1);

    for (const subscription of subscriptions) {
      try {
        await this.prisma.subscriptionInvoice.create({
          data: {
            subscriptionId: subscription.id,
            amount: SUBSCRIPTION_TIERS[subscription.tier].priceFcfa,
            periodStart: now,
            periodEnd,
          },
        });
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { currentPeriodEnd: periodEnd },
        });
        await this.notify.notifyUser({
          userId: subscription.userId,
          event: 'subscription-invoice-due',
          variables: {
            tierLabel: TIER_LABELS[subscription.tier],
            periodLabel: formatPeriodLabel(now),
            amount: SUBSCRIPTION_TIERS[subscription.tier].priceFcfa,
          },
        });
      } catch (error) {
        this.logger.error(
          `[subscription-billing/monthly] échec pour subscription=${subscription.id}`,
          error,
        );
      }
    }
  }

  private async executeReminders(): Promise<void> {
    await this.sendRemindersFor(3, 'reminder3SentAt');
    await this.sendRemindersFor(7, 'reminder7SentAt');
    await this.suspendOverdueAccounts();
  }

  private async sendRemindersFor(
    days: number,
    field: 'reminder3SentAt' | 'reminder7SentAt',
  ): Promise<void> {
    const threshold = new Date(Date.now() - days * MS_PER_DAY);

    const invoices = await this.prisma.subscriptionInvoice.findMany({
      where: { status: 'PENDING', [field]: null, createdAt: { lte: threshold } },
      include: { subscription: true },
      take: 100,
    });

    for (const invoice of invoices) {
      try {
        await this.notify.notifyUser({
          userId: invoice.subscription.userId,
          event: 'subscription-invoice-due',
          variables: {
            tierLabel: TIER_LABELS[invoice.subscription.tier],
            periodLabel: formatPeriodLabel(invoice.periodStart),
            amount: invoice.amount,
          },
        });
        await this.prisma.subscriptionInvoice.update({
          where: { id: invoice.id },
          data: { [field]: new Date() },
        });
      } catch (error) {
        this.logger.error(`[subscription-billing/reminder-${days}j] invoice=${invoice.id}`, error);
      }
    }
  }

  private async suspendOverdueAccounts(): Promise<void> {
    const cutoff = new Date(Date.now() - SUBSCRIPTION_SUSPENSION_DAYS * MS_PER_DAY);

    const invoices = await this.prisma.subscriptionInvoice.findMany({
      where: { status: 'PENDING', createdAt: { lte: cutoff } },
      include: { subscription: { include: { user: true } } },
      take: 100,
    });

    for (const invoice of invoices) {
      if (invoice.subscription.user.accountStatus !== 'ACTIVE') continue; // déjà suspendu
      try {
        await this.prisma.user.update({
          where: { id: invoice.subscription.userId },
          data: { accountStatus: 'SUSPENDED_PAYMENT' },
        });
        await this.notify.notifyUser({
          userId: invoice.subscription.userId,
          event: 'account-suspended',
          variables: { reason: 'abonnement impayé' },
        });
      } catch (error) {
        this.logger.error(`[subscription-billing/suspend] invoice=${invoice.id}`, error);
      }
    }
  }
}
