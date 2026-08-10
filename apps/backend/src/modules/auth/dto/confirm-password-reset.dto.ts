import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class ConfirmPasswordResetDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code doit être composé de 6 chiffres' })
  code!: string;

  // Politique de mot de passe déléguée à Supabase Auth (minimum 6
  // caractères par défaut) — pas de règle locale supplémentaire.
  @ApiProperty()
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
