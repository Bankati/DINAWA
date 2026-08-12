import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { DashboardScope } from '../dashboard.types';

export class MonthlyRevenueQueryDto {
  @ApiPropertyOptional({ enum: DashboardScope, default: DashboardScope.ALL })
  @IsOptional()
  @IsEnum(DashboardScope)
  scope?: DashboardScope;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number;
}
