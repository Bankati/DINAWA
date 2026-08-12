import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword!: string;

  // Même règle qu'à l'inscription (signup-owner.dto.ts) — aucune contrainte
  // de complexité en base, juste une longueur minimale.
  @ApiProperty()
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
