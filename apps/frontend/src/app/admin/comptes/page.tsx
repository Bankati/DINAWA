'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import type { AdminUser } from '@/lib/admin';
import { initiales } from '@/lib/format';
import {
  PageHeader, Card, Badge, Input, EmptyState, Skeleton,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ds';

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
  const url = `/admin/users?${new URLSearchParams(qs).toString()}`;

  const { data: res, isLoading: loading, error } = useQuery({
    queryKey: ['admin-users', activeTab, debouncedSearch],
    queryFn: () => api.get<{ data: AdminUser[]; total: number; page: number; limit: number }>(url),
  });
  const users = res?.data ?? [];
  const total = res?.total ?? 0;

  const totalActifs = users.filter((u) => u.accountStatus === 'ACTIVE').length;

  return (
    <div>
      <PageHeader
        title="Comptes"
        subtitle="Tous les comptes de la plateforme"
        actions={
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, email…" className="pl-9 w-60" />
          </div>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
          {error instanceof Error ? error.message : 'Erreur lors du chargement des comptes'}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <div className="flex gap-1 bg-ds-secondary rounded-lg p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`rounded-md py-2 px-3.5 text-sm font-bold transition-colors ${activeTab === t.key ? 'bg-card text-primary shadow-sm' : 'bg-transparent text-muted-foreground'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          Total : <strong className="text-foreground">{total}</strong> · Actifs : <strong className="text-foreground">{totalActifs}</strong>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="p-5 flex flex-col gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : users.length === 0 ? (
          <EmptyState title="Aucun compte trouvé" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Biens / Baux</TableHead>
                <TableHead>Inscription</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ background: AVATAR_COLORS[u.role] ?? '#6B7280' }}>
                        {initiales(u.firstName, u.lastName)}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{u.firstName} {u.lastName}</div>
                        <div className="text-xs text-muted-foreground">{ROLE_LABEL[u.role] ?? u.role}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email ?? '—'}</TableCell>
                  <TableCell>{u.city ?? '—'}</TableCell>
                  <TableCell className="tabular-nums">
                    {u.role === 'OWNER' || u.role === 'MANAGER'
                      ? `${u._count.ownedProperties} bien${u._count.ownedProperties !== 1 ? 's' : ''}`
                      : `${u._count.leasesAsTenant} bail${u._count.leasesAsTenant !== 1 ? 's' : ''}`}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell>
                    <Badge tone={u.accountStatus === 'ACTIVE' ? 'success' : 'error'}>{STATUS_LABEL[u.accountStatus] ?? u.accountStatus}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`/admin/comptes/${u.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary-50" title="Voir le profil" aria-label="Voir le profil">
                      <Eye className="w-4 h-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
