import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { TenantsService, PaginatedLeaseHistory, TenantSummary } from './tenants.service';
import { LeaseHistoryQueryDto } from './dto/lease-history-query.dto';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Liste les locataires invités par le propriétaire/gestionnaire courant',
  })
  listTenants(@CurrentUser() user: AuthenticatedUser): Promise<TenantSummary[]> {
    return this.tenantsService.listInvitedTenants(user);
  }

  @Get(':tenantUserId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: "Détail d'un locataire invité par le propriétaire/gestionnaire courant",
  })
  getTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenantUserId') tenantUserId: string,
  ): Promise<TenantSummary> {
    return this.tenantsService.getTenantById(user, tenantUserId);
  }

  @Delete(':tenantUserId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Supprime un locataire (propriétaire/gestionnaire courant uniquement)' })
  removeTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenantUserId') tenantUserId: string,
  ) {
    return this.tenantsService.removeTenant(user, tenantUserId);
  }

  @Get(':tenantUserId/leases/history')
  // Accessible au locataire lui-même en plus des rôles habituels — le
  // service vérifie qu'il ne consulte que son propre historique (voir
  // /architect unité 14).
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN, UserRole.TENANT)
  @ApiOperation({
    summary: "Historique complet des baux passés et présent d'un locataire",
  })
  getLeasesHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenantUserId') tenantUserId: string,
    @Query() query: LeaseHistoryQueryDto,
  ): Promise<PaginatedLeaseHistory> {
    return this.tenantsService.getTenantLeasesHistory(user, tenantUserId, query);
  }
}
