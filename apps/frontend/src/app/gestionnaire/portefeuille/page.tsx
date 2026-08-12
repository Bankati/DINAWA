'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, TrendingUp, Banknote, Building2, FileText } from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatFcfa } from '@/lib/format';
import type { MandateWithParties } from '@/lib/api-types';
import {
  PageHeader, Card, StatCard, EmptyState, Skeleton, Button,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ds';
import { toast } from '@/components/ui';

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
  const { data: mandates, isLoading: mLoading } = useQuery({
    queryKey: ['mandates'],
    queryFn: () => api.get<MandateReceived[]>('/mandates'),
  });
  const { data: stats, isLoading: sLoading } = useQuery({
    queryKey: ['dashboard-manager', 'summary', annee],
    queryFn: () => api.get<DashboardSummary>(`/dashboard?annee=${annee}`),
  });
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

  // GET /mandates est bidirectionnel (propriétaire ET gestionnaire) — un
  // gestionnaire peut aussi posséder des biens en propre (parité), donc ne
  // garder que les mandats où il est le gestionnaire destinataire.
  const received = (mandates ?? []).filter((m) => m.managerId === user?.id);
  const active = received.filter((m) => m.status === 'ACTIVE');

  function commission(m: MandateReceived) {
    if (m.feeType === 'PERCENTAGE') {
      return Math.round((m.property.monthlyRent * m.feeValue) / 100);
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
          <Select value={String(annee)} onValueChange={(v) => setAnnee(Number(v))}>
            <SelectTrigger className="w-auto"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2026, 2025, 2024].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <StatCard index={0} label="Commissions ce mois" value={sLoading ? '—' : formatFcfa(totalCommMois)} sub="Estimation sur mandats actifs" tone="primary" icon={<Wallet className="w-[18px] h-[18px]" />} />
        <StatCard index={1} label="Commissions annuelles" value={sLoading ? '—' : formatFcfa(totalCommAnnee)} sub="Projection annuelle" tone="primary" icon={<TrendingUp className="w-[18px] h-[18px]" />} />
        <StatCard index={2} label="Loyers encaissés (mois)" value={sLoading ? '—' : formatFcfa(stats?.revenusMensuels ?? 0)} sub={`Données ${annee}`} tone="success" icon={<Banknote className="w-[18px] h-[18px]" />} />
        <StatCard index={3} label="Biens actifs" value={active.length} sub="Mandats en cours" tone="warning" icon={<Building2 className="w-[18px] h-[18px]" />} />
      </div>

      <h3 className="text-sm font-bold text-foreground mb-3.5">Commissions par bien géré</h3>
      <Card>
        {mLoading ? (
          <div className="p-5 flex flex-col gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : active.length === 0 ? (
          <EmptyState icon={<Building2 />} title="Aucun mandat actif" description="Aucun mandat actif pour le moment." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bien</TableHead>
                <TableHead>Propriétaire</TableHead>
                <TableHead>Loyer</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Commission / mois</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-semibold text-foreground">{m.property.address}</div>
                    <div className="text-xs text-muted-foreground">{m.property.neighborhood}, {m.property.city}</div>
                  </TableCell>
                  <TableCell>{m.owner.firstName} {m.owner.lastName}</TableCell>
                  <TableCell className="font-semibold tabular-nums">{formatFcfa(m.property.monthlyRent)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.feeType === 'PERCENTAGE' ? `${m.feeValue}%` : formatFcfa(m.feeValue)}
                  </TableCell>
                  <TableCell className="font-extrabold text-accent tabular-nums">{formatFcfa(commission(m))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {active.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3.5 border-t-2 border-ds-border bg-ds-secondary">
            <span className="text-sm font-bold text-foreground">Total mensuel estimé</span>
            <span className="text-base font-extrabold text-accent tabular-nums">{formatFcfa(totalCommMois)}</span>
          </div>
        )}
      </Card>

      {owners.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-foreground mt-6 mb-3.5">Rapports mensuels</h3>
          <Card>
            {owners.map((o, i) => (
              <div key={o.id} className={`px-5 py-4 flex items-center justify-between gap-3 flex-wrap ${i < owners.length - 1 ? 'border-b border-ds-border' : ''}`}>
                <div>
                  <div className="font-semibold text-foreground">{o.firstName} {o.lastName}</div>
                  <div className="text-xs text-muted-foreground">Aperçu du mois en cours, données à jour à l&apos;instant</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  loading={downloadingReport === o.id}
                  onClick={() => downloadReportPreview(o.id, `${o.firstName}-${o.lastName}`)}
                >
                  <FileText className="w-3.5 h-3.5" />Aperçu du rapport (PDF)
                </Button>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
