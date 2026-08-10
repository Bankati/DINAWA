import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectPaymentDto {
  @ApiProperty({ description: 'Motif obligatoire — communiqué au locataire' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  rejectionReason!: string;
}
