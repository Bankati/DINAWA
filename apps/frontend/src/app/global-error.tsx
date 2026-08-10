'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// Filet de sécurité racine — capture toute erreur non rattrapée par un
// error.tsx de segment. Doit définir son propre html/body (remplace le
// layout racine quand actif) : pas d'accès à AuthProvider/Toaster/globals.css.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <h1 style={{ color: '#0A2650', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Une erreur est survenue</h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 20px' }}>
            L&apos;équipe WARAH a été notifiée. Vous pouvez réessayer.
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{ background: '#0F4C81', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
