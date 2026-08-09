import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ManagerReviewsService } from './manager-reviews.service';
import { ListPublicManagersQueryDto } from './dto/list-public-managers-query.dto';
import { PaginatedPublicManagers, PublicManagerDetail } from './manager-reviews.types';

@ApiTags('Public Managers')
@Controller('public/managers')
@Public()
export class PublicManagersController {
  constructor(private readonly managerReviews: ManagerReviewsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Annuaire public des gestionnaires, filtrable par ville d’intervention et note minimale',
    description: 'Aucune authentification requise.',
  })
  findAll(@Query() query: ListPublicManagersQueryDto): Promise<PaginatedPublicManagers> {
    return this.managerReviews.findAllPublic(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Profil détaillé public d’un gestionnaire — portfolio et avis vérifiés',
  })
  findOne(@Param('id') id: string): Promise<PublicManagerDetail> {
    return this.managerReviews.findOnePublic(id);
  }
}
