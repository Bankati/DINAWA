'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { paymentsApi, type Payment, PAYMENT_STATUS_LABELS } from '@/lib/payments';
import { formatFcfa } from '@/lib/format';
import { PageHeader, Card, CardHeader, CardBody, StatCard, Badge, EmptyState, Skeleton } from '@/components/ui';

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
  const [lease, setLease] = useState<ActiveLease | null>(null);
  const [nextDue, setNextDue] = useState<ScheduleEntry | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [noLease, setNoLease] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;

    api.get<{ data: ActiveLease[] }>(`/tenants/${user.id}/leases/history?limit=10`)
      .then((res) => {
        const active = res.data.find((l) => l.status === 'ACTIVE');
        if (!active) { setNoLease(true); return null; }
        setLease(active);
        return api.get<ScheduleEntry[]>(`/leases/${active.id}/schedule`);
      })
      .then((entries) => {
        if (!entries) return;
        const pending = entries
          .filter((e) => e.status !== 'PAID')
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        setNextDue(pending[0] ?? null);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    paymentsApi.getPayments({ limit: 5 }).then((res) => setPayments(res.data)).catch(() => setError(true));
  }, [user]);

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
        <Card><CardBody><div className="p-2"><Skeleton /><Skeleton /></div></CardBody></Card>
      ) : noLease ? (
        <Card>
          <EmptyState
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>}
            title="Aucun bail actif"
            description="Contactez votre propriétaire ou gestionnaire si vous pensez qu'il s'agit d'une erreur."
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            <StatCard
              label="Loyer mensuel"
              value={formatFcfa((lease?.monthlyRent ?? 0) + (lease?.monthlyCharges ?? 0))}
              sub={lease?.monthlyCharges ? `Dont ${formatFcfa(lease.monthlyCharges)} de charges` : 'Charges incluses'}
              tone="primary"
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /></svg>}
            />
            <StatCard
              label="Prochaine échéance"
              value={nextDue ? new Date(nextDue.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
              sub={nextDue ? formatFcfa(nextDue.expectedAmount - nextDue.paidAmount) : 'Aucune échéance en attente'}
              tone={enRetard ? 'error' : 'primary'}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
            />
            <StatCard
              label="Statut"
              value={enRetard ? 'En retard' : 'À jour'}
              sub={enRetard ? 'Régularisez au plus vite' : 'Aucun impayé'}
              tone={enRetard ? 'error' : 'success'}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>}
            />
            <StatCard
              label="Bail actif depuis"
              value={lease ? new Date(lease.startDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : '—'}
              sub={lease?.endDate ? `Jusqu'au ${new Date(lease.endDate).toLocaleDateString('fr-FR')}` : 'Durée indéterminée'}
              tone="primary"
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></svg>}
            />
          </div>

          <div className="flex gap-3 flex-wrap">
            <Link href="/locataire/paiements/declaration" className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-5 py-2.5 text-sm font-semibold hover:bg-primary-dark transition-colors">
              Déclarer un paiement
            </Link>
            <Link href="/locataire/paiements/historique" className="inline-flex items-center gap-2 rounded-lg bg-gray-100 text-gray-700 px-5 py-2.5 text-sm font-semibold hover:bg-gray-200 transition-colors">
              Voir l&apos;historique complet
            </Link>
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-primary-dark m-0">Mon bien</h2>
            </CardHeader>
            <CardBody>
              <div className="font-semibold text-sm text-gray-900">{lease?.property.address}</div>
              <div className="text-xs text-gray-500 mt-0.5">{lease?.property.neighborhood}, {lease?.property.city}</div>
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
                  <div key={p.id} className={`px-5 py-3.5 flex items-center gap-4 ${i < payments.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900">{p.lease?.property?.address ?? 'Bien'}</div>
                      <div className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-sm text-primary-dark tabular-nums mb-1">{formatFcfa(p.paidAmount)}</div>
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
