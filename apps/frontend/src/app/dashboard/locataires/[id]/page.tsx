'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  tenantsApi,
  ACCOUNT_STATUS_LABELS,
  LEASE_STATUS_LABELS,
  PAYMENT_FREQUENCY_LABELS,
  type TenantSummary,
  type LeaseHistoryEntry,
} from '@/lib/tenants';
import { leasesApi } from '@/lib/leases';
import { ApiError } from '@/lib/api';
import { initiales } from '@/lib/format';
import { fcfa } from '@/lib/dashboard';
import './page.css';

const LEASE_STATUS_CLASSES: Record<string, string> = {
  ACTIVE: 'locd-lease-active',
  TERMINATED: 'locd-lease-terminated',
  EXPIRED: 'locd-lease-expired',
};

export default function LocataireDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [locataire, setLocataire] = useState<TenantSummary | null>(null);
  const [historique, setHistorique] = useState<LeaseHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const [terminating, setTerminating] = useState(false);

  const load = () => {
    setLoading(true);
    setErrorMessage('');
    Promise.all([tenantsApi.getById(id), tenantsApi.getLeaseHistory(id, 1, 50)])
      .then(([tenant, history]) => {
        setLocataire(tenant);
        setHistorique(history.data);
      })
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors du chargement du locataire'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const bailActif = useMemo(() => historique.find((h) => h.status === 'ACTIVE') ?? null, [historique]);

  const resilierBail = async () => {
    if (!bailActif) return;
    setTerminating(true);
    setErrorMessage('');
    try {
      await leasesApi.terminate(bailActif.id, { terminationReason: terminationReason.trim() || undefined });
      setShowTerminateModal(false);
      setTerminationReason('');
      load();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors de la résiliation du bail');
    } finally {
      setTerminating(false);
    }
  };

  if (loading) {
    return (
      <div className="locd-page">
        <div className="locd-skeleton" />
      </div>
    );
  }

  if (!locataire) {
    return (
      <div className="locd-page">
        <div className="locd-alert-error">{errorMessage || 'Locataire introuvable'}</div>
        <Link href="/dashboard/locataires" className="locd-btn-secondary">Retour aux locataires</Link>
      </div>
    );
  }

  return (
    <div className="locd-page">
      <div className="locd-header">
        <Link href="/dashboard/locataires" className="locd-back-btn" aria-label="Retour aux locataires">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </Link>
        <div className="locd-header-info">
          <div className="locd-avatar">{initiales(locataire.firstName, locataire.lastName, 'L')}</div>
          <div>
            <h1 className="locd-title">{locataire.firstName} {locataire.lastName}</h1>
            <p className="locd-subtitle">{ACCOUNT_STATUS_LABELS[locataire.accountStatus]}</p>
          </div>
        </div>
      </div>

      {errorMessage && <div className="locd-alert-error">{errorMessage}</div>}

      <div className="locd-grid">
        <div className="locd-card">
          <h2 className="locd-card-title">Coordonnées</h2>
          <div className="locd-info-row"><span>Email</span><strong>{locataire.email ?? '—'}</strong></div>
          <div className="locd-info-row"><span>Téléphone</span><strong>{locataire.phone ?? '—'}</strong></div>
          <div className="locd-info-row"><span>Locataire depuis</span><strong>{new Date(locataire.createdAt).toLocaleDateString('fr-FR')}</strong></div>
        </div>

        <div className="locd-card">
          <div className="locd-card-header-row">
            <h2 className="locd-card-title">Bail actif</h2>
            {bailActif && (
              <button type="button" className="locd-btn-danger" onClick={() => setShowTerminateModal(true)}>Résilier</button>
            )}
          </div>
          {bailActif ? (
            <>
              <div className="locd-info-row"><span>Bien</span><strong>{bailActif.property.neighborhood}, {bailActif.property.city}</strong></div>
              <div className="locd-info-row"><span>Loyer</span><strong>{fcfa(bailActif.monthlyRent)}</strong></div>
              <div className="locd-info-row"><span>Charges</span><strong>{fcfa(bailActif.monthlyCharges)}</strong></div>
              <div className="locd-info-row"><span>Fréquence</span><strong>{PAYMENT_FREQUENCY_LABELS[bailActif.paymentFrequency]}</strong></div>
              <div className="locd-info-row"><span>Dépôt de garantie</span><strong>{fcfa(bailActif.securityDeposit)}</strong></div>
              <div className="locd-info-row"><span>Début</span><strong>{new Date(bailActif.startDate).toLocaleDateString('fr-FR')}</strong></div>
              <div className="locd-info-row"><span>Fin</span><strong>{bailActif.endDate ? new Date(bailActif.endDate).toLocaleDateString('fr-FR') : 'Bail ouvert'}</strong></div>
            </>
          ) : (
            <p className="locd-empty-text">Aucun bail actif actuellement.</p>
          )}
        </div>
      </div>

      <div className="locd-card">
        <h2 className="locd-card-title">Historique des baux</h2>
        {historique.length === 0 ? (
          <p className="locd-empty-text">Aucun bail enregistré.</p>
        ) : (
          <div className="locd-history-list">
            {historique.map((h) => (
              <div key={h.id} className="locd-history-row">
                <div>
                  <p className="locd-history-address">{h.property.neighborhood}, {h.property.city}</p>
                  <p className="locd-history-dates">
                    {new Date(h.startDate).toLocaleDateString('fr-FR')} — {h.endDate ? new Date(h.endDate).toLocaleDateString('fr-FR') : 'ouvert'}
                  </p>
                </div>
                <span className="locd-history-rent">{fcfa(h.monthlyRent)}</span>
                <span className={`locd-lease-badge ${LEASE_STATUS_CLASSES[h.status]}`}>{LEASE_STATUS_LABELS[h.status]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showTerminateModal && (
        <div className="locd-modal-overlay" onClick={() => setShowTerminateModal(false)}>
          <div className="locd-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="locd-modal-title">Résilier le bail</h2>
            <p className="locd-modal-text">Le bien redeviendra vacant et sera à nouveau visible en annonce. Cette action est irréversible.</p>
            <textarea
              className="locd-modal-textarea"
              placeholder="Motif de résiliation (optionnel)"
              value={terminationReason}
              onChange={(e) => setTerminationReason(e.target.value)}
              maxLength={1000}
              rows={3}
            />
            <div className="locd-modal-actions">
              <button type="button" className="locd-btn-secondary" onClick={() => setShowTerminateModal(false)} disabled={terminating}>Annuler</button>
              <button type="button" className="locd-btn-danger" onClick={resilierBail} disabled={terminating}>
                {terminating ? 'Résiliation…' : 'Résilier le bail'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
