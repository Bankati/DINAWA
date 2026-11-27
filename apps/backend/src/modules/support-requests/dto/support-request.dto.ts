import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArtisanTrade,
  InterventionCostPayer,
  SupportRequestStatus,
  SupportRequestUrgency,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);
// Formulaire multipart : un champ vide arrive en chaîne vide.
const emptyToUndefined = ({ value }: { value: unknown }): unknown =>
  value === '' || value === null ? undefined : value;

// Signalement par le locataire (multipart : champs texte + photos).
export class CreateSupportRequestDto {
  @ApiProperty({ example: "L'eau coule sous l'évier de la cuisine depuis ce matin." })
  @Transform(trim)
  @IsString()
  @MinLength(10, { message: 'Décrivez la panne en au moins 10 caractères' })
  @MaxLength(1000)
  description!: string;

  @ApiPropertyOptional({ enum: ArtisanTrade })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(ArtisanTrade)
  trade?: ArtisanTrade;

  @ApiPropertyOptional({ enum: SupportRequestUrgency, default: SupportRequestUrgency.NORMAL })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(SupportRequestUrgency)
  urgency?: SupportRequestUrgency;
}

export class ListSupportRequestsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: SupportRequestStatus })
  @IsOptional()
  @IsEnum(SupportRequestStatus)
  status?: SupportRequestStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  propertyId?: string;
}

export class AssignArtisanDto {
  @ApiProperty({ description: 'Artisan de votre carnet ou de l’annuaire public' })
  @IsString()
  @MaxLength(40)
  artisanId!: string;
}

// Avancement décidé par le responsable du bien.
export class UpdateSupportRequestStatusDto {
  @ApiProperty({ enum: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'] })
  @IsIn(['IN_PROGRESS', 'RESOLVED', 'CANCELLED'])
  status!: 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';

  @ApiPropertyOptional({ description: 'Coût de l’intervention en FCFA (à la clôture)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  costAmount?: number;

  @ApiPropertyOptional({ enum: InterventionCostPayer })
  @IsOptional()
  @IsEnum(InterventionCostPayer)
  costPaidBy?: InterventionCostPayer;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ReviewArtisanDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
