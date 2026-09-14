'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, CheckCircle2, XCircle } from 'lucide-react';
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

// Le retour de PayDunya (?paydunya=success|cancelled, voir PaymentsService.initiate(),
// returnUrl/cancelUrl) ne veut pas dire "confirmé" — la confirmation réelle
// arrive via webhook ou, au pire, le cron de réconciliation (jusqu'à 15 min,
// voir /architect 2026-09-14). On rafraîchit donc automatiquement la liste
// un moment après un retour "success", plutôt que de laisser le locataire
// se demander si son paiement a fonctionné.
const POLL_INTERVAL_MS = 5_000;
const POLL_DURATION_MS = 60_000;

export default function PaymentHistoryPage() {
  return (
    <Suspense>
      <PaymentHistoryContent />
    </Suspense>
  );
}

function PaymentHistoryContent() {
  const searchParams = useSearchParams();
  const paydunyaReturn = searchParams.get('paydunya'); // 'success' | 'cancelled' | null
  const [pollStartedAt] = useState(() => (paydunyaReturn === 'success' ? Date.now() : null));

  const { data: res, isLoading: loading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api.get<{ data: Payment[]; total: number }>('/payments'),
    refetchInterval: () => {
      if (!pollStartedAt) return false;
      return Date.now() - pollStartedAt < POLL_DURATION_MS ? POLL_INTERVAL_MS : false;
    },
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
        actions={<Button asChild><Link href="/locataire/paiements/declaration">Payer / déclarer un paiement</Link></Button>}
      />

      {paydunyaReturn === 'success' && (
        <Card className="mb-4">
          <div className="p-4 flex items-start gap-3 bg-green-50 border border-green-200 rounded-2xl">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">
              <div className="font-semibold">Paiement envoyé à PayDunya</div>
              <div className="mt-0.5">
                La confirmation peut prendre quelques instants — cette page se met à jour automatiquement.
                Le statut passera à « Payé » dès que le paiement sera confirmé.
              </div>
            </div>
          </div>
        </Card>
      )}

      {paydunyaReturn === 'cancelled' && (
        <Card className="mb-4">
          <div className="p-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl">
            <XCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <div className="font-semibold">Paiement annulé</div>
              <div className="mt-0.5">Vous pouvez relancer un paiement à tout moment depuis cette page.</div>
            </div>
          </div>
        </Card>
      )}

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
