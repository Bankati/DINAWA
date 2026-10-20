import { maskSensitiveUrl } from './mask-sensitive-url';

// Nettoie un événement Sentry (erreur ou trace) avant envoi : URL de la
// requête, chaîne de requête, nom de transaction et fil d'Ariane (requêtes
// HTTP sortantes/entrantes) — aucun jeton de lien de paiement ou
// d'invitation ne doit quitter le serveur (unité 43). Types volontairement
// structurels pour ne pas dépendre des types internes de Sentry.
type ScrubbableEvent = {
  request?: { url?: string; query_string?: unknown };
  transaction?: string;
  breadcrumbs?: { message?: string; data?: Record<string, unknown> }[];
};

export function scrubSentryEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request) {
    event.request.url = maskSensitiveUrl(event.request.url);
    if (typeof event.request.query_string === 'string') {
      event.request.query_string = maskSensitiveUrl(`?${event.request.query_string}`).slice(1);
    } else if (event.request.query_string) {
      // Forme objet/liste : on préfère tout retirer plutôt que risquer un oubli.
      event.request.query_string = '[masqué]';
    }
  }
  event.transaction = maskSensitiveUrl(event.transaction);
  for (const breadcrumb of event.breadcrumbs ?? []) {
    breadcrumb.message = maskSensitiveUrl(breadcrumb.message);
    if (breadcrumb.data) {
      for (const key of ['url', 'to', 'from']) {
        const value = breadcrumb.data[key];
        if (typeof value === 'string') breadcrumb.data[key] = maskSensitiveUrl(value);
      }
    }
  }
  return event;
}
