'use client';

import { useState } from 'react';
import Link from 'next/link';
import { paymentsApi, type Payment } from '@/lib/payments';
import { useApi, TTL } from '@/lib/use-api';
import { formatFcfa } from '@/lib/format';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente', PENDING_CONFIRMATION: 'À confirmer', PAID: 'Payé',
  PARTIAL: 'Partiel', LATE: 'En retard', OVERDUE: 'Impayé', REJECTED: 'Rejeté',
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PAID: { bg: '#DCFCE7', color: '#15803D' },
  PENDING: { bg: '#FEF3C7', color: '#D97706' },
  PENDING_CONFIRMATION: { bg: '#DBEAFE', color: '#1D4ED8' },
  PARTIAL: { bg: '#FEF3C7', color: '#D97706' },
  LATE: { bg: '#FEF3C7', color: '#D97706' },
  OVERDUE: { bg: '#FEE2E2', color: '#DC2626' },
  REJECTED: { bg: '#FEE2E2', color: '#DC2626' },
};
const METHOD_LABELS: Record<string, string> = {
  TMONEY: 'T-Money', FLOOZ: 'Flooz', CASH: 'Espèces', BANK_TRANSFER: 'Virement',
};

const HERO: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0A2650 0%, #0F4C81 60%, #081E41 100%)',
  borderRadius: 14, padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden',
};
const SK: React.CSSProperties = {
  height: 52, background: 'linear-gradient(90deg,#F3F4F6,#E5E7EB,#F3F4F6)',
  borderRadius: 8, margin: '8px 16px', animation: 'shimmer 1.4s infinite',
};
const ACT_BTN: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #E5E7EB',
  borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600,
  background: '#fff', color: '#374151', cursor: 'pointer', textDecoration: 'none',
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PaiementsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const url = statusFilter ? `/payments?status=${statusFilter}&limit=100` : '/payments?limit=100';
  const { data: res, loading } = useApi<{ data: Payment[]; total: number }>(url, TTL.LIST);
  const payments = res?.data ?? [];

  const [downloading, setDownloading] = useState<string | null>(null);
  const [dlError, setDlError] = useState('');

  async function downloadReceipt(id: string) {
    setDownloading(id); setDlError('');
    try {
      const blob = await paymentsApi.downloadReceipt(id);
      const url2 = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url2; a.download = `quittance-${id}.pdf`;
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url2); document.body.removeChild(a);
    } catch (err: unknown) {
      setDlError(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
    } finally { setDownloading(null); }
  }

  const TABS = [
    ['', 'Tous'],
    ['PENDING_CONFIRMATION', 'À confirmer'],
    ['PAID', 'Payés'],
    ['OVERDUE', 'Impayés'],
    ['REJECTED', 'Rejetés'],
  ];

  return (
    <div style={{ padding: '24px 28px' }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>

      {/* Hero */}
      <div style={HERO}>
        <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', fontSize: 80, opacity: 0.06, fontWeight: 900, color: '#fff', letterSpacing: -4, userSelect: 'none', pointerEvents: 'none' }}>WARAH</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Paiements</h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '4px 0 0' }}>
              Suivi des encaissements et déclarations locataires
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/dashboard/paiements/validation" style={{ ...ACT_BTN, background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
              Valider déclarations
            </Link>
            <Link href="/dashboard/paiements/manual" style={{ ...ACT_BTN, background: '#C9982E', color: '#fff', border: 'none' }}>
              + Paiement manuel
            </Link>
          </div>
        </div>
      </div>

      {dlError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#DC2626', fontSize: 13 }}>{dlError}</div>}

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(([v, l]) => (
          <button key={v} onClick={() => setStatusFilter(v)}
            style={{ background: statusFilter === v ? '#0F4C81' : '#fff', color: statusFilter === v ? '#fff' : '#374151', border: `1px solid ${statusFilter === v ? '#0F4C81' : '#D1D5DB'}`, borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 8 }}>{[1,2,3,4].map(i => <div key={i} style={SK} />)}</div>
        ) : payments.length === 0 ? (
          <div style={{ padding: '48px 32px', textAlign: 'center' }}>
            <svg style={{ width: 52, height: 52, margin: '0 auto 16px', display: 'block', color: '#D1D5DB' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 8 }}>Aucun paiement</div>
            <div style={{ fontSize: 13.5, color: '#6B7280' }}>Les paiements apparaîtront ici dès leur enregistrement.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {['Date', 'Locataire', 'Bien', 'Montant', 'Mode', 'Statut', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => {
                  const sc = STATUS_COLORS[p.status] ?? { bg: '#F3F4F6', color: '#6B7280' };
                  return (
                    <tr key={p.id} style={{ borderBottom: i < payments.length - 1 ? '1px solid #F9FAFB' : undefined }}>
                      <td style={{ padding: '14px 16px', fontSize: 12.5, color: '#6B7280', whiteSpace: 'nowrap' }}>{fmtDate(p.createdAt)}</td>
                      <td style={{ padding: '14px 16px' }}>
                        {p.lease?.tenant ? (
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>
                            {p.lease.tenant.firstName} {p.lease.tenant.lastName}
                          </div>
                        ) : <span style={{ color: '#D1D5DB' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {p.lease?.property ? (
                          <div style={{ fontSize: 12.5, color: '#374151' }}>{p.lease.property.address}</div>
                        ) : <span style={{ color: '#D1D5DB' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: 13, color: '#0A2650', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {formatFcfa(p.paidAmount)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12.5, color: '#6B7280' }}>
                        {p.paymentMethod ? (METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod) : '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: sc.bg, color: sc.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                          {STATUS_LABELS[p.status] ?? p.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {p.status === 'PAID' && (
                          <button onClick={() => downloadReceipt(p.id)} disabled={downloading === p.id}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#EFF6FF', color: '#0F4C81', border: '1px solid #BFDBFE', borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: downloading === p.id ? 'not-allowed' : 'pointer' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            {downloading === p.id ? '…' : 'Quittance'}
                          </button>
                        )}
                        {p.status === 'PENDING_CONFIRMATION' && (
                          <Link href="/dashboard/paiements/validation"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                            Valider
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
