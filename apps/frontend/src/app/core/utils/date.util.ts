/**
 * Convertit une Date (ou une chaîne ISO) en valeur `yyyy-MM-dd` attendue
 * par un `<input type="date">`. Sans cette conversion, patcher un
 * FormControl<string> avec un objet Date brut ne s'affiche pas
 * correctement dans le champ (l'accesseur de valeur écrit `Date.toString()`,
 * pas un format compris par l'input).
 */
export function toDateInputValue(
  date: Date | string | null | undefined,
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}
