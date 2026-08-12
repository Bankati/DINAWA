import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { ManagerReviewsService } from './manager-reviews.service';
import { ListPublicManagersQueryDto } from './dto/list-public-managers-query.dto';
import { PaginatedPublicManagers, PublicManagerDetail } from './manager-reviews.types';

// Nom de route/contrôleur hérité de l'unité 34 ("annuaire public"), mais ce
// n'est plus public depuis le 2026-08-12 — le développeur a explicitement
// demandé que l'annuaire ne soit visible qu'en étant connecté (Propriétaire
// ou Gestionnaire), y compris côté API et pas seulement côté frontend.
@ApiTags('Public Managers')
@ApiBearerAuth()
@Controller('public/managers')
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class PublicManagersController {
  constructor(private readonly managerReviews: ManagerReviewsService) {}

  @Get()
  @ApiOperation({
    summary: 'Annuaire des gestionnaires, filtrable par ville d’intervention et note minimale',
    description: 'Réservé aux Propriétaires et Gestionnaires connectés.',
  })
  findAll(@Query() query: ListPublicManagersQueryDto): Promise<PaginatedPublicManagers> {
    return this.managerReviews.findAllPublic(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Profil détaillé d’un gestionnaire — portfolio, avis vérifiés et email de contact',
  })
  findOne(@Param('id') id: string): Promise<PublicManagerDetail> {
    return this.managerReviews.findOnePublic(id);
  }
}
