'use client';

import ComingSoon from '@/components/coming-soon';

// Profil public gestionnaire (avec avis clients), prévu au plan produit mais
// pas encore construit côté backend.
export default function ProfilPublicPage() {
  return (
    <ComingSoon
      titre="Profil public"
      description="Votre profil public (visible des propriétaires à la recherche d'un gestionnaire, avec avis clients) est en cours de développement."
      backRoute="/gestionnaire/dashboard"
    />
  );
}
