'use client';

import { useQuery } from '@tanstack/react-query';
import { Info, Home } from 'lucide-react';
import { api } from '@/lib/api';
import { formatFcfa } from '@/lib/format';
import { PageHeader, Card, Badge, EmptyState, Skeleton } from '@/components/ds';

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
export default function GestionnaireAnnoncesPage() {
  const { data: res, isLoading: loading } = useQuery({
    queryKey: ['properties', 'VACANT'],
    queryFn: () => api.get<{ data: Property[]; total: number }>('/properties?status=VACANT&limit=100'),
  });
  const properties = res?.data ?? [];

  return (
    <div>
      <PageHeader title="Annonces" subtitle="Biens vacants sous votre mandat, publiés automatiquement sur le portail WARAH" />

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 flex items-start gap-2.5">
        <Info className="w-[18px] h-[18px] shrink-0 mt-0.5 text-blue-700" />
        <div className="text-sm text-blue-700">
          Un bien vacant sous votre mandat est automatiquement publié, et automatiquement retiré dès qu&apos;un locataire y est installé — rien à faire ici.
        </div>
      </div>

      {loading ? (
        <Card><div className="p-5 flex flex-col gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div></Card>
      ) : properties.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Home />}
            title="Aucun bien vacant"
            description="Aucun bien vacant sous votre mandat pour le moment."
          />
        </Card>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {properties.map((p) => (
            <Card key={p.id}>
              <div className="p-5 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <Badge tone="neutral">{TYPE_LABELS[p.type] ?? p.type}</Badge>
                  <Badge tone="info" dot>Annonce active</Badge>
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground mb-0.5">{p.address}</div>
                  <div className="text-xs text-muted-foreground">{p.neighborhood}, {p.city}</div>
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
