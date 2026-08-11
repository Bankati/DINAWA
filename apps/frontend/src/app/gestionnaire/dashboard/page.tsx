'use client';

import { useState } from 'react';
import { useApi, TTL } from '@/lib/use-api';
import { useAuth } from '@/lib/auth-context';
import { formatFcfa } from '@/lib/format';
import type { MandateWithParties } from '@/lib/api-types';
import { PageHeader, Card, CardHeader, CardBody, StatCard, Badge, EmptyState, Skeleton } from '@/components/ui';
import { RentTypeDonut, MonthlyRevenueChart, DashboardFilters, type DashboardFiltersValue } from '@/components/dashboard';
import type { RepartitionType } from '@/lib/dashboard';

type MandateReceived = MandateWithParties;

interface ManagerSummary {
  totalManagedProperties: number;
  byStatus: Record<'OCCUPIED' | 'VACANT' | 'RENOVATION' | 'ARCHIVED', number>;
  mandatingOwnersCount: number;
}

interface PeriodComparison {
  current: number;
  previous: number;
  changePercent: number | null;
}

interface ManagerRevenue {
  period: { type: string; label: string };
  ownProperties: PeriodComparison;
  managedProperties: PeriodComparison;
  total: PeriodComparison;
}

interface AlertParty {
  id: string;
  address?: string;
  firstName?: string;
  lastName?: string;
}

interface ManagerAlerts {
  overdueEntries: Array<{ id: string; expectedAmount: number; property: AlertParty; tenant: AlertParty }>;
  expiringLeases: Array<{ id: string; endDate: string | null; property: AlertParty; tenant: AlertParty }>;
  pendingDeclarations: Array<{ id: string; paidAmount: number; property: AlertParty; tenant: AlertParty }>;
}

const STATUS_P: Record<string, string> = {
  OCCUPIED: 'Occupé', VACANT: 'Vacant', RENOVATION: 'Travaux', ARCHIVED: 'Archivé',
};
const TYPE_P: Record<string, string> = {
  VILLA: 'Villa', APARTMENT: 'Appartement', STUDIO: 'Studio', COMMERCIAL: 'Commercial',
};

export default function GestionnaireDashboard() {
  const { user } = useAuth();
  const now = new Date();
  const [filters, setFilters] = useState<DashboardFiltersValue>({ mois: now.getMonth() + 1, annee: now.getFullYear() });

  const { data: mandates, loading: mLoading } = useApi<MandateReceived[]>('/mandates', TTL.LIST);
  const { data: summary, loading: sLoading } = useApi<ManagerSummary>('/dashboard/manager/summary', TTL.LIST);
  const { data: revenue, loading: rLoading } = useApi<ManagerRevenue>(
    `/dashboard/manager/revenue?period=MONTH&month=${filters.mois}&year=${filters.annee}`, TTL.LIST,
  );
  const { data: propertyTypes } = useApi<RepartitionType[]>('/dashboard/manager/property-types', TTL.LIST);
  const { data: monthlyRevenue, loading: mrLoading } = useApi<{ mois: string; montant: number }[]>(
    `/dashboard/manager/monthly-revenue?year=${filters.annee}`, TTL.LIST,
  );
  const { data: alerts, loading: aLoading } = useApi<ManagerAlerts>('/dashboard/manager/alerts', TTL.LIST);

  // GET /mandates est bidirectionnel (propriétaire ET gestionnaire) — un
  // gestionnaire peut aussi posséder des biens en propre (parité), donc ne
  // garder que les mandats où il est le gestionnaire destinataire.
  const list = (mandates ?? []).filter(m => m.managerId === user?.id);
  const active = list.filter(m => m.status === 'ACTIVE');
  const pending = list.filter(m => m.status === 'PENDING');

  const totalBiens = summary
    ? summary.byStatus.OCCUPIED + summary.byStatus.VACANT + summary.byStatus.RENOVATION + summary.byStatus.ARCHIVED
    : 0;
  const tauxOccupation = summary && totalBiens > 0 ? Math.round((summary.byStatus.OCCUPIED / totalBiens) * 100) : 0;
  const impayesCount = alerts?.overdueEntries.length ?? 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <PageHeader title="Tableau de bord" subtitle="Vue synthétique de vos mandats de gestion" />
        <DashboardFilters value={filters} onChange={setFilters} />
      </div>

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <StatCard
          label="Biens gérés"
          value={sLoading ? '—' : (summary?.totalManagedProperties ?? 0)}
          sub={`${summary?.mandatingOwnersCount ?? 0} propriétaire${(summary?.mandatingOwnersCount ?? 0) !== 1 ? 's' : ''} mandant${(summary?.mandatingOwnersCount ?? 0) !== 1 ? 's' : ''}`}
          tone="primary"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>}
        />
        <StatCard
          label="Revenus du mois"
          value={rLoading ? '—' : formatFcfa(revenue?.total.current ?? 0)}
          sub="Biens propres + sous mandat"
          tone="success"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /></svg>}
        />
        <StatCard
          label="Taux d'occupation"
          value={`${tauxOccupation} %`}
          tone="primary"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></svg>}
        />
        <StatCard
          label="Impayés"
          value={aLoading ? '—' : impayesCount}
          sub={impayesCount > 0 ? 'Urgent — à relancer' : 'À jour'}
          tone={impayesCount > 0 ? 'error' : 'success'}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M12 9v4M12 17h.01" /><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>}
        />
      </div>

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-primary-dark m-0">Revenus mensuels</h2>
            <span className="text-xs font-semibold text-primary bg-primary-50 px-2.5 py-1 rounded-full">{filters.annee}</span>
          </CardHeader>
          <CardBody>
            {mrLoading ? <Skeleton /> : <MonthlyRevenueChart data={monthlyRevenue ?? []} />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-primary-dark m-0">Répartition par type de bien</h2>
          </CardHeader>
          <CardBody>
            <RentTypeDonut data={propertyTypes ?? []} />
          </CardBody>
        </Card>
      </div>

      {(alerts && (alerts.overdueEntries.length > 0 || alerts.expiringLeases.length > 0)) && (
        <>
          <h3 className="text-sm font-bold text-gray-900 mb-3.5">À traiter</h3>
          <Card className="mb-6">
            {alerts.overdueEntries.map((e, i) => (
              <div key={e.id} className={`px-5 py-3.5 flex items-center gap-3.5 ${i < alerts.overdueEntries.length - 1 || alerts.expiringLeases.length > 0 ? 'border-b border-gray-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900">{e.property.address ?? 'Bien'}</div>
                  <div className="text-xs text-gray-500">{e.tenant.firstName} {e.tenant.lastName} · {formatFcfa(e.expectedAmount)}</div>
                </div>
                <Badge tone="error">Impayé</Badge>
              </div>
            ))}
            {alerts.expiringLeases.map((l, i) => (
              <div key={l.id} className={`px-5 py-3.5 flex items-center gap-3.5 ${i < alerts.expiringLeases.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900">{l.property.address ?? 'Bien'}</div>
                  <div className="text-xs text-gray-500">{l.tenant.firstName} {l.tenant.lastName} · bail expirant sous 30 jours</div>
                </div>
                <Badge tone="warning">Bientôt expiré</Badge>
              </div>
            ))}
          </Card>
        </>
      )}

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
