import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { DashboardScope } from '../dashboard.types';

export class ScopeQueryDto {
  @ApiPropertyOptional({ enum: DashboardScope, default: DashboardScope.ALL })
  @IsOptional()
  @IsEnum(DashboardScope)
  scope?: DashboardScope;
}
