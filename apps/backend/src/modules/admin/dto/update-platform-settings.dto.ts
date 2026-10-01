import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePlatformSettingsDto {
  @ApiPropertyOptional({
    description: 'Suspend le blocage par quota de biens facturables sur toute la plateforme',
  })
  @IsOptional()
  @IsBoolean()
  subscriptionQuotasSuspended?: boolean;

  @ApiPropertyOptional({
    description: 'Active la facturation mensuelle automatique des abonnements',
  })
  @IsOptional()
  @IsBoolean()
  subscriptionBillingEnabled?: boolean;
}
