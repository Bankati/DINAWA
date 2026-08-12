'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Badge } from './badge';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, badge, actions }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-start justify-between gap-4 flex-wrap mb-6"
    >
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {badge && <Badge tone="neutral">{badge}</Badge>}
        </div>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </motion.div>
  );
}
