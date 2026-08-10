'use client';

import { useState } from 'react';
import { useApi, TTL } from '@/lib/use-api';
import { useAuth } from '@/lib/auth-context';
import { API_URL } from '@/lib/api';
import { formatFcfa } from '@/lib/format';
import type { MandateWithParties } from '@/lib/api-types';
import { PageHeader, Card, StatCard, Select, Button, EmptyState, Skeleton, toast } from '@/components/ui';

type MandateReceived = MandateWithParties;

interface DashboardSummary {
  revenusMensuels?: number;
  revenusAnnuels?: number;
  tauxOccupation?: number;
  totalBiens?: number;
  biensOccupes?: number;
  impayes?: number;
}

export default function GestionnairePortefeuillePage() {
  const { user } = useAuth();
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const { data: mandates, loading: mLoading } = useApi<MandateReceived[]>('/mandates', TTL.LIST);
  const { data: stats, loading: sLoading } = useApi<DashboardSummary>(`/dashboard?annee=${annee}`, TTL.LIST);
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

  // GET /mandates est bidirectionnel (propriétaire ET gestionnaire) — un
  // gestionnaire peut aussi posséder des biens en propre (parité), donc ne
  // garder que les mandats où il est le gestionnaire destinataire.
  const received = (mandates ?? []).filter(m => m.managerId === user?.id);
  const active = received.filter(m => m.status === 'ACTIVE');

  function commission(m: MandateReceived) {
    if (m.feeType === 'PERCENTAGE') {
      return Math.round(m.property.monthlyRent * m.feeValue / 100);
    }
    return m.feeValue;
  }

  const totalCommMois = active.reduce((s, m) => s + commission(m), 0);
  const totalCommAnnee = totalCommMois * 12;

  const owners = Array.from(
    active.reduce((map, m) => {
      if (!map.has(m.owner.id)) map.set(m.owner.id, m.owner);
      return map;
    }, new Map<string, { id: string; firstName: string; lastName: string }>()).values(),
  );

  async function downloadReportPreview(ownerId: string, label: string) {
    setDownloadingReport(ownerId);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('warah_access_token') : null;
      const res = await fetch(`${API_URL}/manager/owners/${ownerId}/report/preview.pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `Erreur ${res.status}` }));
        throw new Error(err.message ?? `Erreur ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `rapport-${label}.pdf`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
    } finally {
      setDownloadingReport(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Portefeuille"
        subtitle="Vos revenus de gestion et commissions"
        actions={
          <Select value={annee} onChange={e => setAnnee(Number(e.target.value))} className="!w-auto">
            {[2026, 2025, 2024].map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
        }
      />

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <StatCard
          label="Commissions ce mois"
          value={sLoading ? <Skeleton /> : formatFcfa(totalCommMois)}
          sub="Estimation sur mandats actifs"
          tone="primary"
        />
        <StatCard
          label="Commissions annuelles"
          value={sLoading ? <Skeleton /> : formatFcfa(totalCommAnnee)}
          sub="Projection annuelle"
          tone="primary"
        />
        <StatCard
          label="Loyers encaissés (mois)"
          value={sLoading ? <Skeleton /> : formatFcfa(stats?.revenusMensuels ?? 0)}
          sub={`Données ${annee}`}
          tone="success"
        />
        <StatCard
          label="Biens actifs"
          value={active.length}
          sub="Mandats en cours"
          tone="primary"
        />
      </div>

      <h3 className="text-sm font-bold text-gray-900 mb-3.5">Commissions par bien géré</h3>
      <Card>
        {mLoading ? (
          <div className="p-2"><Skeleton /><Skeleton /><Skeleton /></div>
        ) : active.length === 0 ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" />
              </svg>
            }
            title="Aucun mandat actif"
            description="Aucun mandat actif pour le moment."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Bien', 'Propriétaire', 'Loyer', 'Commission', 'Commission / mois'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11.5px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {active.map((m, i) => (
                  <tr key={m.id} className={i < active.length - 1 ? 'border-b border-gray-50' : ''}>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-sm text-gray-900">{m.property.address}</div>
                      <div className="text-xs text-gray-400">{m.property.neighborhood}, {m.property.city}</div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-700">{m.owner.firstName} {m.owner.lastName}</td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-gray-700 tabular-nums">{formatFcfa(m.property.monthlyRent)}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {m.feeType === 'PERCENTAGE' ? `${m.feeValue}%` : formatFcfa(m.feeValue)}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-extrabold text-accent tabular-nums">
                      {formatFcfa(commission(m))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={4} className="px-4 py-3.5 text-sm font-bold text-gray-700">Total mensuel estimé</td>
                  <td className="px-4 py-3.5 text-base font-extrabold text-accent tabular-nums">{formatFcfa(totalCommMois)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {owners.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-gray-900 mt-6 mb-3.5">Rapports mensuels</h3>
          <Card>
            {owners.map((o, i) => (
              <div key={o.id} className={`px-5 py-4 flex items-center justify-between gap-3 flex-wrap ${i < owners.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div>
                  <div className="font-semibold text-sm text-gray-900">{o.firstName} {o.lastName}</div>
                  <div className="text-xs text-gray-400">Aperçu du mois en cours, données à jour à l&apos;instant</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  loading={downloadingReport === o.id}
                  onClick={() => downloadReportPreview(o.id, `${o.firstName}-${o.lastName}`)}
                >
                  Aperçu du rapport (PDF)
                </Button>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
