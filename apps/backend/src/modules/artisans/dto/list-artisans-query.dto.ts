import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArtisanDirectoryStatus, ArtisanTrade } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PUBLIC_ARTISANS_MAX_PAGE_SIZE } from '../../../common/constants';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

class PageQuery {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ enum: ArtisanTrade })
  @IsOptional()
  @IsEnum(ArtisanTrade)
  trade?: ArtisanTrade;

  @ApiPropertyOptional({ description: 'Quartier ou ville (contient, insensible à la casse)' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  zone?: string;

  @ApiPropertyOptional({ description: 'Nom de l’artisan (contient, insensible à la casse)' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  search?: string;
}

// Carnet du propriétaire / gestionnaire.
export class ListArtisansQueryDto extends PageQuery {
  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

// Annuaire public : pages courtes (le contenu expose des numéros).
export class ListPublicArtisansQueryDto extends PageQuery {
  @ApiPropertyOptional({ default: PUBLIC_ARTISANS_MAX_PAGE_SIZE, maximum: PUBLIC_ARTISANS_MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PUBLIC_ARTISANS_MAX_PAGE_SIZE)
  limit?: number = PUBLIC_ARTISANS_MAX_PAGE_SIZE;
}

// Console d'administration.
export class AdminListArtisansQueryDto extends ListArtisansQueryDto {
  @ApiPropertyOptional({ enum: ArtisanDirectoryStatus })
  @IsOptional()
  @IsEnum(ArtisanDirectoryStatus)
  status?: ArtisanDirectoryStatus;
}
