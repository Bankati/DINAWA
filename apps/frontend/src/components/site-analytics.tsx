'use client';

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';
import { maskAnalyticsUrl } from '@/lib/analytics-url';

// Statistiques de visites (Vercel Web Analytics, plan marketing 2026-10-11).
// Composant client : beforeSend est une fonction, elle ne peut pas être
// passée depuis le layout serveur. Aucun cookie ; chaque adresse est nettoyée
// avant envoi (voir lib/analytics-url.ts).
function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = maskAnalyticsUrl(event.url);
  return url ? { ...event, url } : null;
}

export function SiteAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
