'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { notificationsApi, EVENT_LABELS, REMINDER_EVENTS, type NotificationSummary } from '@/lib/notifications';
import { ApiError } from '@/lib/api';
import './page.css';

const EVENT_ICON: Record<string, 'clock' | 'alert' | 'check'> = {
  'payment-reminder': 'clock',
  'overdue-alert': 'alert',
  'payment-declaration-pending': 'check',
};

function Icon({ type }: { type: 'clock' | 'alert' | 'check' }) {
  if (type === 'alert') {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
  }
  if (type === 'check') {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>;
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}

export default function RappelsPage() {
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    notificationsApi
      .list(100)
      .then(setNotifications)
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors du chargement des rappels'))
      .finally(() => setLoading(false));
  }, []);

  const rappels = useMemo(
    () => notifications.filter((n) => REMINDER_EVENTS.includes(n.event)),
    [notifications],
  );

  return (
    <div className="rap-page">
      <div className="rap-header">
        <div>
          <h1 className="rap-title">Rappels et alertes</h1>
          <p className="rap-subtitle">Rappels d&apos;échéance envoyés à vos locataires et alertes d&apos;impayés</p>
        </div>
        <Link href="/dashboard/paiements" className="rap-btn-secondary">Retour aux paiements</Link>
      </div>

      {errorMessage && <div className="rap-alert-error">{errorMessage}</div>}

      {loading ? (
        <div className="rap-list">
          {[1, 2, 3].map((i) => <div key={i} className="rap-skeleton" />)}
        </div>
      ) : rappels.length === 0 ? (
        <div className="rap-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          <h3>Aucun rappel pour le moment</h3>
          <p>Les rappels de loyer et alertes d&apos;impayés apparaîtront ici automatiquement.</p>
        </div>
      ) : (
        <div className="rap-list">
          {rappels.map((n) => (
            <div key={n.id} className={`rap-row rap-${n.event}`}>
              <div className="rap-icon">
                <Icon type={EVENT_ICON[n.event] ?? 'clock'} />
              </div>
              <div className="rap-body">
                <p className="rap-titre">{EVENT_LABELS[n.event] ?? n.titre}</p>
                <p className="rap-date">{new Date(n.createdAt).toLocaleString('fr-FR')}</p>
              </div>
              <span className="rap-channel">{n.channel === 'EMAIL' ? 'Email' : 'Push'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
