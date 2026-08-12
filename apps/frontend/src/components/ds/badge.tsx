import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-gray-100 text-gray-600 dark:bg-ds-secondary dark:text-muted-foreground',
        success: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        error: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        accent: 'bg-secondary-50 text-secondary-700 dark:bg-secondary-900/40 dark:text-secondary-300',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface DsBadgeProps extends VariantProps<typeof badgeVariants> {
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ tone, dot, className, children }: DsBadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}
