import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-8">
      {icon && (
        <div className="text-muted-foreground/40 mb-4 [&>svg]:w-[52px] [&>svg]:h-[52px]" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="font-bold text-lg text-foreground mb-2">{title}</div>
      {description && <div className="text-sm text-muted-foreground max-w-sm">{description}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
