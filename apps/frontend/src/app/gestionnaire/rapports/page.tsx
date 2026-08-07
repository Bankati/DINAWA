'use client';

import ComingSoon from '@/components/coming-soon';

// Rapports mensuels automatiques (PDF, envoi par email), prévus au plan
// produit mais pas encore construits côté backend.
export default function RapportsPage() {
  return (
    <ComingSoon
      titre="Rapports"
      description="La génération de rapports mensuels (PDF, envoi automatique par email) est en cours de développement."
      backRoute="/gestionnaire/dashboard"
    />
  );
}
