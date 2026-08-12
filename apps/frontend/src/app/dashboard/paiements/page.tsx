'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { CheckCircle2, Clock, AlertTriangle, Wallet, Search } from 'lucide-react';
import { paymentsApi, type Payment, type PaymentDeclaration } from '@/lib/payments';
import { api } from '@/lib/api';
import { formatFcfa } from '@/lib/format';
import { toast } from '@/components/ui';
import {
  PageHeader, Button, Card, Badge, Skeleton, EmptyState, StatCard, Input,
  Dialog, DialogContent, DialogHeader, DialogTitle, Textarea,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ds';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente', PENDING_CONFIRMATION: 'À confirmer', PAID: 'Payé',
  PARTIAL: 'Partiel', LATE: 'En retard', OVERDUE: 'Impayé', REJECTED: 'Rejeté',
};
const STATUS_TONE: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  PAID: 'success', PENDING: 'warning', PENDING_CONFIRMATION: 'info',
  PARTIAL: 'warning', LATE: 'warning', OVERDUE: 'error', REJECTED: 'error',
};
const METHOD_LABELS: Record<string, string> = {
  TMONEY: 'T-Money', FLOOZ: 'Flooz', CASH: 'Espèces', BANK_TRANSFER: 'Virement',
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PaiementsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'declarations' | 'historique'>('declarations');
  const [statusFilter, setStatusFilter] = useState('');
  const [tenantSearchInput, setTenantSearchInput] = useState('');
  const [tenantSearch, setTenantSearch] = useState('');

  // Léger debounce — évite une requête à chaque frappe pendant la saisie.
  useEffect(() => {
    const t = setTimeout(() => setTenantSearch(tenantSearchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [tenantSearchInput]);

  const url = (() => {
    const params = new URLSearchParams({ limit: '100' });
    if (statusFilter) params.set('status', statusFilter);
    if (tenantSearch) params.set('search', tenantSearch);
    return `/payments?${params.toString()}`;
  })();
  const { data: res, isLoading: loading } = useQuery({
    queryKey: ['payments', statusFilter, tenantSearch],
    queryFn: () => api.get<{ data: Payment[]; total: number }>(url),
  });
  const payments = res?.data ?? [];

  const { data: declRes, isLoading: dLoading } = useQuery({
    queryKey: ['payments', 'declarations'],
    queryFn: () => api.get<{ data: PaymentDeclaration[]; total: number }>(
      '/payments?source=TENANT_DECLARATION&status=PENDING_CONFIRMATION&limit=50',
    ),
  });
  const declarations = declRes?.data ?? [];

  // Requête indépendante du filtre/onglet actif — uniquement pour les
  // compteurs de la rangée StatCard, sur les 100 paiements les plus récents.
  const { data: statsRes } = useQuery({
    queryKey: ['payments', 'stats'],
    queryFn: () => api.get<{ data: Payment[]; total: number }>('/payments?limit=100'),
  });
  const statsPayments = statsRes?.data ?? [];
  const statsExhaustive = (statsRes?.total ?? 0) <= statsPayments.length;
  const statsSub = statsExhaustive ? undefined : 'Sur les 100 plus récents';
  const paidCount = statsPayments.filter((p) => p.status === 'PAID').length;
  const overdueCount = statsPayments.filter((p) => p.status === 'OVERDUE').length;
  const totalEncaisse = statsPayments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + p.paidAmount, 0);

  const invalidatePayments = () => queryClient.invalidateQueries({ queryKey: ['payments'] });

  const [downloading, setDownloading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function downloadReceipt(id: string) {
    setDownloading(id);
    try {
      const blob = await paymentsApi.downloadReceipt(id);
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl; a.download = `quittance-${id}.pdf`;
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(objUrl); document.body.removeChild(a);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
    } finally { setDownloading(null); }
  }

  const confirmMutation = useMutation({
    mutationFn: (id: string) => paymentsApi.confirmPayment(id),
    onSuccess: () => { toast.success('Paiement confirmé'); invalidatePayments(); },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Erreur'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => paymentsApi.rejectPayment(rejectId!, { rejectionReason: rejectReason }),
    onSuccess: () => {
      setRejectId(null); setRejectReason('');
      toast.success('Paiement rejeté');
      invalidatePayments();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Erreur'),
  });

  return (
    <div>
      <PageHeader
        title="Paiements"
        subtitle="Suivi des encaissements et déclarations locataires"
        actions={<Button asChild variant="accent"><Link href="/dashboard/paiements/manual">+ Paiement manuel</Link></Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <StatCard index={0} label="Déclarations à valider" value={declarations.length} sub={declarations.length > 0 ? 'Action requise' : 'À jour'} tone="warning" icon={<Clock className="w-[18px] h-[18px]" />} />
        <StatCard index={1} label="Payés" value={paidCount} sub={statsSub} tone="success" icon={<CheckCircle2 className="w-[18px] h-[18px]" />} />
        <StatCard index={2} label="Impayés" value={overdueCount} sub={statsSub} tone={overdueCount > 0 ? 'error' : 'success'} icon={<AlertTriangle className="w-[18px] h-[18px]" />} />
        <StatCard index={3} label="Montant encaissé" value={formatFcfa(totalEncaisse)} sub={statsSub} tone="primary" icon={<Wallet className="w-[18px] h-[18px]" />} />
      </div>

      <div className="flex gap-1 mb-5 bg-ds-secondary rounded-lg p-1 max-w-md">
        {([['declarations', `Déclarations${declarations.length > 0 ? ` (${declarations.length})` : ''}`], ['historique', 'Historique']] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-md py-2 px-3 text-sm font-bold transition-colors ${tab === k ? 'bg-card text-primary shadow-sm' : 'bg-transparent text-muted-foreground'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === 'declarations' ? (
        <Card>
          {dLoading ? (
            <div className="p-5 flex flex-col gap-3"><Skeleton className="h-16" /></div>
          ) : declarations.length === 0 ? (
            <EmptyState icon={<CheckCircle2 />} title="Aucune déclaration en attente" description="Toutes les déclarations locataires ont été traitées." />
          ) : (
            <div>
              {declarations.map((d, i) => (
                <div key={d.id} className={`px-5 py-4 ${i > 0 ? 'border-t border-ds-border' : ''}`}>
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div>
                      <div className="font-bold text-sm text-foreground">
                        {d.lease?.tenant?.firstName} {d.lease?.tenant?.lastName}
                        <span className="text-xs font-normal text-muted-foreground ml-2">{d.lease?.tenant?.email}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {d.lease?.property?.address ?? 'Bien non spécifié'} · Déclaré le {fmtDate(d.createdAt)}
                        {d.note && <> · <em>{d.note}</em></>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-extrabold text-primary-dark tabular-nums">{formatFcfa(d.paidAmount)}</div>
                      <div className="text-xs text-muted-foreground">{METHOD_LABELS[d.paymentMethod] ?? d.paymentMethod}</div>
                    </div>
                  </div>
                  <div className="flex gap-2.5 justify-end">
                    <Button variant="destructive" size="sm" onClick={() => { setRejectId(d.id); setRejectReason(''); }} disabled={confirmMutation.isPending && confirmMutation.variables === d.id}>Rejeter</Button>
                    <Button size="sm" onClick={() => confirmMutation.mutate(d.id)} loading={confirmMutation.isPending && confirmMutation.variables === d.id}>Confirmer</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9"
                placeholder="Rechercher un locataire (nom, email)…"
                value={tenantSearchInput}
                onChange={(e) => setTenantSearchInput(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[['', 'Tous'], ['PAID', 'Payés'], ['PENDING_CONFIRMATION', 'À confirmer'], ['OVERDUE', 'Impayés'], ['REJECTED', 'Rejetés']].map(([v, l]) => (
                <button key={v} onClick={() => setStatusFilter(v)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${statusFilter === v ? 'bg-primary text-white border-primary' : 'bg-card text-foreground border-ds-border hover:border-primary/50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <Card>
            {loading ? (
              <div className="p-5 flex flex-col gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
            ) : payments.length === 0 ? (
              tenantSearch || statusFilter ? (
                <EmptyState title="Aucun résultat" description="Aucun paiement ne correspond à ces critères." />
              ) : (
                <EmptyState title="Aucun paiement" description="Les paiements apparaîtront ici dès leur enregistrement." />
              )
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Locataire</TableHead>
                    <TableHead>Bien</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(p.createdAt)}</TableCell>
                      <TableCell>
                        {p.lease?.tenant ? <span className="font-semibold text-foreground">{p.lease.tenant.firstName} {p.lease.tenant.lastName}</span> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {p.lease?.property ? <span className="text-foreground">{p.lease.property.address}</span> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="font-bold text-primary-dark tabular-nums whitespace-nowrap">{formatFcfa(p.paidAmount)}</TableCell>
                      <TableCell className="text-muted-foreground">{p.paymentMethod ? (METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod) : '—'}</TableCell>
                      <TableCell><Badge tone={STATUS_TONE[p.status] ?? 'neutral'}>{STATUS_LABELS[p.status] ?? p.status}</Badge></TableCell>
                      <TableCell>
                        {p.status === 'PAID' ? (
                          <Button variant="outline" size="sm" onClick={() => downloadReceipt(p.id)} loading={downloading === p.id}>Quittance</Button>
                        ) : p.status === 'PENDING_CONFIRMATION' ? (
                          <Button variant="outline" size="sm" onClick={() => setTab('declarations')}>Valider</Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}

      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent maxWidth={420}>
          <DialogHeader><DialogTitle>Rejeter la déclaration</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">Indiquez la raison du rejet (visible par le locataire).</p>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} placeholder="Raison du rejet..." className="mb-4" />
          <div className="flex gap-2.5 justify-end">
            <Button variant="secondary" onClick={() => setRejectId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => rejectMutation.mutate()} disabled={!rejectReason} loading={rejectMutation.isPending}>Confirmer le rejet</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
