'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import './intro-animation.css';

const STORAGE_KEY = 'warah_intro_seen';

// Une grande accroche à la fois (façon titre, pas une liste) — plus imposant
// à l'écran que 3 petites lignes empilées, sur le même principe de
// révélation séquentielle que le site de référence du client, sans le
// copier : pas de carte ni de chiffre inventé, l'accroche déjà utilisée par
// le site (voir <title>, layout.tsx) — voir /architect animation d'accueil,
// révisé le 2026-09-30 (« plus impressionnant » demandé par le client).
const LINES = ['Gérez vos biens.', 'Encaissez vos loyers.', 'Dormez tranquille.'];
const LINE_DURATION_MS = 1300;
const KICKER_DURATION_MS = 500;
const TOTAL_MS = KICKER_DURATION_MS + LINES.length * LINE_DURATION_MS;

// Jouée une seule fois par appareil (mémorisée en localStorage) — jamais
// rejouée ensuite, jamais si elle retarderait le rendu du vrai contenu en
// dessous : overlay position:fixed purement animé en CSS, monté par-dessus
// une page qui continue de charger normalement en parallèle (voir
// /architect animation d'accueil, décisions actées avec le développeur).
export function IntroAnimation() {
  // undefined tant qu'on ne sait pas encore si elle a déjà été vue (évite un
  // flash côté serveur/premier rendu client avant lecture du localStorage).
  const [visible, setVisible] = useState<boolean | undefined>(undefined);
  const [step, setStep] = useState(0); // 0 = juste le sigle, 1..N = ligne N affichée
  // Piloté par JS plutôt qu'un délai figé en CSS — un seul minutage à tenir
  // à jour, jamais deux horloges indépendantes à resynchroniser à la main.
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let alreadySeen = true;
    try {
      alreadySeen = localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      // Stockage indisponible (navigation privée stricte, etc.) — on ne
      // joue pas l'animation plutôt que de risquer de la rejouer à chaque
      // page vue faute de pouvoir mémoriser qu'elle a été vue.
    }
    setVisible(!alreadySeen);
  }, []);

  useEffect(() => {
    if (!visible) return;
    // prefers-reduced-motion : on affiche directement la dernière accroche
    // sans les transitions intermédiaires, puis referme presque aussitôt,
    // au lieu d'imposer les animations.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setStep(LINES.length);
      const t = setTimeout(dismiss, 900);
      return () => clearTimeout(t);
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= LINES.length; i++) {
      timers.push(setTimeout(() => setStep(i), KICKER_DURATION_MS + (i - 1) * LINE_DURATION_MS));
    }
    timers.push(setTimeout(dismiss, TOTAL_MS + 600));
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  // En 2 temps : on déclenche le fondu (classe CSS) puis on démonte une fois
  // la transition terminée — évite qu'un clic sur "passer" fasse disparaître
  // l'overlay d'un coup sec, et remplace le double minutage JS+CSS figé.
  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Rien à faire de plus — si on ne peut pas mémoriser, l'animation
      // pourra rejouer à la prochaine visite ; jamais bloquant.
    }
    setClosing(true);
    setTimeout(() => setVisible(false), 500);
  }

  if (!visible) return null;

  return (
    <div className={`intro-overlay${closing ? ' intro-overlay-closing' : ''}`} role="dialog" aria-label="Bienvenue sur WARAH">
      {/* Texture de fond discrète (points dorés qui dérivent lentement) —
          coûte quasiment rien (transform/opacity en CSS pur), même esprit
          que .hero-glow-dots déjà utilisé sur la page d'accueil, pour rester
          cohérent avec l'identité visuelle plutôt que d'inventer un nouveau
          motif. */}
      <div className="intro-orbs" aria-hidden="true">
        <span className="intro-orb intro-orb-1" />
        <span className="intro-orb intro-orb-2" />
        <span className="intro-orb intro-orb-3" />
        <span className="intro-orb intro-orb-4" />
      </div>

      <button type="button" className="intro-close" onClick={dismiss} aria-label="Passer l'introduction">
        <X className="w-4 h-4" />
      </button>

      <div className="intro-content">
        <div className="intro-kicker">
          <img src="/warah-icon.png" alt="" className="intro-kicker-mark" />
          <span className="intro-kicker-word">WARAH</span>
        </div>

        <div className="intro-headline-stack">
          {LINES.map((line, i) => (
            <h2
              key={line}
              className={`intro-headline${step === i + 1 ? ' intro-headline-active' : ''}${step > i + 1 ? ' intro-headline-past' : ''}`}
            >
              {line}
            </h2>
          ))}
        </div>

        <div className="intro-dots">
          {LINES.map((line, i) => (
            <span key={line} className={`intro-dot${step >= i + 1 ? ' intro-dot-active' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
