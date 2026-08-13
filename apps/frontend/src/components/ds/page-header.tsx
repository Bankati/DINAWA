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
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}
