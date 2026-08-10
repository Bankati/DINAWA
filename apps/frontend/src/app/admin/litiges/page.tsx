import { PageHeader, Card, EmptyState } from '@/components/ui';

export default function AdminLitigesPage() {
  return (
    <div>
      <PageHeader title="Litiges" subtitle="Gestion des litiges entre utilisateurs" />
      <Card>
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
          title="Cette section sera disponible prochainement"
          description="La gestion des litiges arrivera dans une prochaine mise à jour."
        />
      </Card>
    </div>
  );
}
