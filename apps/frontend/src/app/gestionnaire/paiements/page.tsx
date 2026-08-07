'use client';

import ComingSoon from '@/components/coming-soon';

// Le backend (saisie manuelle, confirmation des déclarations, quittances)
// est déjà prêt — seule cette page Next.js reste à porter (page partagée
// avec l'espace propriétaire).
export default function GestionnairePaiementsPage() {
  return (
    <ComingSoon
      titre="Paiements"
      description="La saisie et le suivi des paiements arrivent prochainement dans cette nouvelle interface — le backend est déjà prêt."
      backRoute="/gestionnaire/dashboard"
    />
  );
}
