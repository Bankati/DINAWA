import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { DeclarablePaymentMethod } from './create-payment-declaration.dto';

const DECLARABLE_PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER'] as const;

// Modification autorisée uniquement tant que la déclaration est
// PENDING_CONFIRMATION (voir build-plan.md unité 20) — vérifié dans le
// service, jamais dans le DTO.
export class UpdatePaymentDeclarationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  declaredAmount?: number;

  @ApiPropertyOptional({ description: 'Date effective du paiement (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  declaredAt?: string;

  @ApiPropertyOptional({ enum: DECLARABLE_PAYMENT_METHODS })
  @IsOptional()
  @IsIn(DECLARABLE_PAYMENT_METHODS)
  declaredMethod?: DeclarablePaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
