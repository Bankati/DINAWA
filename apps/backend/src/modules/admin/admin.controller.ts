import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ManagerReview, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { Cacheable } from '../../common/decorators/cacheable.decorator';
import { CACHE_TTL_DASHBOARD, CACHE_TTL_LIST } from '../../common/constants';
import { AdminService } from './admin.service';
import { ManagerReviewsService } from '../manager-reviews/manager-reviews.service';
import { ModerateReviewDto } from '../manager-reviews/dto/moderate-review.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly managerReviews: ManagerReviewsService,
  ) {}

  @Get('stats')
  @Cacheable(CACHE_TTL_DASHBOARD)
  @ApiOperation({ summary: 'Statistiques globales plateforme (super admin)' })
  getStats(@Query('annee') annee?: number, @Query('mois') mois?: number) {
    return this.adminService.getStats(
      annee ? Number(annee) : undefined,
      mois ? Number(mois) : undefined,
    );
  }

  @Get('top-owners')
  @Cacheable(CACHE_TTL_DASHBOARD)
  @ApiOperation({ summary: 'Top propriétaires par volume de loyers encaissés (super admin)' })
  topOwners(
    @Query('limit') limit?: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminService.topOwners(limit ? Number(limit) : undefined, from, to);
  }

  @Get('top-managers')
  @Cacheable(CACHE_TTL_DASHBOARD)
  @ApiOperation({ summary: 'Top gestionnaires par nombre de mandats actifs (super admin)' })
  topManagers(@Query('limit') limit?: number) {
    return this.adminService.topManagers(limit ? Number(limit) : undefined);
  }

  @Get('transactions')
  @Cacheable(CACHE_TTL_LIST)
  @ApiOperation({ summary: 'Supervision de tous les paiements de la plateforme (super admin)' })
  listTransactions(@Query() query: ListTransactionsQueryDto) {
    return this.adminService.listTransactions(query);
  }

  @Get('audit-logs')
  @ApiOperation({
    summary: 'Journal d’audit de toute action mutante sur la plateforme (super admin)',
  })
  listAuditLogs(@Query() query: ListAuditLogsQueryDto) {
    return this.adminService.listAuditLogs(query);
  }

  @Get('users')
  @Cacheable(CACHE_TTL_LIST)
  @ApiOperation({ summary: 'Liste tous les comptes (super admin)' })
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: "Détail d'un compte (super admin)" })
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Post('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend manuellement un compte non-admin, avec motif (super admin)' })
  suspendUser(@Param('id') id: string, @Body() dto: SuspendUserDto) {
    return this.adminService.suspendUser(id, dto);
  }

  @Post('users/:id/reactivate')
  @ApiOperation({ summary: 'Lève une suspension et repasse le compte à ACTIVE (super admin)' })
  reactivateUser(@Param('id') id: string) {
    return this.adminService.reactivateUser(id);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Supprimer (anonymiser) un compte (super admin)' })
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Patch('reviews/:id/moderate')
  @ApiOperation({ summary: 'Masque ou réaffiche un avis signalé (super admin)' })
  moderateReview(@Param('id') id: string, @Body() dto: ModerateReviewDto): Promise<ManagerReview> {
    return this.managerReviews.moderate(id, dto);
  }
}
