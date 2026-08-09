'use client';

import { useState } from 'react';
import { useApi, TTL } from '@/lib/use-api';
import { formatFcfa } from '@/lib/format';

interface MandateReceived {
  id: string;
  status: string;
  feeType: 'PERCENTAGE' | 'FLAT';
  feeValue: number;
  property: { address: string; neighborhood: string; city: string; monthlyRent: number; status: string };
  owner: { firstName: string; lastName: string };
}

interface DashboardSummary {
  revenusMensuels?: number;
  revenusAnnuels?: number;
  tauxOccupation?: number;
  totalBiens?: number;
  biensOccupes?: number;
  impayes?: number;
}

const HERO: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0A2650 0%, #0F4C81 60%, #081E41 100%)',
  borderRadius: 14, padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden',
};
const CARD: React.CSSProperties = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12 };
const SK: React.CSSProperties = {
  background: 'linear-gradient(90deg,#F3F4F6,#E5E7EB,#F3F4F6)', borderRadius: 8, animation: 'shimmer 1.4s infinite',
};

export default function GestionnairePortefeuillePage() {
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const { data: mandates, loading: mLoading } = useApi<MandateReceived[]>('/mandates/received', TTL.LIST);
  const { data: stats, loading: sLoading } = useApi<DashboardSummary>(`/dashboard?annee=${annee}`, TTL.LIST);

  const active = (mandates ?? []).filter(m => m.status === 'ACTIVE');

  function commission(m: MandateReceived) {
    if (m.feeType === 'PERCENTAGE') {
      return Math.round(m.property.monthlyRent * m.feeValue / 100);
    }
    return m.feeValue;
  }

  const totalCommMois = active.reduce((s, m) => s + commission(m), 0);
  const totalCommAnnee = totalCommMois * 12;

  return (
    <div style={{ padding: '24px 28px' }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>

      {/* Hero */}
      <div style={HERO}>
        <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', fontSize: 80, opacity: 0.06, fontWeight: 900, color: '#fff', letterSpacing: -4, userSelect: 'none', pointerEvents: 'none' }}>WARAH</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Portefeuille</h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '4px 0 0' }}>Vos revenus de gestion et commissions</p>
          </div>
          <select value={annee} onChange={e => setAnnee(Number(e.target.value))}
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 9, padding: '8px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {[2026, 2025, 2024].map(y => <option key={y} value={y} style={{ color: '#111827', background: '#fff' }}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Commissions ce mois', value: formatFcfa(totalCommMois), icon: '💰', color: '#C9982E', sub: 'Estimation sur mandats actifs' },
          { label: 'Commissions annuelles', value: formatFcfa(totalCommAnnee), icon: '📊', color: '#0F4C81', sub: 'Projection annuelle' },
          { label: 'Loyers encaissés (mois)', value: formatFcfa(stats?.revenusMensuels ?? 0), icon: '💳', color: '#059669', sub: `Données ${annee}` },
          { label: 'Biens actifs', value: active.length, icon: '🏠', color: '#374151', sub: 'Mandats en cours' },
        ].map(k => (
          <div key={k.label} style={{ ...CARD, padding: '20px 22px' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{k.icon}</div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>
              {sLoading ? <span style={{ ...SK, display: 'inline-block', width: 100, height: 28 }} /> : k.value}
            </div>
            <div style={{ fontSize: 11.5, color: '#9CA3AF' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Détail par mandat */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 14px' }}>Commissions par bien géré</h2>
      <div style={{ ...CARD, overflow: 'hidden' }}>
        {mLoading ? (
          <div style={{ padding: 8 }}>{[1,2,3].map(i => <div key={i} style={{ ...SK, height: 60, margin: '8px 16px' }} />)}</div>
        ) : active.length === 0 ? (
          <div style={{ padding: '40px 32px', textAlign: 'center', color: '#6B7280', fontSize: 13.5 }}>Aucun mandat actif pour le moment.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {['Bien', 'Propriétaire', 'Loyer', 'Commission', 'Commission / mois'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {active.map((m, i) => (
                  <tr key={m.id} style={{ borderBottom: i < active.length - 1 ? '1px solid #F9FAFB' : undefined }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{m.property.address}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>{m.property.neighborhood}, {m.property.city}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{m.owner.firstName} {m.owner.lastName}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: '#374151', fontVariantNumeric: 'tabular-nums' }}>{formatFcfa(m.property.monthlyRent)}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#6B7280' }}>
                      {m.feeType === 'PERCENTAGE' ? `${m.feeValue}%` : formatFcfa(m.feeValue)}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 800, color: '#C9982E', fontVariantNumeric: 'tabular-nums' }}>
                      {formatFcfa(commission(m))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #E5E7EB', background: '#F9FAFB' }}>
                  <td colSpan={4} style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, color: '#374151' }}>Total mensuel estimé</td>
                  <td style={{ padding: '14px 16px', fontSize: 16, fontWeight: 800, color: '#C9982E', fontVariantNumeric: 'tabular-nums' }}>{formatFcfa(totalCommMois)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
