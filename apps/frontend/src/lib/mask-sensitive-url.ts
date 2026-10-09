// Masque les jetons d'accès portés par une URL avant envoi à Sentry
// (unité 43) — miroir de apps/backend/src/common/utils/mask-sensitive-url.ts,
// sans empreinte (aucune cryptographie côté navigateur pour ça).
const PATH_TOKEN_SEGMENTS = /\/(pay-links|payer)\/([^/?#]+)/g;
const QUERY_TOKEN_PARAM = /([?&]token=)[^&#]*/gi;

export function maskSensitiveUrl(url: string): string;
export function maskSensitiveUrl(url: string | undefined): string | undefined;
export function maskSensitiveUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  return url.replace(PATH_TOKEN_SEGMENTS, "/$1/[jeton]").replace(QUERY_TOKEN_PARAM, "$1[masqué]");
}

type ScrubbableEvent = {
  request?: { url?: string; query_string?: unknown };
  transaction?: string;
  breadcrumbs?: { message?: string; data?: Record<string, unknown> }[];
};

// Erreurs, traces et fil d'Ariane (navigations, appels fetch) nettoyés.
export function scrubSentryEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request) {
    event.request.url = maskSensitiveUrl(event.request.url);
    if (typeof event.request.query_string === "string") {
      event.request.query_string = maskSensitiveUrl(`?${event.request.query_string}`).slice(1);
    } else if (event.request.query_string) {
      event.request.query_string = "[masqué]";
    }
  }
  event.transaction = maskSensitiveUrl(event.transaction);
  for (const breadcrumb of event.breadcrumbs ?? []) {
    breadcrumb.message = maskSensitiveUrl(breadcrumb.message);
    if (breadcrumb.data) {
      for (const key of ["url", "to", "from"]) {
        const value = breadcrumb.data[key];
        if (typeof value === "string") breadcrumb.data[key] = maskSensitiveUrl(value);
      }
    }
  }
  return event;
}
