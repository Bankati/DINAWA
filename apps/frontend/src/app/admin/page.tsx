'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Home, CreditCard, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import type { StatistiquesPlateforme } from '@/lib/admin';
import { formatFcfa, formatNumber } from '@/lib/format';
import { PageHeader, StatCard, Card, CardHeader, CardBody, Skeleton } from '@/components/ds';
import { RentTypeDonut, MonthlyRevenueChart, DashboardFilters, type DashboardFiltersValue } from '@/components/dashboard';

export default function AdminDashboardPage() {
  const now = new Date();
  const [filters, setFilters] = useState<DashboardFiltersValue>({ mois: now.getMonth() + 1, annee: now.getFullYear() });

  const { data: stats, isLoading: loading, isError: errMsg } = useQuery({
    queryKey: ['admin-stats', filters.annee, filters.mois],
    queryFn: () => api.get<StatistiquesPlateforme>(`/admin/stats?annee=${filters.annee}&mois=${filters.mois}`),
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <PageHeader title="Statistiques" subtitle="Vue d'ensemble de la plateforme WARAH" />
        <DashboardFilters value={filters} onChange={setFilters} />
      </div>

      {loading ? (
        <Card><CardBody><div className="flex flex-col gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /></div></CardBody></Card>
      ) : errMsg || !stats ? (
        <Card><CardBody>
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            Impossible de charger les statistiques. Réessayez plus tard.
          </div>
        </CardBody></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <StatCard
              index={0}
              label="Utilisateurs inscrits"
              value={formatNumber(stats.nombreUtilisateurs)}
              sub={`↑ +${stats.croissanceUtilisateursMois}% ce mois`}
              tone="success"
              icon={<Users className="w-[18px] h-[18px]" />}
            />
            <StatCard
              index={1}
              label="Biens enregistrés"
              value={formatNumber(stats.nombreBiens)}
              sub={`${stats.tauxOccupation}% d'occupation`}
              tone="primary"
              icon={<Home className="w-[18px] h-[18px]" />}
            />
            <StatCard
              index={2}
              label="Volume transactions (mois)"
              value={formatFcfa(stats.volumeTransactionsMois)}
              sub={`Commissions : ${formatFcfa(stats.commissionsMois)}`}
              tone="warning"
              icon={<CreditCard className="w-[18px] h-[18px]" />}
            />
            <StatCard
              index={3}
              label="Litiges ouverts"
              value={stats.nombreLitigesOuverts}
              sub="à traiter"
              tone={stats.nombreLitigesOuverts > 0 ? 'error' : 'success'}
              icon={<AlertTriangle className="w-[18px] h-[18px]" />}
            />
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
            <Card>
              <CardHeader>
                <h2 className="text-sm font-bold text-primary-dark m-0">Revenus plateforme</h2>
                <span className="text-xs font-semibold text-primary bg-primary-50 px-2.5 py-1 rounded-full">{filters.annee}</span>
              </CardHeader>
              <CardBody>
                <MonthlyRevenueChart data={stats.revenusMensuels} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <h2 className="text-sm font-bold text-primary-dark m-0">Parc immobilier par type</h2>
              </CardHeader>
              <CardBody>
                <RentTypeDonut data={stats.repartitionBiensParType} emptyMessage="Aucun bien enregistré pour l'instant." />
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
