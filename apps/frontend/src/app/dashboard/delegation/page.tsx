'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useApi, TTL } from '@/lib/use-api';
import { cacheInvalidate } from '@/lib/cache';

interface Manager {
  id: string; firstName: string; lastName: string; email: string | null; phone: string | null;
}
interface Property {
  id: string; address: string; neighborhood: string; city: string; status: string;
}
interface Mandate {
  id: string;
  status: 'ACTIVE' | 'PENDING';
  feeType: 'PERCENTAGE' | 'FLAT';
  feeValue: number;
  startDate: string;
  endDate: string | null;
  property: { id: string; address: string; neighborhood: string; city: string };
  manager: Manager;
}

const STATUS_LABELS: Record<string, string> = { OCCUPIED: 'Occupé', VACANT: 'Vacant', RENOVATION: 'En travaux' };

const today = new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  managerEmail: '', feeType: 'PERCENTAGE' as 'PERCENTAGE' | 'FLAT',
  feeValue: '0', startDate: today, endDate: '',
};

export default function DelegationPage() {
  const { data: mandatesRaw, reload } = useApi<Mandate[]>('/mandates', TTL.LIST);
  const mandates = mandatesRaw ?? [];
  const { data: propsRes } = useApi<{ data: Property[]; total: number } | Property[]>('/properties?limit=200', TTL.LIST);
  const allProps: Property[] = Array.isArray(propsRes) ? propsRes : (propsRes?.data ?? []);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Biens déjà délégués
  const delegatedIds = new Set(mandates.map(m => m.property.id));
  const availableProps = allProps.filter(p => !delegatedIds.has(p.id));

  function toggleProp(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function openForm() {
    setForm({ ...EMPTY_FORM });
    setSelected([]);
    setFormError('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.managerEmail) { setFormError("L'email du gestionnaire est requis"); return; }
    if (selected.length === 0) { setFormError('Sélectionnez au moins un bien'); return; }
    setSaving(true); setFormError('');
    try {
      await api.post('/mandates', {
        managerEmail: form.managerEmail,
        propertyIds: selected,
        feeType: form.feeType,
        feeValue: Number(form.feeValue),
        startDate: form.startDate,
        ...(form.endDate ? { endDate: form.endDate } : {}),
      });
      cacheInvalidate('/mandates');
      reload();
      setShowForm(false);
      setSuccessMsg(`${selected.length} bien${selected.length > 1 ? 's' : ''} délégué${selected.length > 1 ? 's' : ''} avec succès`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la délégation');
    } finally { setSaving(false); }
  }

  async function handleRevoke(id: string) {
    setRevoking(id); setRevokeError('');
    try {
      await api.delete(`/mandates/${id}`);
      cacheInvalidate('/mandates');
      reload();
    } catch (err: unknown) {
      setRevokeError(err instanceof Error ? err.message : 'Erreur lors de la révocation');
    } finally { setRevoking(null); }
  }

  // Regrouper les mandats par gestionnaire
  const byManager: Record<string, { manager: Manager; mandates: Mandate[] }> = {};
  for (const m of mandates) {
    if (!byManager[m.manager.id]) byManager[m.manager.id] = { manager: m.manager, mandates: [] };
    byManager[m.manager.id].mandates.push(m);
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* En-tête */}
      <div style={{ background: 'linear-gradient(135deg, #0A2650 0%, #0F4C81 60%, #081E41 100%)', borderRadius: 14, padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', fontSize: 80, opacity: 0.06, fontWeight: 900, color: '#fff', letterSpacing: -4, userSelect: 'none', pointerEvents: 'none' }}>WARAH</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Délégation</h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '4px 0 0' }}>
              Confiez la gestion de vos biens à un gestionnaire
            </p>
          </div>
          <button onClick={openForm} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#C9982E', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 15, height: 15 }}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouvelle délégation
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#15803D', fontSize: 13, fontWeight: 600 }}>
          ✓ {successMsg}
        </div>
      )}
      {revokeError && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#DC2626', fontSize: 13 }}>
          {revokeError}
        </div>
      )}

      {/* Mandats actuels */}
      {mandates.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '48px 32px', textAlign: 'center' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 52, height: 52, margin: '0 auto 16px', display: 'block', color: '#C9982E' }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <div style={{ fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 8 }}>Aucune délégation active</div>
          <div style={{ fontSize: 13.5, color: '#6B7280', maxWidth: 380, margin: '0 auto' }}>
            Vous n'avez confié aucun bien à un gestionnaire pour le moment.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.values(byManager).map(({ manager, mandates: ms }) => (
            <div key={manager.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
              {/* Header gestionnaire */}
              <div style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #0A2650, #0F4C81)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                  {manager.firstName[0]}{manager.lastName[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{manager.firstName} {manager.lastName}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{manager.email} {manager.phone ? `· ${manager.phone}` : ''}</div>
                </div>
                <div style={{ background: '#EFF6FF', color: '#0F4C81', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
                  {ms.length} bien{ms.length > 1 ? 's' : ''} délégué{ms.length > 1 ? 's' : ''}
                </div>
              </div>
              {/* Liste des biens délégués */}
              <div>
                {ms.map((m, i) => (
                  <div key={m.id} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, borderTop: i > 0 ? '1px solid #F3F4F6' : undefined }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: '#111827' }}>{m.property.address}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>
                        {m.property.neighborhood}, {m.property.city}
                        {' · '}
                        Commission : {m.feeType === 'PERCENTAGE' ? `${m.feeValue}%` : `${m.feeValue.toLocaleString('fr-FR')} FCFA`}
                        {' · '}
                        Depuis le {new Date(m.startDate).toLocaleDateString('fr-FR')}
                        {m.endDate ? ` → ${new Date(m.endDate).toLocaleDateString('fr-FR')}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(m.id)}
                      disabled={revoking === m.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: revoking === m.id ? '#F3F4F6' : '#FEF2F2', color: revoking === m.id ? '#9CA3AF' : '#DC2626', border: '1px solid', borderColor: revoking === m.id ? '#E5E7EB' : '#FECACA', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: revoking === m.id ? 'not-allowed' : 'pointer' }}
                    >
                      {revoking === m.id ? 'Révocation…' : 'Révoquer'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nouvelle délégation */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => setShowForm(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Nouvelle délégation</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9CA3AF' }}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Email gestionnaire */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Email du gestionnaire <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input type="email" value={form.managerEmail} onChange={e => setForm(f => ({ ...f, managerEmail: e.target.value }))}
                  placeholder="gestionnaire@exemple.com" required
                  style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 9, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 4 }}>Le gestionnaire doit déjà avoir un compte WARAH avec le rôle Gestionnaire.</div>
              </div>

              {/* Sélection des biens */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  Biens à déléguer <span style={{ color: '#DC2626' }}>*</span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF', marginLeft: 8 }}>(sélectionnez un ou plusieurs)</span>
                </label>
                {availableProps.length === 0 ? (
                  <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 9, padding: '12px 14px', fontSize: 13, color: '#9A3412' }}>
                    Tous vos biens sont déjà délégués.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 9, padding: 12 }}>
                    {availableProps.map(p => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '6px 8px', borderRadius: 7, background: selected.includes(p.id) ? '#EFF6FF' : 'transparent', border: '1px solid', borderColor: selected.includes(p.id) ? '#BFDBFE' : 'transparent' }}>
                        <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleProp(p.id)} style={{ width: 16, height: 16, flexShrink: 0, accentColor: '#0F4C81' }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{p.address}</div>
                          <div style={{ fontSize: 11.5, color: '#6B7280' }}>{p.neighborhood}, {p.city} · {STATUS_LABELS[p.status] ?? p.status}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {selected.length > 0 && (
                  <div style={{ fontSize: 12, color: '#0F4C81', marginTop: 6, fontWeight: 600 }}>
                    {selected.length} bien{selected.length > 1 ? 's' : ''} sélectionné{selected.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Commission */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Type de commission</label>
                  <select value={form.feeType} onChange={e => setForm(f => ({ ...f, feeType: e.target.value as 'PERCENTAGE' | 'FLAT' }))}
                    style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 9, padding: '9px 12px', fontSize: 13 }}>
                    <option value="PERCENTAGE">Pourcentage (%)</option>
                    <option value="FLAT">Montant fixe (FCFA)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    {form.feeType === 'PERCENTAGE' ? 'Taux (%)' : 'Montant (FCFA)'}
                  </label>
                  <input type="number" min="0" value={form.feeValue} onChange={e => setForm(f => ({ ...f, feeValue: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 9, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Date de début <span style={{ color: '#DC2626' }}>*</span></label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required
                    style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 9, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Date de fin <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF' }}>(optionnel)</span></label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 9, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>

              {formError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#DC2626' }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 9, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button type="submit" disabled={saving || availableProps.length === 0}
                  style={{ background: saving ? '#93C5FD' : '#0F4C81', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 24px', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Enregistrement…' : 'Confirmer la délégation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
