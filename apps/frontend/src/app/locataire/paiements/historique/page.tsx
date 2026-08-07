'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { paymentsApi, type Payment } from '@/lib/payments';
import { ApiError } from '@/lib/auth-context';
import { formatFcfa } from '@/lib/format';
import '../../locataire.css';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  PAID: 'Payé',
  PARTIAL: 'Partiel',
  LATE: 'En retard',
  OVERDUE: 'Impayé',
  REJECTED: 'Rejeté',
  PENDING_CONFIRMATION: 'À confirmer',
};

const STATUS_CLASS: Record<string, string> = {
  PAID: 'loc-badge-paid',
  PENDING: 'loc-badge-pending',
  PENDING_CONFIRMATION: 'loc-badge-pending',
  PARTIAL: 'loc-badge-pending',
  LATE: 'loc-badge-pending',
  OVERDUE: 'loc-badge-rejected',
  REJECTED: 'loc-badge-rejected',
};

const METHOD_LABELS: Record<string, string> = {
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Virement',
  CASH: 'Espèces',
  CHECK: 'Chèque',
  TMONEY: 'T-Money',
  FLOOZ: 'Flooz',
};

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [dateCourante] = useState(() =>
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  );

  useEffect(() => {
    paymentsApi.getPayments()
      .then((res) => setPayments(res.data || []))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Erreur de chargement'))
      .finally(() => setIsLoading(false));
  }, []);

  const downloadReceipt = async (paymentId: string) => {
    try {
      const blob = await paymentsApi.downloadReceipt(paymentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quittance-${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erreur lors du téléchargement');
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
        <h1 className="loc-hero-title">Historique des paiements</h1>
        <p className="loc-hero-sub">Consultez et téléchargez vos quittances de loyer</p>
      </div>

      <div className="loc-body">
        {error && (
          <div className="loc-alert loc-alert-error">
            <span>{error}</span>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        <div className="loc-card">
          <div className="loc-card-header">
            <h2 className="loc-card-title">Mes paiements</h2>
            <Link href="/locataire/paiements/declaration" className="loc-dl-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Déclarer un paiement
            </Link>
          </div>

          {isLoading ? (
            <><div className="loc-sk" /><div className="loc-sk" /><div className="loc-sk" /></>
          ) : payments.length === 0 ? (
            <div className="loc-empty">
              <svg className="loc-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              <p className="loc-empty-title">Aucun paiement enregistré</p>
              <p className="loc-empty-desc">Votre historique de paiements apparaîtra ici.</p>
            </div>
          ) : (
            <div className="loc-table-wrap">
              <table className="loc-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Bien</th>
                    <th>Montant</th>
                    <th>Mode</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td style={{ color: '#6B7280', fontSize: 12 }}>{formatDate(p.createdAt)}</td>
                      <td style={{ fontWeight: 500 }}>{p.lease?.property?.address || '—'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatFcfa(p.paidAmount)}
                      </td>
                      <td style={{ color: '#6B7280' }}>{(p.paymentMethod && METHOD_LABELS[p.paymentMethod]) || p.paymentMethod || '—'}</td>
                      <td>
                        <span className={`loc-badge ${STATUS_CLASS[p.status] ?? 'loc-badge-default'}`}>
                          <span className="loc-badge-dot" />
                          {STATUS_LABELS[p.status] || p.status}
                        </span>
                      </td>
                      <td>
                        {p.status === 'PAID' && (
                          <button className="loc-dl-btn" onClick={() => downloadReceipt(p.id)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Quittance
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
