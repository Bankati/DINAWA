import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { InactivityTask } from './inactivity.task';
import { SupabaseKeepaliveTask } from './supabase-keepalive.task';
import { RemindersTask } from './reminders.task';
import { OverdueAlertsTask } from './overdue.task';

@Module({
  imports: [AccountModule],
  providers: [InactivityTask, SupabaseKeepaliveTask, RemindersTask, OverdueAlertsTask],
})
export class SchedulingModule {}
