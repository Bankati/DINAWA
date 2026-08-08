'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
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
  monthlyRent: number;
  description: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  VILLA: 'Villa', APARTMENT: 'Appartement', STUDIO: 'Studio', COMMERCIAL: 'Commercial',
};
const HERO: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0A2650 0%, #0F4C81 60%, #081E41 100%)',
  borderRadius: 14, padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden',
};
const SK: React.CSSProperties = {
  height: 64, background: 'linear-gradient(90deg,#F3F4F6,#E5E7EB,#F3F4F6)',
  borderRadius: 8, margin: '8px 16px', animation: 'shimmer 1.4s infinite',
};

export default function GestionnaireAnnoncesPage() {
  const { data: res, loading } = useApi<{ data: Property[]; total: number }>('/properties?status=VACANT&limit=100', TTL.LIST);
  const properties = res?.data ?? [];

  const [publishing, setPublishing] = useState<string | null>(null);
  const [unpublishing, setUnpublishing] = useState<string | null>(null);
  const [published, setPublished] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function publish(id: string) {
    setPublishing(id); setErrors(e => ({ ...e, [id]: '' }));
    try {
      await api.post(`/properties/${id}/listing`, {});
      setPublished(p => new Set(p).add(id));
      setMessages(m => ({ ...m, [id]: 'Annonce publiée !' }));
      setTimeout(() => setMessages(m => ({ ...m, [id]: '' })), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      if (msg.toLowerCase().includes('already') || msg.includes('409')) {
        setPublished(p => new Set(p).add(id));
        setMessages(m => ({ ...m, [id]: 'Annonce déjà active' }));
      } else { setErrors(e => ({ ...e, [id]: msg })); }
    } finally { setPublishing(null); }
  }

  async function unpublish(id: string) {
    setUnpublishing(id); setErrors(e => ({ ...e, [id]: '' }));
    try {
      await api.delete(`/properties/${id}/listing`);
      setPublished(p => { const next = new Set(p); next.delete(id); return next; });
      setMessages(m => ({ ...m, [id]: 'Annonce retirée' }));
      setTimeout(() => setMessages(m => ({ ...m, [id]: '' })), 4000);
    } catch (err: unknown) { setErrors(e => ({ ...e, [id]: err instanceof Error ? err.message : 'Erreur' })); }
    finally { setUnpublishing(null); }
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>

      <div style={HERO}>
        <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', fontSize: 80, opacity: 0.06, fontWeight: 900, color: '#fff', letterSpacing: -4, userSelect: 'none', pointerEvents: 'none' }}>WARAH</div>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Annonces</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '4px 0 0' }}>Publiez les biens vacants sur le portail WARAH</p>
        </div>
      </div>

      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div style={{ fontSize: 13, color: '#1D4ED8' }}>
          Vous ne pouvez publier des annonces que pour les biens <strong>vacants</strong> que vous gérez sous mandat.
        </div>
      </div>

      {loading ? (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 8 }}>
          {[1,2,3].map(i => <div key={i} style={SK} />)}
        </div>
      ) : properties.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🏠</div>
          <div style={{ fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 8 }}>Aucun bien vacant</div>
          <div style={{ fontSize: 13.5, color: '#6B7280' }}>Aucun bien vacant sous votre mandat pour le moment.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {properties.map(p => {
            const active = published.has(p.id);
            const busy = publishing === p.id || unpublishing === p.id;
            return (
              <div key={p.id} style={{ background: '#fff', border: `1px solid ${active ? '#BFDBFE' : '#E5E7EB'}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, background: '#F3F4F6', color: '#6B7280', borderRadius: 20, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {TYPE_LABELS[p.type] ?? p.type}
                  </span>
                  {active && <span style={{ fontSize: 11, fontWeight: 700, background: '#DBEAFE', color: '#1D4ED8', borderRadius: 20, padding: '3px 10px' }}>● Active</span>}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 3 }}>{p.address}</div>
                  <div style={{ fontSize: 12.5, color: '#6B7280' }}>{p.neighborhood}, {p.city}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0A2650', fontVariantNumeric: 'tabular-nums' }}>{formatFcfa(p.monthlyRent)}</div>
                {messages[p.id] && <div style={{ fontSize: 12, color: '#15803D', background: '#F0FDF4', borderRadius: 7, padding: '5px 10px' }}>{messages[p.id]}</div>}
                {errors[p.id] && <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', borderRadius: 7, padding: '5px 10px' }}>{errors[p.id]}</div>}
                {!active ? (
                  <button onClick={() => publish(p.id)} disabled={busy}
                    style={{ background: busy ? '#E5E7EB' : '#0F4C81', color: busy ? '#9CA3AF' : '#fff', border: 'none', borderRadius: 9, padding: '9px 0', fontWeight: 700, fontSize: 13, cursor: busy ? 'not-allowed' : 'pointer' }}>
                    {busy ? 'Publication…' : 'Publier l\'annonce'}
                  </button>
                ) : (
                  <button onClick={() => unpublish(p.id)} disabled={busy}
                    style={{ background: busy ? '#F3F4F6' : '#FEF2F2', color: busy ? '#9CA3AF' : '#DC2626', border: `1px solid ${busy ? '#E5E7EB' : '#FECACA'}`, borderRadius: 9, padding: '9px 0', fontWeight: 700, fontSize: 13, cursor: busy ? 'not-allowed' : 'pointer' }}>
                    {busy ? 'Retrait…' : 'Retirer l\'annonce'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
