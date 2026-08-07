'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  paymentsApi,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_BADGE_CLASSES,
  PAYMENT_STATUS_DOT_CLASSES,
  type Payment,
  type PaymentStatus,
} from '@/lib/payments';
import { ApiError } from '@/lib/api';
import { fcfa } from '@/lib/dashboard';
import { exportToCsv } from '@/lib/csv-export';
import './page.css';

const STATUS_TABS: { value: PaymentStatus | ''; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'PENDING_CONFIRMATION', label: 'À confirmer' },
  { value: 'PAID', label: 'Payés' },
  { value: 'LATE', label: 'En retard' },
  { value: 'OVERDUE', label: 'Impayés' },
  { value: 'REJECTED', label: 'Rejetés' },
];

export default function PaiementsListPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [exporting, setExporting] = useState(false);

  const limit = 20;

  const load = useCallback(() => {
    setLoading(true);
    setErrorMessage('');
    paymentsApi
      .getPayments({ page, limit, status: statusFilter || undefined })
      .then((res) => {
        setPayments(res.data);
        setTotal(res.total);
      })
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors du chargement des paiements'))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const changeStatusFilter = (value: PaymentStatus | '') => {
    setStatusFilter(value);
    setPage(1);
  };

  const confirmer = async (payment: Payment) => {
    setActioningId(payment.id);
    setErrorMessage('');
    try {
      await paymentsApi.confirmPayment(payment.id);
      setSuccessMessage('Paiement confirmé');
      load();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Erreur lors de la confirmation");
    } finally {
      setActioningId(null);
    }
  };

  const rejeter = async () => {
    if (!rejectTarget || !rejectionReason.trim()) return;
    setActioningId(rejectTarget.id);
    setErrorMessage('');
    try {
      await paymentsApi.rejectPayment(rejectTarget.id, { rejectionReason: rejectionReason.trim() });
      setRejectTarget(null);
      setRejectionReason('');
      setSuccessMessage('Paiement rejeté');
      load();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors du rejet');
    } finally {
      setActioningId(null);
    }
  };

  const telechargerQuittance = async (payment: Payment) => {
    try {
      const blob = await paymentsApi.downloadReceipt(payment.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quittance-${payment.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors du téléchargement de la quittance');
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    setErrorMessage('');
    try {
      const res = await paymentsApi.getPayments({ status: statusFilter || undefined, limit: 500 });
      exportToCsv(
        'paiements',
        [
          { key: 'date', label: 'Date', value: (p: Payment) => new Date(p.paidAt ?? p.createdAt).toLocaleDateString('fr-FR') },
          { key: 'locataire', label: 'Locataire', value: (p: Payment) => p.lease?.tenant ? `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}` : '' },
          { key: 'bien', label: 'Bien', value: (p: Payment) => p.lease?.property ? `${p.lease.property.neighborhood}, ${p.lease.property.city}` : '' },
          { key: 'montant', label: 'Montant (FCFA)', value: (p: Payment) => p.paidAmount },
          { key: 'mode', label: 'Mode', value: (p: Payment) => p.paymentMethod ? PAYMENT_METHOD_LABELS[p.paymentMethod] : '' },
          { key: 'statut', label: 'Statut', value: (p: Payment) => PAYMENT_STATUS_LABELS[p.status] },
        ],
        res.data,
      );
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="pmt-page">
      <div className="pmt-header">
        <div>
          <h1 className="pmt-title">Paiements</h1>
          <p className="pmt-subtitle">Historique et suivi des paiements de vos locataires</p>
        </div>
        <div className="pmt-header-actions">
          <button type="button" className="pmt-btn-secondary" onClick={exportCsv} disabled={exporting}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            {exporting ? 'Export…' : 'Exporter'}
          </button>
          <Link href="/dashboard/paiements/rappels" className="pmt-btn-secondary">Rappels</Link>
          <Link href="/dashboard/paiements/nouveau" className="pmt-btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Saisir un paiement
          </Link>
        </div>
      </div>

      {errorMessage && <div className="pmt-alert-error">{errorMessage}</div>}
      {successMessage && <div className="pmt-alert-success">{successMessage}</div>}

      <div className="pmt-tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value || 'ALL'}
            type="button"
            className={`pmt-tab${statusFilter === tab.value ? ' active' : ''}`}
            onClick={() => changeStatusFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="pmt-table-card">
          {[1, 2, 3].map((i) => <div key={i} className="pmt-row-skeleton" />)}
        </div>
      ) : payments.length === 0 ? (
        <div className="pmt-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
          <h3>Aucun paiement</h3>
          <p>Aucun paiement ne correspond à ce filtre.</p>
        </div>
      ) : (
        <>
          <div className="pmt-table-card">
            <div className="pmt-table-header-row">
              <span>Date</span>
              <span>Locataire</span>
              <span>Bien</span>
              <span>Montant</span>
              <span>Mode</span>
              <span>Statut</span>
              <span>Actions</span>
            </div>
            {payments.map((p) => (
              <div key={p.id} className="pmt-table-row">
                <span className="pmt-row-date">{new Date(p.paidAt ?? p.createdAt).toLocaleDateString('fr-FR')}</span>
                <span className="pmt-row-tenant">{p.lease?.tenant ? `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}` : '—'}</span>
                <span className="pmt-row-property">{p.lease?.property ? `${p.lease.property.neighborhood}, ${p.lease.property.city}` : '—'}</span>
                <span className="pmt-row-amount">{fcfa(p.paidAmount)}</span>
                <span className="pmt-row-method">{p.paymentMethod ? PAYMENT_METHOD_LABELS[p.paymentMethod] : '—'}</span>
                <span className={`pmt-badge ${PAYMENT_STATUS_BADGE_CLASSES[p.status]}`}>
                  <span className={`pmt-badge-dot ${PAYMENT_STATUS_DOT_CLASSES[p.status]}`} />
                  {PAYMENT_STATUS_LABELS[p.status]}
                </span>
                <span className="pmt-row-actions">
                  {p.status === 'PENDING_CONFIRMATION' && (
                    <>
                      <button type="button" className="pmt-action-btn pmt-action-confirm" disabled={actioningId === p.id} onClick={() => confirmer(p)}>Confirmer</button>
                      <button type="button" className="pmt-action-btn pmt-action-reject" disabled={actioningId === p.id} onClick={() => setRejectTarget(p)}>Rejeter</button>
                    </>
                  )}
                  {p.status === 'PAID' && (
                    <button type="button" className="pmt-action-btn" onClick={() => telechargerQuittance(p)}>Quittance</button>
                  )}
                  {p.status === 'REJECTED' && p.rejectionReason && (
                    <span className="pmt-reject-reason" title={p.rejectionReason}>{p.rejectionReason}</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="pmt-pagination">
            <button type="button" className="pmt-page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</button>
            <span className="pmt-page-info">Page {page} / {totalPages}</span>
            <button type="button" className="pmt-page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</button>
          </div>
        </>
      )}

      {rejectTarget && (
        <div className="pmt-modal-overlay" onClick={() => setRejectTarget(null)}>
          <div className="pmt-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="pmt-modal-title">Rejeter le paiement</h2>
            <p className="pmt-modal-text">Motif du rejet de ce paiement de {fcfa(rejectTarget.paidAmount)} :</p>
            <textarea
              className="pmt-modal-textarea"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Raison du rejet…"
            />
            <div className="pmt-modal-actions">
              <button type="button" className="pmt-btn-secondary" onClick={() => setRejectTarget(null)}>Annuler</button>
              <button type="button" className="pmt-btn-danger" disabled={!rejectionReason.trim() || actioningId === rejectTarget.id} onClick={rejeter}>
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
