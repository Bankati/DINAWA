import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
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

  @Patch('reviews/:id/moderate')
  @ApiOperation({ summary: 'Masque ou réaffiche un avis signalé (super admin)' })
  moderateReview(@Param('id') id: string, @Body() dto: ModerateReviewDto): Promise<ManagerReview> {
    return this.managerReviews.moderate(id, dto);
  }
}
