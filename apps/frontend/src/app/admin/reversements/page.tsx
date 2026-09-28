'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { api } from '@/lib/api';
import { formatFcfa } from '@/lib/format';
import { PAYOUT_STATUS_LABELS, PAYOUT_STATUS_TONE, type PayoutStatus } from '@/lib/payments';
import { PAYOUT_OPERATOR_LABELS, formatTogoPhone, type PayoutOperator } from '@/lib/payout-account';
import { toast } from '@/components/ui';
import {
  PageHeader, Card, Badge, Button, EmptyState, Skeleton,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ds';

interface AdminPayout {
  id: string;
  status: PayoutStatus;
  amount: number;
  attempts: number;
  operator: PayoutOperator | null;
  phone: string | null;
  lastError: string | null;
  providerFee: number | null;
  createdAt: string;
  completedAt: string | null;
  propertyLabel: string;
  beneficiary: { id: string; firstName: string; lastName: string; role: string };
}

const ROLE_LABELS: Record<string, string> = { OWNER: 'Propriétaire', MANAGER: 'Gestionnaire' };

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Supervision des reversements de loyers (voir /architect reversement,
// 2026-09-25) : un reversement en échec — solde PayDunya insuffisant, numéro
// invalide... — reste visible ici jusqu'à relance manuelle par un admin.
export default function AdminPayoutsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('all');

  const { data: res, isLoading: loading, isError } = useQuery({
    queryKey: ['admin-payouts', status],
    queryFn: () =>
      api.get<{ data: AdminPayout[]; total: number }>(
        `/admin/payouts?limit=100${status === 'all' ? '' : `&status=${status}`}`,
      ),
  });
  const payouts = res?.data ?? [];

  const retryMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/payouts/${id}/retry`),
    onSuccess: () => {
      toast.success('Reversement relancé');
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Erreur lors de la relance'),
  });

  return (
    <div>
      <PageHeader
        title="Reversements"
        subtitle="Suivi des loyers envoyés aux propriétaires et gestionnaires"
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(PAYOUT_STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        {loading ? (
          <div className="p-5 flex flex-col gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : isError ? (
          <div className="p-5 text-sm text-red-600">Impossible de charger les reversements. Rechargez la page.</div>
        ) : payouts.length === 0 ? (
          <EmptyState
            icon={<Send />}
            title="Aucun reversement"
            description="Les reversements apparaissent ici dès qu'un locataire paie un loyer en ligne."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Bénéficiaire</TableHead>
                <TableHead>Bien</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Tentatives</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(p.createdAt)}</TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{p.beneficiary.firstName} {p.beneficiary.lastName}</div>
                    <div className="text-xs text-muted-foreground">{ROLE_LABELS[p.beneficiary.role] ?? p.beneficiary.role}</div>
                  </TableCell>
                  <TableCell>{p.propertyLabel}</TableCell>
                  <TableCell className="font-bold text-primary-dark tabular-nums whitespace-nowrap">{formatFcfa(p.amount)}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {p.operator && p.phone ? `${PAYOUT_OPERATOR_LABELS[p.operator]} ${formatTogoPhone(p.phone)}` : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge tone={PAYOUT_STATUS_TONE[p.status]}>{PAYOUT_STATUS_LABELS[p.status]}</Badge>
                    {p.lastError && p.status !== 'SUCCESS' && (
                      <div className="text-xs text-muted-foreground mt-1 max-w-[260px]">{p.lastError}</div>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{p.attempts}</TableCell>
                  <TableCell>
                    {p.status === 'FAILED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => retryMutation.mutate(p.id)}
                        loading={retryMutation.isPending && retryMutation.variables === p.id}
                      >
                        Relancer
                      </Button>
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
