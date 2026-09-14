'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Home, CheckCircle2, Upload, Check, Smartphone, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { paymentsApi } from '@/lib/payments';
import { formatFcfa } from '@/lib/format';
import { toast } from '@/components/ui';
import {
  PageHeader, Card, CardBody, Label, Input, Textarea, Button, EmptyState,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ds';

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

const MANUAL_PAYMENT_METHODS = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'BANK_TRANSFER', label: 'Virement bancaire' },
];

// Choix indicatif côté WARAH — PayDunya ne permet pas de l'imposer, le
// locataire choisit réellement son opérateur sur sa page de paiement (voir
// PaydunyaService.operatorCodeFor(), /architect 2026-09-07/14).
const ONLINE_PAYMENT_METHODS: { value: 'TMONEY' | 'FLOOZ'; label: string }[] = [
  { value: 'TMONEY', label: 'T-Money' },
  { value: 'FLOOZ', label: 'Flooz' },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  PARTIAL: 'Partiel',
  PAID: 'Payé',
  OVERDUE: 'En retard',
};

// Hors composant volontairement — le compilateur React (Next 16) interdit
// d'écrire sur `window.*` depuis l'intérieur d'un composant/hook (même
// pattern que le redirect de session expirée dans lib/api.ts).
function redirectToCheckout(url: string): void {
  window.location.href = url;
}

export default function PaymentDeclarationPage() {
  const { user } = useAuth();

  const { data: leasesRes, isLoading: loadingLease, isError: leasesQueryError } = useQuery({
    queryKey: ['locataire-leases', user?.id],
    queryFn: () => api.get<{ data: LeaseEntry[]; total: number }>(`/tenants/${user!.id}/leases/history?limit=10`),
    enabled: !!user,
  });
  const activeLease = leasesRes?.data.find((l) => l.status === 'ACTIVE') ?? null;

  const { data: scheduleRes, isError: scheduleQueryError } = useQuery({
    queryKey: ['locataire-schedule', activeLease?.id],
    queryFn: () => api.get<ScheduleEntry[]>(`/leases/${activeLease!.id}/schedule`),
    enabled: !!activeLease,
  });
  const schedule = (scheduleRes ?? []).filter((e) => e.status !== 'PAID').sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );

  const leaseError = !user
    ? "Impossible de récupérer l'identifiant utilisateur."
    : leasesQueryError
      ? 'Erreur lors du chargement du bail.'
      : !loadingLease && !activeLease
        ? 'Aucun bail actif trouvé. Contactez votre propriétaire.'
        : scheduleQueryError
          ? 'Erreur lors du chargement du bail.'
          : '';

  // « Payer en ligne » mis en avant par défaut — c'est l'action principale
  // désormais possible (voir /architect 2026-09-14) ; « déjà payé autrement »
  // reste le cas exceptionnel.
  const [mode, setMode] = useState<'online' | 'manual'>('online');
  const [error, setError] = useState('');

  const [selectedEntryId, setSelectedEntryId] = useState('');
  const selectedEntry = schedule.find((e) => e.id === selectedEntryId) ?? schedule[0] ?? null;

  // --- Payer en ligne (PayDunya) ---
  const [onlineMethod, setOnlineMethod] = useState<'TMONEY' | 'FLOOZ'>('TMONEY');
  const [isInitiating, setIsInitiating] = useState(false);

  // --- Déclarer un paiement déjà effectué ---
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [declaredAmount, setDeclaredAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDeclaring, setIsDeclaring] = useState(false);

  function handleEntryChange(id: string) {
    setSelectedEntryId(id);
    const entry = schedule.find((e) => e.id === id) ?? null;
    if (entry) setDeclaredAmount(String(entry.expectedAmount - entry.paidAmount));
    setError('');
  }

  function handleModeChange(next: 'online' | 'manual') {
    setMode(next);
    setError('');
  }

  async function handlePayOnline() {
    if (!selectedEntry) return;
    setIsInitiating(true);
    setError('');
    try {
      const { checkoutUrl } = await paymentsApi.initiate({
        scheduleEntryId: selectedEntry.id,
        paymentMethod: onlineMethod,
      });
      // Redirection vers la page de paiement PayDunya — le retour se fait
      // sur /locataire/paiements/historique (voir PaymentsService.initiate(),
      // returnUrl/cancelUrl côté backend).
      redirectToCheckout(checkoutUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'initialisation du paiement");
      setIsInitiating(false);
    }
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
    setIsDeclaring(true);
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
      setIsDeclaring(false);
    }
  }

  return (
    <div>
      <PageHeader title="Paiement du loyer" subtitle="Payez en ligne ou déclarez un paiement déjà effectué" />

      {loadingLease ? (
        <Card><CardBody><div className="text-center text-muted-foreground py-8">Chargement de votre bail…</div></CardBody></Card>
      ) : leaseError ? (
        <Card><CardBody>
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{leaseError}</div>
        </CardBody></Card>
      ) : activeLease && (
        <div className="flex flex-col gap-4">
          <Card>
            <div className="p-5 flex items-center gap-3.5 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(10,38,80,1) 0%, rgba(15,76,129,1) 60%, rgba(8,30,65,1) 100%)' }}>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Home className="w-5 h-5 text-white" strokeWidth={1.8} />
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
                icon={<CheckCircle2 />}
                title="Aucune échéance en attente"
                description="Tous vos paiements sont à jour."
              />
            </Card>
          ) : (
            <Card>
              <CardBody>
                <div className="flex gap-2 mb-5" role="tablist" aria-label="Mode de règlement">
                  <Button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'online'}
                    variant={mode === 'online' ? 'default' : 'outline'}
                    onClick={() => handleModeChange('online')}
                  >
                    Payer en ligne
                  </Button>
                  <Button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'manual'}
                    variant={mode === 'manual' ? 'default' : 'outline'}
                    onClick={() => handleModeChange('manual')}
                  >
                    J&apos;ai déjà payé autrement
                  </Button>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

                <div className="flex flex-col gap-4">
                  <div>
                    <Label>Échéance à {mode === 'online' ? 'payer' : 'déclarer'} <span className="text-destructive">*</span></Label>
                    <Select value={selectedEntry?.id ?? ''} onValueChange={handleEntryChange}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {schedule.map((entry) => {
                          const due = new Date(entry.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
                          const remaining = entry.expectedAmount - entry.paidAmount;
                          return (
                            <SelectItem key={entry.id} value={entry.id}>
                              Échéance du {due} — {formatFcfa(remaining)} restant ({STATUS_LABEL[entry.status] ?? entry.status})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedEntry && (
                    <div className="flex gap-6 flex-wrap text-sm bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                      <div>
                        <div className="text-muted-foreground mb-0.5">Montant attendu</div>
                        <div className="font-bold text-primary">{formatFcfa(selectedEntry.expectedAmount)}</div>
                      </div>
                      {selectedEntry.paidAmount > 0 && (
                        <div>
                          <div className="text-muted-foreground mb-0.5">Déjà payé</div>
                          <div className="font-bold text-green-600">{formatFcfa(selectedEntry.paidAmount)}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-muted-foreground mb-0.5">Restant à payer</div>
                        <div className="font-bold text-red-600">{formatFcfa(selectedEntry.expectedAmount - selectedEntry.paidAmount)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-0.5">Date limite</div>
                        <div className="font-semibold text-foreground">{new Date(selectedEntry.dueDate).toLocaleDateString('fr-FR')}</div>
                      </div>
                    </div>
                  )}

                  {mode === 'online' ? (
                    <div className="flex flex-col gap-4">
                      <div>
                        <Label>Opérateur mobile money</Label>
                        <div className="flex gap-2 mt-1.5">
                          {ONLINE_PAYMENT_METHODS.map((m) => (
                            <Button
                              key={m.value}
                              type="button"
                              variant={onlineMethod === m.value ? 'default' : 'outline'}
                              onClick={() => setOnlineMethod(m.value)}
                            >
                              <Smartphone className="w-4 h-4" /> {m.label}
                            </Button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Vous confirmerez l&apos;opérateur exact sur la page de paiement PayDunya.
                        </p>
                      </div>

                      <div>
                        <Button
                          type="button"
                          loading={isInitiating}
                          disabled={!selectedEntry}
                          onClick={handlePayOnline}
                        >
                          Payer {selectedEntry ? formatFcfa(selectedEntry.expectedAmount - selectedEntry.paidAmount) : ''} maintenant
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Montant déclaré (FCFA) <span className="text-destructive">*</span></Label>
                          <Input className="mt-1.5" type="number" value={declaredAmount} onChange={(e) => setDeclaredAmount(e.target.value)} placeholder="0" required min="1" />
                        </div>
                        <div>
                          <Label>Mode de paiement <span className="text-destructive">*</span></Label>
                          <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'CASH' | 'BANK_TRANSFER')}>
                            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {MANUAL_PAYMENT_METHODS.map((m) => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Note <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                        <Textarea className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ajoutez une précision si nécessaire…" rows={3} />
                      </div>

                      <div>
                        <Label>Preuve de paiement <span className="text-destructive">*</span></Label>
                        <input type="file" id="proof-upload" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFileChange} className="hidden" />
                        <label htmlFor="proof-upload" className="flex items-center gap-2.5 px-4 py-2.5 mt-1.5 border border-dashed border-ds-border rounded-lg cursor-pointer text-sm text-muted-foreground bg-ds-secondary">
                          <Upload className="w-4 h-4 shrink-0" />
                          {selectedFile ? <span className="text-green-600 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {selectedFile.name}</span> : <span>Cliquez pour téléverser ou glissez-déposez (JPEG, PNG, WebP, PDF — max 5 Mo)</span>}
                        </label>
                      </div>

                      <div className="flex gap-3 pt-1">
                        <Button type="submit" loading={isDeclaring} disabled={!selectedEntry || !declaredAmount || !selectedFile}>Envoyer la déclaration</Button>
                        <Button type="button" variant="secondary" onClick={() => { setNote(''); setSelectedFile(null); setError(''); }}>Annuler</Button>
                      </div>
                    </form>
                  )}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
