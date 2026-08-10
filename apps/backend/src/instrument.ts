// Doit être importé en tout premier dans main.ts, avant tout autre import —
// Sentry a besoin d'instrumenter les modules Node (http, pg...) avant qu'ils
// ne soient require() par le reste de l'application.
//
// dotenv chargé explicitement ici (pas via ConfigModule, qui n'est initialisé
// que dans NestFactory.create(), trop tard pour ce fichier) — sinon
// process.env.SENTRY_DSN n'est pas encore renseigné à ce stade.
import * as dotenv from 'dotenv';
dotenv.config();

import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Optionnel — ne s'active que si SENTRY_DSN est présent (voir docs/DEPLOYMENT.md).
if (process.env['SENTRY_DSN']) {
  Sentry.init({
    dsn: process.env['SENTRY_DSN'],
    environment: process.env['NODE_ENV'] ?? 'development',
    integrations: [nodeProfilingIntegration()],
    enableLogs: true,
    // Taux conservateur (10%) — voir docs/DEPLOYMENT.md section 9a, ne pas
    // dépasser 0.1 en production pour maîtriser les coûts Sentry.
    tracesSampleRate: 0.1,
    profileSessionSampleRate: 0.1,
    profileLifecycle: 'trace',
  });
}
