'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Clock, CheckCircle2, AlertTriangle, Calendar, Home } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { paymentsApi, type Payment, PAYMENT_STATUS_LABELS } from '@/lib/payments';
import { formatFcfa } from '@/lib/format';
import { PageHeader, Card, CardHeader, CardBody, StatCard, Badge, EmptyState, Skeleton } from '@/components/ds';

interface ScheduleEntry {
  id: string;
  dueDate: string;
  expectedAmount: number;
  paidAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
}

interface ActiveLease {
  id: string;
  property: { address: string; neighborhood: string; city: string };
  status: string;
  monthlyRent: number;
  monthlyCharges: number;
  startDate: string;
  endDate: string | null;
}

const PAYMENT_STATUS_TONE: Record<string, 'success' | 'warning' | 'error' | 'neutral' | 'info'> = {
  PAID: 'success', PENDING: 'neutral', PENDING_CONFIRMATION: 'info', LATE: 'error', REJECTED: 'error', CANCELLED: 'neutral',
};

export default function LocataireDashboardPage() {
  const { user } = useAuth();

  const { data: leasesRes, isLoading: leasesLoading, isError: leasesError } = useQuery({
    queryKey: ['locataire-leases', user?.id],
    queryFn: () => api.get<{ data: ActiveLease[] }>(`/tenants/${user!.id}/leases/history?limit=10`),
    enabled: !!user,
  });
  const lease = leasesRes?.data.find((l) => l.status === 'ACTIVE') ?? null;
  const noLease = !leasesLoading && !leasesError && leasesRes && !lease;

  const { data: schedule, isError: scheduleError } = useQuery({
    queryKey: ['locataire-schedule', lease?.id],
    queryFn: () => api.get<ScheduleEntry[]>(`/leases/${lease!.id}/schedule`),
    enabled: !!lease,
  });
  const nextDue = schedule
    ? [...schedule].filter((e) => e.status !== 'PAID').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] ?? null
    : null;

  const { data: paymentsRes, isError: paymentsError } = useQuery({
    queryKey: ['payments', 'recent'],
    queryFn: () => paymentsApi.getPayments({ limit: 5 }),
  });
  const payments: Payment[] = paymentsRes?.data ?? [];

  const loading = leasesLoading;
  const error = leasesError || scheduleError || paymentsError;
  const enRetard = nextDue?.status === 'OVERDUE';

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Tableau de bord" subtitle="Votre bail et vos paiements en un coup d'œil" />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          Certaines données n&apos;ont pas pu être chargées. Réessayez plus tard.
        </div>
      )}

      {loading ? (
        <Card><CardBody><div className="flex flex-col gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /></div></CardBody></Card>
      ) : noLease ? (
        <Card>
          <EmptyState
            icon={<Home />}
            title="Aucun bail actif"
            description="Contactez votre propriétaire ou gestionnaire si vous pensez qu'il s'agit d'une erreur."
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              index={0}
              label="Loyer mensuel"
              value={formatFcfa((lease?.monthlyRent ?? 0) + (lease?.monthlyCharges ?? 0))}
              sub={lease?.monthlyCharges ? `Dont ${formatFcfa(lease.monthlyCharges)} de charges` : 'Charges incluses'}
              tone="primary"
              icon={<Wallet className="w-[18px] h-[18px]" />}
            />
            <StatCard
              index={1}
              label="Prochaine échéance"
              value={nextDue ? new Date(nextDue.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
              sub={nextDue ? formatFcfa(nextDue.expectedAmount - nextDue.paidAmount) : 'Aucune échéance en attente'}
              tone={enRetard ? 'error' : 'primary'}
              icon={<Clock className="w-[18px] h-[18px]" />}
            />
            <StatCard
              index={2}
              label="Statut"
              value={enRetard ? 'En retard' : 'À jour'}
              sub={enRetard ? 'Régularisez au plus vite' : 'Aucun impayé'}
              tone={enRetard ? 'error' : 'success'}
              icon={enRetard ? <AlertTriangle className="w-[18px] h-[18px]" /> : <CheckCircle2 className="w-[18px] h-[18px]" />}
            />
            <StatCard
              index={3}
              label="Bail actif depuis"
              value={lease ? new Date(lease.startDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : '—'}
              sub={lease?.endDate ? `Jusqu'au ${new Date(lease.endDate).toLocaleDateString('fr-FR')}` : 'Durée indéterminée'}
              tone="warning"
              icon={<Calendar className="w-[18px] h-[18px]" />}
            />
          </div>

          <div className="flex gap-3 flex-wrap">
            <Link href="/locataire/paiements/declaration" className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-5 py-2.5 text-sm font-semibold hover:bg-primary-dark transition-colors">
              Déclarer un paiement
            </Link>
            <Link href="/locataire/paiements/historique" className="inline-flex items-center gap-2 rounded-lg bg-ds-secondary text-foreground px-5 py-2.5 text-sm font-semibold hover:bg-ds-border transition-colors">
              Voir l&apos;historique complet
            </Link>
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-primary-dark m-0">Mon bien</h2>
            </CardHeader>
            <CardBody>
              <div className="font-semibold text-foreground">{lease?.property.address}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{lease?.property.neighborhood}, {lease?.property.city}</div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-primary-dark m-0">Derniers paiements</h2>
              <Link href="/locataire/paiements/historique" className="text-xs font-semibold text-secondary hover:underline">Voir tout</Link>
            </CardHeader>
            {payments.length === 0 ? (
              <EmptyState title="Aucun paiement enregistré" description="Vos paiements apparaîtront ici." />
            ) : (
              <div>
                {payments.map((p, i) => (
                  <div key={p.id} className={`px-5 py-3.5 flex items-center gap-4 ${i < payments.length - 1 ? 'border-b border-ds-border' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground">{p.lease?.property?.address ?? 'Bien'}</div>
                      <div className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-primary-dark tabular-nums mb-1">{formatFcfa(p.paidAmount)}</div>
                      <Badge tone={PAYMENT_STATUS_TONE[p.status] ?? 'neutral'}>{PAYMENT_STATUS_LABELS[p.status] ?? p.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
