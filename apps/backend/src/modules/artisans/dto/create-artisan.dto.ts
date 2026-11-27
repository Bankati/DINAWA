import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArtisanTrade } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normalizeTogoPhone } from '../../../common/utils/normalize-togo-phone';

const trimList = ({ value }: { value: unknown }): unknown =>
  Array.isArray(value)
    ? [...new Set((value as unknown[]).map((v) => (typeof v === 'string' ? v.trim() : v)).filter((v) => v !== ''))]
    : value;

export class CreateArtisanDto {
  @ApiProperty({ example: '90 12 34 56', description: 'Numéro togolais (8 chiffres, +228 accepté)' })
  @Transform(({ value }: { value: unknown }) => normalizeTogoPhone(value))
  @Matches(/^\d{8}$/, { message: 'Numéro togolais à 8 chiffres attendu' })
  phone!: string;

  @ApiProperty({ example: 'Kossi Plomberie' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName!: string;

  @ApiProperty({ enum: ArtisanTrade, isArray: true })
  @Transform(trimList)
  @IsArray()
  @ArrayMinSize(1, { message: 'Choisissez au moins un métier' })
  @ArrayMaxSize(5)
  @IsEnum(ArtisanTrade, { each: true })
  trades!: ArtisanTrade[];

  @ApiPropertyOptional({ type: [String], example: ['Bè', 'Tokoin'] })
  @IsOptional()
  @Transform(trimList)
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  zones?: string[];

  @ApiPropertyOptional({ description: 'Note privée, visible de vous seul' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  privateNote?: string;
}
