import { ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionTier } from '@prisma/client';
import { ArrayUnique, IsArray, IsBoolean, IsEnum, IsOptional } from 'class-validator';

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

  // Liste vide autorisée : la direction peut retirer WhatsApp de tous les
  // forfaits sans couper l'interrupteur technique WHATSAPP_ENABLED.
  @ApiPropertyOptional({
    description:
      'Forfaits dont les locataires ont accès à WhatsApp (forfait du responsable du bien : ' +
      'gestionnaire du mandat actif, sinon propriétaire)',
    enum: SubscriptionTier,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(SubscriptionTier, { each: true })
  whatsappEnabledTiers?: SubscriptionTier[];
}
