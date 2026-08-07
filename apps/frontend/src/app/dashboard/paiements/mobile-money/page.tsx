'use client';

import ComingSoon from '@/components/coming-soon';

// Le paiement direct T-Money/Flooz dépend de l'intégration Cashpay (webhook
// non construit) — en attendant, ces paiements se saisissent manuellement
// via /dashboard/paiements/nouveau (mode Espèces/Virement).
export default function MobileMoneyPage() {
  return (
    <ComingSoon
      titre="Paiement Mobile Money"
      description="Le paiement direct par T-Money ou Flooz arrive avec l'intégration Cashpay. En attendant, saisissez le paiement manuellement une fois reçu."
      backRoute="/dashboard/paiements/nouveau"
      backLabel="Saisir un paiement manuel"
    />
  );
}
