'use client';

import { useApi, TTL } from '@/lib/use-api';
import type { StatistiquesPlateforme } from '@/lib/admin';
import { formatFcfa, formatNumber } from '@/lib/format';
import './page.css';

export default function AdminDashboardPage() {
  const { data: stats, loading, error: errMsg } = useApi<StatistiquesPlateforme>('/admin/stats', TTL.STABLE);

  if (loading) return <div style={{ color: '#9CA3AF', fontSize: 13.5 }}>Chargement…</div>;
  if (errMsg || !stats) {
    return <div style={{ color: '#DC2626', fontSize: 13.5 }}>Impossible de charger les statistiques. Réessayez plus tard.</div>;
  }

  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-label">Utilisateurs inscrits</div>
        <div className="kpi-value">{formatNumber(stats.nombreUtilisateurs)}</div>
        <div className="kpi-sub kpi-sub-up">↑ +{stats.croissanceUtilisateursMois}% ce mois</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Biens enregistrés</div>
        <div className="kpi-value">{formatNumber(stats.nombreBiens)}</div>
        <div className="kpi-sub">{stats.tauxOccupation}% d&apos;occupation</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Volume transactions (mois)</div>
        <div className="kpi-value">{formatFcfa(stats.volumeTransactionsMois)}</div>
        <div className="kpi-sub">Commissions : {formatFcfa(stats.commissionsMois)}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Litiges ouverts</div>
        <div className="kpi-value" style={{ color: stats.nombreLitigesOuverts > 0 ? '#DC2626' : undefined }}>{stats.nombreLitigesOuverts}</div>
        <div className="kpi-sub">à traiter</div>
      </div>
    </div>
  );
}
