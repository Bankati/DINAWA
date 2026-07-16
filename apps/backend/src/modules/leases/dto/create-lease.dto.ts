import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentFrequency } from '@prisma/client';

// Jamais de `status` ni `ownerId` ici — un bail démarre toujours ACTIVE
// (aucune résiliation ne peut précéder sa création) et appartient toujours
// au propriétaire réel du bien (dérivé de `Property.ownerId`), jamais d'un
// tiers désigné par le client (même principe que CreatePropertyDto, voir
// /architect unité 12).
export class CreateLeaseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @ApiProperty({ description: "User.id d'un utilisateur role=TENANT déjà existant" })
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  monthlyRent!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  monthlyCharges!: number;

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
