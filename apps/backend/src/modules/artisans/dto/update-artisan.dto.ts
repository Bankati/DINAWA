import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateArtisanDto } from './create-artisan.dto';

// Le numéro identifie l'artisan (fiche partagée) : il ne se modifie pas.
// Pour un autre numéro, on ajoute un autre artisan.
export class UpdateArtisanDto extends PartialType(OmitType(CreateArtisanDto, ['phone', 'privateNote'] as const)) {
  @ApiPropertyOptional({ description: 'Note privée (chaîne vide pour l’effacer)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  privateNote?: string;
}
