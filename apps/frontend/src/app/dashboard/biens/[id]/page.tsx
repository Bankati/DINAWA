'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  propertiesApi,
  PROPERTY_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  type Property,
  type PropertyStatus,
} from '@/lib/properties';
import { ApiError } from '@/lib/api';
import { fcfa } from '@/lib/dashboard';
import './page.css';

const STATUS_BADGE_CLASSES: Record<PropertyStatus, string> = {
  OCCUPIED: 'bg-green-100 text-green-800',
  VACANT: 'bg-blue-100 text-blue-800',
  RENOVATION: 'bg-orange-100 text-orange-800',
  ARCHIVED: 'bg-gray-100 text-gray-600',
};

export default function BienDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [bien, setBien] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusChanging, setStatusChanging] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const load = () => {
    setLoading(true);
    setErrorMessage('');
    propertiesApi
      .getById(id)
      .then(setBien)
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors du chargement du bien'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const changerStatut = async (nouveauStatut: 'VACANT' | 'RENOVATION') => {
    if (!bien || statusChanging) return;
    setStatusChanging(true);
    setErrorMessage('');
    try {
      const updated = await propertiesApi.update(bien.id, { status: nouveauStatut });
      setBien(updated as Property);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors du changement de statut');
    } finally {
      setStatusChanging(false);
    }
  };

  const archiverBien = async () => {
    if (!bien) return;
    setArchiving(true);
    setErrorMessage('');
    try {
      await propertiesApi.archive(bien.id);
      router.push('/dashboard/biens');
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Erreur lors de l'archivage du bien");
      setShowArchiveModal(false);
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="bd-page">
        <div className="bd-skeleton" />
      </div>
    );
  }

  if (!bien) {
    return (
      <div className="bd-page">
        <div className="bd-alert-error">{errorMessage || 'Bien introuvable'}</div>
        <Link href="/dashboard/biens" className="bd-btn-secondary">Retour à mes biens</Link>
      </div>
    );
  }

  const totalMensuel = bien.monthlyRent + (bien.monthlyCharges || 0);

  return (
    <div className="bd-page">
      <div className="bd-header">
        <div className="bd-header-left">
          <Link href="/dashboard/biens" className="bd-back-btn" aria-label="Retour à mes biens">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
          <div>
            <h1 className="bd-title">{PROPERTY_TYPE_LABELS[bien.type]} — {bien.neighborhood}</h1>
            <p className="bd-subtitle">Informations détaillées du bien</p>
          </div>
        </div>
        <div className="bd-header-actions">
          <Link href={`/dashboard/biens/${bien.id}/edit`} className="bd-btn-secondary">Modifier</Link>
          {bien.status !== 'ARCHIVED' && (
            <button type="button" className="bd-btn-danger" onClick={() => setShowArchiveModal(true)}>Archiver</button>
          )}
        </div>
      </div>

      {errorMessage && <div className="bd-alert-error">{errorMessage}</div>}

      <div className="bd-grid">
        <div className="bd-main">
          <div className="bd-card">
            <h2 className="bd-card-title">Photos</h2>
            {bien.photos.length > 0 ? (
              <div className="bd-photos-grid">
                {bien.photos.map((photo) => <img key={photo.id} src={photo.url} alt={bien.neighborhood} />)}
              </div>
            ) : (
              <div className="bd-photo-empty">Aucune photo disponible</div>
            )}
          </div>

          <div className="bd-card">
            <h2 className="bd-card-title">Description</h2>
            <p className="bd-desc">{bien.description || 'Aucune description renseignée'}</p>
          </div>

          <div className="bd-card">
            <h2 className="bd-card-title">Caractéristiques</h2>
            <div className="bd-carac-grid">
              <div className="bd-carac-item">
                <p className="bd-carac-label">Surface</p>
                <p className="bd-carac-value">{bien.surfaceArea} m²</p>
              </div>
              {bien.roomsCount != null && (
                <div className="bd-carac-item">
                  <p className="bd-carac-label">Pièces</p>
                  <p className="bd-carac-value">{bien.roomsCount}</p>
                </div>
              )}
              <div className="bd-carac-item">
                <p className="bd-carac-label">Type</p>
                <p className="bd-carac-value">{PROPERTY_TYPE_LABELS[bien.type]}</p>
              </div>
              <div className="bd-carac-item">
                <p className="bd-carac-label">Date d&apos;ajout</p>
                <p className="bd-carac-value">{new Date(bien.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bd-side">
          <div className="bd-card">
            <div className="bd-card-header-row">
              <h2 className="bd-card-title">Statut</h2>
              <span className={`bd-status-badge ${STATUS_BADGE_CLASSES[bien.status]}`}>{PROPERTY_STATUS_LABELS[bien.status]}</span>
            </div>
            <div className="bd-loyer-rows">
              <div className="bd-loyer-row">
                <span>Loyer mensuel</span>
                <strong>{fcfa(bien.monthlyRent)}</strong>
              </div>
              {bien.monthlyCharges > 0 && (
                <div className="bd-loyer-row">
                  <span>Charges</span>
                  <strong>{fcfa(bien.monthlyCharges)}</strong>
                </div>
              )}
              <div className="bd-loyer-row bd-loyer-total">
                <span>Total mensuel</span>
                <strong>{fcfa(totalMensuel)}</strong>
              </div>
            </div>
          </div>

          <div className="bd-card">
            <h2 className="bd-card-title">Adresse</h2>
            <p className="bd-addr-main">{bien.neighborhood}</p>
            <p className="bd-addr-sub">{bien.city}</p>
            {bien.address && <p className="bd-addr-detail">{bien.address}</p>}
          </div>

          <div className="bd-card">
            <h2 className="bd-card-title">Actions rapides</h2>
            <div className="bd-actions-list">
              {bien.status === 'VACANT' && (
                <>
                  <div className="bd-annonce-note">
                    Annonce active — <Link href="/annonces">Voir les annonces publiées</Link>
                  </div>
                  <button type="button" className="bd-btn-secondary bd-action-btn" disabled={statusChanging} onClick={() => changerStatut('RENOVATION')}>
                    Marquer en travaux
                  </button>
                </>
              )}
              {bien.status === 'RENOVATION' && (
                <button type="button" className="bd-btn-secondary bd-action-btn" disabled={statusChanging} onClick={() => changerStatut('VACANT')}>
                  Marquer comme vacant
                </button>
              )}
              {bien.status === 'OCCUPIED' && (
                <p className="bd-action-note">Statut piloté par le bail actif — se libère automatiquement à sa résiliation.</p>
              )}
              {bien.status === 'ARCHIVED' && (
                <p className="bd-action-note">Ce bien est archivé et n&apos;apparaît plus dans les listes actives.</p>
              )}
              <Link href={`/dashboard/biens/${bien.id}/edit`} className="bd-btn-secondary bd-action-btn">Modifier les informations</Link>
            </div>
          </div>
        </div>
      </div>

      {showArchiveModal && (
        <div className="bd-modal-overlay" onClick={() => setShowArchiveModal(false)}>
          <div className="bd-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="bd-modal-title">Archiver le bien</h2>
            <p className="bd-modal-text">
              Êtes-vous sûr de vouloir archiver ce bien ? Il sera marqué comme archivé et n&apos;apparaîtra plus dans les listes actives.
            </p>
            <div className="bd-modal-actions">
              <button type="button" className="bd-btn-secondary" onClick={() => setShowArchiveModal(false)} disabled={archiving}>Annuler</button>
              <button type="button" className="bd-btn-danger" onClick={archiverBien} disabled={archiving}>
                {archiving ? 'Archivage…' : 'Archiver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
