'use client';

import { useApi, TTL } from '@/lib/use-api';
import { formatFcfa } from '@/lib/format';

type PropertyType = 'VILLA' | 'APARTMENT' | 'STUDIO' | 'COMMERCIAL';
type PropertyStatus = 'OCCUPIED' | 'VACANT' | 'RENOVATION' | 'ARCHIVED';

interface Property {
  id: string;
  type: PropertyType;
  status: PropertyStatus;
  address: string;
  neighborhood: string;
  city: string;
  surfaceArea: number;
  roomsCount: number | null;
  monthlyRent: number;
  monthlyCharges: number;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  VILLA: 'Villa', APARTMENT: 'Appartement', STUDIO: 'Studio', COMMERCIAL: 'Commercial',
};
const STATUS_LABELS: Record<string, string> = {
  OCCUPIED: 'Occupé', VACANT: 'Vacant', RENOVATION: 'Travaux', ARCHIVED: 'Archivé',
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  OCCUPIED: { bg: '#DCFCE7', color: '#15803D' },
  VACANT: { bg: '#FEF3C7', color: '#D97706' },
  RENOVATION: { bg: '#EDE9FE', color: '#7C3AED' },
  ARCHIVED: { bg: '#F3F4F6', color: '#6B7280' },
};

const HERO: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0A2650 0%, #0F4C81 60%, #081E41 100%)',
  borderRadius: 14, padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden',
};
const SK: React.CSSProperties = {
  height: 44, background: 'linear-gradient(90deg,#F3F4F6,#E5E7EB,#F3F4F6)',
  borderRadius: 8, margin: '8px 16px', animation: 'shimmer 1.4s infinite',
};

export default function GestionnaireBiensPage() {
  const { data: res, loading } = useApi<{ data: Property[]; total: number }>('/properties?limit=100', TTL.LIST);
  const biens = res?.data ?? [];

  return (
    <div style={{ padding: '24px 28px' }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>

      {/* Hero */}
      <div style={HERO}>
        <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', fontSize: 80, opacity: 0.06, fontWeight: 900, color: '#fff', letterSpacing: -4, userSelect: 'none', pointerEvents: 'none' }}>WARAH</div>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Biens gérés</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '4px 0 0' }}>
            Portefeuille de biens sous votre mandat
            {res && <span style={{ marginLeft: 10, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>{res.total} bien{res.total > 1 ? 's' : ''}</span>}
          </p>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 8 }}>{[1,2,3,4].map(i => <div key={i} style={SK} />)}</div>
        ) : biens.length === 0 ? (
          <div style={{ padding: '48px 32px', textAlign: 'center' }}>
            <svg style={{ width: 52, height: 52, margin: '0 auto 16px', display: 'block', color: '#D1D5DB' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 8 }}>Aucun bien sous mandat</div>
            <div style={{ fontSize: 13.5, color: '#6B7280' }}>Les propriétaires qui vous délèguent des biens apparaîtront ici.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {['Type', 'Adresse', 'Ville', 'Surface', 'Loyer', 'Statut'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {biens.map((b, i) => {
                  const sc = STATUS_COLORS[b.status] ?? { bg: '#F3F4F6', color: '#6B7280' };
                  return (
                    <tr key={b.id} style={{ borderBottom: i < biens.length - 1 ? '1px solid #F9FAFB' : undefined }}>
                      <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: '#374151' }}>{TYPE_LABELS[b.type] ?? b.type}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{b.address}</div>
                        <div style={{ fontSize: 12, color: '#9CA3AF' }}>{b.neighborhood}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{b.city}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#6B7280' }}>{b.surfaceArea} m²</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, color: '#0A2650', fontVariantNumeric: 'tabular-nums' }}>{formatFcfa(b.monthlyRent)}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: sc.bg, color: sc.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{STATUS_LABELS[b.status] ?? b.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
