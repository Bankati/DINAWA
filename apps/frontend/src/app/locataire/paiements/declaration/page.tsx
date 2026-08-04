'use client';

import { useState } from 'react';
import { paymentsApi, type CreatePaymentDeclarationDto } from '@/lib/payments';
import '../../locataire.css';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'BANK_TRANSFER', label: 'Virement bancaire' },
];

const EMPTY_FORM: CreatePaymentDeclarationDto = {
  leaseId: '',
  scheduleEntryId: '',
  declaredAmount: 0,
  paymentMethod: 'CASH',
  note: '',
};

export default function PaymentDeclarationPage() {
  const [formData, setFormData] = useState<CreatePaymentDeclarationDto>(EMPTY_FORM);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [dateCourante] = useState(() =>
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Le fichier ne doit pas dépasser 5 Mo'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setError('Formats acceptés : JPEG, PNG, WebP, PDF');
      return;
    }
    setSelectedFile(file);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      await paymentsApi.createDeclaration(formData, selectedFile || undefined);
      setSuccess('Déclaration envoyée avec succès. Elle sera examinée par votre propriétaire.');
      setFormData(EMPTY_FORM);
      setSelectedFile(null);
      setTimeout(() => setSuccess(''), 7000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la déclaration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="loc-page">
      {/* ── Hero ── */}
      <div className="loc-hero">
        <div className="loc-hero-meta">
          <span className="loc-date-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {dateCourante}
          </span>
          <span className="loc-role-badge">Locataire</span>
        </div>
        <h1 className="loc-hero-title">Déclaration de paiement</h1>
        <p className="loc-hero-sub">Déclarez votre paiement et joignez la preuve de transaction</p>
      </div>

      <div className="loc-body">
        {error && (
          <div className="loc-alert loc-alert-error">
            <span>{error}</span>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}
        {success && (
          <div className="loc-alert loc-alert-success">
            <span>{success}</span>
            <button onClick={() => setSuccess('')}>×</button>
          </div>
        )}

        <div className="loc-card">
          <div className="loc-card-header">
            <h2 className="loc-card-title">Informations du paiement</h2>
          </div>

          <form onSubmit={handleSubmit} className="loc-form">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="loc-field">
                <label className="loc-label">
                  ID du bail
                  <span className="loc-label-hint">(requis)</span>
                </label>
                <input
                  className="loc-input"
                  type="text"
                  value={formData.leaseId}
                  onChange={(e) => setFormData({ ...formData, leaseId: e.target.value })}
                  placeholder="ex. clxxx..."
                  required
                />
              </div>

              <div className="loc-field">
                <label className="loc-label">
                  ID de l&apos;échéance
                  <span className="loc-label-hint">(requis)</span>
                </label>
                <input
                  className="loc-input"
                  type="text"
                  value={formData.scheduleEntryId}
                  onChange={(e) => setFormData({ ...formData, scheduleEntryId: e.target.value })}
                  placeholder="ex. clyyy..."
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="loc-field">
                <label className="loc-label">Montant déclaré (FCFA)</label>
                <input
                  className="loc-input"
                  type="number"
                  value={formData.declaredAmount || ''}
                  onChange={(e) => setFormData({ ...formData, declaredAmount: Number(e.target.value) })}
                  placeholder="0"
                  required
                  min="0"
                />
              </div>

              <div className="loc-field">
                <label className="loc-label">Mode de paiement</label>
                <select
                  className="loc-select"
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  required
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="loc-field">
              <label className="loc-label">
                Note <span className="loc-label-hint">(optionnel)</span>
              </label>
              <textarea
                className="loc-textarea"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Ajoutez une précision si nécessaire..."
                rows={3}
              />
            </div>

            <div className="loc-field">
              <label className="loc-label">Preuve de paiement</label>
              <input
                type="file"
                id="proof-upload"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="proof-upload" className="loc-dropzone">
                <svg className="loc-dropzone-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                </svg>
                <p className="loc-dropzone-text">Cliquez pour téléverser ou glissez-déposez</p>
                <p className="loc-dropzone-hint">JPEG, PNG, WebP, PDF — max 5 Mo</p>
                {selectedFile && (
                  <p className="loc-file-ok">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}><polyline points="20 6 9 17 4 12"/></svg>
                    {selectedFile.name}
                  </p>
                )}
              </label>
            </div>

            <div className="loc-form-actions">
              <button type="submit" className="loc-btn-primary" disabled={isLoading}>
                {isLoading ? 'Envoi en cours…' : 'Envoyer la déclaration'}
              </button>
              <button
                type="button"
                className="loc-btn-secondary"
                onClick={() => { setFormData(EMPTY_FORM); setSelectedFile(null); }}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
