import { ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutOperator } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

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

  // Opérateur mobile money de `phone` — OWNER/MANAGER uniquement, c'est le
  // numéro où WARAH reverse les loyers (voir /architect reversement, révisé
  // le 2026-09-28). Sans effet pour TENANT/ADMIN.
  @ApiPropertyOptional({ enum: PayoutOperator })
  @IsOptional()
  @IsEnum(PayoutOperator)
  payoutOperator?: PayoutOperator;

  // Exigé par ProfileService.updateProfile() uniquement quand `phone` ou
  // `payoutOperator` change pour un OWNER/MANAGER — ce numéro décide où
  // partent les loyers, jamais modifiable sans reconfirmer le mot de passe
  // (même garde que l'ancien PayoutAccountsService, voir /architect
  // reversement 2026-09-25).
  @ApiPropertyOptional({
    description:
      'Mot de passe actuel — requis uniquement si phone ou payoutOperator change pour un OWNER/MANAGER',
  })
  @IsOptional()
  @IsString()
  password?: string;

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
