import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { Cacheable } from '../../common/decorators/cacheable.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CACHE_TTL_DASHBOARD } from '../../common/constants';
import { DashboardManagerService } from './dashboard-manager.service';
import { RevenueQueryDto } from './dto/revenue-query.dto';
import { ScopeQueryDto } from './dto/scope-query.dto';
import { MonthlyRevenueQueryDto } from './dto/monthly-revenue-query.dto';
import {
  DashboardScope,
  ManagerDashboardAlerts,
  ManagerDashboardOwner,
  ManagerDashboardPerformance,
  ManagerDashboardRevenue,
  ManagerDashboardSummary,
  ManagerDashboardUpcomingPayment,
  ManagerMonthlyRevenue,
  PropertyTypeBreakdown,
} from './dashboard.types';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard/manager')
@Roles(UserRole.MANAGER)
export class DashboardManagerController {
  constructor(private readonly dashboardManagerService: DashboardManagerService) {}

  @Get('summary')
  @Cacheable(CACHE_TTL_DASHBOARD)
  @ApiOperation({
    summary:
      'Synthèse des biens sous mandat actif, répartition par statut, nombre de propriétaires mandants',
  })
  getSummary(@CurrentUser() user: AuthenticatedUser): Promise<ManagerDashboardSummary> {
    return this.dashboardManagerService.getSummary(user);
  }

  @Get('revenue')
  @Cacheable(CACHE_TTL_DASHBOARD)
  @ApiOperation({
    summary:
      'Encaissements de la période (mois/année), comparaison à la période précédente, ventilation biens propres/sous mandat',
  })
  getRevenue(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RevenueQueryDto,
  ): Promise<ManagerDashboardRevenue> {
    return this.dashboardManagerService.getRevenue(user, query);
  }

  @Get('alerts')
  @Cacheable(CACHE_TTL_DASHBOARD)
  @ApiOperation({
    summary:
      'Échéances impayées, baux expirant sous 30 jours, déclarations en attente de confirmation',
  })
  getAlerts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ScopeQueryDto,
  ): Promise<ManagerDashboardAlerts> {
    return this.dashboardManagerService.getAlerts(user, query.scope ?? DashboardScope.ALL);
  }

  @Get('owners')
  @Cacheable(CACHE_TTL_DASHBOARD)
  @ApiOperation({
    summary: 'Propriétaires mandants actuels, avec le nombre de biens confiés à chacun',
  })
  getOwners(@CurrentUser() user: AuthenticatedUser): Promise<ManagerDashboardOwner[]> {
    return this.dashboardManagerService.getOwners(user);
  }

  @Get('upcoming-payments')
  @Cacheable(CACHE_TTL_DASHBOARD)
  @ApiOperation({ summary: 'Prochaines échéances à venir, triées par date' })
  getUpcomingPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ScopeQueryDto,
  ): Promise<ManagerDashboardUpcomingPayment[]> {
    return this.dashboardManagerService.getUpcomingPayments(
      user,
      query.scope ?? DashboardScope.ALL,
    );
  }

  @Get('property-types')
  @Cacheable(CACHE_TTL_DASHBOARD)
  @ApiOperation({
    summary: 'Répartition des loyers par type de bien (composition du portefeuille)',
  })
  getPropertyTypeBreakdown(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ScopeQueryDto,
  ): Promise<PropertyTypeBreakdown[]> {
    return this.dashboardManagerService.getPropertyTypeBreakdown(
      user,
      query.scope ?? DashboardScope.ALL,
    );
  }

  @Get('monthly-revenue')
  @Cacheable(CACHE_TTL_DASHBOARD)
  @ApiOperation({ summary: 'Encaissements mensuels janvier-décembre pour une année donnée' })
  getMonthlyRevenue(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MonthlyRevenueQueryDto,
  ): Promise<ManagerMonthlyRevenue[]> {
    return this.dashboardManagerService.getMonthlyRevenue(
      user,
      query.scope ?? DashboardScope.ALL,
      query.year ?? new Date().getUTCFullYear(),
    );
  }

  @Get('properties/:id/performance')
  @Cacheable(CACHE_TTL_DASHBOARD)
  @ApiOperation({
    summary: 'Taux de recouvrement à temps sur les 6 derniers mois pour un bien donné',
  })
  getPropertyPerformance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ManagerDashboardPerformance> {
    return this.dashboardManagerService.getPropertyPerformance(user, id);
  }
}
