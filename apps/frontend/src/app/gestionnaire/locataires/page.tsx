'use client';

import ComingSoon from '@/components/coming-soon';

// Le backend (invitation, blocage, historique locataire) est déjà prêt —
// seule cette page Next.js reste à porter (page partagée avec l'espace
// propriétaire).
export default function GestionnaireLocatairesPage() {
  return (
    <ComingSoon
      titre="Locataires"
      description="La gestion de vos locataires (invitation, historique, blocage) arrive prochainement dans cette nouvelle interface — le backend est déjà prêt."
      backRoute="/gestionnaire/dashboard"
    />
  );
}
