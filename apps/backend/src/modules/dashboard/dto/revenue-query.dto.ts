import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { DashboardPeriodType } from '../dashboard.types';

export class RevenueQueryDto {
  @ApiPropertyOptional({ enum: DashboardPeriodType, default: DashboardPeriodType.MONTH })
  @IsOptional()
  @IsEnum(DashboardPeriodType)
  period?: DashboardPeriodType;

  @ApiPropertyOptional({ description: '1-12, ignoré si period=YEAR' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({
    description: 'Restreint le volet "biens sous mandat" à ce propriétaire mandant',
  })
  @IsOptional()
  @IsString()
  ownerId?: string;
}
