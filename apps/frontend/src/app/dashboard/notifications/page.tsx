'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Card, Badge, Button, EmptyState, Skeleton } from '@/components/ds';
import { notificationIcon, formatNotificationDate, type NotificationSummary } from '@/lib/notifications';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading: loading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<NotificationSummary[]>('/notifications?limit=50'),
  });
  const [markingAll, setMarkingAll] = useState(false);
  const list = data ?? [];
  const unreadCount = list.filter((n) => n.unread).length;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  async function markAsRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`);
      invalidate();
    } catch {
      /* échec silencieux acceptable — juste un indicateur visuel de lecture */
    }
  }

  async function markAllAsRead() {
    setMarkingAll(true);
    try {
      await api.patch('/notifications/read-all');
      invalidate();
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Vos 50 dernières alertes et mises à jour"
        actions={
          unreadCount > 0 ? (
            <Button variant="secondary" size="sm" onClick={markAllAsRead} loading={markingAll}>
              Tout marquer comme lu
            </Button>
          ) : undefined
        }
      />

      <Card>
        {loading ? (
          <div className="p-5 flex flex-col gap-3"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Bell />}
            title="Aucune notification"
            description="Vos alertes et mises à jour apparaîtront ici."
          />
        ) : (
          <div>
            {list.map((n, i) => {
              const Icon = notificationIcon(n.event);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => n.unread && markAsRead(n.id)}
                  className={`w-full text-left px-5 py-4 flex items-start gap-4 border-none bg-transparent cursor-pointer transition-colors hover:bg-ds-secondary ${i < list.length - 1 ? 'border-b border-ds-border' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.unread ? 'bg-primary-50 dark:bg-ds-secondary text-primary' : 'bg-ds-secondary text-muted-foreground'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm mb-0.5 ${n.unread ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground'}`}>
                      {n.titre}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {formatNotificationDate(n.createdAt)}
                      <Badge tone={n.channel === 'EMAIL' ? 'info' : 'success'}>{n.channel}</Badge>
                    </div>
                  </div>
                  {n.unread ? (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" aria-label="Non lu" />
                  ) : (
                    <Badge tone={n.status === 'SENT' ? 'success' : 'error'}>{n.status === 'SENT' ? 'Envoyé' : 'Échec'}</Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
