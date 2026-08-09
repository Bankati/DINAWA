import { Body, Controller, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ManagerReview, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { ManagerReviewsService } from './manager-reviews.service';
import { CreateManagerReviewDto } from './dto/create-manager-review.dto';
import { UpdateManagerReviewDto } from './dto/update-manager-review.dto';

@ApiTags('Manager Reviews')
@ApiBearerAuth()
@Controller('managers/:id/reviews')
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class ManagerReviewsController {
  constructor(private readonly managerReviews: ManagerReviewsService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary:
      'Laisse un avis sur un gestionnaire — réservé à un propriétaire ayant eu un mandat accepté avec lui',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') managerId: string,
    @Body() dto: CreateManagerReviewDto,
  ): Promise<ManagerReview> {
    return this.managerReviews.create(user, managerId, dto);
  }

  @Patch(':reviewId')
  @ApiOperation({ summary: 'Modifie son propre avis — jamais de suppression' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') managerId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateManagerReviewDto,
  ): Promise<ManagerReview> {
    return this.managerReviews.update(user, managerId, reviewId, dto);
  }
}
