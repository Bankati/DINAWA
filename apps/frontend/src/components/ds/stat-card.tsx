'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: 'primary' | 'success' | 'warning' | 'error';
  /** Uniquement une vraie métrique (ex: taux d'occupation) — jamais une valeur inventée. */
  progressPercent?: number;
  index?: number;
}

// Les teintes -50 (primary-50, emerald-50…) n'ont pas d'équivalent sombre —
// en mode sombre le dégradé est neutralisé (from-card/to-card, cf. le
// @custom-variant dark ajouté dans globals.css) et seule la pastille d'icône
// (couleurs pleines, déjà lisibles sur fond sombre) porte l'accent coloré.
const TONE_STYLES: Record<string, { cardBg: string; iconBg: string; progressBar: string; progressTrack: string }> = {
  primary: { cardBg: 'from-primary-50 to-card dark:from-card dark:to-card', iconBg: 'bg-primary text-white', progressBar: 'bg-primary', progressTrack: 'bg-primary-50 dark:bg-ds-secondary' },
  success: { cardBg: 'from-emerald-50 to-card dark:from-card dark:to-card', iconBg: 'bg-emerald-500 text-white', progressBar: 'bg-emerald-500', progressTrack: 'bg-emerald-50 dark:bg-ds-secondary' },
  warning: { cardBg: 'from-secondary-50 to-card dark:from-card dark:to-card', iconBg: 'bg-secondary text-white', progressBar: 'bg-secondary', progressTrack: 'bg-secondary-50 dark:bg-ds-secondary' },
  error: { cardBg: 'from-red-50 to-card dark:from-card dark:to-card', iconBg: 'bg-red-500 text-white', progressBar: 'bg-red-500', progressTrack: 'bg-red-50 dark:bg-ds-secondary' },
};

// Style "coloré" validé par le développeur (2026-08-11, inspiré d'une
// maquette de référence) — dégradé teinté par carte + icône en pastille
// pleine, mais AUCUNE donnée de comparaison inventée : la barre de
// progression n'apparaît que si le composant appelant fournit un
// progressPercent réel (ex: tauxOccupation), jamais un delta fictif.
export function StatCard({ label, value, sub, icon, tone = 'primary', progressPercent, index = 0 }: StatCardProps) {
  const styles = TONE_STYLES[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05, ease: 'easeOut' }}
      className={cn('bg-gradient-to-br border border-ds-border rounded-xl p-5 flex flex-col gap-3 shadow-sm', styles.cardBg)}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
        {icon && (
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm', styles.iconBg)}>
            {icon}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-card-foreground tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      {typeof progressPercent === 'number' && (
        <div className={cn('h-1.5 rounded-full overflow-hidden mt-1', styles.progressTrack)}>
          <div
            className={cn('h-full rounded-full', styles.progressBar)}
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}
