import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { ManagerReportsModule } from '../manager-reports/manager-reports.module';
import { PaymentsModule } from '../payments/payments.module';
import { InactivityTask } from './inactivity.task';
import { SupabaseKeepaliveTask } from './supabase-keepalive.task';
import { RemindersTask } from './reminders.task';
import { OverdueAlertsTask } from './overdue.task';
import { MonthlyReportsTask } from './monthly-reports.task';
import { PaydunyaReconciliationTask } from './paydunya-reconciliation.task';

@Module({
  imports: [AccountModule, ManagerReportsModule, PaymentsModule],
  providers: [
    InactivityTask,
    SupabaseKeepaliveTask,
    RemindersTask,
    OverdueAlertsTask,
    MonthlyReportsTask,
    PaydunyaReconciliationTask,
  ],
})
export class SchedulingModule {}
