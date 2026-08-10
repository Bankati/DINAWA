'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { paymentsApi } from '@/lib/payments';
import { formatFcfa } from '@/lib/format';
import { PageHeader, Card, CardBody, Field, Select, Input, Textarea, Button, EmptyState, toast } from '@/components/ui';

interface ScheduleEntry {
  id: string;
  leaseId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  expectedAmount: number;
  paidAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
}

interface LeaseEntry {
  id: string;
  propertyId: string;
  property: { id: string; address: string; neighborhood: string; city: string };
  status: string;
  monthlyRent: number;
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'BANK_TRANSFER', label: 'Virement bancaire' },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  PARTIAL: 'Partiel',
  PAID: 'Payé',
  OVERDUE: 'En retard',
};

export default function PaymentDeclarationPage() {
  const [activeLease, setActiveLease] = useState<LeaseEntry | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loadingLease, setLoadingLease] = useState(true);
  const [leaseError, setLeaseError] = useState('');

  const [selectedEntry, setSelectedEntry] = useState<ScheduleEntry | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [declaredAmount, setDeclaredAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('warah_user');
    const userId = raw ? JSON.parse(raw).id : null;
    if (!userId) { setLeaseError("Impossible de récupérer l'identifiant utilisateur."); setLoadingLease(false); return; }

    api.get<{ data: LeaseEntry[]; total: number }>(`/tenants/${userId}/leases/history?limit=10`)
      .then((res) => {
        const active = res.data.find((l) => l.status === 'ACTIVE');
        if (!active) { setLeaseError('Aucun bail actif trouvé. Contactez votre propriétaire.'); return; }
        setActiveLease(active);
        return api.get<ScheduleEntry[]>(`/leases/${active.id}/schedule`);
      })
      .then((entries) => {
        if (!entries) return;
        const pending = entries.filter((e) => e.status !== 'PAID').sort(
          (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
        );
        setSchedule(pending);
        if (pending.length > 0) {
          setSelectedEntry(pending[0]);
          setDeclaredAmount(String(pending[0].expectedAmount - pending[0].paidAmount));
        }
      })
      .catch(() => setLeaseError('Erreur lors du chargement du bail.'))
      .finally(() => setLoadingLease(false));
  }, []);

  function handleEntryChange(id: string) {
    const entry = schedule.find((e) => e.id === id) ?? null;
    setSelectedEntry(entry);
    if (entry) setDeclaredAmount(String(entry.expectedAmount - entry.paidAmount));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Le fichier ne doit pas dépasser 5 Mo'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setError('Formats acceptés : JPEG, PNG, WebP, PDF'); return;
    }
    setSelectedFile(file);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeLease || !selectedEntry) return;
    setIsLoading(true);
    setError('');
    try {
      await paymentsApi.createDeclaration({
        scheduleEntryId: selectedEntry.id,
        declaredAmount: Number(declaredAmount),
        declaredAt: new Date().toISOString(),
        declaredMethod: paymentMethod,
        note: note.trim() || undefined,
      }, selectedFile || undefined);
      toast.success('Déclaration envoyée avec succès. Elle sera examinée par votre propriétaire.');
      setNote('');
      setSelectedFile(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la déclaration');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Déclaration de paiement" subtitle="Déclarez votre paiement et joignez la preuve de transaction" />

      {loadingLease ? (
        <Card><CardBody><div className="text-center text-gray-400 py-8">Chargement de votre bail…</div></CardBody></Card>
      ) : leaseError ? (
        <Card><CardBody>
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{leaseError}</div>
        </CardBody></Card>
      ) : activeLease && (
        <div className="flex flex-col gap-4">
          <Card>
            <div className="p-5 flex items-center gap-3.5 rounded-2xl" style={{ background: 'linear-gradient(135deg, #0A2650 0%, #0F4C81 60%, #081E41 100%)' }}>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" className="w-5 h-5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-[15px] text-white">{activeLease.property.neighborhood}, {activeLease.property.city}</div>
                <div className="text-xs text-white/70 mt-0.5">{activeLease.property.address} · Loyer {formatFcfa(activeLease.monthlyRent)}/mois</div>
              </div>
            </div>
          </Card>

          {schedule.length === 0 ? (
            <Card>
              <EmptyState
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" /><polyline points="20 6 9 17 4 12" />
                  </svg>
                }
                title="Aucune échéance en attente"
                description="Tous vos paiements sont à jour."
              />
            </Card>
          ) : (
            <Card>
              <CardBody>
                <h2 className="text-base font-bold text-gray-900 mb-5">Informations du paiement</h2>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <Field label="Échéance à payer" required>
                    <Select value={selectedEntry?.id ?? ''} onChange={(e) => handleEntryChange(e.target.value)} required>
                      {schedule.map((entry) => {
                        const due = new Date(entry.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
                        const remaining = entry.expectedAmount - entry.paidAmount;
                        return (
                          <option key={entry.id} value={entry.id}>
                            Échéance du {due} — {formatFcfa(remaining)} restant ({STATUS_LABEL[entry.status] ?? entry.status})
                          </option>
                        );
                      })}
                    </Select>
                  </Field>

                  {selectedEntry && (
                    <div className="flex gap-6 flex-wrap text-sm bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                      <div>
                        <div className="text-gray-500 mb-0.5">Montant attendu</div>
                        <div className="font-bold text-primary">{formatFcfa(selectedEntry.expectedAmount)}</div>
                      </div>
                      {selectedEntry.paidAmount > 0 && (
                        <div>
                          <div className="text-gray-500 mb-0.5">Déjà payé</div>
                          <div className="font-bold text-green-600">{formatFcfa(selectedEntry.paidAmount)}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-gray-500 mb-0.5">Restant à payer</div>
                        <div className="font-bold text-red-600">{formatFcfa(selectedEntry.expectedAmount - selectedEntry.paidAmount)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-0.5">Date limite</div>
                        <div className="font-semibold text-gray-700">{new Date(selectedEntry.dueDate).toLocaleDateString('fr-FR')}</div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Montant déclaré (FCFA)" required>
                      <Input type="number" value={declaredAmount} onChange={(e) => setDeclaredAmount(e.target.value)} placeholder="0" required min="1" />
                    </Field>
                    <Field label="Mode de paiement" required>
                      <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'BANK_TRANSFER')} required>
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <Field label="Note" hint="Optionnel">
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ajoutez une précision si nécessaire…" rows={3} />
                  </Field>

                  <Field label="Preuve de paiement" required>
                    <input type="file" id="proof-upload" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFileChange} className="hidden" />
                    <label htmlFor="proof-upload" className="flex items-center gap-2.5 px-4 py-2.5 border border-dashed border-gray-300 rounded-lg cursor-pointer text-sm text-gray-500 bg-gray-50">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      {selectedFile ? <span className="text-green-600 font-medium">✓ {selectedFile.name}</span> : <span>Cliquez pour téléverser ou glissez-déposez (JPEG, PNG, WebP, PDF — max 5 Mo)</span>}
                    </label>
                  </Field>

                  <div className="flex gap-3 pt-1">
                    <Button type="submit" loading={isLoading} disabled={!selectedEntry || !declaredAmount || !selectedFile}>Envoyer la déclaration</Button>
                    <Button type="button" variant="secondary" onClick={() => { setNote(''); setSelectedFile(null); setError(''); }}>Annuler</Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
