'use client';

import { useState } from 'react';
import Link from 'next/link';
import { paymentsApi, type Payment, type PaymentDeclaration } from '@/lib/payments';
import { useApi, TTL } from '@/lib/use-api';
import { formatFcfa } from '@/lib/format';
import { PageHeader, Button, Card, Badge, DataTable, type DataTableColumn, Modal, Textarea, Skeleton, toast } from '@/components/ui';

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
  const [tab, setTab] = useState<'declarations' | 'historique'>('declarations');
  const [statusFilter, setStatusFilter] = useState('');

  const url = statusFilter ? `/payments?status=${statusFilter}&limit=100` : '/payments?limit=100';
  const { data: res, loading } = useApi<{ data: Payment[]; total: number }>(url, TTL.LIST);
  const payments = res?.data ?? [];

  const { data: declRes, loading: dLoading, reload: reloadDecl } = useApi<{ data: PaymentDeclaration[]; total: number }>(
    '/payments?source=TENANT_DECLARATION&status=PENDING_CONFIRMATION&limit=50', TTL.LIST,
  );
  const declarations = declRes?.data ?? [];

  const [downloading, setDownloading] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
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

  async function confirmDeclaration(id: string) {
    setProcessing(id);
    try {
      await paymentsApi.confirmPayment(id);
      toast.success('Paiement confirmé');
      reloadDecl();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally { setProcessing(null); }
  }

  async function rejectDeclaration() {
    if (!rejectId || !rejectReason) return;
    setProcessing(rejectId);
    try {
      await paymentsApi.rejectPayment(rejectId, { rejectionReason: rejectReason });
      setRejectId(null); setRejectReason('');
      toast.success('Paiement rejeté');
      reloadDecl();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally { setProcessing(null); }
  }

  const columns: DataTableColumn<Payment>[] = [
    { key: 'date', header: 'Date', render: (p) => <span className="text-sm text-gray-500 whitespace-nowrap">{fmtDate(p.createdAt)}</span> },
    { key: 'locataire', header: 'Locataire', render: (p) => (
      p.lease?.tenant ? <span className="font-semibold text-sm text-gray-900">{p.lease.tenant.firstName} {p.lease.tenant.lastName}</span> : <span className="text-gray-300">—</span>
    ) },
    { key: 'bien', header: 'Bien', render: (p) => (
      p.lease?.property ? <span className="text-sm text-gray-700">{p.lease.property.address}</span> : <span className="text-gray-300">—</span>
    ) },
    { key: 'montant', header: 'Montant', render: (p) => (
      <span className="font-bold text-sm text-primary-dark tabular-nums whitespace-nowrap">{formatFcfa(p.paidAmount)}</span>
    ) },
    { key: 'mode', header: 'Mode', render: (p) => <span className="text-sm text-gray-500">{p.paymentMethod ? (METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod) : '—'}</span> },
    { key: 'statut', header: 'Statut', render: (p) => <Badge tone={STATUS_TONE[p.status] ?? 'neutral'}>{STATUS_LABELS[p.status] ?? p.status}</Badge> },
    { key: 'actions', header: '', render: (p) => (
      p.status === 'PAID' ? (
        <Button variant="outline" size="sm" onClick={() => downloadReceipt(p.id)} loading={downloading === p.id}>Quittance</Button>
      ) : p.status === 'PENDING_CONFIRMATION' ? (
        <Button variant="outline" size="sm" onClick={() => setTab('declarations')}>Valider</Button>
      ) : null
    ) },
  ];

  return (
    <div>
      <PageHeader
        title="Paiements"
        subtitle="Suivi des encaissements et déclarations locataires"
        actions={<Link href="/dashboard/paiements/manual"><Button variant="accent">+ Paiement manuel</Button></Link>}
      />

      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 max-w-md">
        {([['declarations', `Déclarations${declarations.length > 0 ? ` (${declarations.length})` : ''}`], ['historique', 'Historique']] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-md py-2 px-3 text-sm font-bold transition-colors ${tab === k ? 'bg-white text-primary shadow-sm' : 'bg-transparent text-gray-500'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === 'declarations' ? (
        <Card>
          {dLoading ? (
            <div className="p-2"><Skeleton height={64} /></div>
          ) : declarations.length === 0 ? (
            <div className="text-center py-12 px-8">
              <div className="text-4xl mb-3">✓</div>
              <div className="font-bold text-lg text-gray-900 mb-2">Aucune déclaration en attente</div>
              <div className="text-sm text-gray-500">Toutes les déclarations locataires ont été traitées.</div>
            </div>
          ) : (
            <div>
              {declarations.map((d, i) => (
                <div key={d.id} className={`px-5 py-4 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div>
                      <div className="font-bold text-sm text-gray-900">
                        {d.lease?.tenant?.firstName} {d.lease?.tenant?.lastName}
                        <span className="text-xs font-normal text-gray-400 ml-2">{d.lease?.tenant?.email}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {d.lease?.property?.address ?? 'Bien non spécifié'} · Déclaré le {fmtDate(d.createdAt)}
                        {d.note && <> · <em>{d.note}</em></>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-extrabold text-primary-dark tabular-nums">{formatFcfa(d.paidAmount)}</div>
                      <div className="text-xs text-gray-500">{METHOD_LABELS[d.paymentMethod] ?? d.paymentMethod}</div>
                    </div>
                  </div>
                  <div className="flex gap-2.5 justify-end">
                    <Button variant="danger" size="sm" onClick={() => { setRejectId(d.id); setRejectReason(''); }} disabled={processing === d.id}>Rejeter</Button>
                    <Button size="sm" onClick={() => confirmDeclaration(d.id)} loading={processing === d.id}>Confirmer</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {[['', 'Tous'], ['PAID', 'Payés'], ['PENDING_CONFIRMATION', 'À confirmer'], ['OVERDUE', 'Impayés'], ['REJECTED', 'Rejetés']].map(([v, l]) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${statusFilter === v ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300 hover:border-primary/50'}`}>
                {l}
              </button>
            ))}
          </div>
          <Card>
            <DataTable
              columns={columns}
              data={payments}
              rowKey={(p) => p.id}
              loading={loading}
              empty={{ title: 'Aucun paiement', description: 'Les paiements apparaîtront ici dès leur enregistrement.' }}
            />
          </Card>
        </>
      )}

      <Modal open={!!rejectId} onClose={() => setRejectId(null)} title="Rejeter la déclaration" maxWidth={420}>
        <p className="text-sm text-gray-500 mb-4">Indiquez la raison du rejet (visible par le locataire).</p>
        <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4} placeholder="Raison du rejet..." className="mb-4" />
        <div className="flex gap-2.5 justify-end">
          <Button variant="secondary" onClick={() => setRejectId(null)}>Annuler</Button>
          <Button variant="danger" onClick={rejectDeclaration} disabled={!rejectReason} loading={processing === rejectId}>Confirmer le rejet</Button>
        </div>
      </Modal>
    </div>
  );
}
