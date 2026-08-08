'use client';

import { useApi, TTL } from '@/lib/use-api';
import { formatFcfa } from '@/lib/format';

interface MandateReceived {
  id: string;
  status: 'ACTIVE' | 'PENDING' | 'REVOKED' | 'EXPIRED';
  feeType: 'PERCENTAGE' | 'FLAT';
  feeValue: number;
  startDate: string;
  endDate: string | null;
  property: {
    id: string;
    address: string;
    neighborhood: string;
    city: string;
    type: string;
    status: string;
    monthlyRent: number;
  };
  owner: { id: string; firstName: string; lastName: string; email: string | null };
}

interface DashboardSummary {
  totalBiens?: number;
  biensOccupes?: number;
  revenusMensuels?: number;
  revenusAnnuels?: number;
  tauxOccupation?: number;
  impayes?: number;
}

const HERO: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0A2650 0%, #0F4C81 60%, #081E41 100%)',
  borderRadius: 14, padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden',
};
const CARD: React.CSSProperties = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12 };
const SK: React.CSSProperties = {
  background: 'linear-gradient(90deg,#F3F4F6,#E5E7EB,#F3F4F6)',
  borderRadius: 8, animation: 'shimmer 1.4s infinite',
};

const STATUS_P: Record<string, string> = {
  OCCUPIED: 'Occupé', VACANT: 'Vacant', RENOVATION: 'Travaux', ARCHIVED: 'Archivé',
};
const TYPE_P: Record<string, string> = {
  VILLA: 'Villa', APARTMENT: 'Appartement', STUDIO: 'Studio', COMMERCIAL: 'Commercial',
};

const annee = new Date().getFullYear();

export default function GestionnaireDashboard() {
  const { data: mandates, loading: mLoading } = useApi<MandateReceived[]>('/mandates/received', TTL.LIST);
  const { data: stats } = useApi<DashboardSummary>(`/dashboard?annee=${annee}`, TTL.LIST);
  const list = mandates ?? [];
  const active = list.filter(m => m.status === 'ACTIVE');

  const kpis = [
    { label: 'Biens gérés', value: active.length, icon: '🏠', color: '#0F4C81' },
    { label: 'Revenus mensuels', value: formatFcfa(stats?.revenusMensuels ?? 0), icon: '💳', color: '#C9982E' },
    { label: 'Taux d\'occupation', value: `${stats?.tauxOccupation ?? 0} %`, icon: '📈', color: '#059669' },
    { label: 'Impayés', value: stats?.impayes ?? 0, icon: '⚠️', color: '#DC2626' },
  ];

  return (
    <div style={{ padding: '24px 28px' }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>

      {/* Hero */}
      <div style={HERO}>
        <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', fontSize: 80, opacity: 0.06, fontWeight: 900, color: '#fff', letterSpacing: -4, userSelect: 'none', pointerEvents: 'none' }}>WARAH</div>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Tableau de bord</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '4px 0 0' }}>
            Vue synthétique de vos mandats de gestion
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ ...CARD, padding: '20px 22px', display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: '#F0F4FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{k.icon}</div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{k.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: k.color, fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Mandats reçus */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 14px' }}>Mandats actifs</h2>
      <div style={{ ...CARD, overflow: 'hidden' }}>
        {mLoading ? (
          <div style={{ padding: 8 }}>{[1,2,3].map(i => <div key={i} style={{ ...SK, height: 72, margin: '8px 16px' }} />)}</div>
        ) : active.length === 0 ? (
          <div style={{ padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 8 }}>Aucun mandat actif</div>
            <div style={{ fontSize: 13.5, color: '#6B7280' }}>Les propriétaires qui vous confient des biens apparaîtront ici.</div>
          </div>
        ) : (
          <div>
            {active.map((m, i) => {
              const commission = m.feeType === 'PERCENTAGE'
                ? `${m.feeValue}% du loyer`
                : formatFcfa(m.feeValue);
              return (
                <div key={m.id} style={{ padding: '18px 22px', borderBottom: i < active.length - 1 ? '1px solid #F9FAFB' : undefined, display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 10, background: 'linear-gradient(135deg, #0A2650, #0F4C81)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                    {TYPE_P[m.property.type]?.[0] ?? '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 2 }}>{m.property.address}</div>
                    <div style={{ fontSize: 12.5, color: '#6B7280' }}>
                      {m.property.neighborhood}, {m.property.city}
                      <span style={{ margin: '0 6px' }}>·</span>
                      {TYPE_P[m.property.type] ?? m.property.type}
                      <span style={{ margin: '0 6px' }}>·</span>
                      {STATUS_P[m.property.status] ?? m.property.status}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0A2650', fontVariantNumeric: 'tabular-nums' }}>{formatFcfa(m.property.monthlyRent)}</div>
                    <div style={{ fontSize: 11.5, color: '#9CA3AF' }}>Commission : {commission}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                      Propriétaire : {m.owner.firstName} {m.owner.lastName}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mandats en attente */}
      {list.filter(m => m.status === 'PENDING').length > 0 && (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '24px 0 14px' }}>Mandats en attente d'acceptation</h2>
          <div style={{ ...CARD, overflow: 'hidden' }}>
            {list.filter(m => m.status === 'PENDING').map((m, i, arr) => (
              <div key={m.id} style={{ padding: '16px 22px', borderBottom: i < arr.length - 1 ? '1px solid #F9FAFB' : undefined, display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: '#111827' }}>{m.property.address}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{m.property.neighborhood}, {m.property.city}</div>
                </div>
                <span style={{ background: '#FEF3C7', color: '#D97706', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>En attente</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
