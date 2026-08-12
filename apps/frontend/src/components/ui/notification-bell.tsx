'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { notificationIcon, formatNotificationDate, type NotificationSummary } from '@/lib/notifications';
import { cn } from '@/lib/cn';

export interface NotificationBellProps {
  // Page "Notifications" complète du rôle courant — lien "Voir tout" du panneau.
  seeAllRoute: string;
}

type Tab = 'all' | 'unread';

// Autosuffisant (interroge lui-même /notifications/unread-count et
// /notifications) — sans Radix/shadcn, avec les composants déjà en place
// dans ce projet (voir /architect refonte notifications, 2026-08-11) :
// même fonctionnalité qu'un popover shadcn (onglets Tout/Non lu, marquer
// comme lu, aperçu des dernières notifications), mais branchée sur les
// vraies notifications WARAH plutôt que des données de démo.
export function NotificationBell({ seeAllRoute }: NotificationBellProps) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('all');
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    api.get<{ count: number }>('/notifications/unread-count').then((d) => setUnreadCount(d.count)).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get<NotificationSummary[]>('/notifications?limit=8')
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [open]);

  // Ferme au clic extérieur / touche Échap — même pattern que Modal.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function markAsRead(id: string) {
    setNotifications((current) => current?.map((n) => (n.id === id ? { ...n, unread: false } : n)) ?? current);
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      /* le prochain fetch resynchronisera si l'appel a échoué */
    }
  }

  async function markAllAsRead() {
    setMarkingAll(true);
    try {
      await api.patch('/notifications/read-all');
      setNotifications((current) => current?.map((n) => ({ ...n, unread: false })) ?? current);
      setUnreadCount(0);
    } finally {
      setMarkingAll(false);
    }
  }

  const list = notifications ?? [];
  const filtered = tab === 'unread' ? list.filter((n) => n.unread) : list;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn('topbar-bell', unreadCount > 0 && 'has-unread')}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell strokeWidth={2} className="w-[19px] h-[19px]" />
        {unreadCount > 0 && <span className="topbar-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] w-[360px] bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setTab('all')}
                className={cn('px-3 py-1 rounded-md text-xs font-semibold transition-colors', tab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}
              >
                Tout
              </button>
              <button
                type="button"
                onClick={() => setTab('unread')}
                className={cn('px-3 py-1 rounded-md text-xs font-semibold transition-colors', tab === 'unread' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}
              >
                Non lu {unreadCount > 0 && <span className="ml-1 text-primary">{unreadCount}</span>}
              </button>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={markingAll}
                className="text-[11px] font-semibold text-gray-500 hover:text-primary disabled:opacity-50"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Chargement…</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                {tab === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
              </div>
            ) : (
              filtered.map((n) => {
                const Icon = notificationIcon(n.event);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => n.unread && markAsRead(n.id)}
                    className="w-full flex items-start gap-3 border-b border-gray-50 px-3.5 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className={cn('mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0', n.unread ? 'bg-primary-50 text-primary' : 'bg-gray-50 text-gray-400')}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-[13px] leading-snug', n.unread ? 'font-semibold text-gray-900' : 'text-gray-600')}>
                        {n.titre}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{formatNotificationDate(n.createdAt)}</p>
                    </div>
                    {n.unread ? (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" aria-label="Non lu" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <Link
            href={seeAllRoute}
            onClick={() => setOpen(false)}
            className="block text-center px-3.5 py-2.5 text-xs font-semibold text-primary hover:bg-gray-50 border-t border-gray-100"
          >
            Voir toutes les notifications
          </Link>
        </div>
      )}
    </div>
  );
}
