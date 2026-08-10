import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ListingsService, PaginatedPublicListings, PublicListingDetail } from './listings.service';
import { ListPublicListingsQueryDto } from './dto/list-public-listings-query.dto';

@ApiTags('Listings publiques')
@Controller('public/listings')
@Public()
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Annonces publiques actives, paginées et filtrables',
    description:
      'Aucune authentification requise. Alimentée automatiquement — jamais de publication manuelle.',
  })
  findAll(@Query() query: ListPublicListingsQueryDto): Promise<PaginatedPublicListings> {
    return this.listingsService.findAllPublic(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: "Fiche détaillée d'une annonce (par slug)" })
  findOne(@Param('slug') slug: string): Promise<PublicListingDetail> {
    return this.listingsService.findOnePublic(slug);
  }
}
