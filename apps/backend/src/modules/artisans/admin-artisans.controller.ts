import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Artisan, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { ArtisansService } from './artisans.service';
import { AdminListArtisansQueryDto } from './dto/list-artisans-query.dto';
import { SuspendArtisanDto } from './dto/artisan-decisions.dto';
import { PaginatedAdminArtisans } from './artisans.types';

// Modération des artisans (unité 52) : badge « vérifié », retrait de
// l'annuaire avec motif, remise en place.
@ApiTags('Admin — artisans')
@ApiBearerAuth()
@Controller('admin/artisans')
@Roles(UserRole.ADMIN)
export class AdminArtisansController {
  constructor(private readonly artisans: ArtisansService) {}

  @Get()
  @ApiOperation({ summary: 'Tous les artisans (filtre statut, métier, quartier, nom)' })
  list(@Query() query: AdminListArtisansQueryDto): Promise<PaginatedAdminArtisans> {
    return this.artisans.adminList(query);
  }

  @Post(':id/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Pose le badge « vérifié »' })
  verify(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string): Promise<Artisan> {
    return this.artisans.adminSetVerified(admin, id, true);
  }

  @Post(':id/unverify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Retire le badge « vérifié »' })
  unverify(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string): Promise<Artisan> {
    return this.artisans.adminSetVerified(admin, id, false);
  }

  @Post(':id/suspend')
  @HttpCode(200)
  @ApiOperation({ summary: 'Retire l’artisan de l’annuaire (motif obligatoire)' })
  suspend(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SuspendArtisanDto,
  ): Promise<Artisan> {
    return this.artisans.adminSuspend(admin, id, dto.reason);
  }

  @Post(':id/reinstate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remet l’artisan dans son état d’avant le retrait' })
  reinstate(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string): Promise<Artisan> {
    return this.artisans.adminReinstate(admin, id);
  }
}
