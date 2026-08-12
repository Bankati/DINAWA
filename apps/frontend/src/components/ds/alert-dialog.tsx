'use client';

import { forwardRef } from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { buttonVariants } from './button';

// Radix n'a pas de primitive AlertDialog dédiée exportée séparément dans ce
// projet (react-dialog suffit : pas de focus-trap différent nécessaire ici)
// — remplace les confirm() bruts du navigateur (voir audit design system,
// ex. archive() dans dashboard/biens).
export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export const AlertDialogContent = forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(function AlertDialogContent({ className, children, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-ds-border bg-card p-6 shadow-xl',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className,
        )}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  );
});

export function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 mb-5', className)} {...props} />;
}

export const AlertDialogTitle = AlertDialogPrimitive.Title;
export const AlertDialogDescription = AlertDialogPrimitive.Description;

export function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex justify-end gap-2.5', className)} {...props} />;
}

export const AlertDialogCancel = forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Close>
>(function AlertDialogCancel({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Close
      ref={ref}
      className={cn(buttonVariants({ variant: 'secondary' }), className)}
      {...props}
    />
  );
});

export const AlertDialogAction = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'destructive' }
>(function AlertDialogAction({ className, variant = 'default', ...props }, ref) {
  return <button ref={ref} className={cn(buttonVariants({ variant }), className)} {...props} />;
});
