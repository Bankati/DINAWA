import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateContactMessageDto {
  @ApiProperty({ description: 'true = marqué comme traité, false = remis en nouveau' })
  @IsBoolean()
  handled!: boolean;
}
