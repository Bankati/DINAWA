'use client';

import { useApi, TTL } from '@/lib/use-api';
import { initiales } from '@/lib/format';

interface TenantSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  createdAt: string;
  activeLease?: {
    id: string;
    property?: { address: string; neighborhood: string; city: string };
    monthlyRent: number;
    startDate: string;
  } | null;
}

const HERO: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0A2650 0%, #0F4C81 60%, #081E41 100%)',
  borderRadius: 14, padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden',
};
const SK: React.CSSProperties = {
  height: 64, background: 'linear-gradient(90deg,#F3F4F6,#E5E7EB,#F3F4F6)',
  borderRadius: 8, margin: '8px 16px', animation: 'shimmer 1.4s infinite',
};

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function LocatairesPage() {
  const { data: tenants, loading } = useApi<TenantSummary[]>('/tenants', TTL.LIST);
  const list = tenants ?? [];

  return (
    <div style={{ padding: '24px 28px' }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>

      {/* Hero */}
      <div style={HERO}>
        <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', fontSize: 80, opacity: 0.06, fontWeight: 900, color: '#fff', letterSpacing: -4, userSelect: 'none', pointerEvents: 'none' }}>WARAH</div>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Mes locataires</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '4px 0 0' }}>
            Suivi de vos locataires actifs
            {list.length > 0 && <span style={{ marginLeft: 10, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>{list.length} locataire{list.length > 1 ? 's' : ''}</span>}
          </p>
        </div>
      </div>

      {/* Liste */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 8 }}>{[1,2,3].map(i => <div key={i} style={SK} />)}</div>
        ) : list.length === 0 ? (
          <div style={{ padding: '48px 32px', textAlign: 'center' }}>
            <svg style={{ width: 52, height: 52, margin: '0 auto 16px', display: 'block', color: '#D1D5DB' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 8 }}>Aucun locataire</div>
            <div style={{ fontSize: 13.5, color: '#6B7280' }}>Invitez un locataire via Paramètres → Inviter un locataire.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {['Locataire', 'Contact', 'Bien loué', 'Depuis le', 'Loyer'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((t, i) => (
                  <tr key={t.id} style={{ borderBottom: i < list.length - 1 ? '1px solid #F9FAFB' : undefined }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #0A2650, #0F4C81)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {initiales(t.firstName, t.lastName)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: '#111827' }}>{t.firstName} {t.lastName}</div>
                          {t.city && <div style={{ fontSize: 12, color: '#9CA3AF' }}>{t.city}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {t.email && <div style={{ fontSize: 13, color: '#374151' }}>{t.email}</div>}
                      {t.phone && <div style={{ fontSize: 12, color: '#9CA3AF' }}>{t.phone}</div>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {t.activeLease?.property ? (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{t.activeLease.property.address}</div>
                          <div style={{ fontSize: 12, color: '#9CA3AF' }}>{t.activeLease.property.neighborhood}, {t.activeLease.property.city}</div>
                        </>
                      ) : <span style={{ fontSize: 13, color: '#D1D5DB' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#6B7280', whiteSpace: 'nowrap' }}>
                      {t.activeLease?.startDate ? formatDate(t.activeLease.startDate) : <span style={{ color: '#D1D5DB' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, color: '#0A2650', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {t.activeLease ? `${t.activeLease.monthlyRent.toLocaleString('fr-FR')} FCFA` : <span style={{ color: '#D1D5DB', fontWeight: 400 }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
