import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: ReactNode;
}

// Titre de page — sobre, sans bandeau coloré (la barre supérieure de
// AppShell porte déjà la salutation/date sur toutes les pages).
export function PageHeader({ title, subtitle, badge, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
      <div className="min-w-0">
        <h2 className="text-gray-900 text-lg font-bold m-0">{title}</h2>
        {(subtitle || badge) && (
          <p className="text-gray-500 text-sm mt-1 flex items-center gap-2 flex-wrap">
            {subtitle}
            {badge && <span className="bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">{badge}</span>}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
}
