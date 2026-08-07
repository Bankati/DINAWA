'use client';

import Link from 'next/link';
import './coming-soon.css';

interface ComingSoonProps {
  titre: string;
  description: string;
  backRoute?: string;
  backLabel?: string;
}

// Fonctionnalité prévue au plan produit mais pas encore construite (ou pas
// encore portée vers cette interface) — affiche un état honnête plutôt
// qu'une page vide ou un formulaire qui échouerait silencieusement.
export default function ComingSoon({ titre, description, backRoute, backLabel = 'Retour' }: ComingSoonProps) {
  return (
    <div className="cs-wrap">
      <div className="cs-card">
        <div className="cs-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
        </div>
        <h1 className="cs-title">{titre}</h1>
        <p className="cs-desc">{description}</p>
        {backRoute && <Link href={backRoute} className="cs-back">{backLabel}</Link>}
      </div>
    </div>
  );
}
