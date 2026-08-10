'use client';

import { useApi, TTL } from '@/lib/use-api';
import type { StatistiquesPlateforme } from '@/lib/admin';
import { formatFcfa, formatNumber } from '@/lib/format';
import { PageHeader, StatCard, Card, CardBody, Skeleton } from '@/components/ui';

export default function AdminDashboardPage() {
  const { data: stats, loading, error: errMsg } = useApi<StatistiquesPlateforme>('/admin/stats', TTL.STABLE);

  return (
    <div>
      <PageHeader title="Statistiques" subtitle="Vue d'ensemble de la plateforme WARAH" />

      {loading ? (
        <Card><CardBody><div className="p-2"><Skeleton /><Skeleton /></div></CardBody></Card>
      ) : errMsg || !stats ? (
        <Card><CardBody>
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            Impossible de charger les statistiques. Réessayez plus tard.
          </div>
        </CardBody></Card>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          <StatCard
            label="Utilisateurs inscrits"
            value={formatNumber(stats.nombreUtilisateurs)}
            sub={`↑ +${stats.croissanceUtilisateursMois}% ce mois`}
            tone="success"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>}
          />
          <StatCard
            label="Biens enregistrés"
            value={formatNumber(stats.nombreBiens)}
            sub={`${stats.tauxOccupation}% d'occupation`}
            tone="primary"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>}
          />
          <StatCard
            label="Volume transactions (mois)"
            value={formatFcfa(stats.volumeTransactionsMois)}
            sub={`Commissions : ${formatFcfa(stats.commissionsMois)}`}
            tone="primary"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>}
          />
          <StatCard
            label="Litiges ouverts"
            value={stats.nombreLitigesOuverts}
            sub="à traiter"
            tone={stats.nombreLitigesOuverts > 0 ? 'error' : 'primary'}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>}
          />
        </div>
      )}
    </div>
  );
}
