'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

// Formalise les variantes déjà à moitié définies dans globals.css
// (.btn-primary/-secondary/-accent/-outline) — remplace ces classes plutôt
// que de les réutiliser, pour permettre un contrôle réel de la taille (sm/md/lg)
// sans conflit de spécificité CSS avec les classes historiques.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-dark',
        secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        accent: 'bg-secondary text-white hover:bg-secondary-600',
        outline: 'bg-transparent text-primary border border-primary hover:bg-primary hover:text-white',
        ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
        danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
      },
      size: {
        sm: 'text-xs px-3 py-1.5',
        md: 'text-sm px-5 py-2.5',
        lg: 'text-base px-6 py-3',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
});
