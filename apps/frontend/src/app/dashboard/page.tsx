'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  Plus, CreditCard, UserPlus, Megaphone, Home, AlertTriangle,
  Download, RefreshCw, FileClock, Building2, CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { fcfa, formatMoisLong, type DashboardKPI } from '@/lib/dashboard';
import { useDashboardQuery } from '@/hooks/use-dashboard-query';
import { StatCard, Card, CardHeader, CardTitle, CardBody, Badge, Button } from '@/components/ds';
import { RentTypeDonut, RevenueBreakdown, DashboardFilters, type DashboardFiltersValue } from '@/components/dashboard';
import './page.css';

const EMPTY_KPI: DashboardKPI = { totalBiens: 0, biensOccupes: 0, biensVacants: 0, totalLocataires: 0, revenusMensuels: 0, revenusAnnuels: 0, impayes: 0, tauxOccupation: 0 };

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente', PENDING_CONFIRMATION: 'À confirmer', PAID: 'Payé', PARTIAL: 'Partiel', LATE: 'En retard', OVERDUE: 'Impayé', REJECTED: 'Rejeté',
};
const PAYMENT_STATUS_TONE: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  PAID: 'success', PARTIAL: 'warning', LATE: 'warning', OVERDUE: 'error', REJECTED: 'error', PENDING_CONFIRMATION: 'info', PENDING: 'neutral',
};
const PROPERTY_STATUS_LABELS: Record<string, string> = { OCCUPIED: 'Occupé', VACANT: 'Vacant', RENOVATION: 'En travaux', ARCHIVED: 'Archivé' };
const PROPERTY_STATUS_TONE: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = { OCCUPIED: 'success', VACANT: 'info', RENOVATION: 'warning', ARCHIVED: 'neutral' };

function initiales2(nom: string): string {
  return nom.split(' ').map((p) => p[0] || '').join('').substring(0, 2).toUpperCase();
}

// Animation d'entrée en CSS pur (tailwindcss-animate) plutôt que
// framer-motion — retiré le 2026-08-13 (diagnostic de lenteur).
const FADE_UP_CLASS = 'animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300 ease-out';
function fadeUpDelay(delaySeconds: number): { animationDelay: string } {
  return { animationDelay: `${delaySeconds * 1000}ms` };
}

const QUICK_ACTIONS = [
  { href: '/dashboard/biens', label: 'Ajouter un bien', sub: 'Nouveau bien locatif', icon: Plus, tone: 'bg-primary' },
  { href: '/dashboard/paiements', label: 'Paiement', sub: 'Enregistrer un paiement', icon: CreditCard, tone: 'bg-emerald-500' },
  { href: '/dashboard/locataires', label: 'Nouveau locataire', sub: 'Inviter un locataire', icon: UserPlus, tone: 'bg-secondary' },
  { href: '/dashboard/annonces', label: 'Publier une annonce', sub: 'Voir mes biens vacants', icon: Megaphone, tone: 'bg-violet-500' },
];

interface DeclarationSummary { id: string }

export default function DashboardPage() {
  const { user } = useAuth();
  const now = new Date();
  const [filters, setFilters] = useState<DashboardFiltersValue>({ mois: now.getMonth() + 1, annee: now.getFullYear() });
  const { data, isLoading, isError, isFetching, refetch } = useDashboardQuery(filters.annee, filters.mois);

  // Même requête que /dashboard/paiements (queryKey partagée) — "à valider"
  // pour l'action en attente ci-dessous, sans dupliquer d'appel réseau.
  const { data: declRes } = useQuery({
    queryKey: ['payments', 'declarations'],
    queryFn: () => api.get<{ data: DeclarationSummary[]; total: number }>(
      '/payments?source=TENANT_DECLARATION&status=PENDING_CONFIRMATION&limit=50',
    ),
  });
  const declarationsCount = declRes?.data.length ?? 0;

  const kpis = data?.kpis ?? EMPTY_KPI;
  const revenus = data?.revenusMensuels ?? [];
  const repartition = data?.repartitionLoyersParType ?? [];
  const derniersPaiements = data?.derniersPaiements ?? [];
  const derniersBiens = data?.derniersBiens ?? [];

  const todayLabel = now.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  function exportExcel() {
    const rows = revenus.map((r) => ({
      Mois: formatMoisLong(r.mois),
      'Montant (FCFA)': r.montant,
      Paiements: r.paiements,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Revenus ${filters.annee}`);
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `warah-revenus-${filters.annee}.xlsx`);
  }

  const pendingItems = [
    { count: declarationsCount, label: 'Déclarations à valider', desc: 'Paiements déclarés par des locataires en attente de confirmation', href: '/dashboard/paiements', icon: FileClock, tone: 'bg-secondary-50 dark:bg-ds-secondary text-secondary-700 dark:text-secondary-300 border-secondary-200 dark:border-ds-border' },
    { count: kpis.impayes, label: 'Loyers impayés', desc: 'Échéances en retard à relancer auprès des locataires', href: '/dashboard/paiements', icon: AlertTriangle, tone: 'bg-red-50 dark:bg-ds-secondary text-red-700 dark:text-red-300 border-red-200 dark:border-ds-border' },
    { count: kpis.biensVacants, label: 'Biens vacants', desc: 'Biens actuellement sans locataire', href: '/dashboard/annonces', icon: Building2, tone: 'bg-primary-50 dark:bg-ds-secondary text-primary dark:text-primary-light border-primary/20 dark:border-ds-border' },
  ].filter((item) => item.count > 0);

  return (
    <div className="dash-body">
      {/* ── Bannière de bienvenue — même traitement photo + surcouche que le
           hero de la landing page (app/page.tsx), pour une cohérence visuelle
           de marque plutôt qu'un simple aplat dégradé. ── */}
      <div className="relative overflow-hidden rounded-2xl p-6 md:p-7 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- asset statique local, même traitement que app/page.tsx#hero-bg-photo */}
        <img src="/bridge-with-city.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: 'center 40%' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(8,20,42,0.85) 0%, rgba(10,38,80,0.78) 55%, rgba(8,30,65,0.88) 100%)' }} />
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold m-0">Bienvenue, {user?.firstName ?? ''}</h1>
            <p className="text-sm text-white/70 mt-1 mb-0 capitalize">{todayLabel}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={exportExcel}>
              <Download className="w-3.5 h-3.5" />Exporter
            </Button>
            <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            </Button>
          </div>
        </div>
        {/* [&_option]: le popup natif du <select> reste sur fond blanc quel
            que soit le CSS de la page — sans ce forçage, les options
            héritent du text-white de la bannière et deviennent illisibles
            (blanc sur blanc), seule l'option survolée reste visible. */}
        <div className="relative z-10 mt-5 [&_option]:text-gray-900">
          <DashboardFilters value={filters} onChange={setFilters} />
        </div>
      </div>

      {isError && (
        <div className="rounded-lg bg-red-50 text-red-600 px-4 py-2.5 text-sm">
          Certaines données n&apos;ont pas pu être chargées. Réessayez plus tard.
        </div>
      )}

      {/* ── KPI 4 colonnes — cartes colorées avec vraies métriques ── */}
      <div className="kpi-grid">
        <StatCard
          index={0}
          label="Revenus du mois"
          value={isLoading ? '—' : fcfa(kpis.revenusMensuels)}
          sub={`Total annuel : ${fcfa(kpis.revenusAnnuels)}`}
          tone="primary"
          icon={<CreditCard className="w-[18px] h-[18px]" />}
        />
        <StatCard
          index={1}
          label="Biens occupés"
          value={isLoading ? '—' : <>{kpis.biensOccupes}<span className="text-base font-medium text-muted-foreground">/{kpis.totalBiens}</span></>}
          sub={`Taux d'occupation : ${kpis.tauxOccupation}%`}
          tone="success"
          progressPercent={isLoading ? undefined : kpis.tauxOccupation}
          icon={<Home className="w-[18px] h-[18px]" />}
        />
        <StatCard
          index={2}
          label="Locataires actifs"
          value={isLoading ? '—' : kpis.totalLocataires}
          sub={`${kpis.biensVacants} bien${kpis.biensVacants !== 1 ? 's' : ''} vacant${kpis.biensVacants !== 1 ? 's' : ''}`}
          tone="warning"
          icon={<UserPlus className="w-[18px] h-[18px]" />}
        />
        <StatCard
          index={3}
          label="Impayés"
          value={isLoading ? '—' : kpis.impayes}
          sub={kpis.impayes > 0 ? 'Urgent — à relancer' : 'À jour'}
          tone={kpis.impayes > 0 ? 'error' : 'success'}
          icon={<AlertTriangle className="w-[18px] h-[18px]" />}
        />
      </div>

      {/* ── Revenus + Répartition par type ── */}
      <div className={cn('chart-alerts-grid', FADE_UP_CLASS)} style={fadeUpDelay(0.2)}>
        <Card>
          <CardHeader>
            <CardTitle>Analyse des revenus</CardTitle>
            <Badge tone="info">{filters.annee}</Badge>
          </CardHeader>
          <CardBody>
            {isLoading ? <div className="sk-line" /> : <RevenueBreakdown data={revenus} />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition par type de bien</CardTitle>
          </CardHeader>
          <CardBody>
            {isLoading ? <div className="sk-line" /> : <RentTypeDonut data={repartition} />}
          </CardBody>
        </Card>
      </div>

      {/* ── Actions rapides — tuiles colorées ── */}
      <div className={FADE_UP_CLASS} style={fadeUpDelay(0.25)}>
        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="rounded-xl border border-ds-border p-4 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all bg-card no-underline"
                >
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0', a.tone)}>
                    <a.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{a.label}</div>
                    <div className="text-xs text-muted-foreground">{a.sub}</div>
                  </div>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ── Paiements + Biens récents ── */}
      <div className={cn('tables-grid', FADE_UP_CLASS)} style={fadeUpDelay(0.3)}>
        <Card>
          <CardHeader>
            <CardTitle>Derniers paiements</CardTitle>
            <Link href="/dashboard/paiements" className="text-xs font-semibold text-secondary hover:underline">Voir tout</Link>
          </CardHeader>
          <CardBody>
            {isLoading ? (
              <><div className="sk-row" /><div className="sk-row" /><div className="sk-row" /></>
            ) : derniersPaiements.length === 0 ? (
              <div className="empty-box">
                <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                <h3 className="empty-title">Aucun paiement enregistré</h3>
                <p className="empty-desc">Les paiements reçus apparaîtront ici.</p>
              </div>
            ) : (
              <div className="table-rows">
                {derniersPaiements.map((p) => (
                  <div className="table-row" key={p.id}>
                    <div className="row-avatar">{initiales2(p.locataire)}</div>
                    <div className="row-info">
                      <p className="row-name">{p.locataire}</p>
                      <p className="row-sub">{p.bien}</p>
                    </div>
                    <div className="row-right">
                      <span className="text-[13px] font-bold text-primary-dark">{fcfa(p.montant)}</span>
                      <Badge tone={PAYMENT_STATUS_TONE[p.statut] ?? 'neutral'} dot>
                        {PAYMENT_STATUS_LABELS[p.statut] ?? p.statut}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mes biens récents</CardTitle>
            <Link href="/dashboard/biens" className="text-xs font-semibold text-secondary hover:underline">Voir tout</Link>
          </CardHeader>
          <CardBody>
            {isLoading ? (
              <><div className="sk-row" /><div className="sk-row" /><div className="sk-row" /></>
            ) : derniersBiens.length === 0 ? (
              <div className="empty-box">
                <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                <h3 className="empty-title">Aucun bien ajouté</h3>
                <p className="empty-desc">Ajoutez votre premier bien pour commencer.</p>
              </div>
            ) : (
              <div className="table-rows">
                {derniersBiens.map((b) => (
                  <div className="table-row" key={b.id}>
                    <div className={`row-bien-icon bi-${b.type.toLowerCase()}`}>
                      <Home className="w-4 h-4" />
                    </div>
                    <div className="row-info">
                      <p className="row-name">{b.neighborhood}</p>
                      <p className="row-sub">{b.city} · {b.type}</p>
                    </div>
                    <div className="row-right">
                      <span className="text-[13px] font-bold text-primary-dark">{fcfa(b.monthlyRent)}</span>
                      <Badge tone={PROPERTY_STATUS_TONE[b.status] ?? 'neutral'} dot>
                        {PROPERTY_STATUS_LABELS[b.status] ?? b.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── Actions en attente — uniquement des compteurs réels ── */}
      <div className={FADE_UP_CLASS} style={fadeUpDelay(0.35)}>
        <Card>
          <CardHeader>
            <CardTitle>Actions en attente</CardTitle>
            {pendingItems.length > 0 && <Badge tone="error" dot>{pendingItems.reduce((n, i) => n + i.count, 0)} en attente</Badge>}
          </CardHeader>
          <CardBody>
            {isLoading ? (
              <div className="sk-row" />
            ) : pendingItems.length === 0 ? (
              <div className="flex items-center gap-3 text-sm text-emerald-700">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                Tout est à jour — aucune action urgente à traiter.
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-3">
                {pendingItems.map((item) => (
                  <div key={item.label} className={cn('rounded-xl border p-4 flex flex-col gap-3', item.tone)}>
                    <div className="flex items-center justify-between">
                      <item.icon className="w-5 h-5" />
                      <span className="text-lg font-extrabold tabular-nums">{item.count}</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold">{item.label}</div>
                      <div className="text-xs opacity-80 mt-0.5">{item.desc}</div>
                    </div>
                    <Button asChild size="sm" variant="secondary" className="self-start mt-1">
                      <Link href={item.href}>Traiter</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
