'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatFcfa } from '@/lib/format';
import { cacheInvalidate } from '@/lib/cache';
import { useApi, TTL } from '@/lib/use-api';

interface Property {
  id: string;
  type: string;
  status: string;
  address: string;
  neighborhood: string;
  city: string;
  monthlyRent: number;
}

interface LeaseEntry {
  id: string;
  status: string;
  property: { id: string; address: string };
}

interface ScheduleEntry {
  id: string;
  leaseId: string;
  periodStart: string;
  dueDate: string;
  expectedAmount: number;
  paidAmount: number;
  status: string;
}

const TYPE_LABEL: Record<string, string> = {
  VILLA: 'Villa', APARTMENT: 'Appartement', STUDIO: 'Studio', COMMERCIAL: 'Local commercial',
};

export default function PaiementManualPage() {
  const { data: propsRes, loading: loadingProps } =
    useApi<{ data: Property[]; total: number }>('/properties?status=OCCUPIED&limit=50', TTL.LIST);
  const properties = propsRes?.data ?? [];

  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [activeLeaseId, setActiveLeaseId] = useState('');

  const [scheduleEntryId, setScheduleEntryId] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [note, setNote] = useState('');
  const [proof, setProof] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handlePropertyChange(propertyId: string) {
    setSelectedPropertyId(propertyId);
    setSchedule([]);
    setScheduleEntryId('');
    setPaidAmount('');
    setActiveLeaseId('');
    if (!propertyId) return;

    setLoadingSchedule(true);
    try {
      const history = await api.get<{ data: LeaseEntry[] }>(`/properties/${propertyId}/tenants/history?limit=5`);
      const activeLease = history.data.find((l) => l.status === 'ACTIVE');
      if (!activeLease) { setError('Aucun bail actif sur ce bien.'); setLoadingSchedule(false); return; }
      setActiveLeaseId(activeLease.id);
      const entries = await api.get<ScheduleEntry[]>(`/leases/${activeLease.id}/schedule`);
      const pending = entries.filter((e) => e.status !== 'PAID').sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      );
      setSchedule(pending);
      if (pending.length > 0) {
        setScheduleEntryId(pending[0].id);
        setPaidAmount(String(pending[0].expectedAmount - pending[0].paidAmount));
      }
    } catch { setError('Impossible de charger le calendrier des échéances.'); }
    finally { setLoadingSchedule(false); }
  }

  function handleEntryChange(id: string) {
    setScheduleEntryId(id);
    const entry = schedule.find((e) => e.id === id);
    if (entry) setPaidAmount(String(entry.expectedAmount - entry.paidAmount));
  }

  function handleProofChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Le fichier ne doit pas dépasser 5 Mo'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setError('Formats acceptés : JPEG, PNG, WebP, PDF'); return;
    }
    setProof(file);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduleEntryId || !paidAmount || !paidAt) return;
    setSaving(true); setError(''); setSuccess('');

    try {
      const fd = new FormData();
      fd.append('scheduleEntryId', scheduleEntryId);
      fd.append('paidAmount', paidAmount);
      fd.append('paidAt', new Date(paidAt).toISOString());
      fd.append('paymentMethod', paymentMethod);
      if (note.trim()) fd.append('note', note.trim());
      if (proof) fd.append('proof', proof);

      await api.post('/payments/manual', fd);
      setSuccess('Paiement enregistré avec succès.');
      cacheInvalidate('/payments');
      setScheduleEntryId('');
      setPaidAmount('');
      setNote('');
      setProof(null);
      // Recharger les échéances pour que la liste soit à jour
      await handlePropertyChange(selectedPropertyId);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err?.message ?? 'Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  }

  const selectedEntry = schedule.find((e) => e.id === scheduleEntryId);

  return (
    <div style={{ padding: '24px 28px' }}>
      <Link href="/dashboard/paiements" style={{ color: '#9CA3AF', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        ← Paiements
      </Link>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0A2650 0%, #0F4C81 60%, #081E41 100%)', borderRadius: 14, padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', fontSize: 80, opacity: 0.06, fontWeight: 900, color: '#fff', letterSpacing: -4, userSelect: 'none', pointerEvents: 'none' }}>WARAH</div>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Enregistrer un paiement</h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '4px 0 0' }}>Paiement hors-plateforme reçu en espèces ou par virement</p>
      </div>

      {success && (
        <div style={{ background: '#DCFCE7', color: '#166534', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', fontWeight: 700 }}>×</button>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: 24 }}>
        {loadingProps ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF' }}>Chargement des biens…</div>
        ) : properties.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF' }}>
            <div style={{ fontWeight: 600, color: '#374151', marginBottom: 8 }}>Aucun bien occupé</div>
            <div style={{ fontSize: 13 }}>Invitez un locataire pour créer un bail avant d&apos;enregistrer un paiement.</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Sélection du bien */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>
                Bien concerné <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                value={selectedPropertyId}
                onChange={(e) => handlePropertyChange(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, background: '#fff' }}
              >
                <option value="">Sélectionnez un bien</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {TYPE_LABEL[p.type] ?? p.type} — {p.neighborhood}, {p.city} ({formatFcfa(p.monthlyRent)}/mois)
                  </option>
                ))}
              </select>
            </div>

            {/* Sélection de l'échéance */}
            {selectedPropertyId && (
              loadingSchedule ? (
                <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Chargement du calendrier…</div>
              ) : schedule.length === 0 ? (
                <div style={{ background: '#F0FDF4', border: '1px solid #6EE7B7', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#065F46' }}>
                  ✓ Toutes les échéances de ce bail sont payées.
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>
                    Échéance <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <select
                    value={scheduleEntryId}
                    onChange={(e) => handleEntryChange(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, background: '#fff' }}
                  >
                    {schedule.map((entry) => {
                      const due = new Date(entry.dueDate).toLocaleDateString('fr-FR');
                      const remaining = entry.expectedAmount - entry.paidAmount;
                      return (
                        <option key={entry.id} value={entry.id}>
                          Échéance du {due} — {formatFcfa(remaining)} restant
                        </option>
                      );
                    })}
                  </select>
                  {selectedEntry && (
                    <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: 12, color: '#374151', background: '#F9FAFB', borderRadius: 8, padding: '10px 14px', flexWrap: 'wrap' }}>
                      <span><strong>Attendu :</strong> {formatFcfa(selectedEntry.expectedAmount)}</span>
                      {selectedEntry.paidAmount > 0 && <span><strong>Déjà payé :</strong> {formatFcfa(selectedEntry.paidAmount)}</span>}
                      <span><strong>Reste :</strong> {formatFcfa(selectedEntry.expectedAmount - selectedEntry.paidAmount)}</span>
                    </div>
                  )}
                </div>
              )
            )}

            {/* Détails du paiement */}
            {scheduleEntryId && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>
                      Montant reçu (FCFA) <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      required min="1"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>
                      Date du paiement <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={paidAt}
                      onChange={(e) => setPaidAt(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>
                    Mode de paiement <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[
                      { value: 'CASH', label: 'Espèces' },
                      { value: 'BANK_TRANSFER', label: 'Virement bancaire' },
                    ].map((m) => (
                      <label key={m.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, padding: '10px 16px', border: `1.5px solid ${paymentMethod === m.value ? '#0F4C81' : '#D1D5DB'}`, borderRadius: 8, background: paymentMethod === m.value ? '#EFF6FF' : '#fff', color: paymentMethod === m.value ? '#0F4C81' : '#374151', fontWeight: paymentMethod === m.value ? 600 : 400 }}>
                        <input type="radio" name="method" value={m.value} checked={paymentMethod === m.value} onChange={() => setPaymentMethod(m.value as 'CASH' | 'BANK_TRANSFER')} style={{ display: 'none' }} />
                        {m.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>
                    Note <span style={{ color: '#9CA3AF' }}>(optionnel)</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ex. : loyer reçu en espèces le 05/08/2026…"
                    rows={3}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>
                    Justificatif <span style={{ color: '#9CA3AF' }}>(optionnel)</span>
                  </label>
                  <input type="file" id="proof-file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleProofChange} style={{ display: 'none' }} />
                  <label htmlFor="proof-file" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', border: '1.5px dashed #D1D5DB', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#6B7280', background: '#FAFAFA' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 20, height: 20, flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                    </svg>
                    {proof ? (
                      <span style={{ color: '#059669', fontWeight: 500 }}>✓ {proof.name}</span>
                    ) : (
                      <span>Cliquez pour téléverser un justificatif (JPEG, PNG, PDF — max 5 Mo)</span>
                    )}
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
                  <button type="submit" disabled={saving}
                    style={{ background: '#0F4C81', color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Enregistrement…' : 'Enregistrer le paiement'}
                  </button>
                  <Link href="/dashboard/paiements"
                    style={{ background: '#F3F4F6', color: '#374151', border: 'none', padding: '11px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                    Annuler
                  </Link>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
