'use client';

import { useState } from 'react';
import { API_URL } from '@/lib/api';

// ── Téléchargement binaire avec auth ───────────────────────
async function fetchAndDownload(path: string, filename: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('warah_access_token') : null;
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `Erreur ${res.status}` }));
    throw new Error(err.message ?? `Erreur ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// ── Composant ───────────────────────────────────────────────
type ExportKey = 'paiements' | 'biens' | 'locataires' | 'rapport';

export default function ExportPage() {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfYear = `${new Date().getFullYear()}-01-01`;

  const [from, setFrom] = useState(firstOfYear);
  const [to, setTo] = useState(today);
  const [loading, setLoading] = useState<ExportKey | null>(null);
  const [done, setDone] = useState<Partial<Record<ExportKey, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<ExportKey, string>>>({});

  async function run(key: ExportKey, path: string, filename: string) {
    setLoading(key);
    setErrors(e => ({ ...e, [key]: undefined }));
    setDone(d => ({ ...d, [key]: false }));
    try {
      await fetchAndDownload(path, filename);
      setDone(d => ({ ...d, [key]: true }));
    } catch (err: unknown) {
      setErrors(e => ({ ...e, [key]: err instanceof Error ? err.message : 'Erreur' }));
    } finally {
      setLoading(null);
    }
  }

  const date = (from && to) ? `${from}_${to}` : today;

  const EXPORTS: { key: ExportKey; icon: string; title: string; desc: string; needsPeriod: boolean; path: string; filename: string }[] = [
    {
      key: 'paiements', icon: '💳', title: 'Historique des paiements',
      desc: 'Tous les paiements reçus sur la période, avec locataire, bien, mode et statut.',
      needsPeriod: true,
      path: `/exports/paiements?from=${from}&to=${to}`,
      filename: `warah-paiements-${date}.pdf`,
    },
    {
      key: 'biens', icon: '🏠', title: 'Liste des biens',
      desc: 'Adresses, types, statuts, loyers et charges de tous vos biens enregistrés.',
      needsPeriod: false,
      path: '/exports/biens',
      filename: `warah-biens-${today}.pdf`,
    },
    {
      key: 'locataires', icon: '👥', title: 'Liste des locataires',
      desc: 'Contacts, statut de compte et bien loué de chaque locataire invité.',
      needsPeriod: false,
      path: '/exports/locataires',
      filename: `warah-locataires-${today}.pdf`,
    },
    {
      key: 'rapport', icon: '📊', title: 'Rapport financier mensuel',
      desc: 'Synthèse mois par mois des encaissements confirmés sur la période.',
      needsPeriod: true,
      path: `/exports/rapport?from=${from}&to=${to}`,
      filename: `warah-rapport-${date}.pdf`,
    },
  ];

  return (
    <div style={{ padding: '24px 28px' }}>

      {/* En-tête */}
      <div style={{ background: 'linear-gradient(135deg, #0A2650 0%, #0F4C81 60%, #081E41 100%)', borderRadius: 14, padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', fontSize: 80, opacity: 0.06, fontWeight: 900, color: '#fff', letterSpacing: -4, userSelect: 'none', pointerEvents: 'none' }}>WARAH</div>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Export PDF</h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '4px 0 0' }}>
          Téléchargez vos données en PDF directement dans votre dossier de téléchargements
        </p>
      </div>

      {/* Filtre de période */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>Période</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, color: '#6B7280' }}>Du</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ border: '1px solid #D1D5DB', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: '#111827' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, color: '#6B7280' }}>Au</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{ border: '1px solid #D1D5DB', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: '#111827' }} />
        </div>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>Utilisé pour les exports « Paiements » et « Rapport »</span>
      </div>

      {/* Cartes d'export */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {EXPORTS.map(exp => (
          <div key={exp.key} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px 20px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 30 }}>{exp.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#DC2626', background: '#FEF2F2', borderRadius: 20, padding: '3px 10px' }}>PDF</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 6 }}>{exp.title}</div>
              <div style={{ fontSize: 12.5, color: '#6B7280', lineHeight: 1.55 }}>{exp.desc}</div>
              {exp.needsPeriod && (
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
                  Période : {from} → {to}
                </div>
              )}
            </div>

            {errors[exp.key] && (
              <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', borderRadius: 8, padding: '6px 10px' }}>
                {errors[exp.key]}
              </div>
            )}
            {done[exp.key] && !errors[exp.key] && (
              <div style={{ fontSize: 12, color: '#059669', background: '#F0FDF4', borderRadius: 8, padding: '6px 10px' }}>
                ✓ PDF téléchargé dans vos téléchargements
              </div>
            )}

            <button
              onClick={() => run(exp.key, exp.path, exp.filename)}
              disabled={loading !== null}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: loading === exp.key ? '#E5E7EB' : '#0F4C81',
                color: loading === exp.key ? '#6B7280' : '#fff',
                border: 'none', borderRadius: 9, padding: '9px 0',
                fontWeight: 600, fontSize: 13, cursor: loading !== null ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading === exp.key ? (
                <>
                  <svg style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Génération…
                </>
              ) : (
                <>
                  <svg style={{ width: 15, height: 15 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Télécharger PDF
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
