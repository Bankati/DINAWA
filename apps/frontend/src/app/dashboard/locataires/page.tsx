'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { tenantsApi, ACCOUNT_STATUS_LABELS, type TenantSummary, type AccountStatus } from '@/lib/tenants';
import { ApiError } from '@/lib/api';
import { initiales } from '@/lib/format';
import { exportToCsv } from '@/lib/csv-export';
import './page.css';

const STATUS_TABS: { value: 'ALL' | 'ACTIVE' | 'SUSPENDED'; label: string }[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'ACTIVE', label: 'Actifs' },
  { value: 'SUSPENDED', label: 'Suspendus' },
];

function matchesStatusTab(status: AccountStatus, tab: 'ALL' | 'ACTIVE' | 'SUSPENDED'): boolean {
  if (tab === 'ALL') return true;
  if (tab === 'ACTIVE') return status === 'ACTIVE';
  return status !== 'ACTIVE';
}

export default function LocatairesListPage() {
  const [locataires, setLocataires] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMessage('');
    tenantsApi
      .list()
      .then((data) => {
        if (!cancelled) setLocataires(data);
      })
      .catch((err) => {
        if (!cancelled) setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors du chargement des locataires');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const statistiques = useMemo(
    () => ({
      total: locataires.length,
      actifs: locataires.filter((l) => l.accountStatus === 'ACTIVE').length,
      avecBail: locataires.filter((l) => l.activeLease !== null).length,
      suspendus: locataires.filter((l) => l.accountStatus !== 'ACTIVE').length,
    }),
    [locataires],
  );

  const locatairesFiltres = useMemo(() => {
    const q = search.trim().toLowerCase();
    return locataires.filter((l) => {
      if (!matchesStatusTab(l.accountStatus, statusTab)) return false;
      if (q) {
        const haystack = `${l.firstName} ${l.lastName} ${l.email ?? ''} ${l.phone ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [locataires, search, statusTab]);

  const exportCsv = () => {
    exportToCsv(
      'locataires',
      [
        { key: 'nom', label: 'Nom', value: (l: TenantSummary) => `${l.firstName} ${l.lastName}` },
        { key: 'email', label: 'Email', value: (l: TenantSummary) => l.email ?? '' },
        { key: 'telephone', label: 'Téléphone', value: (l: TenantSummary) => l.phone ?? '' },
        { key: 'bien', label: 'Bien', value: (l: TenantSummary) => l.activeLease?.address ?? '' },
        { key: 'statut', label: 'Statut', value: (l: TenantSummary) => ACCOUNT_STATUS_LABELS[l.accountStatus] },
      ],
      locatairesFiltres,
    );
  };

  return (
    <div className="loc-page">
      <div className="loc-header">
        <div>
          <h1 className="loc-title">Locataires</h1>
          <p className="loc-subtitle">Gérez vos locataires et leurs baux</p>
        </div>
        <div className="loc-header-actions">
          <button type="button" className="loc-btn-secondary" onClick={exportCsv} disabled={locatairesFiltres.length === 0}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Exporter
          </button>
          <Link href="/dashboard/locataires/nouveau" className="loc-btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Nouveau locataire
          </Link>
        </div>
      </div>

      {errorMessage && <div className="loc-alert-error">{errorMessage}</div>}

      <div className="loc-kpi-grid">
        <div className="loc-kpi-card">
          <p className="loc-kpi-label">Total</p>
          <p className="loc-kpi-value">{loading ? '—' : statistiques.total}</p>
        </div>
        <div className="loc-kpi-card">
          <p className="loc-kpi-label">Actifs</p>
          <p className="loc-kpi-value loc-kpi-green">{loading ? '—' : statistiques.actifs}</p>
        </div>
        <div className="loc-kpi-card">
          <p className="loc-kpi-label">Avec bail actif</p>
          <p className="loc-kpi-value loc-kpi-blue">{loading ? '—' : statistiques.avecBail}</p>
        </div>
        <div className="loc-kpi-card">
          <p className="loc-kpi-label">Suspendus</p>
          <p className="loc-kpi-value loc-kpi-red">{loading ? '—' : statistiques.suspendus}</p>
        </div>
      </div>

      <div className="loc-filter-bar">
        <div className="loc-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            type="text"
            placeholder="Rechercher par nom, email, téléphone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="loc-tabs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`loc-tab${statusTab === tab.value ? ' active' : ''}`}
              onClick={() => setStatusTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loc-table-card">
          {[1, 2, 3].map((i) => <div key={i} className="loc-row-skeleton" />)}
        </div>
      ) : locatairesFiltres.length === 0 ? (
        <div className="loc-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          <h3>{locataires.length === 0 ? 'Aucun locataire' : 'Aucun locataire ne correspond à ces filtres'}</h3>
          <p>
            {locataires.length === 0
              ? 'Invitez votre premier locataire pour lui associer un bail.'
              : 'Essayez de modifier ou d’effacer les filtres.'}
          </p>
          {locataires.length === 0 && (
            <Link href="/dashboard/locataires/nouveau" className="loc-btn-primary">Nouveau locataire</Link>
          )}
        </div>
      ) : (
        <div className="loc-table-card">
          <div className="loc-table-header-row">
            <span>Locataire</span>
            <span>Téléphone</span>
            <span>Bien</span>
            <span>Statut</span>
            <span />
          </div>
          {locatairesFiltres.map((l) => (
            <Link key={l.id} href={`/dashboard/locataires/${l.id}`} className="loc-table-row">
              <div className="loc-row-name">
                <div className="loc-avatar">{initiales(l.firstName, l.lastName, 'L')}</div>
                <div>
                  <p className="loc-row-fullname">{l.firstName} {l.lastName}</p>
                  <p className="loc-row-email">{l.email ?? '—'}</p>
                </div>
              </div>
              <span className="loc-row-phone">{l.phone ?? '—'}</span>
              <span className="loc-row-bien">{l.activeLease?.address ?? 'Aucun bail actif'}</span>
              <span className={`loc-status-badge ${l.accountStatus === 'ACTIVE' ? 'loc-status-active' : 'loc-status-suspended'}`}>
                {ACCOUNT_STATUS_LABELS[l.accountStatus]}
              </span>
              <span className="loc-row-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" /></svg>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
