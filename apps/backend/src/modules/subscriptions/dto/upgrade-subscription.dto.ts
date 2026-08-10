import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SubscriptionTier } from '@prisma/client';

export class UpgradeSubscriptionDto {
  @ApiProperty({
    enum: SubscriptionTier,
    description: 'Forfait cible — doit être strictement supérieur au forfait courant',
  })
  @IsEnum(SubscriptionTier)
  tier!: SubscriptionTier;
}
