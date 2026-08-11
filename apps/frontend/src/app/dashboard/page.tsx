'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getKPIs, getRevenusMensuels, getRepartitionLoyersParType, getDerniersPaiements, getDerniersBiens,
  getDashboardStale, fcfa,
  type DashboardKPI, type RevenuMensuel, type RepartitionType, type DernierPaiement, type DernierBien,
} from '@/lib/dashboard';
import { StatCard, Card, CardHeader, CardBody } from '@/components/ui';
import { RentTypeDonut, MonthlyRevenueChart, DashboardFilters, type DashboardFiltersValue } from '@/components/dashboard';
import './page.css';

const EMPTY_KPI: DashboardKPI = { totalBiens: 0, biensOccupes: 0, biensVacants: 0, totalLocataires: 0, revenusMensuels: 0, revenusAnnuels: 0, impayes: 0, tauxOccupation: 0 };

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente', PENDING_CONFIRMATION: 'À confirmer', PAID: 'Payé', PARTIAL: 'Partiel', LATE: 'En retard', OVERDUE: 'Impayé', REJECTED: 'Rejeté',
};
const PAYMENT_STATUS_CLASSES: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800', PARTIAL: 'bg-yellow-100 text-yellow-800', LATE: 'bg-orange-100 text-orange-800',
  OVERDUE: 'bg-red-100 text-red-800', REJECTED: 'bg-red-100 text-red-800', PENDING_CONFIRMATION: 'bg-blue-50 text-blue-700', PENDING: 'bg-gray-100 text-gray-800',
};
const PAYMENT_STATUS_DOT: Record<string, string> = {
  PAID: 'bg-green-500', PARTIAL: 'bg-yellow-500', LATE: 'bg-orange-500', OVERDUE: 'bg-red-500', REJECTED: 'bg-red-500', PENDING_CONFIRMATION: 'bg-blue-400', PENDING: 'bg-gray-500',
};
const PROPERTY_STATUS_LABELS: Record<string, string> = { OCCUPIED: 'Occupé', VACANT: 'Vacant', RENOVATION: 'En travaux', ARCHIVED: 'Archivé' };
const PROPERTY_STATUS_CLASSES: Record<string, string> = { OCCUPIED: 'bg-green-100 text-green-800', VACANT: 'bg-blue-100 text-blue-800', RENOVATION: 'bg-orange-100 text-orange-800', ARCHIVED: 'bg-gray-100 text-gray-800' };
const PROPERTY_STATUS_DOT: Record<string, string> = { OCCUPIED: 'bg-green-500', VACANT: 'bg-blue-500', RENOVATION: 'bg-orange-500', ARCHIVED: 'bg-gray-500' };

function initiales2(nom: string): string {
  return nom.split(' ').map((p) => p[0] || '').join('').substring(0, 2).toUpperCase();
}

export default function DashboardPage() {
  const now = new Date();
  const [filters, setFilters] = useState<DashboardFiltersValue>({ mois: now.getMonth() + 1, annee: now.getFullYear() });
  const [kpis, setKpis] = useState<DashboardKPI>(EMPTY_KPI);
  const [revenus, setRevenus] = useState<RevenuMensuel[]>([]);
  const [repartition, setRepartition] = useState<RepartitionType[]>([]);
  const [derniersPaiements, setDerniersPaiements] = useState<DernierPaiement[]>([]);
  const [derniersBiens, setDerniersBiens] = useState<DernierBien[]>([]);

  const [loadingKPIs, setLoadingKPIs] = useState(true);
  const [loadingRevenus, setLoadingRevenus] = useState(true);
  const [loadingPaiements, setLoadingPaiements] = useState(true);
  const [loadingBiens, setLoadingBiens] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const { annee, mois } = filters;

    // 1. Affichage immédiat si données en cache localStorage (0ms)
    const stale = getDashboardStale(annee, mois);
    if (stale) {
      setKpis(stale.kpis);
      setRevenus(stale.revenusMensuels);
      setRepartition(stale.repartitionLoyersParType);
      setDerniersPaiements(stale.derniersPaiements);
      setDerniersBiens(stale.derniersBiens);
      setLoadingKPIs(false); setLoadingRevenus(false);
      setLoadingPaiements(false); setLoadingBiens(false);
    } else {
      setLoadingKPIs(true); setLoadingRevenus(true);
      setLoadingPaiements(true); setLoadingBiens(true);
    }

    // 2. Refresh en fond — toujours, même si stale data affichée
    setError(false);
    const onError = () => setError(true);
    getKPIs(annee, mois).then((d) => { setKpis(d); setLoadingKPIs(false); }).catch(() => { setLoadingKPIs(false); onError(); });
    getRevenusMensuels(annee, mois).then((d) => { setRevenus(d); setLoadingRevenus(false); }).catch(() => { setLoadingRevenus(false); onError(); });
    getRepartitionLoyersParType(annee, mois).then(setRepartition).catch(onError);
    getDerniersPaiements(annee, mois).then((d) => { setDerniersPaiements(d); setLoadingPaiements(false); }).catch(() => { setLoadingPaiements(false); onError(); });
    getDerniersBiens(annee, mois).then((d) => { setDerniersBiens(d); setLoadingBiens(false); }).catch(() => { setLoadingBiens(false); onError(); });
  }, [filters]);

  return (
    <div className="dash-body">
      <div className="dash-toolbar">
        <DashboardFilters value={filters} onChange={setFilters} />
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '10px 16px', borderRadius: 10, fontSize: 13.5 }}>
          Certaines données n&apos;ont pas pu être chargées. Réessayez plus tard.
        </div>
      )}

      {/* ── KPI 4 colonnes — design épuré, sans dégradé ── */}
      <div className="kpi-grid">
        <StatCard
          label="Revenus du mois"
          value={loadingKPIs ? '—' : fcfa(kpis.revenusMensuels)}
          sub={`Total annuel : ${fcfa(kpis.revenusAnnuels)}`}
          tone="primary"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/></svg>}
        />
        <StatCard
          label="Biens occupés"
          value={loadingKPIs ? '—' : <>{kpis.biensOccupes}<span className="text-base font-medium text-gray-400">/{kpis.totalBiens}</span></>}
          sub={`Taux d'occupation : ${kpis.tauxOccupation}%`}
          tone="success"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
        />
        <StatCard
          label="Locataires actifs"
          value={loadingKPIs ? '—' : kpis.totalLocataires}
          sub={`${kpis.biensVacants} bien${kpis.biensVacants !== 1 ? 's' : ''} vacant${kpis.biensVacants !== 1 ? 's' : ''}`}
          tone="primary"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard
          label="Impayés"
          value={loadingKPIs ? '—' : kpis.impayes}
          sub={kpis.impayes > 0 ? 'Urgent — à relancer' : 'À jour'}
          tone={kpis.impayes > 0 ? 'error' : 'success'}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
        />
      </div>

      {/* ── Actions rapides ── */}
      <div className="quickactions-strip">
        <Link href="/dashboard/biens" className="qa-btn qa-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Ajouter un bien
        </Link>
        <Link href="/dashboard/paiements" className="qa-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          Paiement
        </Link>
        <Link href="/dashboard/locataires" className="qa-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          Nouveau locataire
        </Link>
        <Link href="/dashboard/annonces" className="qa-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          Publier une annonce
        </Link>
      </div>

      {/* ── Revenus mensuels + Répartition par type ── */}
      <div className="chart-alerts-grid">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-primary-dark m-0">Revenus mensuels</h2>
            <span className="text-xs font-semibold text-primary bg-primary-50 px-2.5 py-1 rounded-full">{filters.annee}</span>
          </CardHeader>
          <CardBody>
            {loadingRevenus ? <div className="sk-line" /> : <MonthlyRevenueChart data={revenus} />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-primary-dark m-0">Répartition par type de bien</h2>
          </CardHeader>
          <CardBody>
            {loadingKPIs ? <div className="sk-line" /> : <RentTypeDonut data={repartition} />}
          </CardBody>
        </Card>
      </div>

      {/* ── Paiements + Biens récents ── */}
      <div className="tables-grid">
        <div className="section-card">
          <div className="section-header">
            <h2 className="section-title">Derniers paiements</h2>
            <Link href="/dashboard/paiements" className="voir-tout">Voir tout</Link>
          </div>
          {loadingPaiements ? (
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
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary-dark)' }}>{fcfa(p.montant)}</span>
                    <span className={`badge inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${PAYMENT_STATUS_CLASSES[p.statut] ?? 'bg-gray-100 text-gray-800'}`}>
                      <span className={`w-2 h-2 rounded-full mr-2 ${PAYMENT_STATUS_DOT[p.statut] ?? 'bg-gray-500'}`} />
                      {PAYMENT_STATUS_LABELS[p.statut] ?? p.statut}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="section-card">
          <div className="section-header">
            <h2 className="section-title">Mes biens récents</h2>
            <Link href="/dashboard/biens" className="voir-tout">Voir tout</Link>
          </div>
          {loadingBiens ? (
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
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </div>
                  <div className="row-info">
                    <p className="row-name">{b.neighborhood}</p>
                    <p className="row-sub">{b.city} · {b.type}</p>
                  </div>
                  <div className="row-right">
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary-dark)' }}>{fcfa(b.monthlyRent)}</span>
                    <span className={`badge inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${PROPERTY_STATUS_CLASSES[b.status] ?? 'bg-gray-100 text-gray-800'}`}>
                      <span className={`w-2 h-2 rounded-full mr-2 ${PROPERTY_STATUS_DOT[b.status] ?? 'bg-gray-500'}`} />
                      {PROPERTY_STATUS_LABELS[b.status] ?? b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
