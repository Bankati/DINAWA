'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';
import { adminApi } from '@/lib/admin';
import { formatFcfa } from '@/lib/format';
import {
  PageHeader, Card, Badge, EmptyState, Skeleton,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ds';

const SOURCE_LABELS: Record<string, string> = {
  MANUAL_OWNER: 'Saisie manuelle',
  TENANT_DECLARATION: 'Déclaration locataire',
  CASHPAY_API: 'Cashpay',
};
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

export default function AdminTransactionsPage() {
  const [source, setSource] = useState('all');
  const [status, setStatus] = useState('all');

  const { data: res, isLoading: loading } = useQuery({
    queryKey: ['admin-transactions', source, status],
    queryFn: () =>
      adminApi.listTransactions({
        source: source === 'all' ? undefined : source,
        status: status === 'all' ? undefined : status,
        limit: 100,
      }),
  });
  const transactions = res?.data ?? [];

  return (
    <div>
      <PageHeader title="Transactions" subtitle="Supervision de tous les paiements de la plateforme" />

      <div className="flex gap-3 mb-5 flex-wrap">
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les sources</SelectItem>
            {Object.entries(SOURCE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        {loading ? (
          <div className="p-5 flex flex-col gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={<CreditCard />}
            title="Aucune transaction"
            description="Les paiements de la plateforme apparaîtront ici dès leur enregistrement."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Locataire</TableHead>
                <TableHead>Bien</TableHead>
                <TableHead>Propriétaire</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(t.createdAt)}</TableCell>
                  <TableCell className="font-medium text-foreground">{t.lease.tenant.firstName} {t.lease.tenant.lastName}</TableCell>
                  <TableCell>{t.lease.property.address}</TableCell>
                  <TableCell className="text-muted-foreground">{t.lease.owner.firstName} {t.lease.owner.lastName}</TableCell>
                  <TableCell className="font-bold text-primary-dark tabular-nums whitespace-nowrap">{formatFcfa(t.paidAmount)}</TableCell>
                  <TableCell className="text-muted-foreground">{SOURCE_LABELS[t.source] ?? t.source}</TableCell>
                  <TableCell className="text-muted-foreground">{t.paymentMethod ? (METHOD_LABELS[t.paymentMethod] ?? t.paymentMethod) : '—'}</TableCell>
                  <TableCell><Badge tone={STATUS_TONE[t.status] ?? 'neutral'}>{STATUS_LABELS[t.status] ?? t.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
