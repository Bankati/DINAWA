'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { AdminUser } from '@/lib/admin';
import { useApi, TTL } from '@/lib/use-api';
import { initiales } from '@/lib/format';
import { PageHeader, Card, Badge, DataTable, type DataTableColumn, Input } from '@/components/ui';

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

  const columns: DataTableColumn<AdminUser>[] = [
    { key: 'membre', header: 'Membre', render: (u) => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ background: AVATAR_COLORS[u.role] ?? '#6B7280' }}>
          {initiales(u.firstName, u.lastName)}
        </div>
        <div>
          <div className="font-semibold text-sm text-gray-900">{u.firstName} {u.lastName}</div>
          <div className="text-xs text-gray-400">{ROLE_LABEL[u.role] ?? u.role}</div>
        </div>
      </div>
    ) },
    { key: 'email', header: 'Email', render: (u) => <span className="text-xs text-gray-500">{u.email ?? '—'}</span> },
    { key: 'ville', header: 'Ville', render: (u) => <span className="text-xs text-gray-700">{u.city ?? '—'}</span> },
    { key: 'biens', header: 'Biens / Baux', render: (u) => (
      <span className="text-xs text-gray-700 tabular-nums">
        {u.role === 'OWNER' || u.role === 'MANAGER'
          ? `${u._count.ownedProperties} bien${u._count.ownedProperties !== 1 ? 's' : ''}`
          : `${u._count.leasesAsTenant} bail${u._count.leasesAsTenant !== 1 ? 's' : ''}`}
      </span>
    ) },
    { key: 'inscription', header: 'Inscription', render: (u) => (
      <span className="text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
    ) },
    { key: 'statut', header: 'Statut', render: (u) => (
      <Badge tone={u.accountStatus === 'ACTIVE' ? 'success' : 'error'}>{STATUS_LABEL[u.accountStatus] ?? u.accountStatus}</Badge>
    ) },
    { key: 'voir', header: '', className: 'text-center', render: (u) => (
      <Link href={`/admin/comptes/${u.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-50" title="Voir le profil" aria-label="Voir le profil">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
        </svg>
      </Link>
    ) },
  ];

  return (
    <div>
      <PageHeader
        title="Comptes"
        subtitle="Tous les comptes de la plateforme"
        actions={
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, email…" className="!pl-9 !w-60" />
          </div>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`rounded-md py-2 px-3.5 text-sm font-bold transition-colors ${activeTab === t.key ? 'bg-white text-primary shadow-sm' : 'bg-transparent text-gray-500'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-gray-500">
          Total : <strong className="text-gray-900">{total}</strong> · Actifs : <strong className="text-gray-900">{totalActifs}</strong>
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={users}
          rowKey={(u) => u.id}
          loading={loading}
          empty={{ title: 'Aucun compte trouvé' }}
        />
      </Card>
    </div>
  );
}
