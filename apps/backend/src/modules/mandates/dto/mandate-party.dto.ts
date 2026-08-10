import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Sous-ensemble volontairement restreint de `User` — reflète exactement le
// `select` de MandatesService.findAllForUser(), jamais tout le modèle.
export class MandatePartyDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  phone!: string | null;
}
