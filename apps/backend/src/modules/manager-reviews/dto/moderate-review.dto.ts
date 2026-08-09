import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ModerateReviewDto {
  @ApiProperty({ description: 'true = masque l’avis de l’annuaire public, false = le réaffiche' })
  @IsBoolean()
  isHidden!: boolean;
}
