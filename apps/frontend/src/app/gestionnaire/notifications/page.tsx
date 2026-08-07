'use client';

import ComingSoon from '@/components/coming-soon';

// Le backend (historique, compteur non-lues) est déjà prêt — seule cette
// page Next.js reste à porter (page partagée avec l'espace propriétaire).
export default function GestionnaireNotificationsPage() {
  return (
    <ComingSoon
      titre="Notifications"
      description="L'historique de vos notifications arrive prochainement dans cette nouvelle interface — le backend est déjà prêt."
      backRoute="/gestionnaire/dashboard"
    />
  );
}
