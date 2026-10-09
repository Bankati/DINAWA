import { Logger } from '@nestjs/common';

// Diagnostic TEMPORAIRE (unité 43) pour régler TRUST_PROXY_HOPS en staging :
// journalise, pour les premières requêtes seulement, combien d'adresses
// contient X-Forwarded-For et si `req.ip` diffère de l'adresse de connexion
// (signe que la confiance au proxy est active). Aucune adresse IP n'est
// jamais journalisée. Activé par TRUST_PROXY_DIAGNOSTIC=true, à retirer une
// fois la bonne valeur confirmée.
const MAX_LOGGED_REQUESTS = 20;

type DiagnosedRequest = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
};

export function forwardedForDiagnostic(trustProxyHops: number) {
  const logger = new Logger('TrustProxyDiagnostic');
  let logged = 0;

  return (req: DiagnosedRequest, _res: unknown, next: () => void): void => {
    if (logged < MAX_LOGGED_REQUESTS) {
      logged++;
      const header = req.headers['x-forwarded-for'];
      const raw = Array.isArray(header) ? header.join(',') : (header ?? '');
      const forwardedCount = raw ? raw.split(',').filter((part) => part.trim()).length : 0;
      logger.log(
        `requête ${logged}/${MAX_LOGGED_REQUESTS} : ${forwardedCount} adresse(s) dans X-Forwarded-For, ` +
          `TRUST_PROXY_HOPS=${trustProxyHops}, adresse retenue ${
            req.ip === req.socket?.remoteAddress ? 'IDENTIQUE à' : 'DIFFÉRENTE de'
          } l'adresse de connexion`,
      );
    }
    next();
  };
}
