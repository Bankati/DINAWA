'use client';

import type { ReactNode } from 'react';
import { Badge } from './badge';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, badge, actions }: PageHeaderProps) {
  return (
    // Animation d'entrée en CSS pur (tailwindcss-animate) plutôt que
    // framer-motion — retiré le 2026-08-13 (diagnostic de lenteur, PageHeader
    // est monté sur ~40 pages).
    <div className="flex items-start justify-between gap-4 flex-wrap mb-6 animate-in fade-in slide-in-from-top-1 duration-[250ms] ease-out">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {badge && <Badge tone="neutral">{badge}</Badge>}
        </div>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {/* flex-wrap : sans lui, 2 boutons (icône + texte) dans `actions` peuvent
          dépasser la largeur de l'écran sur mobile au lieu de passer à la
          ligne — trouvé lors de l'audit responsive du 2026-09-30 sur la page
          Délégation (2 actions), présent partout où PageHeader reçoit
          plusieurs actions. */}
      {actions && <div className="flex flex-wrap items-center justify-end gap-2.5 shrink-0 max-sm:w-full">{actions}</div>}
    </div>
  );
}
