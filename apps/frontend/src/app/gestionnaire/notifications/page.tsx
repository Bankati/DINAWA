'use client';

import { useApi, TTL } from '@/lib/use-api';
import { PageHeader, Card, Badge, EmptyState, Skeleton } from '@/components/ui';

interface Notification {
  id: string;
  event: string;
  titre?: string;
  channel: 'PUSH' | 'EMAIL';
  status: 'SENT' | 'FAILED';
  payload?: Record<string, unknown> | null;
  createdAt: string;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const EVENT_ICONS: Record<string, string> = {
  payment_received: '💳',
  payment_overdue: '⚠️',
  lease_expiring: '📋',
  declaration_submitted: '📩',
  declaration_confirmed: '✅',
  declaration_rejected: '❌',
};

export default function NotificationsPage() {
  const { data: notifications, loading } = useApi<Notification[]>('/notifications?limit=50', TTL.LIST);
  const list = notifications ?? [];

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Vos 50 dernières alertes et mises à jour" />

      <Card>
        {loading ? (
          <div className="p-2"><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            }
            title="Aucune notification"
            description="Vos alertes et mises à jour apparaîtront ici."
          />
        ) : (
          <div>
            {list.map((n, i) => {
              const icon = EVENT_ICONS[n.event] ?? '🔔';
              return (
                <div key={n.id} className={`px-5 py-4 flex items-start gap-4 ${i < list.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl shrink-0">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900 mb-0.5">
                      {n.titre ?? n.event.replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-2">
                      {fmtDate(n.createdAt)}
                      <Badge tone={n.channel === 'EMAIL' ? 'info' : 'success'}>{n.channel}</Badge>
                    </div>
                  </div>
                  <Badge tone={n.status === 'SENT' ? 'success' : 'error'}>{n.status === 'SENT' ? 'Envoyé' : 'Échec'}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
