// Partagé entre SubscriptionsService (paiement à la demande) et
// SubscriptionBillingTask (facturation mensuelle + relances) — voir
// /architect abonnements, 2026-09-30.
export function formatPeriodLabel(periodStart: Date): string {
  return periodStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}
