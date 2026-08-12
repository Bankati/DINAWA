import { CreditCard } from 'lucide-react';
import { PageHeader, Card, EmptyState } from '@/components/ds';

export default function AdminTransactionsPage() {
  return (
    <div>
      <PageHeader title="Transactions" subtitle="Supervision des transactions de la plateforme" />
      <Card>
        <EmptyState
          icon={<CreditCard />}
          title="Cette section sera disponible prochainement"
          description="Le suivi détaillé des transactions arrivera dans une prochaine mise à jour."
        />
      </Card>
    </div>
  );
}
