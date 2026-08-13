'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Home, CreditCard, AlertTriangle, Wallet, UserX } from 'lucide-react';
import { api } from '@/lib/api';
import { adminApi, type StatistiquesPlateforme } from '@/lib/admin';
import { formatFcfa, formatNumber } from '@/lib/format';
import { PageHeader, StatCard, Card, CardHeader, CardBody, Skeleton, EmptyState } from '@/components/ds';
import { RentTypeDonut, MonthlyRevenueChart, DashboardFilters, type DashboardFiltersValue } from '@/components/dashboard';

export default function AdminDashboardPage() {
  const now = new Date();
  const [filters, setFilters] = useState<DashboardFiltersValue>({ mois: now.getMonth() + 1, annee: now.getFullYear() });

  const { data: stats, isLoading: loading, isError: errMsg } = useQuery({
    queryKey: ['admin-stats', filters.annee, filters.mois],
    queryFn: () => api.get<StatistiquesPlateforme>(`/admin/stats?annee=${filters.annee}&mois=${filters.mois}`),
  });

  const { data: topOwners, isLoading: topOwnersLoading } = useQuery({
    queryKey: ['admin-top-owners'],
    queryFn: () => adminApi.topOwners(5),
  });
  const { data: topManagers, isLoading: topManagersLoading } = useQuery({
    queryKey: ['admin-top-managers'],
    queryFn: () => adminApi.topManagers(5),
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
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
              label="Volume loyers (mois)"
              value={formatFcfa(stats.volumeTransactionsMois)}
              sub={`Données ${filters.annee}`}
              tone="warning"
              icon={<CreditCard className="w-[18px] h-[18px]" />}
            />
            <StatCard
              index={3}
              label="MRR abonnements"
              value={formatFcfa(stats.mrr)}
              sub="Hors comptes en bêta gratuite"
              tone="primary"
              icon={<Wallet className="w-[18px] h-[18px]" />}
            />
            <StatCard
              index={4}
              label="Comptes suspendus"
              value={stats.comptesSuspendus}
              sub="Inactivité, paiement ou admin"
              tone={stats.comptesSuspendus > 0 ? 'warning' : 'success'}
              icon={<UserX className="w-[18px] h-[18px]" />}
            />
            <StatCard
              index={5}
              label="Litiges ouverts"
              value={stats.nombreLitigesOuverts}
              sub="à traiter"
              tone={stats.nombreLitigesOuverts > 0 ? 'error' : 'success'}
              icon={<AlertTriangle className="w-[18px] h-[18px]" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-5">
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

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><h2 className="text-sm font-bold text-primary-dark m-0">Top propriétaires</h2></CardHeader>
              <CardBody>
                {topOwnersLoading ? (
                  <Skeleton className="h-8" />
                ) : !topOwners || topOwners.length === 0 ? (
                  <EmptyState title="Aucune donnée" description="Aucun loyer encaissé pour l'instant." />
                ) : (
                  <div className="flex flex-col gap-3">
                    {topOwners.map((o, i) => (
                      <div key={o.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-primary-50 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          <span className="text-sm font-medium text-foreground">{o.firstName} {o.lastName}</span>
                        </div>
                        <span className="text-sm font-bold text-primary-dark tabular-nums">{formatFcfa(o.totalPaidAmount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader><h2 className="text-sm font-bold text-primary-dark m-0">Top gestionnaires</h2></CardHeader>
              <CardBody>
                {topManagersLoading ? (
                  <Skeleton className="h-8" />
                ) : !topManagers || topManagers.length === 0 ? (
                  <EmptyState title="Aucune donnée" description="Aucun mandat actif pour l'instant." />
                ) : (
                  <div className="flex flex-col gap-3">
                    {topManagers.map((m, i) => (
                      <div key={m.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-primary-50 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          <span className="text-sm font-medium text-foreground">{m.firstName} {m.lastName}</span>
                        </div>
                        <span className="text-sm font-bold text-primary-dark tabular-nums">{m.activeMandatesCount} mandat{m.activeMandatesCount !== 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
