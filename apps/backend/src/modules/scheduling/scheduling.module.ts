import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { InactivityTask } from './inactivity.task';

@Module({
  imports: [AccountModule],
  providers: [InactivityTask],
})
export class SchedulingModule {}
