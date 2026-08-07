'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  getKPIs, getAlertes, getDerniersBiens, fcfa,
  type DashboardKPI, type Alerte, type DernierBien,
} from '@/lib/dashboard';
import { NotificationsBell } from '@/components/notifications-bell';
import './page.css';

const EMPTY_KPI: DashboardKPI = { totalBiens: 0, biensOccupes: 0, biensVacants: 0, totalLocataires: 0, revenusMensuels: 0, revenusAnnuels: 0, impayes: 0, tauxOccupation: 0 };

const PROPERTY_STATUS_LABEL: Record<string, string> = { OCCUPIED: 'Occupé', VACANT: 'Vacant', RENOVATION: 'En travaux', ARCHIVED: 'Archivé' };

export default function GestionnaireDashboardPage() {
  const { user } = useAuth();

  const [kpis, setKpis] = useState<DashboardKPI>(EMPTY_KPI);
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [biens, setBiens] = useState<DernierBien[]>([]);
  const [loadingKPIs, setLoadingKPIs] = useState(true);
  const [error, setError] = useState(false);

  const [dateCourante] = useState(() =>
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  );

  useEffect(() => {
    const onError = () => setError(true);
    getKPIs().then((d) => { setKpis(d); setLoadingKPIs(false); }).catch(() => { setLoadingKPIs(false); onError(); });
    getAlertes().then(setAlertes).catch(onError);
    getDerniersBiens().then(setBiens).catch(onError);
  }, []);

  const prenomGestionnaire = user?.firstName || 'Gestionnaire';
  const userInitiales = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'G' : 'G';

  return (
    <div className="ges-dash-page">
      {/* ── Hero (même traitement photo + voile que le dashboard propriétaire) ── */}
      <div className="ges-hero-wrap">
        <div className="ges-hero">
          <img src="/bridge-with-city.jpg" alt="" className="hero-bg" />
          <div className="hero-scrim" />
          <div className="hero-dots" aria-hidden="true">
            <span className="pd pd-1" /><span className="pd pd-2" /><span className="pd pd-3" />
          </div>
          <div className="hero-icon">
            <svg viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="26" fill="rgba(255,255,255,0.06)" />
              <circle cx="32" cy="32" r="19" stroke="rgba(201,152,46,0.35)" strokeWidth="1.5" />
              <path d="M32 16L48 28v20a2 2 0 01-2 2h-9v-12h-10v12h-9a2 2 0 01-2-2V28z" fill="#C9982E" />
            </svg>
          </div>
          <div className="hero-meta">
            <span className="hero-date-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {dateCourante}
            </span>
            <span className="hero-role-badge">Gestionnaire</span>
          </div>
          <h1 className="hero-greeting">Bonjour, {prenomGestionnaire} !</h1>
          <p className="hero-subtitle">Voici un aperçu de votre portefeuille géré</p>
          <div className="hero-actions">
            <NotificationsBell notificationsHref="/gestionnaire/notifications" />
            <div className="hero-avatar">{userInitiales}</div>
          </div>
        </div>
      </div>

      <div className="ges-body">
        {error && (
          <div className="ges-error-banner">Certaines données n&apos;ont pas pu être chargées. Réessayez plus tard.</div>
        )}

        {/* ── KPI ── */}
        <div className="kpi-grid">
          {loadingKPIs ? (
            <>
              <div className="kpi-card"><div className="sk-line" /></div>
              <div className="kpi-card"><div className="sk-line" /></div>
              <div className="kpi-card"><div className="sk-line" /></div>
              <div className="kpi-card"><div className="sk-line" /></div>
            </>
          ) : (
            <>
              <div className="kpi-card">
                <div className="kpi-icon-wrap kpi-blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/></svg>
                </div>
                <span className="kpi-value">{kpis.totalBiens}</span>
                <span className="kpi-label">Biens gérés</span>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon-wrap kpi-green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <span className="kpi-value">{kpis.tauxOccupation}%</span>
                <span className="kpi-label">Taux d&apos;occupation</span>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon-wrap kpi-indigo">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <span className="kpi-value">{fcfa(kpis.revenusMensuels)}</span>
                <span className="kpi-label">Revenus gérés / mois</span>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon-wrap kpi-danger">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                <span className="kpi-value">{fcfa(kpis.impayes)}</span>
                <span className="kpi-label">Impayés</span>
              </div>
            </>
          )}
        </div>

        {/* ── Deux colonnes : alertes + biens récents ── */}
        <div className="two-col">
          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">Alertes actives</h2>
              {alertes.length > 0 && <span className="count-badge">{alertes.length}</span>}
              <Link href="/gestionnaire/notifications" className="see-all">Voir tout →</Link>
            </div>
            {alertes.length === 0 ? (
              <div className="empty-state">
                <p className="empty-title">Aucune alerte active</p>
                <p className="empty-desc">Vous êtes à jour, rien à traiter pour le moment.</p>
              </div>
            ) : (
              <div className="alerts-list">
                {alertes.map((a) => (
                  <div key={a.id} className={`alert-item alert-${a.priorite === 'haute' ? 'critical' : a.priorite === 'moyenne' ? 'warning' : 'info'}`}>
                    <div className="alert-body">
                      <span className="alert-titre">{a.titre}</span>
                      <span className="alert-detail">{a.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">Biens récents</h2>
              <Link href="/gestionnaire/biens" className="see-all">Voir tout →</Link>
            </div>
            {biens.length === 0 ? (
              <div className="empty-state">
                <p className="empty-title">Aucun bien dans le portefeuille</p>
                <p className="empty-desc">Les biens que vous gérez apparaîtront ici.</p>
              </div>
            ) : (
              <div className="biens-list">
                {biens.map((b) => (
                  <div key={b.id} className="bien-row">
                    <div className="bien-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/></svg>
                    </div>
                    <div className="bien-info">
                      <span className="bien-nom">{b.neighborhood}, {b.city}</span>
                      <span className="bien-adresse">{fcfa(b.monthlyRent)} / mois</span>
                    </div>
                    <span className={`statut-pill ${b.status === 'OCCUPIED' ? 'occupe' : 'vacant'}`}>
                      {PROPERTY_STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Actions rapides ── */}
        <div className="section-card">
          <div className="section-header"><h2 className="section-title">Actions rapides</h2></div>
          <div className="actions-grid">
            <Link href="/gestionnaire/biens" className="action-card">
              <div className="action-icon-wrap act-blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              </div>
              <p className="action-title">Ajouter un bien</p>
              <p className="action-sub">Nouveau bien au portefeuille</p>
            </Link>
            <Link href="/gestionnaire/locataires" className="action-card">
              <div className="action-icon-wrap act-green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              </div>
              <p className="action-title">Ajouter locataire</p>
              <p className="action-sub">Inviter un nouveau locataire</p>
            </Link>
            <Link href="/gestionnaire/paiements" className="action-card">
              <div className="action-icon-wrap act-indigo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <p className="action-title">Enregistrer paiement</p>
              <p className="action-sub">Nouveau paiement reçu</p>
            </Link>
            <Link href="/gestionnaire/portefeuille" className="action-card">
              <div className="action-icon-wrap act-accent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <p className="action-title">Portefeuille</p>
              <p className="action-sub">Biens confiés par mandat</p>
            </Link>
            <Link href="/gestionnaire/rapports" className="action-card">
              <div className="action-icon-wrap act-purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <p className="action-title">Rapports</p>
              <p className="action-sub">Rapports mensuels</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
