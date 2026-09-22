import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PropertyType } from '@prisma/client';

// Jamais de `status` ni `ownerId` ici — voir /architect unité 12 : un bien
// démarre toujours VACANT (aucun bail ne peut exister avant sa création) et
// appartient toujours à l'utilisateur authentifié, jamais à un tiers désigné
// par le client.
export class CreatePropertyDto {
  @ApiProperty({ enum: PropertyType })
  @IsEnum(PropertyType)
  type!: PropertyType;

  // Optionnelle depuis 2026-09-22 — Quartier + Ville suffisent (voir
  // /recover, décision développeur : plus jugée importante).
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string | null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  neighborhood!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  city!: string;

  // Regroupement libre (voir /architect 2026-09-20) — texte saisi par
  // l'utilisateur, réutilise une valeur existante ou en crée une nouvelle.
  // Type `| null` uniquement pour matcher UpdatePropertyDto (toPayload() est
  // partagé création/édition côté frontend) — sans effet à la création.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  building?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0.01)
  surfaceArea?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomsCount?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  monthlyRent!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  monthlyCharges?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
