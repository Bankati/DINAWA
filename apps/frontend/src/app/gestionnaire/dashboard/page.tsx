'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Building2, Wallet, Percent, AlertTriangle, Clock, FileClock, Download, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { formatFcfa } from '@/lib/format';
import type { MandateWithParties } from '@/lib/api-types';
import { Card, CardHeader, CardTitle, CardBody, StatCard, Badge, EmptyState, Skeleton } from '@/components/ds';
import { RentTypeDonut, MonthlyRevenueChart, DashboardFilters, type DashboardFiltersValue } from '@/components/dashboard';
import { formatMoisLong, type RepartitionType } from '@/lib/dashboard';

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
  const queryClient = useQueryClient();
  const now = new Date();
  const [filters, setFilters] = useState<DashboardFiltersValue>({ mois: now.getMonth() + 1, annee: now.getFullYear() });

  const { data: mandates, isLoading: mLoading } = useQuery({
    queryKey: ['mandates'],
    queryFn: () => api.get<MandateReceived[]>('/mandates'),
  });
  const { data: summary, isLoading: sLoading } = useQuery({
    queryKey: ['dashboard-manager', 'summary'],
    queryFn: () => api.get<ManagerSummary>('/dashboard/manager/summary'),
  });
  const { data: revenue, isLoading: rLoading } = useQuery({
    queryKey: ['dashboard-manager', 'revenue', filters.mois, filters.annee],
    queryFn: () => api.get<ManagerRevenue>(`/dashboard/manager/revenue?period=MONTH&month=${filters.mois}&year=${filters.annee}`),
  });
  const { data: propertyTypes } = useQuery({
    queryKey: ['dashboard-manager', 'property-types'],
    queryFn: () => api.get<RepartitionType[]>('/dashboard/manager/property-types'),
  });
  const { data: monthlyRevenue, isLoading: mrLoading } = useQuery({
    queryKey: ['dashboard-manager', 'monthly-revenue', filters.annee],
    queryFn: () => api.get<{ mois: string; montant: number }[]>(`/dashboard/manager/monthly-revenue?year=${filters.annee}`),
  });
  const { data: alerts, isLoading: aLoading } = useQuery({
    queryKey: ['dashboard-manager', 'alerts'],
    queryFn: () => api.get<ManagerAlerts>('/dashboard/manager/alerts'),
  });

  // GET /mandates est bidirectionnel (propriétaire ET gestionnaire) — un
  // gestionnaire peut aussi posséder des biens en propre (parité), donc ne
  // garder que les mandats où il est le gestionnaire destinataire.
  const list = (mandates ?? []).filter((m) => m.managerId === user?.id);
  const active = list.filter((m) => m.status === 'ACTIVE');
  const pending = list.filter((m) => m.status === 'PENDING');

  const totalBiens = summary
    ? summary.byStatus.OCCUPIED + summary.byStatus.VACANT + summary.byStatus.RENOVATION + summary.byStatus.ARCHIVED
    : 0;
  const tauxOccupation = summary && totalBiens > 0 ? Math.round((summary.byStatus.OCCUPIED / totalBiens) * 100) : 0;
  const impayesCount = alerts?.overdueEntries.length ?? 0;
  const declarationsCount = alerts?.pendingDeclarations.length ?? 0;
  const isLoading = mLoading || sLoading || rLoading || aLoading;

  function exportExcel() {
    const rows = (monthlyRevenue ?? []).map((r) => ({ Mois: formatMoisLong(r.mois), 'Montant (FCFA)': r.montant }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Revenus ${filters.annee}`);
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `warah-revenus-gestion-${filters.annee}.xlsx`);
  }
  function refreshAll() {
    queryClient.invalidateQueries({ queryKey: ['mandates'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Bannière de bienvenue — même traitement que le dashboard Propriétaire ── */}
      <div className="relative overflow-hidden rounded-2xl p-6 md:p-7 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- asset statique local, même traitement que app/page.tsx#hero-bg-photo */}
        <img src="/bridge-with-city.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: 'center 40%' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(10,38,80,1) 0%, rgba(15,76,129,1) 60%, rgba(8,30,65,1) 100%)' }} />
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold m-0">Bienvenue, {user?.firstName ?? ''}</h1>
            <p className="text-sm text-white/70 mt-1 mb-0">Vue synthétique de vos mandats de gestion</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={exportExcel} className="inline-flex items-center gap-2 text-sm font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded-lg px-3.5 py-2 transition-colors">
              <Download className="w-3.5 h-3.5" />Exporter
            </button>
            <button type="button" onClick={refreshAll} className="inline-flex items-center justify-center bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded-lg w-9 h-9 transition-colors">
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            </button>
          </div>
        </div>
        <div className="relative z-10 mt-5 [&_option]:text-gray-900">
          <DashboardFilters value={filters} onChange={setFilters} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          index={0}
          label="Biens gérés"
          value={sLoading ? '—' : (summary?.totalManagedProperties ?? 0)}
          sub={`${summary?.mandatingOwnersCount ?? 0} propriétaire${(summary?.mandatingOwnersCount ?? 0) !== 1 ? 's' : ''} mandant${(summary?.mandatingOwnersCount ?? 0) !== 1 ? 's' : ''}`}
          tone="primary"
          icon={<Building2 className="w-[18px] h-[18px]" />}
        />
        <StatCard
          index={1}
          label="Revenus du mois"
          value={rLoading ? '—' : formatFcfa(revenue?.total.current ?? 0)}
          sub="Biens propres + sous mandat"
          tone="success"
          icon={<Wallet className="w-[18px] h-[18px]" />}
        />
        <StatCard
          index={2}
          label="Taux d'occupation"
          value={`${tauxOccupation} %`}
          progressPercent={tauxOccupation}
          tone="warning"
          icon={<Percent className="w-[18px] h-[18px]" />}
        />
        <StatCard
          index={3}
          label="Impayés"
          value={aLoading ? '—' : impayesCount}
          sub={impayesCount > 0 ? 'Urgent — à relancer' : 'À jour'}
          tone={impayesCount > 0 ? 'error' : 'success'}
          icon={<AlertTriangle className="w-[18px] h-[18px]" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Revenus mensuels</CardTitle>
            <Badge tone="info">{filters.annee}</Badge>
          </CardHeader>
          <CardBody>
            {mrLoading ? <div className="sk-line" /> : <MonthlyRevenueChart data={monthlyRevenue ?? []} />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Répartition par type de bien</CardTitle></CardHeader>
          <CardBody>
            <RentTypeDonut data={propertyTypes ?? []} />
          </CardBody>
        </Card>
      </div>

      {alerts && (alerts.overdueEntries.length > 0 || alerts.expiringLeases.length > 0 || alerts.pendingDeclarations.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>À traiter</CardTitle>
            <Badge tone="error" dot>{impayesCount + alerts.expiringLeases.length + declarationsCount} en attente</Badge>
          </CardHeader>
          <div>
            {alerts.overdueEntries.map((e) => (
              <div key={e.id} className="px-5 py-3.5 flex items-center gap-3.5 border-t border-ds-border">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground">{e.property.address ?? 'Bien'}</div>
                  <div className="text-xs text-muted-foreground">{e.tenant.firstName} {e.tenant.lastName} · {formatFcfa(e.expectedAmount)}</div>
                </div>
                <Badge tone="error">Impayé</Badge>
              </div>
            ))}
            {alerts.expiringLeases.map((l) => (
              <div key={l.id} className="px-5 py-3.5 flex items-center gap-3.5 border-t border-ds-border">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground">{l.property.address ?? 'Bien'}</div>
                  <div className="text-xs text-muted-foreground">{l.tenant.firstName} {l.tenant.lastName} · bail expirant sous 30 jours</div>
                </div>
                <Badge tone="warning"><Clock className="w-3 h-3" />Bientôt expiré</Badge>
              </div>
            ))}
            {alerts.pendingDeclarations.map((d) => (
              <div key={d.id} className="px-5 py-3.5 flex items-center gap-3.5 border-t border-ds-border">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground">{d.property.address ?? 'Bien'}</div>
                  <div className="text-xs text-muted-foreground">{d.tenant.firstName} {d.tenant.lastName} · déclaration de {formatFcfa(d.paidAmount)} à confirmer</div>
                </div>
                <Badge tone="info"><FileClock className="w-3 h-3" />À valider</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div>
        <h3 className="text-sm font-bold text-foreground mb-3.5">Mandats actifs</h3>
        <Card>
          {mLoading ? (
            <div className="p-5 flex flex-col gap-3"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
          ) : active.length === 0 ? (
            <EmptyState
              icon={<Building2 />}
              title="Aucun mandat actif"
              description="Les propriétaires qui vous confient des biens apparaîtront ici."
            />
          ) : (
            <div>
              {active.map((m, i) => {
                const commission = m.feeType === 'PERCENTAGE' ? `${m.feeValue}% du loyer` : formatFcfa(m.feeValue);
                return (
                  <div key={m.id} className={`px-5 py-4.5 flex items-center gap-4 ${i < active.length - 1 ? 'border-b border-ds-border' : ''}`}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shrink-0 bg-primary">
                      {TYPE_P[m.property.type]?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-foreground mb-0.5">{m.property.address}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.property.neighborhood}, {m.property.city}
                        <span className="mx-1.5">·</span>
                        {TYPE_P[m.property.type] ?? m.property.type}
                        <span className="mx-1.5">·</span>
                        {STATUS_P[m.property.status] ?? m.property.status}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-sm text-primary-dark tabular-nums">{formatFcfa(m.property.monthlyRent)}</div>
                      <div className="text-xs text-muted-foreground">Commission : {commission}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Propriétaire : {m.owner.firstName} {m.owner.lastName}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3.5">Mandats en attente d&apos;acceptation</h3>
          <Card>
            {pending.map((m, i) => (
              <div key={m.id} className={`px-5 py-4 flex items-center gap-3.5 ${i < pending.length - 1 ? 'border-b border-ds-border' : ''}`}>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-foreground">{m.property.address}</div>
                  <div className="text-xs text-muted-foreground">{m.property.neighborhood}, {m.property.city}</div>
                </div>
                <Badge tone="warning">En attente</Badge>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
