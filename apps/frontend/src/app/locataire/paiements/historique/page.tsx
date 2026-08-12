'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { paymentsApi, type Payment } from '@/lib/payments';
import { toast } from '@/components/ui';
import {
  PageHeader, Card, Button, Badge, EmptyState, Skeleton,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ds';

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
  const { data: res, isLoading: loading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api.get<{ data: Payment[]; total: number }>('/payments'),
  });
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
        actions={<Button asChild><Link href="/locataire/paiements/declaration">Déclarer un paiement</Link></Button>}
      />

      <Card>
        {loading ? (
          <div className="p-5 flex flex-col gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title="Aucun paiement enregistré"
            description="Votre historique de paiements apparaîtra ici."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Bien</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(p.createdAt)}</TableCell>
                  <TableCell className="font-medium text-foreground">{p.lease?.property?.address || '—'}</TableCell>
                  <TableCell className="font-bold text-primary-dark tabular-nums whitespace-nowrap">{formatMontant(p.paidAmount)}</TableCell>
                  <TableCell className="text-muted-foreground">{METHOD_LABELS[p.paymentMethod] || p.paymentMethod}</TableCell>
                  <TableCell><Badge tone={STATUS_TONE[p.status] ?? 'neutral'} dot>{STATUS_LABELS[p.status] || p.status}</Badge></TableCell>
                  <TableCell>
                    {p.status === 'PAID' && (
                      <button
                        onClick={() => downloadReceipt(p.id)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark"
                      >
                        <Download className="w-4 h-4" />
                        Quittance
                      </button>
                    )}
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
