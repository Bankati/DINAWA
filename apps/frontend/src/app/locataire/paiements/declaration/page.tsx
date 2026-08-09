'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { paymentsApi } from '@/lib/payments';
import { formatFcfa } from '@/lib/format';
import '../../locataire.css';

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
  const [success, setSuccess] = useState('');

  const [dateCourante] = useState(() =>
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  );

  useEffect(() => {
    const raw = localStorage.getItem('warah_user');
    const userId = raw ? JSON.parse(raw).id : null;
    if (!userId) { setLeaseError("Impossible de récupérer l'identifiant utilisateur."); setLoadingLease(false); return; }

    api.get<{ data: LeaseEntry[]; total: number }>(`/tenants/${userId}/leases/history?limit=10`)
      .then((res) => {
        const active = res.data.find((l) => l.status === 'ACTIVE');
        if (!active) { setLeaseError("Aucun bail actif trouvé. Contactez votre propriétaire."); return; }
        setActiveLease(active);
        return api.get<ScheduleEntry[]>(`/leases/${active.id}/schedule`);
      })
      .then((entries) => {
        if (!entries) return;
        // Afficher uniquement les échéances non payées, de la plus ancienne à la plus récente
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
    if (entry) {
      setDeclaredAmount(String(entry.expectedAmount - entry.paidAmount));
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Le fichier ne doit pas dépasser 5 Mo'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setError('Formats acceptés : JPEG, PNG, WebP, PDF'); return;
    }
    setSelectedFile(file);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLease || !selectedEntry) return;
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      await paymentsApi.createDeclaration({
        scheduleEntryId: selectedEntry.id,
        declaredAmount: Number(declaredAmount),
        declaredAt: new Date().toISOString(),
        declaredMethod: paymentMethod,
        note: note.trim() || undefined,
      }, selectedFile || undefined);
      setSuccess('Déclaration envoyée avec succès. Elle sera examinée par votre propriétaire.');
      setNote('');
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
        {loadingLease && (
          <div className="loc-card" style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px 0' }}>
            Chargement de votre bail…
          </div>
        )}

        {leaseError && !loadingLease && (
          <div className="loc-alert loc-alert-error">
            <span>{leaseError}</span>
          </div>
        )}

        {error && <div className="loc-alert loc-alert-error"><span>{error}</span><button onClick={() => setError('')}>×</button></div>}
        {success && <div className="loc-alert loc-alert-success"><span>{success}</span><button onClick={() => setSuccess('')}>×</button></div>}

        {!loadingLease && activeLease && (
          <>
            {/* Info bail */}
            <div className="loc-card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, #0A2650 0%, #0F4C81 60%, #081E41 100%)', color: '#fff', border: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}>
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{activeLease.property.neighborhood}, {activeLease.property.city}</div>
                  <div style={{ fontSize: 12.5, opacity: 0.7 }}>{activeLease.property.address} · Loyer {formatFcfa(activeLease.monthlyRent)}/mois</div>
                </div>
              </div>
            </div>

            {schedule.length === 0 ? (
              <div className="loc-card" style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 44, height: 44, margin: '0 auto 12px', display: 'block', color: '#D1D5DB' }}>
                  <circle cx="12" cy="12" r="10"/><polyline points="20 6 9 17 4 12"/>
                </svg>
                <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>Aucune échéance en attente</div>
                <div style={{ fontSize: 13 }}>Tous vos paiements sont à jour.</div>
              </div>
            ) : (
              <div className="loc-card">
                <div className="loc-card-header">
                  <h2 className="loc-card-title">Informations du paiement</h2>
                </div>

                <form onSubmit={handleSubmit} className="loc-form">
                  {/* Sélection de l'échéance */}
                  <div className="loc-field">
                    <label className="loc-label">Échéance à payer</label>
                    <select
                      className="loc-select"
                      value={selectedEntry?.id ?? ''}
                      onChange={(e) => handleEntryChange(e.target.value)}
                      required
                    >
                      {schedule.map((entry) => {
                        const due = new Date(entry.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
                        const remaining = entry.expectedAmount - entry.paidAmount;
                        return (
                          <option key={entry.id} value={entry.id}>
                            Échéance du {due} — {formatFcfa(remaining)} restant ({STATUS_LABEL[entry.status] ?? entry.status})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Résumé de l'échéance sélectionnée */}
                  {selectedEntry && (
                    <div style={{ background: '#F0F4FF', border: '1px solid #DBEAFE', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
                      <div>
                        <div style={{ color: '#6B7280', marginBottom: 2 }}>Montant attendu</div>
                        <div style={{ fontWeight: 700, color: '#0F4C81' }}>{formatFcfa(selectedEntry.expectedAmount)}</div>
                      </div>
                      {selectedEntry.paidAmount > 0 && (
                        <div>
                          <div style={{ color: '#6B7280', marginBottom: 2 }}>Déjà payé</div>
                          <div style={{ fontWeight: 700, color: '#10B981' }}>{formatFcfa(selectedEntry.paidAmount)}</div>
                        </div>
                      )}
                      <div>
                        <div style={{ color: '#6B7280', marginBottom: 2 }}>Restant à payer</div>
                        <div style={{ fontWeight: 700, color: '#DC2626' }}>{formatFcfa(selectedEntry.expectedAmount - selectedEntry.paidAmount)}</div>
                      </div>
                      <div>
                        <div style={{ color: '#6B7280', marginBottom: 2 }}>Date limite</div>
                        <div style={{ fontWeight: 600 }}>{new Date(selectedEntry.dueDate).toLocaleDateString('fr-FR')}</div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="loc-field">
                      <label className="loc-label">Montant déclaré (FCFA)</label>
                      <input
                        className="loc-input"
                        type="number"
                        value={declaredAmount}
                        onChange={(e) => setDeclaredAmount(e.target.value)}
                        placeholder="0"
                        required
                        min="1"
                      />
                    </div>
                    <div className="loc-field">
                      <label className="loc-label">Mode de paiement</label>
                      <select
                        className="loc-select"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'BANK_TRANSFER')}
                        required
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="loc-field">
                    <label className="loc-label">Note <span className="loc-label-hint">(optionnel)</span></label>
                    <textarea
                      className="loc-textarea"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Ajoutez une précision si nécessaire..."
                      rows={3}
                    />
                  </div>

                  <div className="loc-field">
                    <label className="loc-label">Preuve de paiement <span style={{ color: '#DC2626' }}>*</span></label>
                    <input type="file" id="proof-upload" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFileChange} style={{ display: 'none' }} />
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
                    <button type="submit" className="loc-btn-primary" disabled={isLoading || !selectedEntry || !declaredAmount || !selectedFile}>
                      {isLoading ? 'Envoi en cours…' : 'Envoyer la déclaration'}
                    </button>
                    <button type="button" className="loc-btn-secondary" onClick={() => { setNote(''); setSelectedFile(null); setError(''); }}>
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
