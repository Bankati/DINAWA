'use client';

import { ArrowRight } from 'lucide-react';
import './flow-button.css';

interface FlowButtonProps {
  text: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
}

// Bouton utilisé pour l'action finale d'un processus (créer, enregistrer,
// envoyer...) — jamais pour une action secondaire ou un lien de navigation,
// afin de garder sa signification "fin de parcours" intacte.
export function FlowButton({ text, type = 'button', disabled, onClick }: FlowButtonProps) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} className="flow-btn">
      <ArrowRight className="flow-btn-arrow flow-btn-arrow-left" />
      <span className="flow-btn-text">{text}</span>
      <span className="flow-btn-circle" />
      <ArrowRight className="flow-btn-arrow flow-btn-arrow-right" />
    </button>
  );
}
