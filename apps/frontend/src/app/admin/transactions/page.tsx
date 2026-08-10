import { PageHeader, Card, EmptyState } from '@/components/ui';

export default function AdminTransactionsPage() {
  return (
    <div>
      <PageHeader title="Transactions" subtitle="Supervision des transactions de la plateforme" />
      <Card>
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          }
          title="Cette section sera disponible prochainement"
          description="Le suivi détaillé des transactions arrivera dans une prochaine mise à jour."
        />
      </Card>
    </div>
  );
}
