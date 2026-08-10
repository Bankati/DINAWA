import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantPropertyBlock, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { TenantsService, PaginatedLeaseHistory } from './tenants.service';
import { BlockTenantDto } from './dto/block-tenant.dto';
import { LeaseHistoryQueryDto } from './dto/lease-history-query.dto';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('properties/:propertyId/tenants')
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN)
export class PropertyTenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post(':tenantUserId/block')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Bloque un locataire pour ce bien précis (justification obligatoire)',
  })
  blockTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('propertyId') propertyId: string,
    @Param('tenantUserId') tenantUserId: string,
    @Body() dto: BlockTenantDto,
  ): Promise<TenantPropertyBlock> {
    return this.tenantsService.blockTenant(user, propertyId, tenantUserId, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Historique des baux (passés et présent) de ce bien' })
  getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('propertyId') propertyId: string,
    @Query() query: LeaseHistoryQueryDto,
  ): Promise<PaginatedLeaseHistory> {
    return this.tenantsService.getPropertyTenantsHistory(user, propertyId, query);
  }
}
