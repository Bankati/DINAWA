'use client';

import { useApi, TTL } from '@/lib/use-api';
import { useAuth } from '@/lib/auth-context';
import { formatFcfa } from '@/lib/format';
import type { MandateWithParties } from '@/lib/api-types';
import { PageHeader, Card, StatCard, Badge, EmptyState, Skeleton } from '@/components/ui';

type MandateReceived = MandateWithParties;

interface DashboardSummary {
  totalBiens?: number;
  biensOccupes?: number;
  revenusMensuels?: number;
  revenusAnnuels?: number;
  tauxOccupation?: number;
  impayes?: number;
}

const STATUS_P: Record<string, string> = {
  OCCUPIED: 'Occupé', VACANT: 'Vacant', RENOVATION: 'Travaux', ARCHIVED: 'Archivé',
};
const TYPE_P: Record<string, string> = {
  VILLA: 'Villa', APARTMENT: 'Appartement', STUDIO: 'Studio', COMMERCIAL: 'Commercial',
};

const annee = new Date().getFullYear();

export default function GestionnaireDashboard() {
  const { user } = useAuth();
  const { data: mandates, loading: mLoading } = useApi<MandateReceived[]>('/mandates', TTL.LIST);
  const { data: stats } = useApi<DashboardSummary>(`/dashboard?annee=${annee}`, TTL.LIST);
  // GET /mandates est bidirectionnel (propriétaire ET gestionnaire) — un
  // gestionnaire peut aussi posséder des biens en propre (parité), donc ne
  // garder que les mandats où il est le gestionnaire destinataire.
  const list = (mandates ?? []).filter(m => m.managerId === user?.id);
  const active = list.filter(m => m.status === 'ACTIVE');
  const pending = list.filter(m => m.status === 'PENDING');

  return (
    <div>
      <PageHeader title="Tableau de bord" subtitle="Vue synthétique de vos mandats de gestion" />

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <StatCard
          label="Biens gérés"
          value={active.length}
          tone="primary"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>}
        />
        <StatCard
          label="Revenus mensuels"
          value={formatFcfa(stats?.revenusMensuels ?? 0)}
          tone="success"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /></svg>}
        />
        <StatCard
          label="Taux d'occupation"
          value={`${stats?.tauxOccupation ?? 0} %`}
          tone="primary"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></svg>}
        />
        <StatCard
          label="Impayés"
          value={stats?.impayes ?? 0}
          tone="error"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M12 9v4M12 17h.01" /><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>}
        />
      </div>

      <h3 className="text-sm font-bold text-gray-900 mb-3.5">Mandats actifs</h3>
      <Card>
        {mLoading ? (
          <div className="p-2"><Skeleton /><Skeleton /><Skeleton /></div>
        ) : active.length === 0 ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12h6m-6 4h6M9 8h6M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" />
              </svg>
            }
            title="Aucun mandat actif"
            description="Les propriétaires qui vous confient des biens apparaîtront ici."
          />
        ) : (
          <div>
            {active.map((m, i) => {
              const commission = m.feeType === 'PERCENTAGE'
                ? `${m.feeValue}% du loyer`
                : formatFcfa(m.feeValue);
              return (
                <div key={m.id} className={`px-5 py-4.5 flex items-center gap-4 ${i < active.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <div className="w-11.5 h-11.5 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shrink-0" style={{ background: 'linear-gradient(135deg, #0A2650, #0F4C81)' }}>
                    {TYPE_P[m.property.type]?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900 mb-0.5">{m.property.address}</div>
                    <div className="text-xs text-gray-500">
                      {m.property.neighborhood}, {m.property.city}
                      <span className="mx-1.5">·</span>
                      {TYPE_P[m.property.type] ?? m.property.type}
                      <span className="mx-1.5">·</span>
                      {STATUS_P[m.property.status] ?? m.property.status}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm text-primary-dark tabular-nums">{formatFcfa(m.property.monthlyRent)}</div>
                    <div className="text-xs text-gray-400">Commission : {commission}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Propriétaire : {m.owner.firstName} {m.owner.lastName}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {pending.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-gray-900 mt-6 mb-3.5">Mandats en attente d&apos;acceptation</h3>
          <Card>
            {pending.map((m, i) => (
              <div key={m.id} className={`px-5 py-4 flex items-center gap-3.5 ${i < pending.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900">{m.property.address}</div>
                  <div className="text-xs text-gray-500">{m.property.neighborhood}, {m.property.city}</div>
                </div>
                <Badge tone="warning">En attente</Badge>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
