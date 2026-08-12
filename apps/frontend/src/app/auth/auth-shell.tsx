'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, FileCheck2, KeyRound, Home, User, Calendar } from 'lucide-react';

const DECOR: { Icon: typeof Home; style: React.CSSProperties }[] = [
  { Icon: BarChart3, style: { top: '15%', left: '7%' } },
  { Icon: FileCheck2, style: { top: '48%', left: '4%' } },
  { Icon: KeyRound, style: { bottom: '12%', left: '13%' } },
  { Icon: Home, style: { top: '4%', right: '8%' } },
  { Icon: User, style: { top: '26%', right: '5%' } },
  { Icon: Calendar, style: { top: '54%', right: '9%' } },
];

export interface AuthShellProps {
  children: ReactNode;
  maxWidth?: number;
}

// Coquille visuelle partagée login/register/forgot-password — photo plein
// écran (même image que le hero de la landing, app/page.tsx) + surcouche
// dégradée + pastilles décoratives, inspirée de la maquette fournie par le
// développeur (palette WARAH conservée, jamais le vert de la référence).
export function AuthShell({ children, maxWidth = 420 }: AuthShellProps) {
  return (
    <div className="auth-page">
      {/* eslint-disable-next-line @next/next/no-img-element -- asset statique local, même traitement que app/page.tsx#hero-bg-photo */}
      <img src="/bridge-with-city.jpg" alt="" className="auth-bg-photo" />
      <Link href="/" className="auth-home-link"><ArrowLeft /> Accueil</Link>
      {DECOR.map(({ Icon, style }, i) => (
        <div key={i} className="auth-deco" style={style} aria-hidden="true">
          <Icon strokeWidth={1.5} />
        </div>
      ))}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="auth-card-logo">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo statique local, next/image ajouterait peu ici */}
          <img src="/warah-icon.png" alt="" />
          <span>WARAH</span>
        </div>
        {children}
      </div>
    </div>
  );
}
