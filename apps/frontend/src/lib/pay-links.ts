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

// Message lisible pour chaque échec possible — jamais un échec avalé.
export function payLinkErrorMessage(error: unknown): string {
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
