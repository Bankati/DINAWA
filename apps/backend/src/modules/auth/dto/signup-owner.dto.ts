import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class SignupOwnerDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  // Politique de mot de passe déléguée à Supabase Auth (minimum 6
  // caractères par défaut) — pas de règle locale supplémentaire.
  @ApiProperty()
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty()
  @IsString()
  firstName!: string;

  @ApiProperty()
  @IsString()
  lastName!: string;

  @ApiProperty({ example: '90330557' })
  @IsString()
  @Matches(/^\+?\d{8,15}$/, { message: 'phone doit être un numéro valide' })
  phone!: string;

  // Texte libre, sans logique métier attachée (voir /architect révision
  // inscription owner/manager).
  @ApiProperty({ example: 'Lomé' })
  @IsString()
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
