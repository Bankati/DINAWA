import { Module } from '@nestjs/common';
import { DashboardManagerController } from './dashboard-manager.controller';
import { DashboardManagerService } from './dashboard-manager.service';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

// Deux dashboards distincts, routes disjointes : `dashboard/manager/*`
// (scope mandat ACTIVE, voir /architect unité 32) et `dashboard` (KPIs
// génériques propriétaire/gestionnaire sur leurs biens visibles).
@Module({
  controllers: [DashboardManagerController, DashboardController],
  providers: [DashboardManagerService, DashboardService],
})
export class DashboardModule {}
