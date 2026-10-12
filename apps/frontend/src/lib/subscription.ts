import { api } from "./api";

// Miroir de SubscriptionTier/SubscriptionStatus/QuotaStatus côté backend
// (apps/backend/src/modules/subscriptions/subscriptions.types.ts) — lecture
// seule pour le forfait/quota (voir /architect abonnements, 2026-09-30) :
// pas de bouton "changer de forfait gratuitement" tant qu'aucun vrai paiement
// n'existe derrière /subscription/upgrade. "Payer maintenant" est différent
// — une vraie facture PayDunya, jamais gratuite.
export type SubscriptionTier = "STARTER" | "PRO" | "PREMIUM" | "AGENCE";
export type SubscriptionStatus =
  "ACTIVE" | "PENDING_CANCELLATION" | "CANCELLED";

export interface QuotaStatus {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  managedPropertiesQuota: number | null;
  billablePropertiesCount: number;
  remaining: number | null;
  betaUntil: string | null;
  pendingInvoice: { amount: number; periodLabel: string } | null;
  freePromotionEndsAt: string | null;
}

export const SUBSCRIPTION_TIER_LABELS: Record<SubscriptionTier, string> = {
  STARTER: "Starter",
  PRO: "Pro",
  PREMIUM: "Premium",
  AGENCE: "Agence",
};

export const SUBSCRIPTION_TIER_TONE: Record<
  SubscriptionTier,
  "neutral" | "info" | "accent"
> = {
  STARTER: "neutral",
  PRO: "info",
  PREMIUM: "accent",
  AGENCE: "accent",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: "Actif",
  PENDING_CANCELLATION: "Résiliation prévue",
  CANCELLED: "Résilié",
};

export function getQuotaStatus(): Promise<QuotaStatus> {
  return api.get<QuotaStatus>("/subscription/quota");
}

export function payCurrentInvoice(): Promise<{
  invoiceId: string;
  checkoutUrl: string;
}> {
  return api.post<{ invoiceId: string; checkoutUrl: string }>(
    "/subscription/invoices/pay",
  );
}
