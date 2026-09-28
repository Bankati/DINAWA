import { ApiProperty } from '@nestjs/swagger';
import { PayoutOperator } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { normalizeTogoPhone } from '../../../common/utils/normalize-togo-phone';

export class UpsertPayoutAccountDto {
  @ApiProperty({ enum: PayoutOperator })
  @IsEnum(PayoutOperator)
  operator!: PayoutOperator;

  // Numéro togolais à 8 chiffres — l'indicatif +228 éventuel est retiré avant
  // validation (voir normalizeTogoPhone).
  @ApiProperty({ example: '90330557' })
  @Transform(({ value }) => normalizeTogoPhone(value))
  @Matches(/^\d{8}$/, { message: 'phone doit être un numéro togolais à 8 chiffres' })
  phone!: string;

  // Mot de passe du compte, exigé à chaque enregistrement/modification : ce
  // numéro décide où partent les loyers (voir /architect reversement).
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password!: string;
}
