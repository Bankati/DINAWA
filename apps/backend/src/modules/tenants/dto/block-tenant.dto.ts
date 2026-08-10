import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class BlockTenantDto {
  @ApiProperty({ description: 'Justification obligatoire du blocage' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}
