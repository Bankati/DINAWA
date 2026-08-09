import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { MandateFeeType } from '@prisma/client';

// Un mandat est toujours créé par le propriétaire réel (Property.ownerId),
// jamais par un gestionnaire déjà mandaté sur le bien — voir /architect
// unité 31. propertyIds en tableau : un même gestionnaire peut être désigné
// pour plusieurs biens en un seul appel, mais chaque bien produit sa propre
// ligne Mandate (un mandat ne porte jamais sur plusieurs biens à la fois).
export class CreateMandateDto {
  @ApiProperty({
    type: [String],
    description: 'Biens à confier — tous doivent appartenir en propre à l’appelant',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  propertyIds!: string[];

  @ApiProperty({ description: 'Identifiant du gestionnaire désigné (jamais par email/téléphone)' })
  @IsString()
  managerId!: string;

  @ApiProperty({ enum: MandateFeeType })
  @IsEnum(MandateFeeType)
  feeType!: MandateFeeType;

  // Pas de @Max ici — la borne à 100 pour PERCENTAGE dépend de feeType,
  // vérifiée dans MandatesService.create() plutôt qu'en cross-field DTO.
  @ApiProperty({ description: 'Pourcentage (1-100) si PERCENTAGE, montant FCFA entier si FLAT' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  feeValue!: number;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
