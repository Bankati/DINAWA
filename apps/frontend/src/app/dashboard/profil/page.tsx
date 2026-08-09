'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useApi, TTL } from '@/lib/use-api';
import { initiales } from '@/lib/format';

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

const HERO: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0A2650 0%, #0F4C81 60%, #081E41 100%)',
  borderRadius: 14, padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden',
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Propriétaire', MANAGER: 'Gestionnaire', TENANT: 'Locataire', ADMIN: 'Administrateur',
};
const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  ACTIVE: { label: 'Actif', bg: '#DCFCE7', color: '#15803D' },
  SUSPENDED_INACTIVITY: { label: 'Suspendu (inactivité)', bg: '#FEE2E2', color: '#DC2626' },
  SUSPENDED_ADMIN: { label: 'Suspendu (admin)', bg: '#FEE2E2', color: '#DC2626' },
  SUSPENDED_PAYMENT: { label: 'Suspendu (paiement)', bg: '#FEE2E2', color: '#DC2626' },
};

function ipt(): React.CSSProperties {
  return { width: '100%', border: '1px solid #D1D5DB', borderRadius: 9, padding: '10px 12px', fontSize: 13.5, boxSizing: 'border-box', color: '#111827' };
}

export default function ProfilPage() {
  const { data: profile, loading } = useApi<UserProfile>('/profile', TTL.STABLE);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', city: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        phone: profile.phone ?? '',
        city: profile.city ?? '',
      });
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

  const st = profile ? (STATUS_LABELS[profile.accountStatus] ?? { label: profile.accountStatus, bg: '#F3F4F6', color: '#6B7280' }) : null;

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Hero */}
      <div style={HERO}>
        <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', fontSize: 80, opacity: 0.06, fontWeight: 900, color: '#fff', letterSpacing: -4, userSelect: 'none', pointerEvents: 'none' }}>WARAH</div>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Mon profil</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '4px 0 0' }}>Gérez vos informations personnelles</p>
        </div>
      </div>

      {loading ? (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Chargement…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>

          {/* Carte identité */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 28, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #0A2650, #0F4C81)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 28, margin: '0 auto 16px' }}>
              {initiales(profile?.firstName, profile?.lastName)}
            </div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#111827', marginBottom: 4 }}>
              {profile?.firstName} {profile?.lastName}
            </div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>{profile?.email}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              <span style={{ background: '#EFF6FF', color: '#0F4C81', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700 }}>
                {profile ? (ROLE_LABELS[profile.role] ?? profile.role) : '—'}
              </span>
              {st && <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700 }}>{st.label}</span>}
            </div>
            {profile?.createdAt && (
              <div style={{ marginTop: 16, fontSize: 12, color: '#9CA3AF' }}>
                Membre depuis {new Date(profile.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </div>
            )}
          </div>

          {/* Formulaire */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Informations personnelles</h2>

            {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 16 }}>{error}</div>}
            {success && <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#15803D', fontWeight: 600, marginBottom: 16 }}>✓ {success}</div>}

            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Prénom *</label>
                  <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required style={ipt()} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Nom *</label>
                  <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required style={ipt()} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Adresse email</label>
                <input value={profile?.email ?? ''} disabled style={{ ...ipt(), background: '#F9FAFB', color: '#9CA3AF', cursor: 'not-allowed' }} />
                <p style={{ fontSize: 11.5, color: '#9CA3AF', margin: '4px 0 0' }}>L'email est géré par Supabase Auth et ne peut pas être modifié ici.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Téléphone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+228 90 00 00 00" style={ipt()} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Ville</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Ex: Lomé" style={ipt()} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                <button type="submit" disabled={saving}
                  style={{ background: saving ? '#93C5FD' : '#0F4C81', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 28px', fontWeight: 700, fontSize: 13.5, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
