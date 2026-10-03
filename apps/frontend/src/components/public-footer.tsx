'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import './public-footer.css';

export default function PublicFooter() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <footer className="pf">
      {/* ── BANDE SUPÉRIEURE ── */}
      <div className="pf-top">
        <div className="pf-top-inner">
          <div className="pf-top-text">
            <span className="pf-top-label">Nouveau sur WARAH ?</span>
            <p className="pf-top-title">Commencez à gérer vos biens gratuitement dès aujourd&apos;hui.</p>
          </div>
          <div className="pf-top-actions">
            <Link href="/auth/register" className="pf-btn-primary">Créer un compte</Link>
            <Link href="/annonces" className="pf-btn-ghost">Voir les annonces</Link>
          </div>
        </div>
      </div>

      {/* ── OPÉRATEURS MOBILE MONEY ── */}
      <div className="pf-partners">
        <span className="pf-partners-label">Opérateurs Mobile Money partenaires</span>
        <div className="pf-partners-row">
          <div className="pf-partner-card" title="Mixx by Yas"><img src="/mixx-by-yas.png" alt="Mixx by Yas" /></div>
          <div className="pf-partner-card" title="Moov Money Flooz"><img src="/Flooz.jpg" alt="Moov Money Flooz" /></div>
          <div className="pf-partner-card" title="Carte bancaire"><img src="/carte-bancaire.jpg" alt="Carte bancaire" className="pf-partner-img-card" /></div>
        </div>
      </div>

      {/* ── CORPS DU FOOTER ── */}
      <div className="pf-body">
        <div className="pf-inner">
          <div className="pf-brand">
            <div className="pf-logo-wrap">
              <img src="/WARAH-logo.png" alt="WARAH" className="pf-logo" />
            </div>
            <p className="pf-brand-desc">L&apos;infrastructure numérique du logement au Togo. Paiements Mobile Money, quittances certifiées, gestion locative complète.</p>
          </div>

          <div className="pf-col">
            <h4 className="pf-col-title">Produit</h4>
            <nav className="pf-nav">
              <Link href="/#fonctionnalites" className="pf-link">Fonctionnalités</Link>
              <Link href="/#comment" className="pf-link">Comment ça marche</Link>
              <Link href="/a-propos" className="pf-link">Pour qui</Link>
              <Link href="/auth/login" className="pf-link">Se connecter</Link>
              <Link href="/auth/register" className="pf-link">Créer un compte</Link>
            </nav>
          </div>

          <div className="pf-col">
            <h4 className="pf-col-title">Entreprise</h4>
            <nav className="pf-nav">
              <Link href="/a-propos" className="pf-link">À propos</Link>
            </nav>
          </div>

          <div className="pf-col">
            <h4 className="pf-col-title">Contact</h4>
            <div className="pf-contact">
              <a href="mailto:warah9896@gmail.com" className="pf-contact-item">
                <svg className="pf-ci-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <span>warah9896@gmail.com</span>
              </a>
              <a href="tel:+22873000773" className="pf-contact-item">
                <svg className="pf-ci-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.02 1.18 2 2 0 012 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                <span>Togocel : +228 73 00 07 73</span>
              </a>
              <a href="tel:+22899327312" className="pf-contact-item">
                <svg className="pf-ci-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.02 1.18 2 2 0 012 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                <span>Contact : +228 99 32 73 12</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── BARRE DE BAS ── */}
      <div className="pf-bottom">
        <div className="pf-bottom-inner">
          <p className="pf-copy">© 2026 WARAH — Tous droits réservés</p>
          <nav className="pf-legal">
            <Link href="/cgu" className="pf-legal-link">CGU</Link>
            <span className="pf-legal-sep" aria-hidden="true">·</span>
            <Link href="/confidentialite" className="pf-legal-link">Confidentialité</Link>
          </nav>
        </div>
      </div>

      <button className={`pf-scrolltop${showScrollTop ? ' pf-scrolltop-visible' : ''}`} onClick={scrollToTop} aria-label="Retour en haut">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
      </button>
    </footer>
  );
}
