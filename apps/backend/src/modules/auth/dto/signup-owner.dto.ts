import { ApiProperty } from '@nestjs/swagger';
import { PayoutOperator } from '@prisma/client';
import { IsEmail, IsEnum, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SignupOwnerDto {
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

  // Opérateur mobile money de `phone` — WARAH y reverse les loyers payés en
  // ligne, aucun numéro séparé n'est demandé (voir /architect reversement,
  // révisé le 2026-09-28). Demandé une seule fois, ici, car PayDunya ne peut
  // pas deviner l'opérateur à partir du seul numéro.
  @ApiProperty({ enum: PayoutOperator, example: PayoutOperator.TMONEY })
  @IsEnum(PayoutOperator)
  payoutOperator!: PayoutOperator;

  // Texte libre, sans logique métier attachée (voir /architect révision
  // inscription owner/manager).
  @ApiProperty({ example: 'Lomé' })
  @IsString()
  @MaxLength(100)
  city!: string;

  // Code ISO 3166-1 alpha-2 (ex. "TG" pour un résident togolais, tout autre
  // code pour la diaspora) — aucune branche logique différente selon la
  // valeur, juste stocké tel quel sur OwnerProfile.
  @ApiProperty({ example: 'TG' })
  @IsString()
  @Matches(/^[A-Z]{2}$/, {
    message: 'residenceCountry doit être un code ISO 3166-1 alpha-2 (ex. TG)',
  })
  residenceCountry!: string;
}
