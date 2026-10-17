import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { ManagerReportsModule } from '../manager-reports/manager-reports.module';
import { PaymentsModule } from '../payments/payments.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { PayLinksModule } from '../pay-links/pay-links.module';
import { WhatsappChannelModule } from '../whatsapp-channel/whatsapp-channel.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { WhatsappWebhookModule } from '../whatsapp-webhook/whatsapp-webhook.module';
import { InactivityTask } from './inactivity.task';
import { SupabaseKeepaliveTask } from './supabase-keepalive.task';
import { RemindersTask } from './reminders.task';
import { OverdueAlertsTask } from './overdue.task';
import { MonthlyReportsTask } from './monthly-reports.task';
import { PaydunyaReconciliationTask } from './paydunya-reconciliation.task';
import { PayoutsTask } from './payouts.task';
import { SubscriptionBillingTask } from './subscription-billing.task';
import { WhatsappInboundRecoveryTask } from './whatsapp-inbound-recovery.task';
import { WhatsappRetryTask } from './whatsapp-retry.task';

@Module({
  imports: [
    AccountModule,
    ManagerReportsModule,
    PaymentsModule,
    PayoutsModule,
    PayLinksModule,
    WhatsappChannelModule,
    SubscriptionsModule,
    PlatformSettingsModule,
    WhatsappWebhookModule,
  ],
  providers: [
    InactivityTask,
    SupabaseKeepaliveTask,
    RemindersTask,
    OverdueAlertsTask,
    MonthlyReportsTask,
    PaydunyaReconciliationTask,
    PayoutsTask,
    SubscriptionBillingTask,
    WhatsappInboundRecoveryTask,
    WhatsappRetryTask,
  ],
})
export class SchedulingModule {}
