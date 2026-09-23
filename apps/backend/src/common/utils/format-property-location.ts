// `address` est optionnelle depuis 2026-09-22 (voir /recover) — cette
// fonction est le seul endroit qui décide comment afficher la localisation
// d'un bien quand l'adresse précise manque, pour ne pas avoir une phrase de
// repli différente à chaque endroit (email, PDF, notification).
export function formatPropertyLocation(property: {
  address?: string | null;
  neighborhood: string;
  city: string;
}): string {
  return [property.address, property.neighborhood, property.city].filter(Boolean).join(', ');
}
