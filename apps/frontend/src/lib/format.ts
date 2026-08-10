// Séparateur d'espace normal (jamais l'espace fine insécable U+202F que
// produit Intl.NumberFormat('fr-FR') par défaut) — comportement calqué sur
// l'ancien FcfaPipe Angular, à préserver à l'identique.
export function formatNumber(value: number): string {
  const rounded = Math.round(value);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function formatFcfa(value: number): string {
  return `${formatNumber(value)} FCFA`;
}

export function initiales(
  firstName?: string,
  lastName?: string,
  fallback = "?",
): string {
  const result = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
  return result || fallback;
}
