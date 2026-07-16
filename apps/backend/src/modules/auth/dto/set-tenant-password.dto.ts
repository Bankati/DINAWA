import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SetTenantPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  password!: string;
}
