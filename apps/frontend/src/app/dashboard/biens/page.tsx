'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  propertiesApi,
  PROPERTY_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  type Property,
  type PropertyStatus,
} from '@/lib/properties';
import { ApiError } from '@/lib/api';
import { fcfa } from '@/lib/dashboard';
import { Dropdown } from '@/components/ui/dropdown';
import { exportToCsv } from '@/lib/csv-export';
import './page.css';

const STATUS_TABS: { value: PropertyStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'VACANT', label: 'Vacant' },
  { value: 'OCCUPIED', label: 'Occupé' },
  { value: 'RENOVATION', label: 'En travaux' },
  { value: 'ARCHIVED', label: 'Archivé' },
];

const STATUS_BADGE_CLASSES: Record<PropertyStatus, string> = {
  OCCUPIED: 'bg-green-100 text-green-800',
  VACANT: 'bg-blue-100 text-blue-800',
  RENOVATION: 'bg-orange-100 text-orange-800',
  ARCHIVED: 'bg-gray-100 text-gray-600',
};

export default function BiensListPage() {
  const [biens, setBiens] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | 'ALL'>('ALL');
  const [cityFilter, setCityFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMessage('');
    propertiesApi
      .list()
      .then((res) => {
        if (!cancelled) setBiens(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors du chargement des biens');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const villes = useMemo(
    () => Array.from(new Set(biens.map((b) => b.city))).sort(),
    [biens],
  );

  const statistiques = useMemo(() => {
    const actifs = biens.filter((b) => b.status !== 'ARCHIVED');
    return {
      total: actifs.length,
      occupes: actifs.filter((b) => b.status === 'OCCUPIED').length,
      vacants: actifs.filter((b) => b.status === 'VACANT').length,
      enTravaux: actifs.filter((b) => b.status === 'RENOVATION').length,
    };
  }, [biens]);

  const biensFiltres = useMemo(() => {
    const q = search.trim().toLowerCase();
    return biens.filter((b) => {
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
      if (cityFilter && b.city !== cityFilter) return false;
      if (q) {
        const haystack = `${b.neighborhood} ${b.city} ${b.address} ${b.description ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [biens, search, statusFilter, cityFilter]);

  const hasActiveFilters = search.trim() !== '' || statusFilter !== 'ALL' || cityFilter !== '';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setCityFilter('');
  };

  const exportCsv = () => {
    exportToCsv(
      'mes-biens',
      [
        { key: 'type', label: 'Type', value: (b: Property) => PROPERTY_TYPE_LABELS[b.type] },
        { key: 'statut', label: 'Statut', value: (b: Property) => PROPERTY_STATUS_LABELS[b.status] },
        { key: 'quartier', label: 'Quartier', value: (b: Property) => b.neighborhood },
        { key: 'ville', label: 'Ville', value: (b: Property) => b.city },
        { key: 'surface', label: 'Surface (m²)', value: (b: Property) => b.surfaceArea },
        { key: 'loyer', label: 'Loyer mensuel (FCFA)', value: (b: Property) => b.monthlyRent },
        { key: 'charges', label: 'Charges (FCFA)', value: (b: Property) => b.monthlyCharges },
      ],
      biensFiltres,
    );
  };

  return (
    <div className="biens-page">
      <div className="biens-header">
        <div>
          <h1 className="biens-title">Mes biens</h1>
          <p className="biens-subtitle">Gérez votre portefeuille immobilier</p>
        </div>
        <div className="biens-header-actions">
          <button type="button" className="biens-btn-secondary" onClick={exportCsv} disabled={biensFiltres.length === 0}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Exporter
          </button>
          <Link href="/dashboard/biens/nouveau" className="biens-btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Ajouter un bien
          </Link>
        </div>
      </div>

      {errorMessage && <div className="biens-alert-error">{errorMessage}</div>}

      <div className="biens-kpi-grid">
        <div className="biens-kpi-card">
          <p className="biens-kpi-label">Total</p>
          <p className="biens-kpi-value">{loading ? '—' : statistiques.total}</p>
        </div>
        <div className="biens-kpi-card">
          <p className="biens-kpi-label">Occupés</p>
          <p className="biens-kpi-value biens-kpi-green">{loading ? '—' : statistiques.occupes}</p>
        </div>
        <div className="biens-kpi-card">
          <p className="biens-kpi-label">Vacants</p>
          <p className="biens-kpi-value biens-kpi-blue">{loading ? '—' : statistiques.vacants}</p>
        </div>
        <div className="biens-kpi-card">
          <p className="biens-kpi-label">En travaux</p>
          <p className="biens-kpi-value biens-kpi-amber">{loading ? '—' : statistiques.enTravaux}</p>
        </div>
      </div>

      <div className="biens-filter-bar">
        <div className="biens-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            type="text"
            placeholder="Rechercher par quartier, ville, adresse…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="biens-tabs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`biens-tab${statusFilter === tab.value ? ' active' : ''}`}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="biens-city-select">
          <Dropdown
            value={cityFilter}
            onChange={setCityFilter}
            placeholder="Toutes les villes"
            options={[{ value: '', label: 'Toutes les villes' }, ...villes.map((ville) => ({ value: ville, label: ville }))]}
          />
        </div>

        {hasActiveFilters && (
          <button type="button" className="biens-clear-filters" onClick={clearFilters}>
            Effacer les filtres
          </button>
        )}
      </div>

      {loading ? (
        <div className="biens-grid">
          {[1, 2, 3, 4].map((i) => <div key={i} className="biens-card biens-skeleton" />)}
        </div>
      ) : biensFiltres.length === 0 ? (
        <div className="biens-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <h3>{biens.length === 0 ? 'Aucun bien ajouté' : 'Aucun bien ne correspond à ces filtres'}</h3>
          <p>
            {biens.length === 0
              ? 'Ajoutez votre premier bien pour commencer à gérer votre portefeuille.'
              : 'Essayez de modifier ou d’effacer les filtres.'}
          </p>
          {biens.length === 0 && (
            <Link href="/dashboard/biens/nouveau" className="biens-btn-primary">Ajouter un bien</Link>
          )}
        </div>
      ) : (
        <div className="biens-grid">
          {biensFiltres.map((bien) => (
            <article key={bien.id} className="biens-card">
              <Link href={`/dashboard/biens/${bien.id}`} className="biens-card-link">
                <div className="biens-card-photo">
                  {bien.photos[0] ? (
                    <img src={bien.photos[0].url} alt="" />
                  ) : (
                    <div className="biens-card-photo-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                    </div>
                  )}
                  <span className="biens-card-type-badge">{PROPERTY_TYPE_LABELS[bien.type]}</span>
                  <span className={`biens-card-status-badge ${STATUS_BADGE_CLASSES[bien.status]}`}>{PROPERTY_STATUS_LABELS[bien.status]}</span>
                </div>
                <div className="biens-card-body">
                  <p className="biens-card-price">{fcfa(bien.monthlyRent)}<span>/mois</span></p>
                  <p className="biens-card-loc">{bien.neighborhood}, {bien.city}</p>
                  <p className="biens-card-meta">
                    {bien.surfaceArea} m²{bien.roomsCount ? ` · ${bien.roomsCount} pièce${bien.roomsCount > 1 ? 's' : ''}` : ''}
                  </p>
                  {bien.description && <p className="biens-card-desc">{bien.description}</p>}
                </div>
              </Link>
              <div className="biens-card-actions">
                <Link href={`/dashboard/biens/${bien.id}/edit`} className="biens-card-btn">Modifier</Link>
                <Link href={`/dashboard/biens/${bien.id}`} className="biens-card-btn biens-card-btn-primary">Voir le détail</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
