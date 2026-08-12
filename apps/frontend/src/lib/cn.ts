import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Upgradé le 2026-08-11 (refonte design system) pour résoudre correctement
// les classes Tailwind conflictuelles (ex. `w-full` défini par un composant
// de base puis `w-auto` passé en override) — un clsx nu laissait les deux
// coexister et le résultat dépendait de l'ordre de génération du CSS.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
