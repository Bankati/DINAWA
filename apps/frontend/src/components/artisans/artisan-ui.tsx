'use client';

import { Star, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRADES, TRADE_LABELS, type ArtisanTrade } from '@/lib/artisans';

// Petits éléments partagés par les écrans artisans et pannes.

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          width={size}
          height={size}
          className={i <= Math.round(value) ? 'fill-secondary text-secondary' : 'text-gray-300'}
        />
      ))}
    </span>
  );
}

export function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          aria-label={`${i} étoile${i > 1 ? 's' : ''}`}
          className="cursor-pointer p-1"
        >
          <Star width={26} height={26} className={i <= value ? 'fill-secondary text-secondary' : 'text-gray-300'} />
        </button>
      ))}
    </span>
  );
}

export function VerifiedMark() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary" title="Vérifié par l'équipe WARAH">
      <BadgeCheck className="w-4 h-4" /> Vérifié
    </span>
  );
}

export function TradeChips({ trades }: { trades: ArtisanTrade[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {trades.map((t) => (
        <span key={t} className="text-xs rounded-full px-2.5 py-1 bg-primary-50 text-primary dark:bg-primary/20">
          {TRADE_LABELS[t]}
        </span>
      ))}
    </div>
  );
}

// Choix multiple des métiers (cases à cocher accessibles, ≥ 44 px).
export function TradePicker({
  value,
  onChange,
  disabled,
}: {
  value: ArtisanTrade[];
  onChange: (v: ArtisanTrade[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {TRADES.map((t) => {
        const checked = value.includes(t);
        return (
          <label
            key={t}
            className={cn(
              'flex items-center gap-2 min-h-[44px] rounded-lg border px-3 text-sm cursor-pointer',
              checked ? 'border-primary bg-primary-50 dark:bg-primary/20' : 'border-ds-border',
              disabled && 'opacity-60 cursor-not-allowed',
            )}
          >
            <input
              type="checkbox"
              className="accent-[var(--color-primary)]"
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(checked ? value.filter((x) => x !== t) : [...value, t])}
            />
            {TRADE_LABELS[t]}
          </label>
        );
      })}
    </div>
  );
}

export function TradeSelect({
  value,
  onChange,
  allLabel = 'Tous les métiers',
  id,
}: {
  value: ArtisanTrade | '';
  onChange: (v: ArtisanTrade | '') => void;
  allLabel?: string;
  id?: string;
}) {
  return (
    <select
      id={id}
      className="h-11 rounded-lg border border-ds-border bg-background px-3 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value as ArtisanTrade | '')}
    >
      <option value="">{allLabel}</option>
      {TRADES.map((t) => (
        <option key={t} value={t}>
          {TRADE_LABELS[t]}
        </option>
      ))}
    </select>
  );
}

export function formatDay(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
