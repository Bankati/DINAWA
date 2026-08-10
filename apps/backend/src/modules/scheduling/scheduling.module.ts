import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { ManagerReportsModule } from '../manager-reports/manager-reports.module';
import { InactivityTask } from './inactivity.task';
import { SupabaseKeepaliveTask } from './supabase-keepalive.task';
import { RemindersTask } from './reminders.task';
import { OverdueAlertsTask } from './overdue.task';
import { MonthlyReportsTask } from './monthly-reports.task';

@Module({
  imports: [AccountModule, ManagerReportsModule],
  providers: [
    InactivityTask,
    SupabaseKeepaliveTask,
    RemindersTask,
    OverdueAlertsTask,
    MonthlyReportsTask,
  ],
})
export class SchedulingModule {}
