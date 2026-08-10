import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';

// Même restriction que la saisie manuelle (voir create-manual-payment.dto.ts)
// — TMONEY/FLOOZ passent par Cashpay (unité 17, non construite), pas par une
// déclaration a posteriori.
const DECLARABLE_PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER'] as const;
export type DeclarablePaymentMethod = (typeof DECLARABLE_PAYMENT_METHODS)[number];

export class CreatePaymentDeclarationDto {
  @ApiProperty()
  @IsString()
  scheduleEntryId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  declaredAmount!: number;

  @ApiProperty({ description: 'Date effective du paiement (ISO 8601)' })
  @IsDateString()
  declaredAt!: string;

  @ApiProperty({ enum: DECLARABLE_PAYMENT_METHODS })
  @IsIn(DECLARABLE_PAYMENT_METHODS)
  declaredMethod!: DeclarablePaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
