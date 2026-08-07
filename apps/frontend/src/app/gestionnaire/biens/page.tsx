'use client';

import ComingSoon from '@/components/coming-soon';

// Le backend (CRUD biens, photos/documents) est déjà prêt — seule cette
// page Next.js reste à porter (page partagée avec l'espace propriétaire).
export default function GestionnaireBiensPage() {
  return (
    <ComingSoon
      titre="Biens gérés"
      description="La liste de vos biens gérés (recherche, filtres, ajout) arrive prochainement dans cette nouvelle interface — le backend est déjà prêt."
      backRoute="/gestionnaire/dashboard"
    />
  );
}
