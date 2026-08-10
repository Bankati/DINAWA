import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

const fieldControlClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm box-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors';

export interface FieldProps {
  label: ReactNode;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

// Remplace les fonctions field()/editField()/linkField() réimplémentées
// localement dans chaque page (jusqu'à 3 versions quasi identiques dans un
// seul fichier).
export function Field({ label, required, hint, children }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
      {hint && <div className="text-xs text-gray-400 mt-1.5">{hint}</div>}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldControlClass, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldControlClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldControlClass, 'resize-y min-h-[90px]', className)} {...props} />;
}
