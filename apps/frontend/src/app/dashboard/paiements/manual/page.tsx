'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Upload, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { formatFcfa } from '@/lib/format';
import { toast } from '@/components/ui';
import {
  PageHeader, Card, CardBody, Label, Input, Textarea, Button,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ds';

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

const BACK_ROUTE = '/dashboard/paiements';

export default function PaiementManualPage() {
  const queryClient = useQueryClient();
  const { data: propsRes, isLoading: loadingProps } = useQuery({
    queryKey: ['properties', 'OCCUPIED'],
    queryFn: () => api.get<{ data: Property[]; total: number }>('/properties?status=OCCUPIED&limit=50'),
  });
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
      queryClient.invalidateQueries({ queryKey: ['payments'] });
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
      <Link href={BACK_ROUTE} className="text-muted-foreground text-sm no-underline inline-flex items-center gap-1 mb-4 hover:text-foreground">
        <ArrowLeft className="w-3.5 h-3.5" /> Paiements
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
            <div className="text-center py-8 text-muted-foreground">Chargement des biens…</div>
          ) : properties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="font-semibold text-foreground mb-2">Aucun bien occupé</div>
              <div className="text-sm">Invitez un locataire pour créer un bail avant d&apos;enregistrer un paiement.</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <Label>Bien concerné <span className="text-destructive">*</span></Label>
                <Select value={selectedPropertyId} onValueChange={handlePropertyChange}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Sélectionnez un bien" /></SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {TYPE_LABEL[p.type] ?? p.type} — {p.neighborhood}, {p.city} ({formatFcfa(p.monthlyRent)}/mois)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPropertyId && (
                loadingSchedule ? (
                  <div className="text-center text-sm text-muted-foreground">Chargement du calendrier…</div>
                ) : schedule.length === 0 ? (
                  <div className="bg-green-50 border border-green-300 rounded-lg px-4 py-3 text-sm text-green-800">
                    ✓ Toutes les échéances de ce bail sont payées.
                  </div>
                ) : (
                  <div>
                    <Label>Échéance <span className="text-destructive">*</span></Label>
                    <Select value={scheduleEntryId} onValueChange={handleEntryChange}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {schedule.map((entry) => {
                          const due = new Date(entry.dueDate).toLocaleDateString('fr-FR');
                          const remaining = entry.expectedAmount - entry.paidAmount;
                          return (
                            <SelectItem key={entry.id} value={entry.id}>
                              Échéance du {due} — {formatFcfa(remaining)} restant
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {selectedEntry && (
                      <div className="flex gap-5 mt-2.5 text-xs text-foreground bg-ds-secondary rounded-lg px-3.5 py-2.5 flex-wrap">
                        <span><strong>Attendu :</strong> {formatFcfa(selectedEntry.expectedAmount)}</span>
                        {selectedEntry.paidAmount > 0 && <span><strong>Déjà payé :</strong> {formatFcfa(selectedEntry.paidAmount)}</span>}
                        <span><strong>Reste :</strong> {formatFcfa(selectedEntry.expectedAmount - selectedEntry.paidAmount)}</span>
                      </div>
                    )}
                  </div>
                )
              )}

              {scheduleEntryId && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Montant reçu (FCFA) <span className="text-destructive">*</span></Label>
                      <Input className="mt-1.5" type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} required min="1" />
                    </div>
                    <div>
                      <Label>Date du paiement <span className="text-destructive">*</span></Label>
                      <Input className="mt-1.5" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
                    </div>
                  </div>

                  <div>
                    <Label>Mode de paiement <span className="text-destructive">*</span></Label>
                    <div className="flex gap-3 mt-1.5">
                      {[{ value: 'CASH', label: 'Espèces' }, { value: 'BANK_TRANSFER', label: 'Virement bancaire' }].map((m) => (
                        <label
                          key={m.value}
                          className={`flex items-center gap-2 cursor-pointer text-sm px-4 py-2.5 rounded-lg border ${paymentMethod === m.value ? 'border-primary bg-primary-50 dark:bg-ds-secondary text-primary font-semibold' : 'border-ds-border text-foreground'}`}
                        >
                          <input type="radio" name="method" value={m.value} checked={paymentMethod === m.value} onChange={() => setPaymentMethod(m.value as 'CASH' | 'BANK_TRANSFER')} className="hidden" />
                          {m.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Note <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                    <Textarea className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. : loyer reçu en espèces le 05/08/2026…" rows={3} />
                  </div>

                  <div>
                    <Label>Justificatif <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                    <input type="file" id="proof-file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleProofChange} className="hidden" />
                    <label htmlFor="proof-file" className="flex items-center gap-2.5 px-4 py-2.5 mt-1.5 border border-dashed border-ds-border rounded-lg cursor-pointer text-sm text-muted-foreground bg-ds-secondary">
                      <Upload className="w-4 h-4 shrink-0" />
                      {proof ? <span className="text-green-600 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {proof.name}</span> : <span>Cliquez pour téléverser un justificatif (JPEG, PNG, PDF — max 5 Mo)</span>}
                    </label>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button type="submit" loading={saving}>Enregistrer le paiement</Button>
                    <Button asChild variant="secondary"><Link href={BACK_ROUTE}>Annuler</Link></Button>
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
