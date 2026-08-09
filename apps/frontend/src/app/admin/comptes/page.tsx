'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { AdminUser } from '@/lib/admin';
import { useApi, TTL } from '@/lib/use-api';
import { initiales } from '@/lib/format';
import './page.css';

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Propriétaire',
  TENANT: 'Locataire',
  MANAGER: 'Gestionnaire',
  ADMIN: 'Administrateur',
};

const AVATAR_COLORS: Record<string, string> = {
  OWNER: '#0F4C81',
  MANAGER: '#C9982E',
  TENANT: '#1F7A5C',
  ADMIN: '#B5563A',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Actif',
  SUSPENDED_INACTIVITY: 'Suspendu',
  SUSPENDED_PAYMENT: 'Suspendu',
  SUSPENDED_ADMIN: 'Suspendu',
};

const TABS = [
  { key: 'tous', label: 'Tous', role: undefined },
  { key: 'owners', label: 'Propriétaires', role: 'OWNER' },
  { key: 'managers', label: 'Gestionnaires', role: 'MANAGER' },
  { key: 'tenants', label: 'Locataires', role: 'TENANT' },
];

export default function ComptesPage() {
  const [activeTab, setActiveTab] = useState('tous');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const tab = TABS.find((t) => t.key === activeTab);
  const qs: Record<string, string> = {};
  if (tab?.role) qs.role = tab.role;
  if (debouncedSearch.trim()) qs.search = debouncedSearch.trim();
  qs.limit = '100';
  const cacheKey = `/admin/users?${new URLSearchParams(qs).toString()}`;

  const { data: res, loading, error } = useApi<{ data: AdminUser[]; total: number; page: number; limit: number }>(cacheKey, TTL.LIST);
  const users = res?.data ?? [];
  const total = res?.total ?? 0;

  const totalActifs = useMemo(() => users.filter((u) => u.accountStatus === 'ACTIVE').length, [users]);

  return (
    <div>
      {error && (
        <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13.5 }}>
          {error}
        </div>
      )}
      <div className="panel">
        <div className="panel-head">
          <h1 className="panel-title">Comptes</h1>
          <div className="panel-actions">
            <div className="search-wrap" style={{ width: 240 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                type="text" className="search-input"
                placeholder="Nom, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="tabs-row">
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.key} className={`tab-btn${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="stats-inline">
            Total : <strong>{total}</strong> · Actifs : <strong>{totalActifs}</strong>
          </div>
        </div>

        <div className="table-wrap">
          <table className="comptes-table">
            <thead>
              <tr>
                <th>Membre</th>
                <th>Email</th>
                <th>Ville</th>
                <th>Biens / Baux</th>
                <th>Inscription</th>
                <th>Statut</th>
                <th style={{ textAlign: 'center' }}>Voir</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="empty-row"><td colSpan={7}>Chargement…</td></tr>
              ) : users.length === 0 ? (
                <tr className="empty-row"><td colSpan={7}>Aucun compte trouvé.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="cell-member">
                        <div className="member-avatar" style={{ background: AVATAR_COLORS[u.role] ?? '#6B7280' }}>
                          {initiales(u.firstName, u.lastName)}
                        </div>
                        <div>
                          <div className="member-name">{u.firstName} {u.lastName}</div>
                          <div className="member-role">{ROLE_LABEL[u.role] ?? u.role}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12.5, color: '#6B7280' }}>{u.email ?? '—'}</td>
                    <td style={{ fontSize: 12.5 }}>{u.city ?? '—'}</td>
                    <td style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
                      {u.role === 'OWNER' || u.role === 'MANAGER'
                        ? `${u._count.ownedProperties} bien${u._count.ownedProperties !== 1 ? 's' : ''}`
                        : `${u._count.leasesAsTenant} bail${u._count.leasesAsTenant !== 1 ? 's' : ''}`}
                    </td>
                    <td style={{ fontSize: 12, color: '#9CA3AF' }}>
                      {new Date(u.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <span className={`status-badge status-${u.accountStatus === 'ACTIVE' ? 'actif' : 'suspendu'}`}>
                        {STATUS_LABEL[u.accountStatus] ?? u.accountStatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Link href={`/admin/comptes/${u.id}`} className="icon-btn" title="Voir le profil" aria-label="Voir le profil">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
