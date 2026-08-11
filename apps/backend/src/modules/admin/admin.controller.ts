import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ManagerReview, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { ManagerReviewsService } from '../manager-reviews/manager-reviews.service';
import { ModerateReviewDto } from '../manager-reviews/dto/moderate-review.dto';

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
  @ApiOperation({ summary: 'Statistiques globales plateforme (super admin)' })
  getStats(@Query('annee') annee?: number, @Query('mois') mois?: number) {
    return this.adminService.getStats(
      annee ? Number(annee) : undefined,
      mois ? Number(mois) : undefined,
    );
  }

  @Get('users')
  @ApiOperation({ summary: 'Liste tous les comptes (super admin)' })
  listUsers(
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listUsers({ role, search, page, limit });
  }

  @Get('users/:id')
  @ApiOperation({ summary: "Détail d'un compte (super admin)" })
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
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
