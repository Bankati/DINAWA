'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import './dropdown.css';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface DropdownProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Remplace un <select> natif partout où une liste déroulante est un choix
// structurant (formulaires, filtres) — pas un <select> HTML brut, mais un
// composant contrôlé (value/onChange) pour rester cohérent avec le reste
// des formulaires du projet (useState simple, sans lib de formulaire).
export function Dropdown({ id, value, onChange, options, placeholder = 'Sélectionner…', disabled, className = '' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const select = (opt: DropdownOption) => {
    onChange(opt.value);
    setIsOpen(false);
  };

  return (
    <div ref={wrapRef} className={`dd-wrap ${className}`}>
      <button
        id={id}
        type="button"
        className={`dd-trigger${disabled ? ' dd-disabled' : ''}`}
        onClick={() => !disabled && setIsOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`dd-trigger-label${!selected ? ' dd-placeholder' : ''}`}>
          {selected ? selected.label : placeholder}
        </span>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="dd-chevron">
          <ChevronDown size={16} />
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="dd-menu"
            role="listbox"
            initial={{ opacity: 0, y: -8, scaleY: 0.96 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.96, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', bounce: 0.15, duration: 0.28 }}
          >
            {options.length === 0 ? (
              <div className="dd-empty">Aucune option</div>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    className={`dd-item${isSelected ? ' dd-item-selected' : ''}`}
                    onClick={() => select(opt)}
                  >
                    {opt.icon && <span className="dd-item-icon">{opt.icon}</span>}
                    <span className="dd-item-label">{opt.label}</span>
                    {isSelected && <Check size={15} className="dd-item-check" />}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
