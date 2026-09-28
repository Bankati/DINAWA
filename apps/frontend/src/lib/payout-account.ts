// Opérateur mobile money du numéro de compte — WARAH y reverse les loyers
// payés en ligne. Demandé une fois à l'inscription (OWNER/MANAGER), modifiable
// ensuite depuis le profil avec le téléphone (voir /architect reversement,
// révisé le 2026-09-28 : plus de numéro de réception séparé, c'est le même
// champ que le téléphone du compte).
export type PayoutOperator = "TMONEY" | "FLOOZ";

export const PAYOUT_OPERATOR_LABELS: Record<PayoutOperator, string> = {
  TMONEY: "T-Money",
  FLOOZ: "Flooz",
};

// Ramène une saisie libre ("+228 90 33 05 57") aux 8 chiffres attendus par
// l'API — même règle que le backend (normalizeTogoPhone).
export function normalizeTogoPhone(raw: string): string {
  const digits = raw
    .replace(/[\s.\-()]/g, "")
    .replace(/^\+/, "")
    .replace(/^00/, "");
  return digits.startsWith("228") && digits.length === 11
    ? digits.slice(3)
    : digits;
}

// "90330557" → "90 33 05 57"
export function formatTogoPhone(phone: string): string {
  return phone.replace(/(\d{2})(?=\d)/g, "$1 ");
}
