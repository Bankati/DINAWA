import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentFrequency } from '@prisma/client';

// Fusionne l'invitation du locataire et la création du bail en un seul
// appel (voir /architect révision paiements, 2026-07-25 — remplace le
// flux en deux étapes invite puis POST /api/leases). Les champs de bail
// sont obligatoires : il n'existe plus de chemin pour inviter un
// locataire sans immédiatement établir les conditions d'occupation.
export class InviteTenantDto {
  @ApiProperty()
  @IsString()
  propertyId!: string;

  // Canal de livraison de l'invitation — seul canal construit (aucun
  // fournisseur SMS dans ce projet), voir architecture.md.
  @ApiProperty()
  @IsEmail()
  email!: string;

  // Identifiant produit du locataire — fourni par l'inviteur, pas ressaisi
  // par le locataire à l'activation de son compte.
  @ApiProperty({ example: '90330557' })
  @IsString()
  @Matches(/^\+?\d{8,15}$/, { message: 'phone doit être un numéro valide' })
  phone!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  lastName!: string;

  // Optionnel — décision /architect : redemander le loyer déjà connu du bien
  // n'a pas de sens pour l'usage courant. Absent = reprend automatiquement
  // le loyer/charges actuels du bien au moment de la création du bail
  // (valeur figée sur ce bail, ne suit jamais un changement ultérieur du
  // prix affiché — voir AuthService.inviteTenant()). Reste modifiable pour
  // le cas où ce bail précis diverge du prix affiché (loyer négocié).
  @ApiPropertyOptional({
    description: 'Absent = reprend le loyer actuel du bien',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  monthlyRent?: number;

  @ApiPropertyOptional({
    description: 'Absent = reprend les charges actuelles du bien',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  monthlyCharges?: number;

  @ApiProperty({ enum: PaymentFrequency })
  @IsEnum(PaymentFrequency)
  paymentFrequency!: PaymentFrequency;

  @ApiProperty({ description: 'Date de début du bail (ISO 8601)' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ description: 'Absent = bail ouvert, calendrier glissant sur 12 mois' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  securityDeposit!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  depositReturnConditions?: string;

  @ApiPropertyOptional({
    description: 'Jours avant échéance pour le rappel — omis = pas de rappel configuré',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  reminderDaysBefore?: number;

  @ApiPropertyOptional({
    description:
      "Fenêtre (en jours) de l'alerte de retard après échéance — omis = pas d'alerte configurée",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  overdueAlertWindowDays?: number;
}
