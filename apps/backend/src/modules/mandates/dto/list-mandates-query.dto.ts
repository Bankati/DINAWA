import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { MandateStatus } from '@prisma/client';

export class ListMandatesQueryDto {
  @ApiPropertyOptional({ enum: MandateStatus })
  @IsOptional()
  @IsEnum(MandateStatus)
  status?: MandateStatus;
}
