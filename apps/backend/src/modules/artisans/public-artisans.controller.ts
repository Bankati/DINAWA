import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArtisanDirectoryStatus } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { THROTTLE_ARTISAN_CONSENT, THROTTLE_PUBLIC_ARTISANS } from '../../common/constants';
import { ArtisansService } from './artisans.service';
import { ListPublicArtisansQueryDto } from './dto/list-artisans-query.dto';
import { ArtisanConsentDecisionDto } from './dto/artisan-decisions.dto';
import { ArtisanConsentView, PaginatedPublicArtisans, PublicArtisanDetail } from './artisans.types';

// Annuaire public des artisans (unité 52) : seulement les artisans qui ont
// eux-mêmes accepté (directoryStatus = PUBLIC), SANS leur numéro (décision du
// boss, 2026-11-28) : le numéro passe par GET /artisans/annuaire, connecté.
@ApiTags('Artisans publics')
@Controller('public/artisans')
@Public()
@Throttle(THROTTLE_PUBLIC_ARTISANS)
export class PublicArtisansController {
  constructor(private readonly artisans: ArtisansService) {}

  @Get()
  @ApiOperation({ summary: 'Annuaire public des artisans (métier, quartier, nom)' })
  findAll(@Query() query: ListPublicArtisansQueryDto): Promise<PaginatedPublicArtisans> {
    return this.artisans.findAllPublic(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fiche publique d’un artisan avec ses avis' })
  findOne(@Param('id') id: string): Promise<PublicArtisanDetail> {
    return this.artisans.findOnePublic(id);
  }
}

// Page d'accord ouverte par l'artisan depuis le lien reçu : le jeton signé
// de l'URL est la seule autorisation (comme le lien de paiement public).
@ApiTags('Artisans publics')
@Controller('public/artisan-consent')
@Public()
@Throttle(THROTTLE_ARTISAN_CONSENT)
export class ArtisanConsentController {
  constructor(private readonly artisans: ArtisansService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Ce que l’artisan accepte (fiche, texte d’accord et sa version)' })
  show(@Param('token') token: string): Promise<ArtisanConsentView> {
    return this.artisans.getConsent(token);
  }

  @Post(':token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Réponse de l’artisan : accepte ou refuse l’annuaire public' })
  decide(
    @Param('token') token: string,
    @Body() dto: ArtisanConsentDecisionDto,
  ): Promise<{ directoryStatus: ArtisanDirectoryStatus }> {
    return this.artisans.decideConsent(token, dto);
  }
}
