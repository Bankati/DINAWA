import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SuspendUserDto {
  @ApiProperty({ description: "Motif de la suspension, communiqué à l'utilisateur par email" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
