import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  // Mêmes règles que signup-owner.dto.ts/signup-manager.dto.ts — bug corrigé
  // le 2026-08-11 : ce champ n'existait pas ici, le ValidationPipe global
  // (whitelist) rejetait toute la requête (photo comprise) dès que le
  // formulaire envoyait phone/city.
  @ApiPropertyOptional({ example: '90330557' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{8,15}$/, { message: 'phone doit être un numéro valide' })
  phone?: string;

  @ApiPropertyOptional({ example: 'Lomé' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Jours avant échéance pour le rappel de loyer' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  reminderDaysBefore?: number;

  @ApiPropertyOptional({ description: "Jours de grâce avant l'alerte d'impayé" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  overdueGraceDays?: number;
}
