'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AOS from 'aos';
import 'aos/dist/aos.css';
import PublicNavbar from '@/components/public-navbar';
import PublicFooter from '@/components/public-footer';
import './page.css';

interface HeroSlide { badge: string; title: string; subtitle: string; cta: string; link: string; photo: string; }

const slides: HeroSlide[] = [
  { badge: 'Gestion immobilière', title: 'Gérez vos biens\nen toute simplicité', subtitle: "Suivez l'occupation, les baux et l'historique de chaque bien depuis une seule interface intuitive.", cta: 'Commencer gratuitement', link: '/auth/register', photo: '/man-showing-house-icon-couch.jpg.jpeg' },
  { badge: 'Paiements des loyers', title: 'Encaissez vos loyers\nsans effort', subtitle: 'Suivez chaque paiement en temps réel. Alertes automatiques pour les impayés, rappels avant échéance.', cta: 'Découvrir WARAH', link: '/auth/register', photo: '/handsome-young-african-man-holding-mobile-phone-gesturing-while-standing-against-grey-wall.jpg.jpeg' },
  { badge: 'Quittances automatiques', title: 'Quittances professionnelles\nen un clic', subtitle: 'Créez et envoyez des quittances de loyer signées directement à vos locataires, à tout moment.', cta: 'Essayer gratuitement', link: '/auth/register', photo: '/black-businessman-happy-expression.jpg.jpeg' },
  { badge: 'Annonces immobilières', title: 'Trouvez vos locataires\nrapidement', subtitle: 'Publiez vos annonces et recevez des candidatures qualifiées depuis partout au Togo.', cta: 'Voir les annonces', link: '/annonces', photo: '/happy-man-with-house.jpg.jpeg' },
];

const fonctionnement = [
  { num: '01', titre: 'Créez votre compte', desc: 'Inscription gratuite en 2 minutes. Renseignez vos informations et téléchargez votre CNI ou passeport pour validation.' },
  { num: '02', titre: 'Ajoutez vos biens', desc: 'Enregistrez vos propriétés avec photos, description et conditions de location. Biens disponibles immédiatement.' },
  { num: '03', titre: 'Invitez vos locataires', desc: 'Envoyez une invitation par email ou SMS. Le locataire crée son compte et est associé à votre bail.' },
  { num: '04', titre: 'Gérez tout en temps réel', desc: "Suivez les paiements, générez des quittances et recevez des alertes dès qu'un loyer est en retard." },
];

const avantages = [
  { titre: 'Gestion centralisée', desc: 'Tous vos biens, locataires et baux réunis sur une seule plateforme, à jour en permanence.' },
  { titre: 'Suivi des paiements', desc: 'Chaque loyer enregistré automatiquement, avec alerte immédiate en cas de retard.' },
  { titre: 'Quittances en un clic', desc: 'Générées et envoyées au locataire automatiquement après chaque paiement confirmé.' },
  { titre: 'Alertes intelligentes', desc: 'Notifications push et email pour les échéances, impayés et renouvellements de bail.' },
];

const temoignages = [
  { nom: 'Kofi Assiamah', role: 'Propriétaire', ville: 'Lomé', photo: 'https://randomuser.me/api/portraits/men/36.jpg', texte: "WARAH a transformé ma façon de gérer mes 5 biens. Les quittances automatiques et le suivi des paiements m'ont fait économiser des heures chaque mois. Je recommande à tous les propriétaires." },
  { nom: 'Adjoa Mensah', role: 'Gestionnaire immobilier', ville: 'Lomé', photo: 'https://randomuser.me/api/portraits/women/56.jpg', texte: 'Je gère le portefeuille de plusieurs propriétaires. WARAH me donne une vue complète sur tous les baux, paiements et locataires en un seul endroit. Un gain de temps considérable.' },
  { nom: 'Ibrahim Touré', role: 'Propriétaire', ville: 'Kara', photo: 'https://randomuser.me/api/portraits/men/9.jpg', texte: "Même depuis Kara, je suis tout ce qui se passe à Lomé. Les alertes d'impayés arrivent immédiatement sur mon téléphone. C'est vraiment indispensable pour tout propriétaire sérieux." },
  { nom: 'Afia Dossou', role: 'Locataire', ville: 'Lomé', photo: 'https://randomuser.me/api/portraits/women/31.jpg', texte: "Grâce à WARAH j'ai trouvé mon appartement en moins d'une semaine. Le propriétaire était vérifié, le contrat de bail signé en ligne. Tout était transparent et rapide." },
  { nom: 'Jean-Baptiste Kuma', role: 'Propriétaire', ville: 'Sokodé', photo: 'https://randomuser.me/api/portraits/men/83.jpg', texte: 'Je possède 8 biens à Sokodé et Lomé. Avant WARAH, je perdais des journées entières à relancer les loyers. Maintenant tout est automatisé — je récupère du temps pour ma famille.' },
  { nom: 'Sitou Amégan', role: 'Gestionnaire immobilier', ville: 'Lomé', photo: 'https://randomuser.me/api/portraits/women/68.jpg', texte: 'Mes clients propriétaires reçoivent un rapport clair chaque mois, sans que je lève le petit doigt. WARAH a professionnalisé toute mon activité de gestion locative.' },
];

const temoPagesArr = Array.from({ length: Math.ceil(temoignages.length / 3) }, (_, i) => i);

const faqs = [
  { q: 'Comment fonctionne WARAH ?', r: "WARAH est une plateforme de gestion immobilière tout-en-un. Vous créez un compte, ajoutez vos biens, invitez vos locataires et gérez tout depuis un tableau de bord unique : paiements, baux, quittances, alertes d'impayés et annonces." },
  { q: "Est-ce gratuit de s'inscrire ?", r: "L'inscription est entièrement gratuite. Vous pouvez commencer à gérer vos biens sans frais. Des formules premium sont disponibles pour les propriétaires avec un grand nombre de biens ou les gestionnaires immobiliers." },
  { q: 'Comment ajouter un bien immobilier ?', r: 'Depuis votre tableau de bord, cliquez sur "Mes biens" puis "+ Nouveau bien". Renseignez l\'adresse, le type (villa, appartement…), le loyer mensuel, les photos et les caractéristiques. Votre bien est disponible en quelques minutes.' },
  { q: 'Comment inviter un locataire sur la plateforme ?', r: 'Depuis la fiche d\'un bien, cliquez sur "Inviter un locataire". Renseignez son nom, téléphone et email — WARAH lui envoie automatiquement un lien d\'activation sécurisé pour créer son espace locataire.' },
  { q: 'Les paiements et données sont-ils sécurisés ?', r: "Oui. Toutes les communications sont chiffrées (HTTPS). Les données personnelles sont stockées en conformité avec les normes de protection des données. WARAH ne stocke aucun numéro de carte bancaire." },
  { q: 'Puis-je gérer plusieurs biens depuis un seul compte ?', r: 'Absolument. WARAH est conçu pour les propriétaires multi-biens et les gestionnaires immobiliers de portefeuilles. Vous pouvez ajouter autant de biens que nécessaire, dans différentes villes du Togo, et tout visualiser depuis un seul tableau de bord.' },
  { q: "Que se passe-t-il en cas d'impayé de loyer ?", r: "WARAH vous envoie une alerte dès qu'un paiement est en retard. Vous pouvez envoyer une relance directement depuis la plateforme, suivre l'historique des échanges et générer un récapitulatif d'impayés pour vos démarches." },
];

function animateCounter(setter: (v: number) => void, target: number, duration: number) {
  const steps = 50;
  const delay = duration / steps;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    setter(Math.round((target / steps) * Math.min(step, steps)));
    if (step >= steps) clearInterval(timer);
  }, delay);
}

export default function LandingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideFade, setSlideFade] = useState(true);
  const [temoPage, setTemoPage] = useState(0);
  const [selectedFaq, setSelectedFaq] = useState(0);
  const [statAnnonces, setStatAnnonces] = useState(0);
  const [statProprio, setStatProprio] = useState(0);
  const [statSatisfaction, setStatSatisfaction] = useState(0);
  const [statVilles, setStatVilles] = useState(0);

  const impactRef = useRef<HTMLElement>(null);
  const slideTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const statsAnimatedRef = useRef(false);
  const currentSlideRef = useRef(0);

  function startSlider() {
    slideTimerRef.current = setInterval(() => {
      const next = (currentSlideRef.current + 1) % slides.length;
      setSlideFade(false);
      setTimeout(() => {
        currentSlideRef.current = next;
        setCurrentSlide(next);
        setSlideFade(true);
      }, 200);
    }, 6000);
  }

  function goToSlide(i: number) {
    if (i === currentSlideRef.current) return;
    setSlideFade(false);
    setTimeout(() => {
      currentSlideRef.current = i;
      setCurrentSlide(i);
      setSlideFade(true);
    }, 200);
    if (slideTimerRef.current) {
      clearInterval(slideTimerRef.current);
      startSlider();
    }
  }

  function nextSlide() { goToSlide((currentSlideRef.current + 1) % slides.length); }
  function prevSlide() { goToSlide((currentSlideRef.current - 1 + slides.length) % slides.length); }

  function goToTemoPage(p: number) {
    setTemoPage(p);
    setTimeout(() => AOS.refresh(), 0);
  }

  useEffect(() => {
    startSlider();
    AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true, offset: 60 });

    let observer: IntersectionObserver | undefined;
    if (impactRef.current) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !statsAnimatedRef.current) {
            statsAnimatedRef.current = true;
            animateCounter(setStatAnnonces, 1200, 1600);
            animateCounter(setStatProprio, 500, 1400);
            animateCounter(setStatSatisfaction, 98, 1200);
            animateCounter(setStatVilles, 6, 900);
          }
        },
        { threshold: 0.35 },
      );
      observer.observe(impactRef.current);
    }

    return () => {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slide = slides[currentSlide];
  const temoPageItems = temoignages.slice(temoPage * 3, temoPage * 3 + 3);

  const hwIcons = [
    <svg key="0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
    <svg key="1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    <svg key="2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    <svg key="3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  ];

  const wfIcons = [
    <svg key="0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    <svg key="1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    <svg key="2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></svg>,
    <svg key="3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>,
  ];

  return (
    <div className="lp">
      <PublicNavbar />

      {/* ── HERO ── */}
      <section className="hero">
        <img src="/bridge-with-city.jpg" alt="" className="hero-bg-photo" loading="lazy" />
        <div className="hero-ov" />

        <div className="hero-inner">
          <div className={`hero-left${!slideFade ? ' hero-fade-out' : ''}`}>
            <h1 className="s-title">{slide.title}</h1>
            <p className="s-sub">{slide.subtitle}</p>
            <div className="s-btns">
              <Link href={slide.link} className="s-cta">
                {slide.cta}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="s-arrow"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <Link href="/annonces" className="s-cta-ghost">
                Voir les annonces
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="s-arrow"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>

            <div className="hero-slide-controls">
              <button className="h-arrow" onClick={prevSlide} aria-label="Précédent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 5l-7 7 7 7"/></svg>
              </button>
              <div className="h-dots">
                {slides.map((s, i) => (
                  <button key={s.badge} className={`dot${currentSlide === i ? ' dot-on' : ''}`} onClick={() => goToSlide(i)} />
                ))}
              </div>
              <button className="h-arrow" onClick={nextSlide} aria-label="Suivant">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-ring" aria-hidden="true" />
            <div className="hero-glow-dots" aria-hidden="true">
              <span className="pd pd-1" /><span className="pd pd-2" /><span className="pd pd-3" /><span className="pd pd-4" />
            </div>

            <div className="hero-toast hero-toast-top">
              <div className="ht-icon ht-icon-ok">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="8"/><path d="M6.5 10l2.5 2.5 4.5-5"/></svg>
              </div>
              <div className="ht-text"><strong>Paiement reçu</strong><span>150 000 FCFA confirmé</span></div>
            </div>

            <div className="hero-toast hero-toast-bottom">
              <div className="ht-icon ht-icon-doc">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h6l4 4v12a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M12 2v4h4"/></svg>
              </div>
              <div className="ht-text"><strong>Quittance générée</strong><span>PDF prêt à télécharger</span></div>
            </div>

            <div className="hero-phone">
              <div className="hp-notch" />
              <div className="hp-screen">
                <div className="hp-greet">
                  <span className="hp-greet-hi">Bonjour, Kofi 👋</span>
                  <span className="hp-greet-title">Tableau de bord</span>
                </div>
                <div className="hp-kpis">
                  <div className="hp-kpi"><span className="hp-kpi-n">12</span><span className="hp-kpi-l">Biens</span></div>
                  <div className="hp-kpi"><span className="hp-kpi-n">9</span><span className="hp-kpi-l">Occupés</span></div>
                  <div className="hp-kpi"><span className="hp-kpi-n">320k</span><span className="hp-kpi-l">FCFA</span></div>
                </div>
                <div className="hp-pay-card">
                  <div className="hp-pay-top">
                    <span className="hp-pay-label">Dernier paiement</span>
                    <span className="hp-pay-pill">Confirmé ✓</span>
                  </div>
                  <div className="hp-pay-amount">150 000 <small>FCFA</small></div>
                  <div className="hp-pay-sub">via T-Money · 3 Juil 2026</div>
                  <div className="hp-pay-track"><span className="hp-pay-fill" /></div>
                </div>
                <div className="hp-hist-label">Historique</div>
                <div className="hp-hist-row">
                  <div className="hp-hist-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6.5"/><path d="M5.2 8l2 2 3.6-4"/></svg></div>
                  <div className="hp-hist-info"><span className="hp-l1" /><span className="hp-l2" /></div>
                  <span className="hp-hist-amount">150k</span>
                </div>
              </div>
              <div className="hp-logo-badge"><img src="/warah-icon.png" alt="" className="hp-logo-img" /></div>
            </div>
          </div>
        </div>

        <div className="hero-stats-band">
          <div className="hsb-stat"><span className="hsb-n">1 200+</span><span className="hsb-l">Annonces</span></div>
          <div className="hsb-sep" />
          <div className="hsb-stat"><span className="hsb-n">500+</span><span className="hsb-l">Propriétaires</span></div>
          <div className="hsb-sep" />
          <div className="hsb-stat"><span className="hsb-n">98%</span><span className="hsb-l">Satisfaction</span></div>
          <div className="hsb-sep" />
          <div className="hsb-stat"><span className="hsb-n">50+</span><span className="hsb-l">Villes</span></div>
        </div>
      </section>

      {/* ── COMMENT ÇA FONCTIONNE ── */}
      <section className="howto-section" id="comment">
        <div className="sec-wrap">
          <div className="sec-head" data-aos="fade-down">
            <span className="sec-eye hw-eye">Simple &amp; rapide</span>
            <h2 className="sec-title hw-sec-title">Comment ça fonctionne ?</h2>
            <p className="sec-sub hw-sec-sub">Commencez à gérer vos biens en moins de 10 minutes</p>
          </div>
          <div className="hw-grid">
            {fonctionnement.map((s, i) => (
              <div className="hw-step" data-aos="fade-down" data-aos-delay={i * 100} key={s.num}>
                {i < 3 && <div className="hw-connector" />}
                <div className={`hw-icon hw-icon-${i}`}>
                  {hwIcons[i]}
                  <span className="hw-icon-num">{s.num}</span>
                </div>
                <h3 className="hw-step-title">{s.titre}</h3>
                <p className="hw-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── POURQUOI WARAH : APPLI MOBILE ── */}
      <section className="why-section">
        <div className="sec-wrap">
          <div className="why-layout">
            <div className="why-text">
              <span className="sec-eye" data-aos="fade-down">Sur tous vos appareils</span>
              <h2 className="why-title" data-aos="fade-down">Gérez tout<br />depuis votre téléphone</h2>
              <p className="why-sub" data-aos="fade-down">Web, Android, iOS — WARAH vous suit partout, sans rien installer de compliqué.</p>

              <div className="why-feats">
                {avantages.map((f, i) => (
                  <div className="wf-item" data-aos="zoom-in-right" data-aos-delay={i * 120} key={f.titre}>
                    <div className={`wf-icon wf-icon-${i % 4}`}>{wfIcons[i % 4]}</div>
                    <div className="wf-body">
                      <h3 className="wf-title">{f.titre}</h3>
                      <p className="wf-desc">{f.desc}</p>
                    </div>
                    <div className={`wf-visual wf-visual-${i % 4}`} aria-hidden="true">
                      {i % 4 === 0 && (
                        <>
                          <div className="wfv-row wfv-row-a"><span className="wfv-dot" /><span className="wfv-bar" style={{ width: '70%' }} /></div>
                          <div className="wfv-row wfv-row-b"><span className="wfv-dot" /><span className="wfv-bar" style={{ width: '55%' }} /></div>
                          <div className="wfv-row wfv-row-c"><span className="wfv-dot" /><span className="wfv-bar" style={{ width: '60%' }} /></div>
                        </>
                      )}
                      {i % 4 === 1 && (
                        <>
                          <span className="wfv-amount">150 000<small>&nbsp;FCFA</small></span>
                          <div className="wfv-track"><span className="wfv-fill" /></div>
                          <span className="wfv-alert">● Retard détecté</span>
                        </>
                      )}
                      {i % 4 === 2 && (
                        <>
                          <svg className="wfv-doc" viewBox="0 0 36 36" fill="none">
                            <path d="M9 3h13l7 7v23a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="#fff" stroke="#C9D3E0" strokeWidth="1.4"/>
                            <path d="M22 3v7h7" fill="none" stroke="#C9D3E0" strokeWidth="1.4"/>
                            <path className="wfv-check" d="M11.5 19l4 4.2 9-9.4" fill="none" stroke="#1F7A5C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className="wfv-doc-label">Quittance.pdf</span>
                        </>
                      )}
                      {i % 4 === 3 && (
                        <>
                          <svg className="wfv-bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                          </svg>
                          <span className="wfv-badge">3</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="why-devices" data-aos="fade-left">
              <div className="wd-phone wd-phone-back">
                <div className="wd-notch" />
                <div className="wd-screen">
                  <div className="wd-bar"><span></span><span></span><span></span></div>
                  <div className="wd-chart-label">Revenus — Juillet</div>
                  <div className="wd-chart">
                    <div className="wd-chart-bar" style={{ height: '38%' }} />
                    <div className="wd-chart-bar" style={{ height: '58%' }} />
                    <div className="wd-chart-bar" style={{ height: '48%' }} />
                    <div className="wd-chart-bar" style={{ height: '72%' }} />
                    <div className="wd-chart-bar wd-chart-bar-hi" style={{ height: '92%' }} />
                  </div>
                  <div className="wd-stats">
                    <div className="wd-stat"><span className="wd-stat-n">12</span><span className="wd-stat-l">Biens</span></div>
                    <div className="wd-stat"><span className="wd-stat-n">75%</span><span className="wd-stat-l">Occupation</span></div>
                  </div>
                </div>
              </div>
              <div className="wd-phone wd-phone-front">
                <div className="wd-notch" />
                <div className="wd-screen">
                  <div className="wd-greet">
                    <span className="wd-greet-hi">Bonjour, Ama 👋</span>
                    <span className="wd-greet-title">Mes paiements</span>
                  </div>
                  <div className="wd-card">
                    <div className="wd-card-top">
                      <span className="wd-card-label">Loyer reçu</span>
                      <span className="wd-card-pill">Confirmé ✓</span>
                    </div>
                    <span className="wd-card-amount">150 000 FCFA</span>
                    <span className="wd-card-sub">via Flooz · 3 Juil 2026</span>
                  </div>
                  <div className="wd-hist-row">
                    <div className="wd-hist-icon wd-hist-ok"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6.5"/><path d="M5.2 8l2 2 3.6-4"/></svg></div>
                    <div className="wd-hist-info"><span className="wd-hist-t">Villa Agoè</span><span className="wd-hist-s">Avr 2026</span></div>
                    <span className="wd-hist-badge wd-hist-badge-ok">Payé</span>
                  </div>
                  <div className="wd-hist-row">
                    <div className="wd-hist-icon wd-hist-warn"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6.5"/><path d="M8 4.5V8l2.4 2"/></svg></div>
                    <div className="wd-hist-info"><span className="wd-hist-t">Studio Bè</span><span className="wd-hist-s">Avr 2026</span></div>
                    <span className="wd-hist-badge wd-hist-badge-warn">Attente</span>
                  </div>
                </div>
                <div className="wd-logo-badge">
                  <img src="/warah-icon.png" alt="" className="wd-logo-img" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── IMPACT EN CHIFFRES ── */}
      <section className="impact-section" ref={impactRef}>
        <div className="sec-wrap">
          <div className="sec-head" data-aos="fade-down">
            <span className="sec-eye impact-eye">En chiffres</span>
            <h2 className="sec-title impact-title">L&apos;impact WARAH au Togo</h2>
            <p className="sec-sub impact-sub">Des résultats concrets mesurés chaque mois sur notre plateforme</p>
          </div>
          <div className="impact-grid">
            <div className="impact-item" data-aos="fade-down">
              <span className="impact-n">{statAnnonces}<small>+</small></span>
              <span className="impact-l">Annonces publiées</span>
              <span className="impact-detail">Biens mis en location sur la plateforme</span>
            </div>
            <div className="impact-sep" />
            <div className="impact-item" data-aos="fade-down" data-aos-delay="100">
              <span className="impact-n">{statProprio}<small>+</small></span>
              <span className="impact-l">Propriétaires actifs</span>
              <span className="impact-detail">Font confiance à WARAH chaque mois</span>
            </div>
            <div className="impact-sep" />
            <div className="impact-item" data-aos="fade-down" data-aos-delay="200">
              <span className="impact-n">{statSatisfaction}<small>%</small></span>
              <span className="impact-l">Taux de satisfaction</span>
              <span className="impact-detail">Selon notre enquête utilisateurs 2026</span>
            </div>
            <div className="impact-sep" />
            <div className="impact-item" data-aos="fade-down" data-aos-delay="300">
              <span className="impact-n">{statVilles}</span>
              <span className="impact-l">Villes couvertes</span>
              <span className="impact-detail">Lomé, Kara, Sokodé, Atakpamé et plus</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES ── */}
      <section className="temo-section" id="temoignages">
        <div className="temo-inner">
          <div className="ts-head" data-aos="fade-down">
            <span className="ts-eyebrow">Témoignages</span>
            <h2 className="ts-title2">Ils nous font confiance<span className="ts-title2-accent">, chaque jour.</span></h2>
            <p className="ts-sub">Propriétaires, gestionnaires et locataires racontent leur expérience avec WARAH.</p>
          </div>

          <div className="ob-grid">
            {temoPageItems.map((t, i) => (
              <div className="tb-card" data-aos="fade-down" data-aos-delay={i * 100} key={t.nom}>
                <div className="tb-top">
                  <img src={t.photo} alt={t.nom} className="tb-ava-img" loading="lazy" />
                  <span className="tb-oq">&ldquo;</span>
                </div>
                <div className="tb-body">
                  <p className="tb-text">{t.texte}</p>
                  <div className="tb-stars">★★★★★</div>
                  <span className="tb-name">{t.nom}</span>
                  <span className="tb-role">{t.role}, {t.ville}</span>
                </div>
              </div>
            ))}
          </div>

          {temoPagesArr.length > 1 && (
            <div className="ts-dots">
              {temoPagesArr.map((p) => (
                <button key={p} className={`ts-dot${temoPage === p ? ' ts-dot-on' : ''}`} onClick={() => goToTemoPage(p)} aria-label={`Page ${p + 1}`} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="faq-section">
        <div className="faq-split">
          <div className="faq-photo" data-aos="fade-down">
            <img src="/customer-service-representative.jpg" alt="Support WARAH" className="faq-photo-img" loading="lazy" />
            <div className="faq-photo-scrim" />
            <div className="faq-photo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="5"/><path d="M12 13a1 1 0 0 0-1 1v4"/><circle cx="12" cy="19.5" r=".6" fill="currentColor" stroke="none"/></svg>
            </div>
            <div className="faq-photo-content">
              <h2 className="faq-photo-title">Foire aux<br /><span>questions</span></h2>
              <p className="faq-photo-sub">Vous avez des questions ? Nous sommes là pour vous aider.</p>
            </div>
          </div>

          <div className="faq-panel">
            <div className="faq-panel-scroll">
              {faqs.map((f, i) => (
                <div
                  key={f.q}
                  className={`faq-item${selectedFaq === i ? ' faq-open' : ''}`}
                  data-aos="fade-down"
                  data-aos-delay={i * 60}
                  onClick={() => setSelectedFaq(selectedFaq === i ? -1 : i)}
                >
                  <div className="faq-row">
                    <span className="faq-q">{f.q}</span>
                    <span className="faq-toggle">{selectedFaq === i ? '−' : '+'}</span>
                  </div>
                  <div className="faq-ans"><div className="faq-ans-in"><p>{f.r}</p></div></div>
                </div>
              ))}
            </div>
            <div className="faq-footer">
              <p>Vous ne trouvez pas la réponse ?</p>
              <Link href="/auth/register" className="faq-cta">Contactez-nous →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── ABONNEMENTS ── */}
      <section className="price-section" id="tarifs">
        <div className="sec-wrap">
          <div className="sec-head" data-aos="fade-down">
            <span className="sec-eye">Tarifs transparents</span>
            <h2 className="sec-title">Choisissez votre formule</h2>
            <p className="sec-sub">Des offres adaptées à chaque propriétaire — du débutant au gestionnaire immobilier professionnel.</p>
          </div>

          <div className="pc-wrap">
            <div className="pc-stage">
              {/* Starter */}
              <div className="pc-card" data-aos="fade-down">
                <div className="price-top">
                  <span className="price-label">Starter</span>
                  <div className="price-amount"><span className="price-n">2 000</span><span className="price-unit"> FCFA</span></div>
                  <p className="price-period">par mois · jusqu&apos;à 5 propriétés</p>
                </div>
                <ul className="price-feats">
                  <li className="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"><path d="M3 8l4 4 6-6"/></svg>Jusqu&apos;à 5 propriétés</li>
                  <li className="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"><path d="M3 8l4 4 6-6"/></svg>Collecte T-Money / Flooz</li>
                  <li className="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"><path d="M3 8l4 4 6-6"/></svg>Quittances automatiques</li>
                  <li className="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"><path d="M3 8l4 4 6-6"/></svg>Rappels &amp; alertes impayés</li>
                  <li className="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"><path d="M3 8l4 4 6-6"/></svg>Tableau de bord basique</li>
                  <li className="feat-no"><svg viewBox="0 0 16 16" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>Contrats de bail PDF</li>
                  <li className="feat-no"><svg viewBox="0 0 16 16" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>Annonces biens vacants</li>
                </ul>
                <Link href="/auth/register" className="price-btn price-btn-ghost">Commencer avec Starter</Link>
              </div>

              {/* Pro (recommandé) */}
              <div className="pc-card price-card-pro" data-aos="fade-down" data-aos-delay="120">
                <div className="price-badge-pop">
                  <svg viewBox="0 0 14 14" fill="var(--color-accent)"><path d="M7 1l1.6 3.2 3.5.5-2.5 2.5 1 3.5L7 9.2l-3.6 1.5 1-3.5L2 4.7l3.5-.5z"/></svg>
                  Recommandé
                </div>
                <div className="price-top">
                  <span className="price-label price-label-pro">Pro</span>
                  <div className="price-amount"><span className="price-n">5 000</span><span className="price-unit"> FCFA</span></div>
                  <p className="price-period">par mois · jusqu&apos;à 15 propriétés</p>
                </div>
                <ul className="price-feats">
                  <li className="feat-ok feat-ok-pro"><svg viewBox="0 0 16 16" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"><path d="M3 8l4 4 6-6"/></svg>Jusqu&apos;à 15 propriétés</li>
                  <li className="feat-ok feat-ok-pro"><svg viewBox="0 0 16 16" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"><path d="M3 8l4 4 6-6"/></svg>Tout ce qu&apos;inclut Starter</li>
                  <li className="feat-ok feat-ok-pro"><svg viewBox="0 0 16 16" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"><path d="M3 8l4 4 6-6"/></svg>Contrats de bail PDF</li>
                  <li className="feat-ok feat-ok-pro"><svg viewBox="0 0 16 16" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"><path d="M3 8l4 4 6-6"/></svg>Historique exportable</li>
                  <li className="feat-ok feat-ok-pro"><svg viewBox="0 0 16 16" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"><path d="M3 8l4 4 6-6"/></svg>Annonces biens vacants</li>
                  <li className="feat-ok feat-ok-pro"><svg viewBox="0 0 16 16" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"><path d="M3 8l4 4 6-6"/></svg>Paiements mensuel / trim. / sem.</li>
                </ul>
                <Link href="/auth/register" className="price-btn price-btn-pro">Démarrer avec Pro</Link>
              </div>

              {/* Premium Gestionnaire */}
              <div className="pc-card" data-aos="fade-down" data-aos-delay="240">
                <div className="price-top">
                  <span className="price-label">Premium Gestionnaire</span>
                  <div className="price-amount"><span className="price-n">10 000</span><span className="price-unit"> FCFA</span></div>
                  <p className="price-period">par mois · propriétés illimitées</p>
                </div>
                <ul className="price-feats">
                  <li className="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"><path d="M3 8l4 4 6-6"/></svg>Propriétés illimitées</li>
                  <li className="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"><path d="M3 8l4 4 6-6"/></svg>Tout ce qu&apos;inclut Pro</li>
                  <li className="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"><path d="M3 8l4 4 6-6"/></svg>Espace gestionnaire immobilier pro</li>
                  <li className="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"><path d="M3 8l4 4 6-6"/></svg>Portefeuille de mandats</li>
                  <li className="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"><path d="M3 8l4 4 6-6"/></svg>Rapports mensuels auto</li>
                  <li className="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"><path d="M3 8l4 4 6-6"/></svg>Profil vérifié &amp; support prioritaire</li>
                </ul>
                <Link href="/auth/register" className="price-btn price-btn-ghost">Démarrer Premium</Link>
              </div>
            </div>
          </div>

          <div className="price-addon" data-aos="fade-down">
            <div className="price-addon-left">
              <div className="price-addon-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18"/><circle cx="19" cy="6" r="3" fill="var(--color-accent)" stroke="none"/></svg>
              </div>
              <div>
                <span className="price-addon-label">Option · Référencement gestionnaire immobilier</span>
                <p className="price-addon-desc">Mise en avant dans l&apos;annuaire WARAH pour les gestionnaires immobiliers souhaitant maximiser leur visibilité auprès des propriétaires.</p>
              </div>
            </div>
            <div className="price-addon-right">
              <div className="price-addon-price">15 000 – 30 000 <span>FCFA/mois</span></div>
              <Link href="/auth/register" className="price-btn price-btn-addon">En savoir plus</Link>
            </div>
          </div>

          <p className="price-note">Sans engagement · Résiliation à tout moment · Paiement sécurisé via T-Money &amp; Flooz</p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
