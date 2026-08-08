'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useApi, TTL } from '@/lib/use-api';
import { initiales } from '@/lib/format';
import '../locataire.css';

interface UserProfile {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: string;
  city: string | null;
  profilePhotoPath: string | null;
  accountStatus: string;
  createdAt: string;
}

export default function LocataireProfilPage() {
  const { data: profile, loading } = useApi<UserProfile>('/profile', TTL.STABLE);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', city: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [dateCourante] = useState(() =>
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  );

  useEffect(() => {
    if (profile) {
      setForm({ firstName: profile.firstName ?? '', lastName: profile.lastName ?? '', phone: profile.phone ?? '', city: profile.city ?? '' });
    }
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const fd = new FormData();
      fd.append('firstName', form.firstName);
      fd.append('lastName', form.lastName);
      if (form.phone) fd.append('phone', form.phone);
      if (form.city) fd.append('city', form.city);
      await api.patch('/profile', fd);
      setSuccess('Profil mis à jour avec succès');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally { setSaving(false); }
  }

  return (
    <div className="loc-page">
      {/* Hero */}
      <div className="loc-hero">
        <div className="loc-hero-meta">
          <span className="loc-date-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {dateCourante}
          </span>
          <span className="loc-role-badge">Locataire</span>
        </div>
        <h1 className="loc-hero-title">Mon profil</h1>
        <p className="loc-hero-sub">Gérez vos informations personnelles</p>
      </div>

      <div className="loc-body">
        {loading ? (
          <div className="loc-card" style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Chargement…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Carte identité */}
            <div className="loc-card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #0A2650, #0F4C81)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 24, flexShrink: 0 }}>
                {initiales(profile?.firstName, profile?.lastName)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#0A2650' }}>{profile?.firstName} {profile?.lastName}</div>
                <div style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>{profile?.email}</div>
                {profile?.city && <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>📍 {profile.city}</div>}
              </div>
              <div>
                <span style={{ background: '#EFF6FF', color: '#0F4C81', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700 }}>Locataire</span>
              </div>
            </div>

            {/* Formulaire */}
            <div className="loc-card">
              <div className="loc-card-header">
                <h2 className="loc-card-title">Modifier mes informations</h2>
              </div>

              {error && (
                <div className="loc-alert loc-alert-error" style={{ margin: '0 0 16px' }}>
                  <span>{error}</span>
                  <button onClick={() => setError('')}>×</button>
                </div>
              )}
              {success && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#15803D', fontWeight: 600, marginBottom: 16 }}>✓ {success}</div>
              )}

              <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Prénom *</label>
                    <input className="loc-input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Nom *</label>
                    <input className="loc-input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email (lecture seule)</label>
                  <input className="loc-input" value={profile?.email ?? ''} disabled style={{ background: '#F9FAFB', color: '#9CA3AF', cursor: 'not-allowed' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Téléphone</label>
                    <input className="loc-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+228 90 00 00 00" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Ville</label>
                    <input className="loc-input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Ex: Lomé" />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={saving} className="loc-dl-btn" style={{ background: saving ? '#93C5FD' : '#0F4C81', fontSize: 14, padding: '10px 28px', cursor: saving ? 'not-allowed' : 'pointer' }}>
                    {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
