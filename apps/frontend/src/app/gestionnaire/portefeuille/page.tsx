'use client';

import ComingSoon from '@/components/coming-soon';

// Le portefeuille repose sur les mandats propriétaire → gestionnaire, une
// fonctionnalité prévue au plan produit mais pas encore construite côté
// backend (module mandates, unité 31).
export default function PortefeuillePage() {
  return (
    <ComingSoon
      titre="Portefeuille"
      description="La délégation de biens par un propriétaire (mandats) est prévue mais pas encore disponible. Une fois construite, vous verrez ici tous les biens qui vous sont confiés."
      backRoute="/gestionnaire/dashboard"
    />
  );
}
