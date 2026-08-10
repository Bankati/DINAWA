'use client';

import { useApi, TTL } from '@/lib/use-api';
import { formatFcfa } from '@/lib/format';
import { PageHeader, Card, Badge, EmptyState, Skeleton } from '@/components/ui';

type PropertyType = 'VILLA' | 'APARTMENT' | 'STUDIO' | 'COMMERCIAL';
type PropertyStatus = 'OCCUPIED' | 'VACANT' | 'RENOVATION' | 'ARCHIVED';

interface Property {
  id: string;
  type: PropertyType;
  status: PropertyStatus;
  address: string;
  neighborhood: string;
  city: string;
  monthlyRent: number;
  description: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  VILLA: 'Villa', APARTMENT: 'Appartement', STUDIO: 'Studio', COMMERCIAL: 'Commercial',
};

// Aucune action manuelle ici — voir /architect module Annonces : un bien
// vacant est toujours automatiquement publié (et republié à la résiliation
// d'un bail), jamais par une action de l'utilisateur. Cette page est
// purement informative.
export default function AnnoncesPage() {
  const { data: res, loading } = useApi<{ data: Property[]; total: number }>('/properties?status=VACANT&limit=100', TTL.LIST);
  const properties = res?.data ?? [];

  return (
    <div>
      <PageHeader title="Annonces" subtitle="Vos biens vacants publiés automatiquement sur le portail WARAH" />

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 flex items-start gap-2.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" className="w-4.5 h-4.5 shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        <div className="text-sm text-blue-700">
          Un bien vacant est automatiquement publié, et automatiquement retiré dès qu&apos;un locataire y est installé — rien à faire ici.
        </div>
      </div>

      {loading ? (
        <Card><div className="p-2"><Skeleton /><Skeleton /><Skeleton /></div></Card>
      ) : properties.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            }
            title="Aucun bien vacant"
            description="Vous n'avez aucun bien vacant actuellement publié en annonce."
          />
        </Card>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {properties.map(p => (
            <Card key={p.id}>
              <div className="p-5 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <Badge tone="neutral">{TYPE_LABELS[p.type] ?? p.type}</Badge>
                  <Badge tone="info" dot>Annonce active</Badge>
                </div>
                <div>
                  <div className="font-bold text-sm text-gray-900 mb-0.5">{p.address}</div>
                  <div className="text-xs text-gray-500">{p.neighborhood}, {p.city}</div>
                </div>
                <span className="text-base font-extrabold text-primary-dark tabular-nums">{formatFcfa(p.monthlyRent)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
