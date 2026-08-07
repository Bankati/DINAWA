'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { propertiesApi, type Property } from '@/lib/properties';
import { tenantsApi, type LeaseHistoryEntry } from '@/lib/tenants';
import { leasesApi, type PaymentScheduleEntry } from '@/lib/leases';
import { paymentsApi, type ManualPaymentMethod } from '@/lib/payments';
import { ApiError } from '@/lib/api';
import { fcfa } from '@/lib/dashboard';
import { Dropdown } from '@/components/ui/dropdown';
import { FlowButton } from '@/components/ui/flow-button';
import './page.css';

const METHOD_OPTIONS: { value: ManualPaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'BANK_TRANSFER', label: 'Virement bancaire' },
];

const STEPS = [
  { number: 1, title: 'Bien' },
  { number: 2, title: 'Bail' },
  { number: 3, title: 'Échéance' },
  { number: 4, title: 'Détails' },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function NouveauPaiementPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [propertyId, setPropertyId] = useState('');

  const [leases, setLeases] = useState<LeaseHistoryEntry[]>([]);
  const [loadingLeases, setLoadingLeases] = useState(false);
  const [leaseId, setLeaseId] = useState('');

  const [entries, setEntries] = useState<PaymentScheduleEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [scheduleEntryId, setScheduleEntryId] = useState('');

  const [paidAmount, setPaidAmount] = useState('');
  const [paidAt, setPaidAt] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState<ManualPaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const [proof, setProof] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    propertiesApi.list().then((res) => setProperties(res.data)).catch(() => {}).finally(() => setLoadingProperties(false));
  }, []);

  const onPropertyChange = (id: string) => {
    setPropertyId(id);
    setLeaseId('');
    setEntries([]);
    setScheduleEntryId('');
    if (!id) { setLeases([]); return; }
    setLoadingLeases(true);
    tenantsApi.getPropertyLeaseHistory(id)
      .then((res) => setLeases(res.data))
      .catch(() => setLeases([]))
      .finally(() => setLoadingLeases(false));
  };

  const onLeaseChange = (id: string) => {
    setLeaseId(id);
    setScheduleEntryId('');
    if (!id) { setEntries([]); return; }
    setLoadingEntries(true);
    leasesApi.getSchedule(id)
      .then((res) => setEntries(res.filter((e) => e.status !== 'PAID')))
      .catch(() => setEntries([]))
      .finally(() => setLoadingEntries(false));
  };

  const onEntryChange = (id: string) => {
    setScheduleEntryId(id);
    const entry = entries.find((e) => e.id === id);
    if (entry) setPaidAmount(String(entry.expectedAmount - entry.paidAmount));
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1: return propertyId !== '';
      case 2: return leaseId !== '';
      case 3: return scheduleEntryId !== '';
      case 4: return Number(paidAmount) >= 1 && paidAt !== '';
      default: return true;
    }
  };

  const goNext = () => { if (isStepValid(currentStep) && currentStep < STEPS.length) setCurrentStep(currentStep + 1); };
  const goPrevious = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStepValid(4) || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await paymentsApi.createManualPayment(
        { scheduleEntryId, paidAmount: Number(paidAmount), paidAt, paymentMethod, note: note.trim() || undefined },
        proof ?? undefined,
      );
      router.push('/dashboard/paiements');
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pf-page">
      <div className="pf-header">
        <div>
          <h1 className="pf-title">Saisir un paiement</h1>
          <p className="pf-subtitle">Enregistrez un paiement reçu en espèces ou par virement</p>
        </div>
        <Link href="/dashboard/paiements" className="pf-btn-secondary">Annuler</Link>
      </div>

      <div className="pf-stepper">
        {STEPS.map((step) => (
          <div key={step.number} className="pf-step-wrap">
            <div className={`pf-step-dot${currentStep >= step.number ? ' active' : ''}`}>
              {currentStep > step.number ? '✓' : step.number}
            </div>
            <span className="pf-step-label">{step.title}</span>
          </div>
        ))}
      </div>

      {errorMessage && <div className="pf-alert-error">{errorMessage}</div>}

      <form onSubmit={onSubmit} className="pf-form">
        {currentStep === 1 && (
          <div className="pf-card">
            <h2 className="pf-card-title">Bien concerné</h2>
            {loadingProperties ? (
              <p className="pf-hint">Chargement…</p>
            ) : (
              <div className="pf-field">
                <label htmlFor="pf-property">Bien *</label>
                <Dropdown
                  id="pf-property"
                  value={propertyId}
                  onChange={onPropertyChange}
                  placeholder="Sélectionnez un bien"
                  options={properties.map((p) => ({ value: p.id, label: `${p.neighborhood}, ${p.city}` }))}
                />
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="pf-card">
            <h2 className="pf-card-title">Bail / locataire</h2>
            {loadingLeases ? (
              <p className="pf-hint">Chargement…</p>
            ) : leases.length === 0 ? (
              <p className="pf-hint">Aucun bail enregistré pour ce bien.</p>
            ) : (
              <div className="pf-field">
                <label htmlFor="pf-lease">Bail *</label>
                <Dropdown
                  id="pf-lease"
                  value={leaseId}
                  onChange={onLeaseChange}
                  placeholder="Sélectionnez un bail"
                  options={leases.map((l) => ({
                    value: l.id,
                    label: `${l.tenant.firstName} ${l.tenant.lastName} — ${l.status === 'ACTIVE' ? 'Bail actif' : 'Bail terminé'}`,
                  }))}
                />
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="pf-card">
            <h2 className="pf-card-title">Échéance</h2>
            {loadingEntries ? (
              <p className="pf-hint">Chargement…</p>
            ) : entries.length === 0 ? (
              <p className="pf-hint">Aucune échéance restant à payer sur ce bail.</p>
            ) : (
              <div className="pf-field">
                <label htmlFor="pf-entry">Échéance *</label>
                <Dropdown
                  id="pf-entry"
                  value={scheduleEntryId}
                  onChange={onEntryChange}
                  placeholder="Sélectionnez une échéance"
                  options={entries.map((e) => ({
                    value: e.id,
                    label: `${new Date(e.periodStart).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} — reste ${fcfa(e.expectedAmount - e.paidAmount)}`,
                  }))}
                />
              </div>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="pf-card">
            <h2 className="pf-card-title">Détails du paiement</h2>
            <div className="pf-row">
              <div className="pf-field">
                <label htmlFor="pf-amount">Montant reçu (FCFA) *</label>
                <input id="pf-amount" type="number" min={1} value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
              </div>
              <div className="pf-field">
                <label htmlFor="pf-date">Date du paiement *</label>
                <input id="pf-date" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
              </div>
            </div>
            <div className="pf-field">
              <label htmlFor="pf-method">Mode de paiement *</label>
              <Dropdown id="pf-method" value={paymentMethod} onChange={(v) => setPaymentMethod(v as ManualPaymentMethod)} options={METHOD_OPTIONS} />
              <p className="pf-hint">T-Money et Flooz arrivent avec Cashpay — pas encore disponibles ici.</p>
            </div>
            <div className="pf-field">
              <label htmlFor="pf-note">Note</label>
              <textarea id="pf-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Optionnel" />
            </div>
            <div className="pf-field">
              <label htmlFor="pf-proof">Justificatif</label>
              <input id="pf-proof" type="file" accept="image/*,.pdf" onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
            </div>
          </div>
        )}

        <div className="pf-nav">
          <button type="button" className="pf-btn-secondary" onClick={goPrevious} disabled={currentStep === 1}>Précédent</button>
          {currentStep < STEPS.length ? (
            <button key="next" type="button" className="pf-btn-primary" onClick={goNext} disabled={!isStepValid(currentStep)}>Suivant</button>
          ) : (
            <FlowButton key="submit" type="submit" disabled={isSubmitting || !isStepValid(4)} text={isSubmitting ? 'Enregistrement…' : 'Enregistrer le paiement'} />
          )}
        </div>
      </form>
    </div>
  );
}
