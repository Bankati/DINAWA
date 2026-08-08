'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useApi, TTL } from '@/lib/use-api';
import { cacheInvalidate } from '@/lib/cache';
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
  description: string | null;
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
const CARD: React.CSSProperties = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' };
const ADD_BTN: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, background: '#C9982E', color: '#fff',
  border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
};
const SK: React.CSSProperties = {
  height: 44, background: 'linear-gradient(90deg,#F3F4F6,#E5E7EB,#F3F4F6)',
  borderRadius: 8, margin: '8px 16px', animation: 'shimmer 1.4s infinite',
};

const EMPTY_FORM = {
  type: 'APARTMENT', address: '', neighborhood: '', city: '',
  surfaceArea: '', roomsCount: '', monthlyRent: '', monthlyCharges: '0', description: '',
};

function ipt(style?: React.CSSProperties): React.CSSProperties {
  return { width: '100%', border: '1px solid #D1D5DB', borderRadius: 9, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box', ...style };
}

export default function BiensPage() {
  const [filter, setFilter] = useState('');
  const url = filter ? `/properties?status=${filter}&limit=100` : '/properties?limit=100';
  const { data: res, loading, reload } = useApi<{ data: Property[]; total: number }>(url, TTL.LIST);
  const biens = res?.data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [success, setSuccess] = useState('');
  const [archiving, setArchiving] = useState<string | null>(null);

  function field(label: string, key: keyof typeof form, props: React.InputHTMLAttributes<HTMLInputElement> = {}) {
    return (
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
        <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={ipt()} {...props} />
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setFormErr('');
    try {
      await api.post('/properties', {
        type: form.type,
        address: form.address,
        neighborhood: form.neighborhood,
        city: form.city,
        surfaceArea: parseFloat(form.surfaceArea),
        ...(form.roomsCount ? { roomsCount: parseInt(form.roomsCount) } : {}),
        monthlyRent: parseInt(form.monthlyRent),
        monthlyCharges: parseInt(form.monthlyCharges || '0'),
        ...(form.description ? { description: form.description } : {}),
      });
      cacheInvalidate(url);
      reload();
      setShowForm(false);
      setSuccess('Bien ajouté avec succès');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: unknown) {
      setFormErr(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally { setSaving(false); }
  }

  async function archive(id: string) {
    if (!confirm('Archiver ce bien ?')) return;
    setArchiving(id);
    try {
      await api.delete(`/properties/${id}`);
      cacheInvalidate(url);
      reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur');
    } finally { setArchiving(null); }
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>

      {/* Hero */}
      <div style={HERO}>
        <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', fontSize: 80, opacity: 0.06, fontWeight: 900, color: '#fff', letterSpacing: -4, userSelect: 'none', pointerEvents: 'none' }}>WARAH</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Mes biens</h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '4px 0 0' }}>
              Gérez votre portefeuille immobilier
              {res && <span style={{ marginLeft: 10, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>{res.total} bien{res.total > 1 ? 's' : ''}</span>}
            </p>
          </div>
          <button onClick={() => { setForm({ ...EMPTY_FORM }); setFormErr(''); setShowForm(true); }} style={ADD_BTN}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 15, height: 15 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Ajouter un bien
          </button>
        </div>
      </div>

      {success && <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#15803D', fontSize: 13, fontWeight: 600 }}>✓ {success}</div>}

      {/* Filtres statut */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['', 'Tous'], ['OCCUPIED', 'Occupés'], ['VACANT', 'Vacants'], ['RENOVATION', 'Travaux'], ['ARCHIVED', 'Archivés']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ background: filter === v ? '#0F4C81' : '#fff', color: filter === v ? '#fff' : '#374151', border: `1px solid ${filter === v ? '#0F4C81' : '#D1D5DB'}`, borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={CARD}>
        {loading ? (
          <div style={{ padding: 8 }}>{[1,2,3].map(i => <div key={i} style={SK} />)}</div>
        ) : biens.length === 0 ? (
          <div style={{ padding: '48px 32px', textAlign: 'center' }}>
            <svg style={{ width: 52, height: 52, margin: '0 auto 16px', display: 'block', color: '#D1D5DB' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 8 }}>Aucun bien trouvé</div>
            <div style={{ fontSize: 13.5, color: '#6B7280' }}>Ajoutez votre premier bien pour commencer.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {['Type', 'Adresse', 'Ville', 'Surface', 'Loyer mensuel', 'Statut', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {biens.map((b, i) => {
                  const sc = STATUS_COLORS[b.status] ?? { bg: '#F3F4F6', color: '#6B7280' };
                  return (
                    <tr key={b.id} style={{ borderBottom: i < biens.length - 1 ? '1px solid #F9FAFB' : undefined, transition: 'background 0.1s' }}>
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
                      <td style={{ padding: '14px 16px' }}>
                        {b.status !== 'ARCHIVED' && (
                          <button onClick={() => archive(b.id)} disabled={archiving === b.id}
                            style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: archiving === b.id ? 'not-allowed' : 'pointer' }}>
                            {archiving === b.id ? '…' : 'Archiver'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal ajout */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => setShowForm(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Ajouter un bien</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9CA3AF' }}>×</button>
            </div>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Type <span style={{ color: '#DC2626' }}>*</span></label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 9, padding: '9px 12px', fontSize: 13 }}>
                  <option value="VILLA">Villa</option>
                  <option value="APARTMENT">Appartement</option>
                  <option value="STUDIO">Studio</option>
                  <option value="COMMERCIAL">Commercial</option>
                </select>
              </div>
              {field('Adresse *', 'address', { required: true, placeholder: 'Ex: Rue des Cocotiers, lot 42' })}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {field('Quartier *', 'neighborhood', { required: true, placeholder: 'Ex: Agbalépédogan' })}
                {field('Ville *', 'city', { required: true, placeholder: 'Ex: Lomé' })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {field('Surface (m²) *', 'surfaceArea', { required: true, type: 'number', min: '1', placeholder: '75' })}
                {field('Nombre de pièces', 'roomsCount', { type: 'number', min: '1', placeholder: '3' })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {field('Loyer mensuel (FCFA) *', 'monthlyRent', { required: true, type: 'number', min: '0', placeholder: '150000' })}
                {field('Charges mensuelles (FCFA)', 'monthlyCharges', { type: 'number', min: '0', placeholder: '10000' })}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  placeholder="Description optionnelle du bien..."
                  style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 9, padding: '9px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              {formErr && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#DC2626' }}>{formErr}</div>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 9, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
                <button type="submit" disabled={saving}
                  style={{ background: saving ? '#93C5FD' : '#0F4C81', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 24px', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Enregistrement…' : 'Ajouter le bien'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
