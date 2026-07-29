'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import AOS from 'aos';
import 'aos/dist/aos.css';
import PublicNavbar from '@/components/public-navbar';
import PublicFooter from '@/components/public-footer';
import './page.css';

export default function AProposPage() {
  useEffect(() => {
    AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true, offset: 60 });
  }, []);

  return (
    <div className="page">
      <PublicNavbar />

      {/* ── HERO ── */}
      <section className="hero">
        <img
          src="/handsome-young-african-man-holding-mobile-phone-gesturing-while-standing-against-grey-wall.jpg.jpeg"
          alt="WARAH — gestion immobilière digitale"
          className="hero-bg"
          loading="lazy"
        />
        <div className="hero-ov" />
        <div className="hero-content">
          <span className="hero-eyebrow">Qui sommes-nous</span>
          <h1 className="hero-title">La gestion immobilière<br />réinventée pour l&apos;<span className="hero-title-accent">Afrique</span></h1>
          <p className="hero-sub">WARAH simplifie la relation entre propriétaires, gestionnaires immobiliers et locataires grâce à une plateforme digitale pensée pour le contexte togolais et africain.</p>
          <Link href="/auth/register" className="hero-cta">
            Rejoindre WARAH
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12M11 5l5 5-5 5"/></svg>
          </Link>
          <div className="hero-stats">
            <div className="h-stat"><span className="h-stat-n">2 024</span><span className="h-stat-l">Année de création</span></div>
            <div className="h-stat-sep" />
            <div className="h-stat"><span className="h-stat-n">Lomé</span><span className="h-stat-l">Siège social</span></div>
            <div className="h-stat-sep" />
            <div className="h-stat"><span className="h-stat-n">Afrique</span><span className="h-stat-l">Vision continentale</span></div>
          </div>
        </div>
      </section>

      {/* ── CE QUI NOUS DÉFINIT ── */}
      <section className="definit-section">
        <div className="sec-wrap">
          <div className="val-head" data-aos="fade-down">
            <h2 className="sec-title">Ce qui nous définit</h2>
          </div>
          <div className="definit-grid">
            <div className="definit-card definit-card-navy" data-aos="fade-up">
              <div className="definit-top">
                <div className="definit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none"/></svg></div>
                <span className="definit-num">01</span>
              </div>
              <h3 className="definit-title">Notre raison d&apos;être</h3>
              <p className="definit-p">Le marché locatif togolais manque cruellement d&apos;outils numériques fiables. Nous apportons une réponse concrète, humaine et pensée pour les réalités locales.</p>
            </div>
            <div className="definit-card definit-card-gold" data-aos="fade-up" data-aos-delay="120">
              <div className="definit-top">
                <div className="definit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg></div>
                <span className="definit-num">02</span>
              </div>
              <h3 className="definit-title">Notre mission</h3>
              <p className="definit-p">Digitaliser l&apos;intégralité du cycle de vie locatif — recherche, bail, paiement, quittance — pour les propriétaires, gestionnaires et locataires du Togo.</p>
            </div>
            <div className="definit-card definit-card-emerald" data-aos="fade-up" data-aos-delay="240">
              <div className="definit-top">
                <div className="definit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3-9 4 18 3-9h6"/></svg></div>
                <span className="definit-num">03</span>
              </div>
              <h3 className="definit-title">Notre vision</h3>
              <p className="definit-p">Devenir la plateforme de référence de la gestion immobilière en Afrique de l&apos;Ouest, en partant du Togo pour rayonner sur tout le continent.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROFILS ── */}
      <section className="profils-section">
        <div className="sec-wrap">
          <div className="profils-eyebrow" data-aos="fade-down">
            <span className="sec-chip">› en un clic</span>
            <h2 className="sec-title-sm">JE SUIS…</h2>
          </div>
          <div className="profils-grid">
            <Link href="/auth/register" className="profil-card" data-aos="fade-up">
              <div className="pc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
              <h3 className="pc-title">Propriétaire</h3>
              <ul className="pc-list"><li>Gérer mes biens</li><li>Suivre mes loyers</li><li>Publier des annonces</li><li>Télécharger mes quittances</li></ul>
              <span className="pc-cta">J&apos;accède →</span>
            </Link>
            <Link href="/auth/register" className="profil-card profil-card-accent" data-aos="fade-up" data-aos-delay="120">
              <div className="pc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg></div>
              <h3 className="pc-title">Gestionnaire</h3>
              <ul className="pc-list"><li>Portefeuille de mandats</li><li>Rapports automatisés</li><li>Profil vérifié WARAH</li><li>Visibilité dans l&apos;annuaire</li></ul>
              <span className="pc-cta">J&apos;accède →</span>
            </Link>
            <Link href="/auth/register" className="profil-card" data-aos="fade-up" data-aos-delay="240">
              <div className="pc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
              <h3 className="pc-title">Locataire</h3>
              <ul className="pc-list"><li>Payer via T-Money / Flooz</li><li>Suivre mes quittances</li><li>Contacter mon propriétaire</li><li>Historique des paiements</li></ul>
              <span className="pc-cta">J&apos;accède →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── HISTOIRE ── */}
      <section className="histoire-section">
        <div className="sec-wrap">
          <div className="hist-grid">
            <div className="hist-text" data-aos="fade-right">
              <span className="sec-chip">› notre histoire</span>
              <h2 className="hist-title">WARAH EST NÉ<br />D&apos;UN CONSTAT SIMPLE</h2>
              <p className="hist-p">Le marché locatif immobilier au Togo souffre d&apos;un déficit structurel d&apos;outils numériques adaptés. Aujourd&apos;hui, pour un propriétaire qui réside au Togo, en France, au Canada, aux USA ou en Chine, la gestion quotidienne de ses biens repose encore très largement sur des carnets, des appels téléphoniques et des quittances manuscrites. Les propriétaires et les gestionnaires immobiliers perdent du temps, les locataires manquent de visibilité et les impayés restent difficiles à suivre.</p>
              <p className="hist-p">Pour le propriétaire de la diaspora, l&apos;absence d&apos;outil de suivi à distance crée une anxiété permanente sur un patrimoine qu&apos;il ne peut pas surveiller physiquement. Pour le propriétaire résidant au Togo, la multiplication des biens rend rapidement la gestion manuelle ingérable.</p>
              <Link href="/auth/register" className="hist-btn">Rejoindre WARAH</Link>
            </div>
            <div className="hist-stats">
              <div className="hs-world-wrap" data-aos="fade-left">
                <img src="/c6b2b9b4149494be6317341b2e668d13.jpg.jpeg" alt="Présence mondiale WARAH" className="hs-world-img" />
                <div className="hs-world-overlay" />
                <div className="hs-world-body">
                  <span className="hs-world-caption">Propriétaires connectés depuis</span>
                  <div className="hs-world-chips">
                    <span className="hs-chip hs-chip-lome">★ Lomé</span>
                    <span className="hs-chip">Paris</span>
                    <span className="hs-chip">Montréal</span>
                    <span className="hs-chip">New York</span>
                    <span className="hs-chip">Guangzhou</span>
                  </div>
                </div>
              </div>
              <div className="hs-card" data-aos="fade-left" data-aos-delay="80"><span className="hs-n">100%</span><span className="hs-l">Paiements mobile money</span><p className="hs-p">T-Money &amp; Flooz intégrés nativement</p></div>
              <div className="hs-card hs-card-dark" data-aos="fade-left" data-aos-delay="160"><span className="hs-n">3 rôles</span><span className="hs-l">Une plateforme unifiée</span><p className="hs-p">Propriétaire, gestionnaire immobilier et locataire</p></div>
              <div className="hs-card" data-aos="fade-left" data-aos-delay="240"><span className="hs-n">0 papier</span><span className="hs-l">Tout digitalisé</span><p className="hs-p">Quittances, baux et rapports en PDF auto</p></div>
              <div className="hs-card hs-card-gold" data-aos="fade-left" data-aos-delay="320"><span className="hs-n">Togo → Afrique</span><span className="hs-l">Vision continentale</span><p className="hs-p">Lancé à Lomé, vocation africaine</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CARTE AFRIQUE ── */}
      <section className="carte-section">
        <div className="carte-inner">
          <div className="carte-text" data-aos="fade-right">
            <span className="sec-chip sec-chip-light">› zoom sur</span>
            <h2 className="carte-title">NOTRE PRÉSENCE<br />EN AFRIQUE</h2>
            <p className="carte-sub">Lancée depuis Lomé, WARAH ambitionne de connecter les marchés immobiliers du continent. Nos routes digitales relient déjà les grandes métropoles africaines.</p>
            <div className="carte-villes">
              <div className="cv-item"><span className="cv-dot cv-active" /><strong>Lomé</strong> — Siège &amp; marché pilote</div>
              <div className="cv-item"><span className="cv-dot" />Lagos — Déploiement en cours</div>
              <div className="cv-item"><span className="cv-dot" />Accra — Déploiement en cours</div>
              <div className="cv-item"><span className="cv-dot" />Abidjan — Partenariats actifs</div>
              <div className="cv-item"><span className="cv-dot cv-soon" />Dakar · Nairobi · Kinshasa — À venir</div>
            </div>
          </div>
          <div className="carte-map">
            <div className="africa-map-wrap" data-aos="fade-left">
              <img src="/280752-P61K2Q-532.jpg" alt="Carte de l'Afrique — présence WARAH" className="africa-img" />
              <svg className="africa-routes" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="rGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="0.8" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <g opacity="0.25" fill="none" strokeWidth="0.5" strokeLinecap="round">
                  <path stroke="#C9982E" strokeDasharray="2 4" d="M14,37 C19,43 24,49 28,53" />
                  <path stroke="#C9982E" strokeDasharray="2 4" d="M28,53 C30,54 32,54 34,54" />
                  <path stroke="#C9982E" strokeDasharray="2 4" d="M34,54 C36,54 38,53 39,52" />
                  <path stroke="#ff9a3c" strokeDasharray="2 4" d="M34,54 C40,59 46,64 51,67" />
                  <path stroke="#64b5f6" strokeDasharray="2 4" d="M51,67 C57,63 62,61 65,60" />
                  <path stroke="#64b5f6" strokeDasharray="2 4" d="M65,60 C62,72 59,79 56,85" />
                  <path stroke="#81c784" strokeDasharray="2 4" d="M65,60 C66,52 67,46 68,44" />
                  <path stroke="#81c784" strokeDasharray="2 4" d="M68,44 C68,32 67,22 66,14" />
                  <path stroke="#81c784" strokeDasharray="2 4" d="M26,13 C40,12 55,12 66,14" />
                </g>
                <g filter="url(#rGlow)" fill="none" stroke="#C9982E" strokeWidth="1.4" strokeLinecap="round">
                  <path className="pkt pkt-1" strokeDasharray="4 200" d="M14,37 C19,43 24,49 28,53" />
                  <path className="pkt pkt-2" strokeDasharray="4 200" d="M28,53 C30,54 32,54 34,54" />
                  <path className="pkt pkt-3" strokeDasharray="4 200" d="M34,54 C36,54 38,53 39,52" />
                </g>
                <g filter="url(#rGlow)" fill="none" stroke="#ffb74d" strokeWidth="1.4" strokeLinecap="round">
                  <path className="pkt pkt-4" strokeDasharray="4 200" d="M34,54 C40,59 46,64 51,67" />
                </g>
                <g filter="url(#rGlow)" fill="none" stroke="#64b5f6" strokeWidth="1.4" strokeLinecap="round">
                  <path className="pkt pkt-5" strokeDasharray="4 200" d="M51,67 C57,63 62,61 65,60" />
                  <path className="pkt pkt-6" strokeDasharray="4 200" d="M65,60 C62,72 59,79 56,85" />
                </g>
                <g filter="url(#rGlow)" fill="none" stroke="#81c784" strokeWidth="1.4" strokeLinecap="round">
                  <path className="pkt pkt-7" strokeDasharray="4 200" d="M65,60 C66,52 67,46 68,44" />
                  <path className="pkt pkt-8" strokeDasharray="4 200" d="M68,44 C68,32 67,22 66,14" />
                  <path className="pkt pkt-9" strokeDasharray="4 200" d="M26,13 C40,12 55,12 66,14" />
                </g>
              </svg>
              <div className="c-dot" style={{ left: '14%', top: '37%' }}><div className="c-core c-wh" /><span className="c-lbl c-lbl-l">Dakar</span></div>
              <div className="c-dot" style={{ left: '28%', top: '53%' }}><div className="c-core c-wh" /><span className="c-lbl c-lbl-b">Abidjan</span></div>
              <div className="c-dot" style={{ left: '32%', top: '54%' }}><div className="c-core c-wh" /><span className="c-lbl c-lbl-t">Accra</span></div>
              <div className="c-dot c-lome" style={{ left: '34%', top: '54%' }}>
                <div className="c-ripple" />
                <div className="c-ripple c-ripple-2" />
                <div className="c-core c-gold" />
                <span className="c-lbl c-lbl-t c-lbl-gold">Lomé ★</span>
              </div>
              <div className="c-dot" style={{ left: '39%', top: '52%' }}><div className="c-core c-wh" /><span className="c-lbl c-lbl-r">Lagos</span></div>
              <div className="c-dot" style={{ left: '51%', top: '67%' }}><div className="c-core c-wh" /><span className="c-lbl c-lbl-r">Kinshasa</span></div>
              <div className="c-dot" style={{ left: '65%', top: '60%' }}><div className="c-core c-wh" /><span className="c-lbl c-lbl-r">Nairobi</span></div>
              <div className="c-dot" style={{ left: '68%', top: '44%' }}><div className="c-core c-wh" /><span className="c-lbl c-lbl-r">Addis Abeba</span></div>
              <div className="c-dot" style={{ left: '26%', top: '13%' }}><div className="c-core c-wh" /><span className="c-lbl c-lbl-r">Casablanca</span></div>
              <div className="c-dot" style={{ left: '66%', top: '14%' }}><div className="c-core c-wh" /><span className="c-lbl c-lbl-r">Le Caire</span></div>
              <div className="c-dot" style={{ left: '56%', top: '85%' }}><div className="c-core c-wh" /><span className="c-lbl c-lbl-t">Johannesburg</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALEURS ── */}
      <section className="valeurs-section">
        <div className="sec-wrap">
          <div className="val-head" data-aos="fade-down">
            <span className="sec-chip">› nos engagements</span>
            <h2 className="sec-title">Ce qui nous guide</h2>
          </div>
          <div className="val-grid">
            <div className="val-card" data-aos="fade-up">
              <div className="val-icon val-icon-navy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
              <h3 className="val-t">Confiance</h3>
              <p className="val-p">Chaque transaction est tracée, chaque quittance authentifiée. La transparence comme fondement.</p>
            </div>
            <div className="val-card" data-aos="fade-up" data-aos-delay="100">
              <div className="val-icon val-icon-gold"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg></div>
              <h3 className="val-t">Accessibilité</h3>
              <p className="val-p">Conçu pour fonctionner sur réseau 3G, pour tous les niveaux de maîtrise numérique.</p>
            </div>
            <div className="val-card" data-aos="fade-up" data-aos-delay="200">
              <div className="val-icon val-icon-emerald"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
              <h3 className="val-t">Efficacité</h3>
              <p className="val-p">Ce qui prenait des heures — relances, quittances, rapports — se fait en quelques secondes.</p>
            </div>
            <div className="val-card" data-aos="fade-up" data-aos-delay="300">
              <div className="val-icon val-icon-terracotta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
              <h3 className="val-t">Communauté</h3>
              <p className="val-p">Un écosystème qui connecte propriétaires, gestionnaires immobiliers et locataires dans une relation plus équilibrée.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="sec-wrap">
          <div className="cta-inner" data-aos="fade-down">
            <h2 className="cta-title">Prêt à simplifier votre gestion immobilière ?</h2>
            <p className="cta-sub">Rejoignez les propriétaires et gestionnaires immobiliers qui font confiance à WARAH.</p>
            <div className="cta-btns">
              <Link href="/auth/register" className="cta-btn-primary">Commencer gratuitement</Link>
              <Link href="/annonces" className="cta-btn-ghost">Voir les annonces</Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
