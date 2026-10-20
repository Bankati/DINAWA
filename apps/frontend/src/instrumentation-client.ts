import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/mask-sensitive-url";

// Miroir de l'init côté backend (apps/backend/src/instrument.ts) — ne
// s'active que si NEXT_PUBLIC_SENTRY_DSN est renseigné (voir docs/DEPLOYMENT.md,
// section Sentry, projet Sentry "javascript-nextjs", org "athena-ju").
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    enableLogs: true,
    // Taux conservateur (10%) — voir docs/DEPLOYMENT.md section 9a, ne pas
    // dépasser 0.1 en production pour maîtriser les coûts Sentry.
    tracesSampleRate: 0.1,
    // Jetons du lien de paiement / d'invitation jamais envoyés (unité 43).
    beforeSend: (event) => scrubSentryEvent(event),
    beforeSendTransaction: (event) => scrubSentryEvent(event),
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
