import { AlertTriangle } from 'lucide-react';
import { PageHeader, Card, EmptyState } from '@/components/ds';

export default function AdminLitigesPage() {
  return (
    <div>
      <PageHeader title="Litiges" subtitle="Gestion des litiges entre utilisateurs" />
      <Card>
        <EmptyState
          icon={<AlertTriangle />}
          title="Cette section sera disponible prochainement"
          description="La gestion des litiges arrivera dans une prochaine mise à jour."
        />
      </Card>
    </div>
  );
}
