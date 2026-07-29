'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getPublicListingBySlug,
  PROPERTY_TYPE_LABELS,
  type PublicListingDetail,
} from '@/lib/listing-public';
import { formatFcfa, formatNumber } from '@/lib/format';
import './page.css';

export default function AnnonceDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();

  const [annonce, setAnnonce] = useState<PublicListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [photoPrincipale, setPhotoPrincipale] = useState('');
  const [lienCopie, setLienCopie] = useState(false);

  useEffect(() => {
    if (!params.slug) return;
    setLoading(true);
    setNotFound(false);
    getPublicListingBySlug(params.slug)
      .then((data) => {
        setAnnonce(data);
        setPhotoPrincipale(data.photos?.[0] ?? '');
        setLoading(false);
        const titre = `${PROPERTY_TYPE_LABELS[data.type]} — ${data.neighborhood} — ${data.city} | WARAH`;
        document.title = titre;
      })
      .catch(() => {
        setLoading(false);
        setNotFound(true);
      });
  }, [params.slug]);

  const typeLabel = annonce ? PROPERTY_TYPE_LABELS[annonce.type] : '';
  const titreAffiche = annonce ? `${typeLabel} — ${annonce.neighborhood}` : '';

  const whatsappLink = (() => {
    if (!annonce?.contactPhone) return null;
    const digits = annonce.contactPhone.replace(/\D/g, '');
    const international = digits.length === 8 ? `228${digits}` : digits;
    const message = `Bonjour, je suis intéressé(e) par votre annonce "${titreAffiche}" sur WARAH.`;
    return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
  })();

  function goBack() {
    router.push('/annonces');
  }

  function partager() {
    const url = window.location.href;
    const texte = annonce ? `Découvrez cette annonce sur WARAH : ${titreAffiche}` : 'Découvrez cette annonce sur WARAH';
    window.open(`https://wa.me/?text=${encodeURIComponent(`${texte} ${url}`)}`, '_blank');
  }

  function copierLien() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLienCopie(true);
      setTimeout(() => setLienCopie(false), 2000);
    });
  }

  return (
    <div className="detail-page">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-inner">
          <button onClick={goBack} className="back-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Retour aux annonces
          </button>
          {annonce && (
            <div className="share-btns">
              <button onClick={partager} className="share-btn share-wa" title="Partager sur WhatsApp">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.15-.149.345-.39.523-.587.174-.195.23-.334.346-.559.111-.225.056-.42-.041-.57-.097-.149-.81-1.949-1.054-2.563-.247-.611-.5-.529-.69-.539-.18-.01-.39-.01-.598-.01-.21 0-.553.08-.846.395-.293.314-1.12 1.095-1.12 2.67 0 1.572 1.155 3.092 1.314 3.305.16.21 2.197 3.36 5.328 4.573 3.13 1.213 3.13.81 3.696.758.567-.05 1.833-.75 2.093-1.473.26-.722.26-1.34.18-1.474-.075-.13-.27-.205-.57-.354z"/>
                  <path d="M12.012 2C6.504 2 2 6.477 2 12c0 1.93.55 3.74 1.5 5.27L2 22l4.84-1.47A9.96 9.96 0 0012.012 22C17.52 22 22 17.523 22 12S17.52 2 12.012 2zm0 18.18c-1.7 0-3.27-.5-4.6-1.36l-.33-.21-3.4 1.03 1.04-3.33-.22-.34A8.13 8.13 0 013.84 12c0-4.5 3.67-8.16 8.18-8.16 4.5 0 8.16 3.66 8.16 8.16 0 4.5-3.66 8.18-8.17 8.18z"/>
                </svg>
              </button>
              <button onClick={copierLien} className="share-btn share-copy" title="Copier le lien">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 11-5.656-5.656l1.5-1.5"/>
                  <path d="M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 115.656 5.656l-1.5 1.5"/>
                </svg>
              </button>
              {lienCopie && <span className="copy-toast">Lien copié !</span>}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-wrap">
          <div className="sk-card">
            <div className="sk-img" />
            <div className="sk-body">
              <div className="sk-line sk-lg" /><div className="sk-line sk-md" /><div className="sk-line sk-sm" />
            </div>
          </div>
          <div className="sk-card">
            <div className="sk-body">
              <div className="sk-line sk-lg" /><div className="sk-line sk-md" /><div className="sk-line sk-sm" />
            </div>
          </div>
        </div>
      ) : notFound ? (
        <div className="not-found-wrap">
          <div className="state-box">
            <svg className="state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
            <h3 className="state-title">Annonce introuvable</h3>
            <p className="state-desc">Cette annonce n&apos;existe pas ou n&apos;est plus disponible.</p>
            <button className="btn-primary" onClick={goBack}>Voir les autres annonces</button>
          </div>
        </div>
      ) : annonce ? (
        <>
          {/* Hero image */}
          <div className="detail-hero">
            {annonce.photos && annonce.photos.length > 0 ? (
              <img src={photoPrincipale} alt={titreAffiche} className="detail-hero-img" />
            ) : (
              <div className="detail-hero-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
              </div>
            )}
            {annonce.photos && annonce.photos.length > 1 && (
              <div className="photo-thumbs">
                {annonce.photos.map((photo, i) => (
                  <button
                    key={photo}
                    className={`thumb-btn${photoPrincipale === photo ? ' thumb-active' : ''}`}
                    onClick={() => setPhotoPrincipale(photo)}
                  >
                    <img src={photo} alt={`Photo ${i + 1}`} className="thumb-img" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contenu principal */}
          <div className="detail-body">
            <div className="detail-grid">
              <div className="detail-main">
                <div className="detail-title-block">
                  <div className="detail-badges">
                    <span className="type-badge">{typeLabel}</span>
                    <span className="dispo-badge">Disponible</span>
                  </div>
                  <h1 className="detail-title">{titreAffiche}</h1>
                  <p className="detail-location">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    {annonce.address}
                  </p>
                </div>

                {annonce.description && (
                  <div className="detail-section">
                    <h2 className="section-title">Description</h2>
                    <p className="section-text">{annonce.description}</p>
                  </div>
                )}

                <div className="detail-section">
                  <h2 className="section-title">Caractéristiques</h2>
                  <div className="caract-grid">
                    <div className="caract-item">
                      <span className="caract-label">Surface</span>
                      <span className="caract-value">{annonce.surfaceArea} m²</span>
                    </div>
                    {annonce.roomsCount && (
                      <div className="caract-item">
                        <span className="caract-label">Pièces</span>
                        <span className="caract-value">{annonce.roomsCount}</span>
                      </div>
                    )}
                    {annonce.monthlyCharges > 0 && (
                      <div className="caract-item">
                        <span className="caract-label">Charges mensuelles</span>
                        <span className="caract-value">{formatFcfa(annonce.monthlyCharges)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="detail-aside">
                <div className="aside-card price-card">
                  <div className="price-amount">{formatNumber(annonce.monthlyRent)} <span className="price-currency">FCFA</span></div>
                  <div className="price-period">par mois</div>
                </div>

                <div className="aside-card">
                  <h3 className="aside-card-title">Contact</h3>
                  <div className="owner-row">
                    <div className="owner-avatar">{annonce.contactName.charAt(0)}</div>
                    <div className="owner-info">
                      <p className="owner-name">{annonce.contactName}</p>
                      {annonce.contactPhone && <p className="owner-phone">{annonce.contactPhone}</p>}
                    </div>
                  </div>
                  {whatsappLink ? (
                    <a href={whatsappLink} target="_blank" rel="noopener" className="whatsapp-btn">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.15-.149.345-.39.523-.587.174-.195.23-.334.346-.559.111-.225.056-.42-.041-.57-.097-.149-.81-1.949-1.054-2.563-.247-.611-.5-.529-.69-.539-.18-.01-.39-.01-.598-.01-.21 0-.553.08-.846.395-.293.314-1.12 1.095-1.12 2.67 0 1.572 1.155 3.092 1.314 3.305.16.21 2.197 3.36 5.328 4.573 3.13 1.213 3.13.81 3.696.758.567-.05 1.833-.75 2.093-1.473.26-.722.26-1.34.18-1.474-.075-.13-.27-.205-.57-.354z"/>
                        <path d="M12.012 2C6.504 2 2 6.477 2 12c0 1.93.55 3.74 1.5 5.27L2 22l4.84-1.47A9.96 9.96 0 0012.012 22C17.52 22 22 17.523 22 12S17.52 2 12.012 2zm0 18.18c-1.7 0-3.27-.5-4.6-1.36l-.33-.21-3.4 1.03 1.04-3.33-.22-.34A8.13 8.13 0 013.84 12c0-4.5 3.67-8.16 8.18-8.16 4.5 0 8.16 3.66 8.16 8.16 0 4.5-3.66 8.18-8.17 8.18z"/>
                      </svg>
                      Contacter sur WhatsApp
                    </a>
                  ) : (
                    <p className="no-phone-note">Numéro de contact indisponible pour cette annonce.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
