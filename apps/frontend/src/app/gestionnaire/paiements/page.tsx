'use client';

import { useState } from 'react';
import Link from 'next/link';
import { paymentsApi, type Payment, type PaymentDeclaration } from '@/lib/payments';
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

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function GestionnairePaiementsPage() {
  const [tab, setTab] = useState<'paiements' | 'declarations'>('declarations');
  const [statusFilter, setStatusFilter] = useState('');

  const paymentsUrl = statusFilter ? `/payments?status=${statusFilter}&limit=100` : '/payments?limit=100';
  const { data: paymentsRes, loading: pLoading } = useApi<{ data: Payment[]; total: number }>(paymentsUrl, TTL.LIST);
  const payments = paymentsRes?.data ?? [];

  const { data: declRes, loading: dLoading, reload } = useApi<{ data: PaymentDeclaration[]; total: number }>(
    '/payments?source=TENANT_DECLARATION&status=PENDING_CONFIRMATION&limit=50', TTL.LIST
  );
  const declarations = declRes?.data ?? [];

  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  async function confirm(id: string) {
    setProcessing(id); setErr('');
    try {
      await paymentsApi.confirmPayment(id);
      setMsg('Paiement confirmé');
      setTimeout(() => setMsg(''), 4000);
      reload();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Erreur'); }
    finally { setProcessing(null); }
  }

  async function reject() {
    if (!rejectId || !rejectReason) return;
    setProcessing(rejectId); setErr('');
    try {
      await paymentsApi.rejectPayment(rejectId, { rejectionReason: rejectReason });
      setRejectId(null); setRejectReason('');
      setMsg('Paiement rejeté');
      setTimeout(() => setMsg(''), 4000);
      reload();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Erreur'); }
    finally { setProcessing(null); }
  }

  async function downloadReceipt(id: string) {
    setDownloading(id);
    try {
      const blob = await paymentsApi.downloadReceipt(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `quittance-${id}.pdf`;
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Erreur téléchargement'); }
    finally { setDownloading(null); }
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>

      {/* Hero */}
      <div style={HERO}>
        <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', fontSize: 80, opacity: 0.06, fontWeight: 900, color: '#fff', letterSpacing: -4, userSelect: 'none', pointerEvents: 'none' }}>WARAH</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Paiements</h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '4px 0 0' }}>Validez les déclarations et suivez les encaissements</p>
          </div>
          <Link href="/gestionnaire/export" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '9px 16px', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
            Export PDF
          </Link>
        </div>
      </div>

      {msg && <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#15803D', fontSize: 13, fontWeight: 600 }}>✓ {msg}</div>}
      {err && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#DC2626', fontSize: 13 }}>{err}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F3F4F6', borderRadius: 10, padding: 4 }}>
        {([['declarations', `Déclarations à valider${declarations.length > 0 ? ` (${declarations.length})` : ''}`], ['paiements', 'Historique paiements']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ flex: 1, background: tab === k ? '#fff' : 'transparent', color: tab === k ? '#0F4C81' : '#6B7280', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: tab === k ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Déclarations à valider */}
      {tab === 'declarations' && (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
          {dLoading ? (
            <div style={{ padding: 8 }}>{[1,2,3].map(i => <div key={i} style={SK} />)}</div>
          ) : declarations.length === 0 ? (
            <div style={{ padding: '48px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>✓</div>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 8 }}>Aucune déclaration en attente</div>
              <div style={{ fontSize: 13.5, color: '#6B7280' }}>Toutes les déclarations locataires ont été traitées.</div>
            </div>
          ) : (
            <div>
              {declarations.map((d, i) => (
                <div key={d.id} style={{ padding: '20px 22px', borderBottom: i < declarations.length - 1 ? '1px solid #F9FAFB' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 3 }}>
                        {d.lease?.tenant?.firstName} {d.lease?.tenant?.lastName}
                        <span style={{ fontSize: 12, fontWeight: 400, color: '#6B7280', marginLeft: 8 }}>{d.lease?.tenant?.email}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: '#6B7280' }}>
                        {d.lease?.property?.address ?? 'Bien non spécifié'}
                        <span style={{ margin: '0 6px' }}>·</span>
                        Déclaré le {fmtDate(d.createdAt)}
                        {d.note && <span style={{ margin: '0 6px' }}>· <em>{d.note}</em></span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#0A2650', fontVariantNumeric: 'tabular-nums' }}>{formatFcfa(d.paidAmount)}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{METHOD_LABELS[d.paymentMethod] ?? d.paymentMethod}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setRejectId(d.id); setRejectReason(''); }} disabled={processing === d.id}
                      style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Rejeter
                    </button>
                    <button onClick={() => confirm(d.id)} disabled={processing === d.id}
                      style={{ background: processing === d.id ? '#93C5FD' : '#0F4C81', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 20px', fontSize: 13, fontWeight: 700, cursor: processing === d.id ? 'not-allowed' : 'pointer' }}>
                      {processing === d.id ? 'Traitement…' : 'Confirmer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Historique paiements */}
      {tab === 'paiements' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {[['', 'Tous'], ['PAID', 'Payés'], ['PENDING_CONFIRMATION', 'À confirmer'], ['OVERDUE', 'Impayés']].map(([v, l]) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                style={{ background: statusFilter === v ? '#0F4C81' : '#fff', color: statusFilter === v ? '#fff' : '#374151', border: `1px solid ${statusFilter === v ? '#0F4C81' : '#D1D5DB'}`, borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
            {pLoading ? (
              <div style={{ padding: 8 }}>{[1,2,3,4].map(i => <div key={i} style={SK} />)}</div>
            ) : payments.length === 0 ? (
              <div style={{ padding: '40px 32px', textAlign: 'center', color: '#6B7280', fontSize: 13.5 }}>Aucun paiement trouvé.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                      {['Date', 'Locataire', 'Bien', 'Montant', 'Mode', 'Statut', ''].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => {
                      const sc = STATUS_COLORS[p.status] ?? { bg: '#F3F4F6', color: '#6B7280' };
                      return (
                        <tr key={p.id} style={{ borderBottom: i < payments.length - 1 ? '1px solid #F9FAFB' : undefined }}>
                          <td style={{ padding: '13px 16px', fontSize: 12.5, color: '#6B7280', whiteSpace: 'nowrap' }}>{fmtDate(p.createdAt)}</td>
                          <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 500, color: '#111827' }}>
                            {p.lease?.tenant ? `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}` : '—'}
                          </td>
                          <td style={{ padding: '13px 16px', fontSize: 12.5, color: '#374151' }}>{p.lease?.property?.address ?? '—'}</td>
                          <td style={{ padding: '13px 16px', fontWeight: 700, fontSize: 13, color: '#0A2650', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatFcfa(p.paidAmount)}</td>
                          <td style={{ padding: '13px 16px', fontSize: 12.5, color: '#6B7280' }}>{p.paymentMethod ? (METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod) : '—'}</td>
                          <td style={{ padding: '13px 16px' }}>
                            <span style={{ background: sc.bg, color: sc.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{STATUS_LABELS[p.status] ?? p.status}</span>
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            {p.status === 'PAID' && (
                              <button onClick={() => downloadReceipt(p.id)} disabled={downloading === p.id}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#EFF6FF', color: '#0F4C81', border: '1px solid #BFDBFE', borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                {downloading === p.id ? '…' : 'Quittance'}
                              </button>
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
        </>
      )}

      {/* Modal rejet */}
      {rejectId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => setRejectId(null)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: '100%', maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Rejeter la déclaration</h2>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 16px' }}>Indiquez la raison du rejet (visible par le locataire).</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4} placeholder="Raison du rejet..."
              style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 9, padding: '10px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setRejectId(null)} style={{ background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 9, padding: '9px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
              <button onClick={reject} disabled={!rejectReason || processing !== null}
                style={{ background: !rejectReason ? '#FCA5A5' : '#DC2626', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 20px', fontWeight: 700, fontSize: 13, cursor: !rejectReason ? 'not-allowed' : 'pointer' }}>
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
