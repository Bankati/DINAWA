import { ApiProperty } from '@nestjs/swagger';
import { PayoutOperator } from '@prisma/client';
import { IsEmail, IsEnum, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SignupManagerDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  // Politique de mot de passe interne (voir modules/auth/token.service.ts)
  // — minimum 6 caractères, hashé en bcrypt avant stockage.
  @ApiProperty()
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: '90330557' })
  @IsString()
  @Matches(/^\+?\d{8,15}$/, { message: 'phone doit être un numéro valide' })
  phone!: string;

  // Opérateur mobile money de `phone` — voir signup-owner.dto.ts.
  @ApiProperty({ enum: PayoutOperator, example: PayoutOperator.TMONEY })
  @IsEnum(PayoutOperator)
  payoutOperator!: PayoutOperator;

  // Texte libre, sans logique métier attachée (voir /architect révision
  // inscription owner/manager).
  @ApiProperty({ example: 'Lomé' })
  @IsString()
  @MaxLength(100)
  city!: string;
}
