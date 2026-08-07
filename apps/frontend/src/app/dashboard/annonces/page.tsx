'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { propertiesApi, PROPERTY_TYPE_LABELS, type Property } from '@/lib/properties';
import { ApiError } from '@/lib/api';
import { fcfa } from '@/lib/dashboard';
import './page.css';

// Il n'existe plus de CRUD manuel d'annonces côté backend — une annonce se
// publie/se désactive automatiquement quand un bien passe VACANT/OCCUPIED
// (voir /architect module Annonces). Cette page est donc une vue lecture
// seule des biens actuellement en annonce (status === VACANT), avec un lien
// vers la recherche publique plutôt qu'un deep-link exact (le slug n'est
// pas exposé par GET /properties).
export default function AnnoncesPage() {
  const [biens, setBiens] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    propertiesApi
      .list('VACANT')
      .then((res) => setBiens(res.data))
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors du chargement des annonces'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="ann-page">
      <div className="ann-header">
        <h1 className="ann-title">Mes annonces</h1>
        <p className="ann-subtitle">Les biens vacants sont automatiquement publiés en annonce</p>
      </div>

      <div className="ann-info-banner">
        La publication est automatique : un bien vacant est immédiatement visible sur l&apos;annonce publique, et retiré dès qu&apos;un locataire y est installé.
      </div>

      {errorMessage && <div className="ann-alert-error">{errorMessage}</div>}

      {loading ? (
        <div className="ann-grid">
          {[1, 2, 3].map((i) => <div key={i} className="ann-card ann-skeleton" />)}
        </div>
      ) : biens.length === 0 ? (
        <div className="ann-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          <h3>Aucune annonce active</h3>
          <p>Vos biens vacants apparaîtront automatiquement ici.</p>
          <Link href="/dashboard/biens" className="ann-btn-primary">Voir mes biens</Link>
        </div>
      ) : (
        <div className="ann-grid">
          {biens.map((bien) => (
            <div key={bien.id} className="ann-card">
              <div className="ann-card-photo">
                {bien.photos[0] ? (
                  <img src={bien.photos[0].url} alt="" />
                ) : (
                  <div className="ann-card-photo-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                  </div>
                )}
                <span className="ann-card-type-badge">{PROPERTY_TYPE_LABELS[bien.type]}</span>
                <span className="ann-card-active-badge">Active</span>
              </div>
              <div className="ann-card-body">
                <p className="ann-card-price">{fcfa(bien.monthlyRent)}<span>/mois</span></p>
                <p className="ann-card-loc">{bien.neighborhood}, {bien.city}</p>
                <p className="ann-card-meta">
                  {bien.surfaceArea} m²{bien.roomsCount ? ` · ${bien.roomsCount} pièce${bien.roomsCount > 1 ? 's' : ''}` : ''}
                </p>
              </div>
              <div className="ann-card-actions">
                <Link href={`/dashboard/biens/${bien.id}`} className="ann-card-btn">Voir le bien</Link>
                <a
                  href={`/annonces?type=${bien.type}&ville=${encodeURIComponent(bien.city)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ann-card-btn ann-card-btn-primary"
                >
                  Annonce publique
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
