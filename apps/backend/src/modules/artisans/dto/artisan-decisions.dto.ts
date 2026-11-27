import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class ArtisanConsentDecisionDto {
  @ApiProperty({ enum: ['ACCEPT', 'REFUSE'] })
  @IsIn(['ACCEPT', 'REFUSE'])
  decision!: 'ACCEPT' | 'REFUSE';

  @ApiProperty({ description: 'Version du texte d’accord affiché (renvoyée par GET)' })
  @IsString()
  @MaxLength(40)
  noticeVersion!: string;
}

export class SuspendArtisanDto {
  @ApiProperty({ description: 'Motif obligatoire (journal d’audit)' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
