import { tokenFingerprint } from './signed-token';

// Masque les jetons portés par une URL avant tout journal ou envoi à Sentry
// (unité 43) : un lien de paiement ou d'invitation est un droit d'accès, il
// n'a rien à faire dans les journaux de Railway ou de Sentry. Une courte
// empreinte non réversible est gardée pour pouvoir relier plusieurs lignes
// d'un même lien pendant un diagnostic.
const PATH_TOKEN_SEGMENTS = /\/(pay-links|payer)\/([^/?#]+)/g;
const QUERY_TOKEN_PARAM = /([?&]token=)[^&#]*/gi;
// Jeton de la poignée de main du webhook Meta (GET /webhooks/whatsapp,
// unité 44) : un secret de configuration, présent dans l'URL. Meta l'envoie
// deux fois, `hub.verify_token` ET `hub_verify_token` (constaté lors de
// l'abonnement réel du 2026-10-13).
const QUERY_VERIFY_TOKEN_PARAM = /([?&]hub[._]verify_token=)[^&#]*/gi;

export function maskSensitiveUrl(url: string): string;
export function maskSensitiveUrl(url: string | undefined): string | undefined;
export function maskSensitiveUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  return url
    .replace(PATH_TOKEN_SEGMENTS, (_match, segment: string, token: string) => {
      return `/${segment}/[jeton:${tokenFingerprint(decodeURIComponentSafe(token))}]`;
    })
    .replace(QUERY_TOKEN_PARAM, '$1[masqué]')
    .replace(QUERY_VERIFY_TOKEN_PARAM, '$1[masqué]');
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
