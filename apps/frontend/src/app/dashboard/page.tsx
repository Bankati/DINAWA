'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  getKPIs, getRevenusMensuels, getAlertes, getDerniersPaiements, getDerniersBiens, fcfa,
  type DashboardKPI, type RevenuMensuel, type Alerte, type DernierPaiement, type DernierBien,
} from '@/lib/dashboard';
import { initiales } from '@/lib/format';
import './page.css';

const CHART_W = 540;
const CHART_H = 160;
const PAD_T = 12;
const PAD_B = 8;

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

function formatMoisCourt(mois: string): string {
  const [year, month] = mois.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1))).replace('.', '');
}
function formatMoisLong(mois: string): string {
  const [year, month] = mois.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
}

interface ChartPoint { x: number; y: number; xPct: number; yPct: number; r: RevenuMensuel; }

function buildChartPoints(revenus: RevenuMensuel[], maxRevenu: number): ChartPoint[] {
  const n = revenus.length;
  if (!n) return [];
  const innerH = CHART_H - PAD_T - PAD_B;
  return revenus.map((r, i) => {
    const x = n > 1 ? (i * CHART_W) / (n - 1) : CHART_W / 2;
    const y = PAD_T + innerH * (1 - r.montant / maxRevenu);
    return { x, y, xPct: (x / CHART_W) * 100, yPct: (y / CHART_H) * 100, r };
  });
}

function svgLinePath(pts: ChartPoint[]): string {
  if (!pts.length) return '';
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const cp1x = +(p1.x + (p2.x - p0.x) / 6).toFixed(2);
    const cp1y = +(p1.y + (p2.y - p0.y) / 6).toFixed(2);
    const cp2x = +(p2.x - (p3.x - p1.x) / 6).toFixed(2);
    const cp2y = +(p2.y - (p3.y - p1.y) / 6).toFixed(2);
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const [kpis, setKpis] = useState<DashboardKPI>(EMPTY_KPI);
  const [revenus, setRevenus] = useState<RevenuMensuel[]>([]);
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [derniersPaiements, setDerniersPaiements] = useState<DernierPaiement[]>([]);
  const [derniersBiens, setDerniersBiens] = useState<DernierBien[]>([]);

  const [loadingKPIs, setLoadingKPIs] = useState(true);
  const [loadingRevenus, setLoadingRevenus] = useState(true);
  const [loadingAlertes, setLoadingAlertes] = useState(true);
  const [loadingPaiements, setLoadingPaiements] = useState(true);
  const [loadingBiens, setLoadingBiens] = useState(true);

  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [error, setError] = useState(false);

  const [dateCourante] = useState(() => new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  const anneeEnCours = new Date().getFullYear();

  useEffect(() => {
    const onError = () => setError(true);
    getKPIs().then((d) => { setKpis(d); setLoadingKPIs(false); }).catch(() => { setLoadingKPIs(false); onError(); });
    getRevenusMensuels().then((d) => { setRevenus(d); setLoadingRevenus(false); }).catch(() => { setLoadingRevenus(false); onError(); });
    getAlertes().then((d) => { setAlertes(d); setLoadingAlertes(false); }).catch(() => { setLoadingAlertes(false); onError(); });
    getDerniersPaiements().then((d) => { setDerniersPaiements(d); setLoadingPaiements(false); }).catch(() => { setLoadingPaiements(false); onError(); });
    getDerniersBiens().then((d) => { setDerniersBiens(d); setLoadingBiens(false); }).catch(() => { setLoadingBiens(false); onError(); });
  }, []);

  const utilisateurPrenom = user?.firstName || 'Propriétaire';
  const userInitiales = user ? initiales(user.firstName, user.lastName, 'P') : 'P';

  const maxRevenu = revenus.length ? Math.max(...revenus.map((r) => r.montant)) : 1000000;
  const totalRevenus = revenus.reduce((s, r) => s + r.montant, 0);
  const moyenneRevenu = revenus.length ? totalRevenus / revenus.length : 0;
  const meilleurMois = revenus.length ? formatMoisLong(revenus.reduce((best, r) => (r.montant > best.montant ? r : best)).mois) : '—';
  const hasRevenusData = totalRevenus > 0;

  const chartPoints = buildChartPoints(revenus, maxRevenu || 1);
  const activePoint = activePointIndex !== null ? chartPoints[activePointIndex] ?? null : null;
  const linePath = svgLinePath(chartPoints);
  const bottomY = CHART_H - PAD_B;
  const areaPath = chartPoints.length ? `${linePath} L ${chartPoints[chartPoints.length - 1].x},${bottomY} L ${chartPoints[0].x},${bottomY} Z` : '';
  const innerH = CHART_H - PAD_T - PAD_B;
  const yGridLines = [1, 0.75, 0.5, 0.25, 0].map((p) => PAD_T + innerH * (1 - p));
  const yGridLabels = [1, 0.75, 0.5, 0.25, 0].map((p) => (p === 0 ? '0' : `${Math.round((maxRevenu * p) / 1000)}k`));

  return (
    <div className="dash-page">
      <header className="dash-header">
        <div className="header-left">
          <h1 className="header-greeting">Bonjour, {utilisateurPrenom}</h1>
          <p className="header-date">{dateCourante}</p>
        </div>
        <div className="header-right">
          <Link href="/dashboard/notifications" className={`notif-btn${alertes.length > 0 ? ' has-alertes' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            {alertes.length > 0 && <span className="notif-badge">{alertes.length}</span>}
          </Link>
          <div className="header-avatar">{userInitiales}</div>
        </div>
      </header>

      <div className="dash-body">
        {error && (
          <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '10px 16px', borderRadius: 10, fontSize: 13.5 }}>
            Certaines données n&apos;ont pas pu être chargées. Réessayez plus tard.
          </div>
        )}
        {/* ── KPI asymétrique ── */}
        <div className="kpi-layout">
          {loadingKPIs ? (
            <>
              <div className="kpi-hero-card"><div className="sk-line" style={{ height: '100%', minHeight: 220 }} /></div>
              <div className="kpi-biens-card"><div className="sk-line" /></div>
              <div className="kpi-taux-card"><div className="sk-line" /></div>
              <div className="kpi-impayes-card"><div className="sk-line" /></div>
            </>
          ) : (
            <>
              <div className="kpi-hero-card">
                <p className="kpi-h-eyebrow">Revenus ce mois</p>
                <p className="kpi-h-amount">{fcfa(kpis.revenusMensuels)}</p>
                <p className="kpi-h-trend">↑ +5 % vs mois dernier</p>
                <div className="kpi-h-sep" />
                <div className="kpi-h-footer">
                  <span className="kpi-h-ann-label">Total annuel</span>
                  <span className="kpi-h-ann-val">{fcfa(kpis.revenusAnnuels)}</span>
                </div>
              </div>

              <div className="kpi-biens-card">
                <p className="kpi-label">Parc immobilier</p>
                <div className="kpi-biens-row">
                  <p className="kpi-big">{kpis.totalBiens}</p>
                  <div className="biens-pills">
                    <span className="biens-pill occ">{kpis.biensOccupes} occupés</span>
                    <span className="biens-pill vac">{kpis.biensVacants} vacants</span>
                  </div>
                </div>
                <div className="biens-bar-track">
                  <div className="biens-bar-fill" style={{ width: `${kpis.totalBiens > 0 ? (kpis.biensOccupes / kpis.totalBiens) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="kpi-taux-card">
                <p className="kpi-label">Occupation</p>
                <div className="taux-body">
                  <div>
                    <p className="kpi-big accent">{kpis.tauxOccupation}%</p>
                    <p className="kpi-sub">{kpis.totalLocataires} locataires</p>
                  </div>
                  <svg viewBox="0 0 44 44" className="ring-svg" aria-hidden="true">
                    <circle cx="22" cy="22" r="17" className="ring-bg" />
                    <circle cx="22" cy="22" r="17" className="ring-fill" strokeDasharray={`${((kpis.tauxOccupation / 100) * 106.81).toFixed(2)} 106.81`} />
                  </svg>
                </div>
              </div>

              <div className="kpi-impayes-card">
                <p className="kpi-label">Impayés</p>
                <p className="kpi-big danger">{kpis.impayes}</p>
                <p className="kpi-sub">loyer{kpis.impayes !== 1 ? 's' : ''} en retard</p>
                {kpis.impayes > 0 ? <span className="urgent-pill">Urgent</span> : <span className="ok-pill">À jour</span>}
              </div>
            </>
          )}
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

        {/* ── Graphique + Alertes ── */}
        <div className="chart-alerts-grid">
          <div className="section-card chart-card">
            <div className="section-header">
              <h2 className="section-title">Revenus mensuels</h2>
              <div className="chart-controls">
                <div className="chart-tabs">
                  <button className="chart-tab active">Mensuel</button>
                  <button className="chart-tab">Annuel</button>
                </div>
                <span className="section-tag">{anneeEnCours}</span>
              </div>
            </div>
            {loadingRevenus ? (
              <div className="sk-line" />
            ) : !hasRevenusData ? (
              <div className="empty-box">
                <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                <h3 className="empty-title">Aucun revenu pour {anneeEnCours}</h3>
                <p className="empty-desc">Les revenus s&apos;afficheront dès qu&apos;un bail actif générera des paiements.</p>
              </div>
            ) : (
              <>
                <div className="chart-container">
                  <div className="y-axis-labels">
                    {yGridLabels.map((lbl, i) => <span className="y-label" key={i}>{lbl}</span>)}
                  </div>
                  <div className="svg-wrapper" onMouseLeave={() => setActivePointIndex(null)}>
                    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="area-chart" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="dashAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0F4C81" stopOpacity="0.18" />
                          <stop offset="65%" stopColor="#1e5fa0" stopOpacity="0.05" />
                          <stop offset="100%" stopColor="#C9982E" stopOpacity="0.02" />
                        </linearGradient>
                        <linearGradient id="dashLineGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#0F4C81" />
                          <stop offset="60%" stopColor="#1a6dc0" />
                          <stop offset="100%" stopColor="#C9982E" />
                        </linearGradient>
                      </defs>
                      {yGridLines.map((gy, i) => <line key={i} x1="0" y1={gy} x2={CHART_W} y2={gy} className="grid-line" />)}
                      <path d={areaPath} className="chart-area-fill" />
                      <path d={linePath} className="chart-line" stroke="url(#dashLineGrad)" />
                      {chartPoints.map((pt, i) => (
                        <g key={i} className={`data-point${activePointIndex === i ? ' active' : ''}`} onMouseEnter={() => setActivePointIndex(i)}>
                          <circle cx={pt.x} cy={pt.y} r="14" className="point-hit" />
                          <circle cx={pt.x} cy={pt.y} r="9" className="point-glow" />
                          <circle cx={pt.x} cy={pt.y} r="5.5" className="point-ring" />
                          <circle cx={pt.x} cy={pt.y} r="3" className="point-dot" />
                        </g>
                      ))}
                    </svg>
                    {activePoint && (
                      <div className="chart-tooltip" style={{ left: `${activePoint.xPct}%`, top: `${activePoint.yPct}%` }}>
                        <span className="tt-month">{formatMoisLong(activePoint.r.mois)}</span>
                        <span className="tt-amount">{Math.round(activePoint.r.montant / 1000)} k FCFA</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="x-axis-row">
                  {revenus.map((r) => <span className="x-label" key={r.mois}>{formatMoisCourt(r.mois)}</span>)}
                </div>
                <div className="chart-stats-row">
                  <div className="chart-stat">
                    <span className="cs-label">Total</span>
                    <span className="cs-value primary">{Math.round(totalRevenus / 1000)} k FCFA</span>
                  </div>
                  <div className="cs-sep" />
                  <div className="chart-stat">
                    <span className="cs-label">Moyenne / mois</span>
                    <span className="cs-value">{Math.round(moyenneRevenu / 1000)} k FCFA</span>
                  </div>
                  <div className="cs-sep" />
                  <div className="chart-stat">
                    <span className="cs-label">Meilleur mois</span>
                    <span className="cs-value accent">{meilleurMois}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="section-card alerts-card">
            <div className="section-header">
              <h2 className="section-title">Alertes</h2>
              {alertes.length > 0 && <span className="alertes-badge">{alertes.length}</span>}
            </div>
            {loadingAlertes ? (
              <><div className="sk-row" /><div className="sk-row" /><div className="sk-row" /></>
            ) : alertes.length === 0 ? (
              <div className="no-alertes">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                <p>Aucune alerte active</p>
              </div>
            ) : (
              <div className="alertes-list">
                {alertes.map((a) => (
                  <div key={a.id} className={`alerte-row alerte-${a.priorite}`}>
                    <div className="alerte-icon-box">
                      {(a.type === 'retard' || a.type === 'impaye') && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      )}
                      {a.type === 'maintenance' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      )}
                      {a.type === 'bientot_expire' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      )}
                    </div>
                    <div className="alerte-body">
                      <p className="alerte-titre">{a.titre}</p>
                      <p className="alerte-desc">{a.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
    </div>
  );
}
