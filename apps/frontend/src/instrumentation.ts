import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/mask-sensitive-url";

// Convention Next.js (instrumentation.ts, stable depuis v15) — register()
// tourne une fois au démarrage du serveur, dans le runtime Node ET Edge.
// Miroir de l'init côté backend (apps/backend/src/instrument.ts).
export function register(): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    enableLogs: true,
    tracesSampleRate: 0.1,
    // Jetons du lien de paiement / d'invitation jamais envoyés (unité 43).
    beforeSend: (event) => scrubSentryEvent(event),
    beforeSendTransaction: (event) => scrubSentryEvent(event),
  });
}

export const onRequestError = Sentry.captureRequestError;
