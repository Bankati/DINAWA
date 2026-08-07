'use client';

import { useApi, TTL } from '@/lib/use-api';
import '../locataire.css';

interface Notification {
  id: string;
  event: string;
  titre: string;
  channel: string;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

const EVENT_ICON: Record<string, string> = {
  'receipt':                      '🧾',
  'payment-reminder':             '⏰',
  'overdue-alert':                '⚠️',
  'payment-declaration-pending':  '✅',
  'monthly-report':               '📊',
  'inactivity-warning':           '💤',
  'account-suspended':            '🔒',
  'account-reactivated':          '🔓',
  'tenant-invitation':            '📨',
  'lease-created':                '📝',
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  SENT:    { bg: '#DCFCE7', color: '#166534' },
  FAILED:  { bg: '#FEE2E2', color: '#991B1B' },
  PENDING: { bg: '#FEF9C3', color: '#854D0E' },
};

export default function LocataireNotificationsPage() {
  const { data, loading } = useApi<Notification[]>('/notifications?limit=50', TTL.LIST);
  const notifications = data ?? [];

  const [dateCourante] = [
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  ];

  return (
    <div className="loc-page">
      <div className="loc-hero">
        <div className="loc-hero-meta">
          <span className="loc-date-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {dateCourante}
          </span>
          <span className="loc-role-badge">Locataire</span>
        </div>
        <h1 className="loc-hero-title">Notifications</h1>
        <p className="loc-hero-sub">{notifications.length} notification{notifications.length > 1 ? 's' : ''} dans votre historique</p>
      </div>

      <div className="loc-body">
        {loading ? (
          <div className="loc-card" style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px 0' }}>Chargement…</div>
        ) : notifications.length === 0 ? (
          <div className="loc-card" style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 44, height: 44, margin: '0 auto 12px', display: 'block', color: '#D1D5DB' }}>
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>Aucune notification</div>
            <div style={{ fontSize: 13 }}>Vos notifications apparaîtront ici dès qu&apos;un événement se produit.</div>
          </div>
        ) : (
          <div className="loc-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notifications.map((n) => {
                const st = STATUS_STYLE[n.status] ?? { bg: '#F3F4F6', color: '#6B7280' };
                const icon = EVENT_ICON[n.event] ?? '🔔';
                return (
                  <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <div style={{ fontSize: 22, flexShrink: 0, lineHeight: 1, marginTop: 2 }}>{icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{n.titre}</span>
                        <span style={{ background: st.bg, color: st.color, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{n.status}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                        {new Date(n.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
