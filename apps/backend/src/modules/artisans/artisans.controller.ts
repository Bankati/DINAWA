import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { ArtisansService } from './artisans.service';
import { CreateArtisanDto } from './dto/create-artisan.dto';
import { UpdateArtisanDto } from './dto/update-artisan.dto';
import { ListArtisansQueryDto } from './dto/list-artisans-query.dto';
import { ArtisanContactView, ArtisanInvitationView, PaginatedArtisanContacts } from './artisans.types';

// Carnet d'artisans du propriétaire ou du gestionnaire (unité 51).
@ApiTags('Artisans')
@ApiBearerAuth()
@Controller('artisans')
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class ArtisansController {
  constructor(private readonly artisans: ArtisansService) {}

  @Get()
  @ApiOperation({ summary: 'Mon carnet d’artisans (filtres métier, quartier, nom)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListArtisansQueryDto,
  ): Promise<PaginatedArtisanContacts> {
    return this.artisans.listContacts(user, query);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Ajoute un artisan au carnet — si le numéro existe déjà, la fiche existante est ajoutée',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateArtisanDto): Promise<ArtisanContactView> {
    return this.artisans.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifie la fiche (créateur, fiche non publique) ou la note privée' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateArtisanDto,
  ): Promise<ArtisanContactView> {
    return this.artisans.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Retire l’artisan du carnet (sa fiche et ses avis restent)' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.artisans.removeContact(user, id);
  }

  @Post(':id/invitation')
  @HttpCode(201)
  @ApiOperation({ summary: 'Lien d’accord pour l’annuaire public, à envoyer à l’artisan' })
  invite(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<ArtisanInvitationView> {
    return this.artisans.createInvitation(user, id);
  }
}
