import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: 'primary' | 'success' | 'warning' | 'error';
}

const TONE_ICON_BG: Record<string, string> = {
  primary: 'bg-primary-50 text-primary',
  success: 'bg-green-50 text-green-600',
  warning: 'bg-amber-50 text-amber-600',
  error: 'bg-red-50 text-red-600',
};

export function StatCard({ label, value, sub, icon, tone = 'primary' }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-2 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        {icon && (
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', TONE_ICON_BG[tone])}>
            {icon}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
}
