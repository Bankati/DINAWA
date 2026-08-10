'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: number;
}

// Même pattern overlay+panel que celui déjà utilisé (et qui fonctionne) dans
// chaque formulaire de l'app — ESC + focus initial + aria ajoutés ici, seule
// vraie amélioration par rapport aux modales inline existantes.
export function Modal({ open, onClose, title, children, maxWidth = 600 }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="bg-white rounded-2xl p-7 w-full outline-none max-h-[90vh] overflow-y-auto"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 m-0">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none bg-transparent border-none cursor-pointer"
            >
              ×
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
