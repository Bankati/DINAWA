'use client';

import Link from 'next/link';
import { paymentsApi, type Payment } from '@/lib/payments';
import { useApi, TTL } from '@/lib/use-api';
import { PageHeader, Card, Button, Badge, EmptyState, Skeleton, toast } from '@/components/ui';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  PAID: 'Payé',
  PARTIAL: 'Partiel',
  LATE: 'En retard',
  OVERDUE: 'Impayé',
  REJECTED: 'Rejeté',
  PENDING_CONFIRMATION: 'À confirmer',
};

const STATUS_TONE: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  PAID: 'success',
  PENDING: 'warning',
  PENDING_CONFIRMATION: 'warning',
  PARTIAL: 'warning',
  LATE: 'warning',
  OVERDUE: 'error',
  REJECTED: 'error',
};

const METHOD_LABELS: Record<string, string> = {
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Virement',
  CASH: 'Espèces',
  CHECK: 'Chèque',
  TMONEY: 'T-Money',
  FLOOZ: 'Flooz',
};

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMontant(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA';
}

export default function PaymentHistoryPage() {
  const { data: res, loading } = useApi<{ data: Payment[]; total: number }>('/payments', TTL.LIST);
  const payments = res?.data ?? [];

  async function downloadReceipt(paymentId: string) {
    try {
      const blob = await paymentsApi.downloadReceipt(paymentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quittance-${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
    }
  }

  return (
    <div>
      <PageHeader
        title="Historique des paiements"
        subtitle="Consultez et téléchargez vos quittances de loyer"
        actions={<Link href="/locataire/paiements/declaration"><Button>Déclarer un paiement</Button></Link>}
      />

      <Card>
        {loading ? (
          <div className="p-2"><Skeleton /><Skeleton /><Skeleton /></div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            title="Aucun paiement enregistré"
            description="Votre historique de paiements apparaîtra ici."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Date', 'Bien', 'Montant', 'Mode', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11.5px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={p.id} className={i < payments.length - 1 ? 'border-b border-gray-50' : ''}>
                    <td className="px-4 py-3.5 text-xs text-gray-500">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3.5 text-sm font-medium text-gray-900">{p.lease?.property?.address || '—'}</td>
                    <td className="px-4 py-3.5 text-sm font-bold text-primary-dark tabular-nums">{formatMontant(p.paidAmount)}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">{METHOD_LABELS[p.paymentMethod] || p.paymentMethod}</td>
                    <td className="px-4 py-3.5">
                      <Badge tone={STATUS_TONE[p.status] ?? 'neutral'} dot>{STATUS_LABELS[p.status] || p.status}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      {p.status === 'PAID' && (
                        <button
                          onClick={() => downloadReceipt(p.id)}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                          Quittance
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
