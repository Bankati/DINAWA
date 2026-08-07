'use client';

import { useEffect, useMemo, useState } from 'react';
import { notificationsApi, EVENT_LABELS, type NotificationSummary } from '@/lib/notifications';
import { ApiError } from '@/lib/api';
import './page.css';

type Categorie = 'tous' | 'paiement' | 'systeme';

const PAYMENT_EVENTS = ['receipt', 'payment-reminder', 'overdue-alert', 'payment-declaration-pending', 'payment-rejected', 'monthly-report'];

function categorieOf(event: string): Categorie {
  return PAYMENT_EVENTS.includes(event) ? 'paiement' : 'systeme';
}

const TABS: { value: Categorie; label: string }[] = [
  { value: 'tous', label: 'Toutes' },
  { value: 'paiement', label: 'Paiement' },
  { value: 'systeme', label: 'Système' },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [tab, setTab] = useState<Categorie>('tous');

  const load = () => {
    setLoading(true);
    setErrorMessage('');
    Promise.all([notificationsApi.list(50), notificationsApi.getUnreadCount()])
      .then(([list, unread]) => {
        setNotifications(list);
        setUnreadCount(unread.count);
      })
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors du chargement des notifications'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(
    () => (tab === 'tous' ? notifications : notifications.filter((n) => categorieOf(n.event) === tab)),
    [notifications, tab],
  );

  const now = Date.now();
  const ceMois = useMemo(
    () => notifications.filter((n) => {
      const d = new Date(n.createdAt);
      const cur = new Date(now);
      return d.getMonth() === cur.getMonth() && d.getFullYear() === cur.getFullYear();
    }).length,
    [notifications, now],
  );

  return (
    <div className="notif-page">
      <div className="notif-header">
        <div>
          <h1 className="notif-title">Notifications</h1>
          <p className="notif-subtitle">{unreadCount} récentes (24h) · {notifications.length} au total</p>
        </div>
        <button type="button" className="notif-btn-secondary" onClick={load}>Actualiser</button>
      </div>

      {errorMessage && <div className="notif-alert-error">{errorMessage}</div>}

      <div className="notif-kpi-grid">
        <div className="notif-kpi-card">
          <p className="notif-kpi-label">Total</p>
          <p className="notif-kpi-value">{loading ? '—' : notifications.length}</p>
        </div>
        <div className="notif-kpi-card">
          <p className="notif-kpi-label">Dernières 24h</p>
          <p className="notif-kpi-value notif-kpi-blue">{loading ? '—' : unreadCount}</p>
        </div>
        <div className="notif-kpi-card">
          <p className="notif-kpi-label">Ce mois</p>
          <p className="notif-kpi-value notif-kpi-green">{loading ? '—' : ceMois}</p>
        </div>
      </div>

      <div className="notif-tabs">
        {TABS.map((t) => (
          <button key={t.value} type="button" className={`notif-tab${tab === t.value ? ' active' : ''}`} onClick={() => setTab(t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="notif-list">
          {[1, 2, 3].map((i) => <div key={i} className="notif-skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="notif-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
          <h3>Aucune notification</h3>
          <p>Vos notifications de paiement et système apparaîtront ici.</p>
        </div>
      ) : (
        <div className="notif-list">
          {filtered.map((n) => (
            <div key={n.id} className="notif-row">
              <div className={`notif-icon notif-icon-${categorieOf(n.event)}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              </div>
              <div className="notif-body">
                <p className="notif-titre">{EVENT_LABELS[n.event] ?? n.titre}</p>
                <p className="notif-sub">{n.event}</p>
              </div>
              <div className="notif-right">
                <span className={`notif-channel-badge ${n.channel === 'EMAIL' ? 'notif-channel-email' : 'notif-channel-push'}`}>
                  {n.channel === 'EMAIL' ? 'Email' : 'Push'}
                </span>
                <span className="notif-date">{new Date(n.createdAt).toLocaleString('fr-FR')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
