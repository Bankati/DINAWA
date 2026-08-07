'use client';

import ComingSoon from '@/components/coming-soon';

// Le backend (publication, désactivation automatique) est déjà prêt — seule
// cette page Next.js reste à porter (page partagée avec l'espace
// propriétaire).
export default function GestionnaireAnnoncesPage() {
  return (
    <ComingSoon
      titre="Annonces"
      description="La gestion de vos annonces publiées arrive prochainement dans cette nouvelle interface — le backend est déjà prêt."
      backRoute="/gestionnaire/dashboard"
    />
  );
}
