'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatFcfa } from '@/lib/format';
import { cacheInvalidate } from '@/lib/cache';
import { useApi, TTL } from '@/lib/use-api';
import { PageHeader, Card, CardBody, Field, Select, Input, Textarea, Button, toast } from '@/components/ui';

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

// Le gestionnaire a les mêmes droits que le propriétaire sur les biens sous
// mandat ACTIVE (canActOnProperty()) — POST /payments/manual accepte déjà
// son rôle, et /properties?status=OCCUPIED est déjà scopé (biens propres +
// sous mandat) par propertyVisibilityWhere() côté backend.
const BACK_ROUTE = '/gestionnaire/paiements';

export default function GestionnairePaiementManualPage() {
  const { data: propsRes, loading: loadingProps } =
    useApi<{ data: Property[]; total: number }>('/properties?status=OCCUPIED&limit=50', TTL.LIST);
  const properties = propsRes?.data ?? [];

  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const [scheduleEntryId, setScheduleEntryId] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [note, setNote] = useState('');
  const [proof, setProof] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handlePropertyChange(propertyId: string) {
    setSelectedPropertyId(propertyId);
    setSchedule([]);
    setScheduleEntryId('');
    setPaidAmount('');
    if (!propertyId) return;

    setLoadingSchedule(true);
    try {
      const history = await api.get<{ data: LeaseEntry[] }>(`/properties/${propertyId}/tenants/history?limit=5`);
      const activeLease = history.data.find((l) => l.status === 'ACTIVE');
      if (!activeLease) { setError('Aucun bail actif sur ce bien.'); setLoadingSchedule(false); return; }
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
    setSaving(true); setError('');

    try {
      const fd = new FormData();
      fd.append('scheduleEntryId', scheduleEntryId);
      fd.append('paidAmount', paidAmount);
      fd.append('paidAt', new Date(paidAt).toISOString());
      fd.append('paymentMethod', paymentMethod);
      if (note.trim()) fd.append('note', note.trim());
      if (proof) fd.append('proof', proof);

      await api.post('/payments/manual', fd);
      toast.success('Paiement enregistré avec succès.');
      cacheInvalidate('/payments');
      setScheduleEntryId('');
      setPaidAmount('');
      setNote('');
      setProof(null);
      await handlePropertyChange(selectedPropertyId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  const selectedEntry = schedule.find((e) => e.id === scheduleEntryId);

  return (
    <div>
      <Link href={BACK_ROUTE} className="text-gray-400 text-sm no-underline inline-flex items-center gap-1 mb-4 hover:text-gray-600">
        ← Paiements
      </Link>

      <PageHeader title="Enregistrer un paiement" subtitle="Paiement hors-plateforme reçu en espèces ou par virement" />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="bg-transparent border-none cursor-pointer text-red-700 font-bold">×</button>
        </div>
      )}

      <Card>
        <CardBody>
          {loadingProps ? (
            <div className="text-center py-8 text-gray-400">Chargement des biens…</div>
          ) : properties.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="font-semibold text-gray-700 mb-2">Aucun bien occupé</div>
              <div className="text-sm">Aucun bail actif sur vos biens propres ou sous mandat pour l&apos;instant.</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <Field label="Bien concerné" required>
                <Select value={selectedPropertyId} onChange={(e) => handlePropertyChange(e.target.value)} required>
                  <option value="">Sélectionnez un bien</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {TYPE_LABEL[p.type] ?? p.type} — {p.neighborhood}, {p.city} ({formatFcfa(p.monthlyRent)}/mois)
                    </option>
                  ))}
                </Select>
              </Field>

              {selectedPropertyId && (
                loadingSchedule ? (
                  <div className="text-center text-sm text-gray-400">Chargement du calendrier…</div>
                ) : schedule.length === 0 ? (
                  <div className="bg-green-50 border border-green-300 rounded-lg px-4 py-3 text-sm text-green-800">
                    ✓ Toutes les échéances de ce bail sont payées.
                  </div>
                ) : (
                  <Field label="Échéance" required>
                    <Select value={scheduleEntryId} onChange={(e) => handleEntryChange(e.target.value)} required>
                      {schedule.map((entry) => {
                        const due = new Date(entry.dueDate).toLocaleDateString('fr-FR');
                        const remaining = entry.expectedAmount - entry.paidAmount;
                        return (
                          <option key={entry.id} value={entry.id}>
                            Échéance du {due} — {formatFcfa(remaining)} restant
                          </option>
                        );
                      })}
                    </Select>
                    {selectedEntry && (
                      <div className="flex gap-5 mt-2.5 text-xs text-gray-700 bg-gray-50 rounded-lg px-3.5 py-2.5 flex-wrap">
                        <span><strong>Attendu :</strong> {formatFcfa(selectedEntry.expectedAmount)}</span>
                        {selectedEntry.paidAmount > 0 && <span><strong>Déjà payé :</strong> {formatFcfa(selectedEntry.paidAmount)}</span>}
                        <span><strong>Reste :</strong> {formatFcfa(selectedEntry.expectedAmount - selectedEntry.paidAmount)}</span>
                      </div>
                    )}
                  </Field>
                )
              )}

              {scheduleEntryId && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Montant reçu (FCFA)" required>
                      <Input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} required min="1" />
                    </Field>
                    <Field label="Date du paiement" required>
                      <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
                    </Field>
                  </div>

                  <Field label="Mode de paiement" required>
                    <div className="flex gap-3">
                      {[{ value: 'CASH', label: 'Espèces' }, { value: 'BANK_TRANSFER', label: 'Virement bancaire' }].map((m) => (
                        <label
                          key={m.value}
                          className={`flex items-center gap-2 cursor-pointer text-sm px-4 py-2.5 rounded-lg border ${paymentMethod === m.value ? 'border-primary bg-blue-50 text-primary font-semibold' : 'border-gray-300 text-gray-700'}`}
                        >
                          <input type="radio" name="method" value={m.value} checked={paymentMethod === m.value} onChange={() => setPaymentMethod(m.value as 'CASH' | 'BANK_TRANSFER')} className="hidden" />
                          {m.label}
                        </label>
                      ))}
                    </div>
                  </Field>

                  <Field label="Note" hint="Optionnel">
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. : loyer reçu en espèces le 05/08/2026…" rows={3} />
                  </Field>

                  <Field label="Justificatif" hint="Optionnel">
                    <input type="file" id="proof-file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleProofChange} className="hidden" />
                    <label htmlFor="proof-file" className="flex items-center gap-2.5 px-4 py-2.5 border border-dashed border-gray-300 rounded-lg cursor-pointer text-sm text-gray-500 bg-gray-50">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      {proof ? <span className="text-green-600 font-medium">✓ {proof.name}</span> : <span>Cliquez pour téléverser un justificatif (JPEG, PNG, PDF — max 5 Mo)</span>}
                    </label>
                  </Field>

                  <div className="flex gap-3 pt-1">
                    <Button type="submit" loading={saving}>Enregistrer le paiement</Button>
                    <Link href={BACK_ROUTE}><Button type="button" variant="secondary">Annuler</Button></Link>
                  </div>
                </>
              )}
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
