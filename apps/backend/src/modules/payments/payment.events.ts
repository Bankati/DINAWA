export const PAYMENT_CONFIRMED = 'payment.confirmed';

// Émis quand un Payment passe effectivement à PAID — saisie manuelle
// (source = MANUAL_OWNER, immédiat) ou confirmation d'une déclaration
// locataire (source = TENANT_DECLARATION, voir PaymentsService.confirm()).
// Écouté par PaymentConfirmedListener (voir build-plan.md unité 22) pour
// générer la quittance et notifier les deux parties — jamais de logique de
// notification directement dans PaymentsService (invariant #6).
export type PaymentConfirmedEvent = {
  paymentId: string;
};
