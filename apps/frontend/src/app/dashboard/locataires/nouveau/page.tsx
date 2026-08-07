'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { tenantsApi, PAYMENT_FREQUENCY_LABELS, type PaymentFrequency } from '@/lib/tenants';
import { propertiesApi, type Property } from '@/lib/properties';
import { ApiError } from '@/lib/api';
import { Dropdown } from '@/components/ui/dropdown';
import { FlowButton } from '@/components/ui/flow-button';
import './page.css';

const FREQUENCY_OPTIONS = (Object.entries(PAYMENT_FREQUENCY_LABELS) as [PaymentFrequency, string][]).map(([value, label]) => ({ value, label }));

const STEPS = [
  { number: 1, title: 'Identité' },
  { number: 2, title: 'Bien' },
  { number: 3, title: 'Bail' },
];

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  propertyId: string;
  monthlyRent: string;
  monthlyCharges: string;
  paymentFrequency: PaymentFrequency;
  securityDeposit: string;
  startDate: string;
  endDate: string;
  depositReturnConditions: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  propertyId: '',
  monthlyRent: '',
  monthlyCharges: '0',
  paymentFrequency: 'MONTHLY',
  securityDeposit: '0',
  startDate: today(),
  endDate: '',
  depositReturnConditions: '',
};

export default function NouveauLocatairePage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [currentStep, setCurrentStep] = useState(1);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<{ invitationUrl: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    propertiesApi
      .list('VACANT')
      .then((res) => setProperties(res.data))
      .catch(() => {})
      .finally(() => setLoadingProperties(false));
  }, []);

  const setField = (field: keyof FormState, value: string) => setForm((f) => ({ ...f, [field]: value }));
  const markTouched = (field: string) => setTouched((t) => ({ ...t, [field]: true }));

  const onPropertyChange = (propertyId: string) => {
    setField('propertyId', propertyId);
    const bien = properties.find((p) => p.id === propertyId);
    if (bien) {
      setForm((f) => ({ ...f, propertyId, monthlyRent: String(bien.monthlyRent), monthlyCharges: String(bien.monthlyCharges) }));
    }
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return (
          form.firstName.trim() !== '' &&
          form.lastName.trim() !== '' &&
          /^\S+@\S+\.\S+$/.test(form.email) &&
          /^\+?\d{8,15}$/.test(form.phone)
        );
      case 2:
        return form.propertyId !== '';
      case 3:
        return Number(form.monthlyRent) >= 1 && form.startDate !== '';
      default:
        return true;
    }
  };

  const goNext = () => {
    if (isStepValid(currentStep) && currentStep < STEPS.length) setCurrentStep(currentStep + 1);
  };
  const goPrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStepValid(1) || !isStepValid(2) || !isStepValid(3) || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await tenantsApi.invite({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        propertyId: form.propertyId,
        monthlyRent: Number(form.monthlyRent),
        monthlyCharges: Number(form.monthlyCharges) || 0,
        paymentFrequency: form.paymentFrequency,
        securityDeposit: Number(form.securityDeposit) || 0,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        depositReturnConditions: form.depositReturnConditions.trim() || undefined,
      });
      setResult({ invitationUrl: res.invitationUrl });
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = () => {
    if (!result?.invitationUrl) return;
    navigator.clipboard.writeText(result.invitationUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (result) {
    return (
      <div className="loc-form-page">
        <div className="loc-success-card">
          <div className="loc-success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h1 className="loc-form-title">Locataire invité avec succès</h1>
          {result.invitationUrl ? (
            <>
              <p className="loc-form-subtitle">Partagez ce lien d&apos;activation avec le locataire :</p>
              <div className="loc-invite-link-box">
                <span>{result.invitationUrl}</span>
                <button type="button" className="loc-btn-secondary" onClick={copyLink}>{copied ? 'Copié !' : 'Copier'}</button>
              </div>
            </>
          ) : (
            <p className="loc-form-subtitle">Ce locataire avait déjà un compte WARAH — le nouveau bail a été créé directement sur son compte existant.</p>
          )}
          <Link href="/dashboard/locataires" className="loc-btn-primary">Retour à la liste</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="loc-form-page">
      <div className="loc-form-header">
        <div>
          <h1 className="loc-form-title">Nouveau locataire</h1>
          <p className="loc-form-subtitle">Invitez un locataire et créez son bail</p>
        </div>
        <Link href="/dashboard/locataires" className="loc-btn-secondary">Annuler</Link>
      </div>

      <div className="loc-stepper">
        {STEPS.map((step) => (
          <div key={step.number} className="loc-step-wrap">
            <div className={`loc-step-dot${currentStep >= step.number ? ' active' : ''}`}>
              {currentStep > step.number ? '✓' : step.number}
            </div>
            <span className="loc-step-label">{step.title}</span>
          </div>
        ))}
      </div>

      {errorMessage && <div className="loc-alert-error">{errorMessage}</div>}

      <form onSubmit={onSubmit} className="loc-form">
        {currentStep === 1 && (
          <div className="loc-form-card">
            <h2 className="loc-form-card-title">Identité et contact</h2>
            <div className="loc-form-row">
              <div className="loc-field">
                <label htmlFor="lf-firstname">Prénom *</label>
                <input id="lf-firstname" type="text" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} onBlur={() => markTouched('firstName')} maxLength={100} placeholder="Jean" />
                {touched.firstName && form.firstName.trim() === '' && <p className="loc-field-error">Le prénom est requis</p>}
              </div>
              <div className="loc-field">
                <label htmlFor="lf-lastname">Nom *</label>
                <input id="lf-lastname" type="text" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} onBlur={() => markTouched('lastName')} maxLength={100} placeholder="Dupont" />
                {touched.lastName && form.lastName.trim() === '' && <p className="loc-field-error">Le nom est requis</p>}
              </div>
            </div>
            <div className="loc-field">
              <label htmlFor="lf-email">Email *</label>
              <input id="lf-email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} onBlur={() => markTouched('email')} placeholder="locataire@email.com" />
              {touched.email && !/^\S+@\S+\.\S+$/.test(form.email) && <p className="loc-field-error">Email invalide</p>}
            </div>
            <div className="loc-field">
              <label htmlFor="lf-phone">Téléphone *</label>
              <input id="lf-phone" type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} onBlur={() => markTouched('phone')} placeholder="+228 XX XX XX XX" />
              {touched.phone && !/^\+?\d{8,15}$/.test(form.phone) && <p className="loc-field-error">Numéro invalide</p>}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="loc-form-card">
            <h2 className="loc-form-card-title">Bien associé</h2>
            {loadingProperties ? (
              <p className="loc-form-hint">Chargement de vos biens…</p>
            ) : properties.length === 0 ? (
              <p className="loc-field-error">Aucun bien vacant disponible. <Link href="/dashboard/biens/nouveau">Ajoutez un bien</Link> avant d&apos;inviter un locataire.</p>
            ) : (
              <div className="loc-field">
                <label htmlFor="lf-property">Bien *</label>
                <Dropdown
                  id="lf-property"
                  value={form.propertyId}
                  onChange={(v) => { onPropertyChange(v); markTouched('propertyId'); }}
                  placeholder="Sélectionnez un bien vacant"
                  options={properties.map((p) => ({ value: p.id, label: `${p.neighborhood}, ${p.city} — ${p.monthlyRent.toLocaleString('fr-FR')} FCFA` }))}
                />
                {touched.propertyId && form.propertyId === '' && <p className="loc-field-error">Le bien est requis</p>}
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="loc-form-card">
            <h2 className="loc-form-card-title">Conditions du bail</h2>
            <div className="loc-form-row">
              <div className="loc-field">
                <label htmlFor="lf-rent">Loyer mensuel (FCFA) *</label>
                <input id="lf-rent" type="number" min={1} value={form.monthlyRent} onChange={(e) => setField('monthlyRent', e.target.value)} onBlur={() => markTouched('monthlyRent')} />
                {touched.monthlyRent && Number(form.monthlyRent) < 1 && <p className="loc-field-error">Le loyer est requis</p>}
              </div>
              <div className="loc-field">
                <label htmlFor="lf-charges">Charges mensuelles (FCFA)</label>
                <input id="lf-charges" type="number" min={0} value={form.monthlyCharges} onChange={(e) => setField('monthlyCharges', e.target.value)} />
              </div>
            </div>
            <div className="loc-form-row">
              <div className="loc-field">
                <label htmlFor="lf-frequency">Fréquence de paiement *</label>
                <Dropdown
                  id="lf-frequency"
                  value={form.paymentFrequency}
                  onChange={(v) => setField('paymentFrequency', v as PaymentFrequency)}
                  options={FREQUENCY_OPTIONS}
                />
              </div>
              <div className="loc-field">
                <label htmlFor="lf-deposit">Dépôt de garantie (FCFA)</label>
                <input id="lf-deposit" type="number" min={0} value={form.securityDeposit} onChange={(e) => setField('securityDeposit', e.target.value)} />
              </div>
            </div>
            <div className="loc-form-row">
              <div className="loc-field">
                <label htmlFor="lf-start">Date de début *</label>
                <input id="lf-start" type="date" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} onBlur={() => markTouched('startDate')} />
              </div>
              <div className="loc-field">
                <label htmlFor="lf-end">Date de fin</label>
                <input id="lf-end" type="date" value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} />
                <p className="loc-form-hint">Laissez vide pour un bail ouvert</p>
              </div>
            </div>
            <div className="loc-field">
              <label htmlFor="lf-conditions">Conditions de restitution du dépôt</label>
              <textarea id="lf-conditions" rows={3} value={form.depositReturnConditions} onChange={(e) => setField('depositReturnConditions', e.target.value)} maxLength={2000} placeholder="Optionnel" />
            </div>
          </div>
        )}

        <div className="loc-nav">
          <button type="button" className="loc-btn-secondary" onClick={goPrevious} disabled={currentStep === 1}>Précédent</button>
          {currentStep < STEPS.length ? (
            <button key="next" type="button" className="loc-btn-primary" onClick={goNext} disabled={!isStepValid(currentStep)}>Suivant</button>
          ) : (
            <FlowButton key="submit" type="submit" disabled={isSubmitting} text={isSubmitting ? 'Envoi…' : 'Inviter le locataire'} />
          )}
        </div>
      </form>
    </div>
  );
}
