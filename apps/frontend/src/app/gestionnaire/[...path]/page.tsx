'use client';

import { usePathname } from 'next/navigation';

const SECTION_LABELS: Record<string, string> = {
  dashboard: 'Tableau de bord',
  portefeuille: 'Portefeuille',
  biens: 'Biens gérés',
  locataires: 'Locataires',
  paiements: 'Paiements',
  annonces: 'Annonces',
  rapports: 'Rapports',
  'profil-public': 'Profil public',
  identite: 'Vérification CNI',
  notifications: 'Notifications',
  export: 'Export',
};

export default function GestionnaireSection() {
  const pathname = usePathname();
  const segment = pathname.replace('/gestionnaire/', '').split('/')[0] ?? '';
  const label = SECTION_LABELS[segment] ?? segment;

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ background: 'linear-gradient(135deg, #0A2650 0%, #0F4C81 60%, #081E41 100%)', borderRadius: 14, padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', fontSize: 80, opacity: 0.06, fontWeight: 900, color: '#fff', letterSpacing: -4, userSelect: 'none', pointerEvents: 'none' }}>WARAH</div>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>{label}</h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '4px 0 0' }}>Espace gestionnaire</p>
      </div>
      <div style={{ textAlign: 'center', padding: '64px 32px', color: '#9CA3AF' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 64, height: 64, margin: '0 auto 20px', display: 'block', color: '#C9982E' }}>
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        <div style={{ fontWeight: 700, fontSize: 18, color: '#374151', marginBottom: 8 }}>
          Section en cours de développement
        </div>
        <div style={{ fontSize: 14, maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
          L'espace gestionnaire sera disponible dans une prochaine version de WARAH.
        </div>
      </div>
    </div>
  );
}
