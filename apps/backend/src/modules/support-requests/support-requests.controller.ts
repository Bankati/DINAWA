import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { MAX_PHOTO_BYTES, MAX_PHOTOS_PER_SUPPORT_REQUEST } from '../../common/constants';
import { createMimeTypeFilter } from '../storage/mime-type-filter';
import { SupportRequestsService } from './support-requests.service';
import {
  AssignArtisanDto,
  CreateSupportRequestDto,
  ListSupportRequestsQueryDto,
  ReviewArtisanDto,
  UpdateSupportRequestStatusDto,
} from './dto/support-request.dto';
import { PaginatedSupportRequests, SupportRequestDetail } from './support-requests.types';

// Pannes côté locataire (unité 53) : seulement les siennes.
@ApiTags('Pannes — locataire')
@ApiBearerAuth()
@Controller('me/support-requests')
@Roles(UserRole.TENANT)
export class TenantSupportRequestsController {
  constructor(private readonly requests: SupportRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'Mes pannes signalées' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSupportRequestsQueryDto,
  ): Promise<PaginatedSupportRequests> {
    return this.requests.listForTenant(user, query);
  }

  @Post()
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: `Signale une panne (description, métier, urgence, ${MAX_PHOTOS_PER_SUPPORT_REQUEST} photos au plus)` })
  @UseInterceptors(
    FilesInterceptor('photos', MAX_PHOTOS_PER_SUPPORT_REQUEST, {
      limits: { fileSize: MAX_PHOTO_BYTES },
      fileFilter: createMimeTypeFilter('property-photos'),
    }),
  )
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupportRequestDto,
    @UploadedFiles() photos: Express.Multer.File[] = [],
  ): Promise<SupportRequestDetail> {
    return this.requests.createForTenant(user, dto, photos);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’une de mes pannes' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<SupportRequestDetail> {
    return this.requests.getForTenant(user, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Annule une panne pas encore en réparation' })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<SupportRequestDetail> {
    return this.requests.cancelForTenant(user, id);
  }
}

// Pannes côté responsable du bien (canActOnProperty dans le service).
@ApiTags('Pannes')
@ApiBearerAuth()
@Controller('support-requests')
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN)
export class SupportRequestsController {
  constructor(private readonly requests: SupportRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'Pannes des biens visibles (filtres statut, bien)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSupportRequestsQueryDto,
  ): Promise<PaginatedSupportRequests> {
    return this.requests.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’une panne avec photos' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<SupportRequestDetail> {
    return this.requests.get(user, id);
  }

  @Post(':id/assign')
  @HttpCode(200)
  @ApiOperation({ summary: 'Choisit (ou change) l’artisan — carnet ou annuaire' })
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AssignArtisanDto,
  ): Promise<SupportRequestDetail> {
    return this.requests.assign(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'En cours, terminée (coût) ou annulée' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSupportRequestStatusDto,
  ): Promise<SupportRequestDetail> {
    return this.requests.updateStatus(user, id, dto);
  }

  @Post(':id/review')
  @HttpCode(201)
  @ApiOperation({ summary: 'Note l’artisan après une réparation terminée (une fois)' })
  review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewArtisanDto,
  ): Promise<SupportRequestDetail> {
    return this.requests.review(user, id, dto);
  }
}

// Modération des avis sur les artisans (unité 54).
@ApiTags('Admin — artisans')
@ApiBearerAuth()
@Controller('admin/artisan-reviews')
@Roles(UserRole.ADMIN)
export class AdminArtisanReviewsController {
  constructor(private readonly requests: SupportRequestsService) {}

  @Post(':id/hide')
  @HttpCode(200)
  @ApiOperation({ summary: 'Masque un avis (exclu de la note moyenne)' })
  hide(@Param('id') id: string): Promise<{ id: string; isHidden: boolean }> {
    return this.requests.setReviewHidden(id, true);
  }

  @Post(':id/unhide')
  @HttpCode(200)
  @ApiOperation({ summary: 'Réaffiche un avis masqué' })
  unhide(@Param('id') id: string): Promise<{ id: string; isHidden: boolean }> {
    return this.requests.setReviewHidden(id, false);
  }
}
