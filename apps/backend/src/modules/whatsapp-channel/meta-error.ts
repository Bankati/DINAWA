import { META_ERROR_GRID, MetaErrorRule, permissionRangeRule } from './meta-error-grid';

// Erreur normalisée renvoyée par WhatsappCloudClient — porte tout ce que
// Meta a dit (ou rien, si la réponse n'est jamais arrivée) pour que
// classifyMetaError() décide sans relire la réponse HTTP brute.
export class MetaApiError extends Error {
  constructor(
    message: string,
    // null = aucune réponse reçue (timeout, coupure réseau)
    readonly httpStatus: number | null,
    readonly errorCode: number | null = null,
    readonly errorSubcode: number | null = null,
  ) {
    super(message);
    this.name = 'MetaApiError';
  }
}

export type MetaErrorClassification = {
  status: 'FAILED' | 'UNKNOWN';
  retryable: boolean;
  alert: boolean;
};

const NO_RESPONSE: MetaErrorClassification = { status: 'UNKNOWN', retryable: false, alert: false };
const SERVER_ERROR: MetaErrorClassification = { status: 'UNKNOWN', retryable: false, alert: false };
const UNLISTED: MetaErrorClassification = { status: 'UNKNOWN', retryable: false, alert: true };

// Classe une erreur Meta selon ce que l'on SAIT de la tentative (voir
// meta-error-grid.ts). Le statut et le caractère réessayable sont deux
// réponses distinctes : une limite de débit est FAILED (rien n'est parti)
// ET réessayable. Toute la décision vient de la grille — jamais d'un
// `if (httpStatus === 400)`, Meta renvoyant des erreurs très différentes
// sous le même code HTTP.
export function classifyMetaError(error: {
  httpStatus: number | null;
  errorCode: number | null;
  errorSubcode: number | null;
}): MetaErrorClassification {
  // Aucune réponse : Meta a peut-être reçu et traité le message.
  if (error.httpStatus === null) return NO_RESPONSE;
  // Tout HTTP 5xx = UNKNOWN, AVANT la grille et quel que soit le code Meta
  // (même « temporairement indisponible ») : une erreur serveur ne garantit
  // pas que le message n'a pas été pris en compte, et un doublon WhatsApp est
  // pire qu'un message manqué (décision /review unité 42, 2026-10-08).
  if (error.httpStatus >= 500) return SERVER_ERROR;

  const rule = findRule(error.errorCode, error.errorSubcode);
  if (!rule) return UNLISTED;
  return { status: rule.status, retryable: rule.retryable, alert: rule.alert ?? false };
}

function findRule(code: number | null, subcode: number | null): MetaErrorRule | undefined {
  if (code === null) return undefined; // ex. 2xx sans wamid, 5xx sans corps d'erreur
  if (subcode !== null && META_ERROR_GRID[`${code}:${subcode}`]) {
    return META_ERROR_GRID[`${code}:${subcode}`];
  }
  return META_ERROR_GRID[`${code}`] ?? permissionRangeRule(code);
}
