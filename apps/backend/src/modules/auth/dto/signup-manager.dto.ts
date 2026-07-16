import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class SignupManagerDto {
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
}
