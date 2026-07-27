import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';

// Saisie manuelle par le propriétaire/gestionnaire (voir build-plan.md
// unité 19) — jamais TMONEY/FLOOZ ici : ces méthodes passent par Cashpay
// (unité 17, non construite), la saisie manuelle ne couvre que l'espèce et
// le virement bancaire, réglés hors plateforme.
const MANUAL_PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER'] as const;
export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

export class CreateManualPaymentDto {
  @ApiProperty()
  @IsString()
  scheduleEntryId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  paidAmount!: number;

  @ApiProperty({ description: 'Date effective du paiement (ISO 8601)' })
  @IsDateString()
  paidAt!: string;

  @ApiProperty({ enum: MANUAL_PAYMENT_METHODS })
  @IsIn(MANUAL_PAYMENT_METHODS)
  paymentMethod!: ManualPaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
