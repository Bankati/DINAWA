const S = {
  page: { minHeight: '100vh', background: '#F0F4FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 } as const,
  card: { background: 'white', borderRadius: 18, padding: '48px 40px', textAlign: 'center' as const, maxWidth: 440, boxShadow: '0 4px 24px rgba(15,76,129,0.08)', border: '1px solid #E5E7EB' },
  icon: { width: 52, height: 52, margin: '0 auto 20px', display: 'block', color: '#D1D5DB' } as const,
  label: { display: 'inline-block', background: 'rgba(201,152,46,0.12)', color: '#C9982E', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '4px 12px', borderRadius: 20, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 800, color: '#0A2650', marginBottom: 10, letterSpacing: '-0.01em' },
  desc: { fontSize: 13.5, color: '#6B7280', lineHeight: 1.6 },
};

export default function PaiementsPage() {
  return (
    <div style={S.page}>
      <div style={S.card}>
        <svg style={S.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
        <span style={S.label}>Bientôt disponible</span>
        <h1 style={S.title}>Paiements</h1>
        <p style={S.desc}>L'historique et la gestion des paiements seront disponibles très prochainement. Suivez les encaissements et les impayés en temps réel.</p>
      </div>
    </div>
  );
}
