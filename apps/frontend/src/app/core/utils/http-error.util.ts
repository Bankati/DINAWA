import { HttpErrorResponse } from "@angular/common/http";

/**
 * Extrait un message d'erreur lisible depuis une réponse HTTP en erreur.
 * `HttpErrorResponse.error` est typé `any` par Angular (le corps de
 * l'erreur serveur est de forme inconnue) — ce helper centralise le seul
 * endroit où l'on suppose sa forme, plutôt que de la caster à chaque appel.
 */
export function extractErrorMessage(
  error: HttpErrorResponse,
  fallback: string,
): string {
  const body = error.error as { message?: string } | null | undefined;
  return body?.message || fallback;
}
