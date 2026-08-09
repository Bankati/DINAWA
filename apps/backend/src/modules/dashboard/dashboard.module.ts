import { Module } from '@nestjs/common';
import { DashboardManagerController } from './dashboard-manager.controller';
import { DashboardManagerService } from './dashboard-manager.service';

@Module({
  controllers: [DashboardManagerController],
  providers: [DashboardManagerService],
})
export class DashboardModule {}
