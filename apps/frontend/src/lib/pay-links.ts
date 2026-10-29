import { api, ApiError } from "@/lib/api";

// Lien de paiement public (unité 43) — miroir de PayLinkView côté backend
// (src/modules/pay-links/pay-links.service.ts). Volontairement minimal : le
// lien peut avoir été transféré à un tiers, jamais de nom de famille,
// téléphone, adresse précise ni autres paiements.
export type PayLinkStatus = "PAYABLE" | "PAID" | "UNAVAILABLE";

export type PayLinkView = {
  status: PayLinkStatus;
  paymentInProgress: boolean;
  tenantFirstName: string;
  propertyType: string;
  building: string | null;
  neighborhood: string;
  city: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  rentAmount: number;
  feeAmount: number;
  totalAmount: number;
  expiresAt: string;
};

// Valeurs attendues par l'API (héritées de PayDunya) ; affichées sous leurs
// noms commerciaux actuels — jamais « T-Money », ancien nom de Mixx by Yas.
export type PayLinkOperator = "TMONEY" | "FLOOZ";

export const PAY_LINK_OPERATORS: { value: PayLinkOperator; label: string; logo: string }[] = [
  { value: "TMONEY", label: "Mixx by Yas", logo: "/mixx-by-yas.png" },
  { value: "FLOOZ", label: "Flooz", logo: "/Flooz.jpg" },
];

export function getPayLink(token: string): Promise<PayLinkView> {
  return api.get<PayLinkView>(`/pay-links/${encodeURIComponent(token)}`);
}

export function initiatePayLink(
  token: string,
  paymentMethod: PayLinkOperator,
): Promise<{ checkoutUrl: string }> {
  return api.post<{ checkoutUrl: string }>(`/pay-links/${encodeURIComponent(token)}/initiate`, {
    paymentMethod,
  });
}

// Dates affichées à l'heure de Lomé (UTC+0), comme tous les documents WARAH.
const DATE_FR = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Lome",
});
const MONTH_FR = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "Africa/Lome",
});

export function formatPayLinkDate(iso: string): string {
  return DATE_FR.format(new Date(iso));
}

// « Loyer d'octobre 2026 » pour un loyer mensuel, sinon la période complète
// (trimestriel, semestriel, annuel).
export function formatPayLinkPeriod(view: Pick<PayLinkView, "periodStart" | "periodEnd">): string {
  const start = new Date(view.periodStart);
  const end = new Date(view.periodEnd);
  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth();
  if (sameMonth) {
    const month = MONTH_FR.format(start);
    return /^[aeiouéèêh]/i.test(month) ? `Loyer d'${month}` : `Loyer de ${month}`;
  }
  return `Loyer du ${formatPayLinkDate(view.periodStart)} au ${formatPayLinkDate(view.periodEnd)}`;
}

// Délai au-delà duquel on prévient d'une connexion lente (réseaux mobiles
// faibles) sans abandonner la requête en cours.
export const PAY_LINK_SLOW_MS = 15_000;

// expired : définitif, « Réessayer » ne servirait à rien ;
// invalid : lien abîmé ou inconnu, définitif aussi ;
// retryable : réseau coupé, trop de tentatives (429) ou panne serveur (5xx).
export type PayLinkErrorKind = "expired" | "invalid" | "retryable";

export const PAY_LINK_EXPIRED_MESSAGE =
  "Le paiement en ligne n'est plus possible pour ce loyer. Contactez votre agence pour le régler.";
export const PAY_LINK_INVALID_MESSAGE =
  "Ce lien de paiement n'est pas valide. Vérifiez que vous avez ouvert le lien complet reçu par WhatsApp ou SMS.";

export function payLinkErrorKind(error: unknown): PayLinkErrorKind {
  if (!(error instanceof ApiError)) return "retryable";
  // Le serveur renvoie aujourd'hui 400 « Lien expiré… » ; 410 est accepté
  // d'avance pour le jour où il passera au code dédié.
  if (error.status === 410 || (error.status === 400 && /expir/i.test(error.message))) return "expired";
  if (error.status === 408 || error.status === 429 || error.status >= 500) return "retryable";
  return "invalid";
}

// Message lisible pour chaque échec possible — jamais un échec avalé.
export function payLinkErrorMessage(error: unknown): string {
  // Pas le message du serveur (« demandez-en un nouveau ») : le robot refuse
  // d'en renvoyer un pour un loyer dont le lien a expiré.
  if (payLinkErrorKind(error) === "expired") return `Ce lien a expiré. ${PAY_LINK_EXPIRED_MESSAGE}`;
  if (error instanceof ApiError) {
    if (error.status === 429) return "Trop de tentatives. Réessayez dans une minute.";
    if (error.status === 404) return "Ce lien de paiement n'est pas valide.";
    if (error.status >= 500 && error.status !== 503) {
      return "Le service est momentanément indisponible. Réessayez dans quelques instants.";
    }
    return error.message;
  }
  return "Connexion impossible. Vérifiez votre accès à internet puis réessayez.";
}
