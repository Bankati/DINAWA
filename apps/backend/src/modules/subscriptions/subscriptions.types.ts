import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';

export interface QuotaStatus {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  managedPropertiesQuota: number | null;
  billablePropertiesCount: number;
  remaining: number | null;
  betaUntil: Date | null;
}
