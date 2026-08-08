'use client';

import { useApi, TTL } from '@/lib/use-api';

interface Notification {
  id: string;
  event: string;
  titre?: string;
  channel: 'PUSH' | 'EMAIL';
  status: 'SENT' | 'FAILED';
  payload?: Record<string, unknown> | null;
  createdAt: string;
}

const HERO: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0A2650 0%, #0F4C81 60%, #081E41 100%)',
  borderRadius: 14, padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden',
};
const SK: React.CSSProperties = {
  height: 60, background: 'linear-gradient(90deg,#F3F4F6,#E5E7EB,#F3F4F6)',
  borderRadius: 8, margin: '8px 16px', animation: 'shimmer 1.4s infinite',
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const EVENT_ICONS: Record<string, string> = {
  payment_received: '💳', payment_overdue: '⚠️', lease_expiring: '📋',
  declaration_submitted: '📩', declaration_confirmed: '✅', declaration_rejected: '❌', mandate_received: '🤝',
};

export default function GestionnaireNotificationsPage() {
  const { data: notifications, loading } = useApi<Notification[]>('/notifications?limit=50', TTL.LIST);
  const list = notifications ?? [];

  return (
    <div style={{ padding: '24px 28px' }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>

      <div style={HERO}>
        <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', fontSize: 80, opacity: 0.06, fontWeight: 900, color: '#fff', letterSpacing: -4, userSelect: 'none', pointerEvents: 'none' }}>WARAH</div>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Notifications</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '4px 0 0' }}>Vos 50 dernières alertes et mises à jour</p>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 8 }}>{[1,2,3,4].map(i => <div key={i} style={SK} />)}</div>
        ) : list.length === 0 ? (
          <div style={{ padding: '48px 32px', textAlign: 'center' }}>
            <svg style={{ width: 52, height: 52, margin: '0 auto 16px', display: 'block', color: '#D1D5DB' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 8 }}>Aucune notification</div>
            <div style={{ fontSize: 13.5, color: '#6B7280' }}>Vos alertes apparaîtront ici.</div>
          </div>
        ) : (
          list.map((n, i) => (
            <div key={n.id} style={{ padding: '16px 20px', borderBottom: i < list.length - 1 ? '1px solid #F9FAFB' : undefined, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#F0F4FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {EVENT_ICONS[n.event] ?? '🔔'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: '#111827', marginBottom: 2 }}>{n.titre ?? n.event.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                  {fmtDate(n.createdAt)}
                  <span style={{ margin: '0 8px', color: '#E5E7EB' }}>·</span>
                  <span style={{ background: n.channel === 'EMAIL' ? '#EFF6FF' : '#F0FDF4', color: n.channel === 'EMAIL' ? '#1D4ED8' : '#15803D', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>{n.channel}</span>
                </div>
              </div>
              <span style={{ background: n.status === 'SENT' ? '#DCFCE7' : '#FEE2E2', color: n.status === 'SENT' ? '#15803D' : '#DC2626', borderRadius: 20, padding: '3px 10px', fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>
                {n.status === 'SENT' ? 'Envoyé' : 'Échec'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
