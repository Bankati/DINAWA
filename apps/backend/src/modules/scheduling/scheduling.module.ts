import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { ManagerReportsModule } from '../manager-reports/manager-reports.module';
import { PaymentsModule } from '../payments/payments.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { InactivityTask } from './inactivity.task';
import { SupabaseKeepaliveTask } from './supabase-keepalive.task';
import { RemindersTask } from './reminders.task';
import { OverdueAlertsTask } from './overdue.task';
import { MonthlyReportsTask } from './monthly-reports.task';
import { PaydunyaReconciliationTask } from './paydunya-reconciliation.task';
import { PayoutsTask } from './payouts.task';
import { SubscriptionBillingTask } from './subscription-billing.task';

@Module({
  imports: [
    AccountModule,
    ManagerReportsModule,
    PaymentsModule,
    PayoutsModule,
    SubscriptionsModule,
    PlatformSettingsModule,
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
  ],
})
export class SchedulingModule {}
