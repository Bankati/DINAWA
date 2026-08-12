'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Design system isolé (components/ds/) — pilote Propriétaire, voir
// /architect refonte UI 2026-08-11. Ne remplace PAS @/components/ui/button
// (utilisé par Gestionnaire/Admin/Locataire) tant que leur migration n'est
// pas décidée, pour ne jamais casser un espace non pilote.
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary-dark',
        accent: 'bg-secondary text-white shadow-sm hover:bg-secondary-600',
        outline: 'border border-ds-border bg-background hover:bg-ds-secondary text-foreground',
        ghost: 'hover:bg-ds-secondary text-foreground',
        secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:opacity-90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4',
        lg: 'h-11 px-6 text-base',
        icon: 'h-9 w-9 shrink-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild, loading, disabled, children, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {children}
        </>
      )}
    </Comp>
  );
});
