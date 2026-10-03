import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';

export interface QuotaStatus {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  managedPropertiesQuota: number | null;
  billablePropertiesCount: number;
  remaining: number | null;
  betaUntil: Date | null;
  // Facture d'abonnement PENDING à régler, s'il y en a une — voir /architect
  // abonnements, 2026-09-30. Permet à la carte "Abonnement" du profil
  // d'afficher le bouton "Payer maintenant" sans appel réseau supplémentaire.
  pendingInvoice: { amount: number; periodLabel: string } | null;
  // Date de fin de l'offre de lancement plateforme (PlatformSettings,
  // jamais par utilisateur) — voir /architect bandeau promotionnel,
  // 2026-10-02. `null` si l'offre n'est pas active. Permet au bandeau
  // AppShell de lire la même route que la carte Abonnement du profil, sans
  // endpoint dédié.
  freePromotionEndsAt: Date | null;
}
