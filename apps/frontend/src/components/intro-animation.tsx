'use client';

import { useEffect, useState } from 'react';
import { Home, Wallet, Moon, X } from 'lucide-react';
import './intro-animation.css';

const STORAGE_KEY = 'warah_intro_seen';

// Trois temps, calqués sur le rythme (logo → phrases qui se révèlent l'une
// après l'autre, barre dorée qui progresse) observé sur le site de
// référence donné par le client, adapté à l'identité WARAH : pas de carte
// ni de chiffre inventé, seulement le logo et l'accroche déjà utilisée par
// le site (voir <title>, layout.tsx) — voir /architect animation d'accueil,
// 2026-09-30.
const LINES: { icon: typeof Home; text: string }[] = [
  { icon: Home, text: 'Gérez vos biens' },
  { icon: Wallet, text: 'Encaissez vos loyers' },
  { icon: Moon, text: 'Dormez tranquille' },
];
const LINE_DURATION_MS = 1000;
const LOGO_DURATION_MS = 700;
const TOTAL_MS = LOGO_DURATION_MS + LINES.length * LINE_DURATION_MS;

// Jouée une seule fois par appareil (mémorisée en localStorage) — jamais
// rejouée ensuite, jamais si elle retarderait le rendu du vrai contenu en
// dessous : overlay position:fixed purement animé en CSS, monté par-dessus
// une page qui continue de charger normalement en parallèle (voir
// /architect animation d'accueil, décisions actées avec le développeur).
export function IntroAnimation() {
  // undefined tant qu'on ne sait pas encore si elle a déjà été vue (évite un
  // flash côté serveur/premier rendu client avant lecture du localStorage).
  const [visible, setVisible] = useState<boolean | undefined>(undefined);
  const [step, setStep] = useState(0); // 0 = logo, 1..N = ligne affichée
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
    // prefers-reduced-motion : on saute directement à la dernière étape
    // (logo + accroche visibles sans les transitions intermédiaires) puis
    // referme presque aussitôt, au lieu d'imposer les animations.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setStep(LINES.length);
      const t = setTimeout(dismiss, 900);
      return () => clearTimeout(t);
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i <= LINES.length; i++) {
      timers.push(setTimeout(() => setStep(i), LOGO_DURATION_MS + i * LINE_DURATION_MS));
    }
    timers.push(setTimeout(dismiss, TOTAL_MS + 500));
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
    setTimeout(() => setVisible(false), 400);
  }

  if (!visible) return null;

  return (
    <div className={`intro-overlay${closing ? ' intro-overlay-closing' : ''}`} role="dialog" aria-label="Bienvenue sur WARAH">
      <button type="button" className="intro-close" onClick={dismiss} aria-label="Passer l'introduction">
        <X className="w-4 h-4" />
      </button>
      <div className="intro-card">
        <div className="intro-logo">
          <img src="/warah-icon.png" alt="" className="intro-logo-mark" />
          <span className="intro-logo-word">WARAH</span>
        </div>
        <div className="intro-lines">
          {LINES.map(({ icon: Icon, text }, i) => (
            <div key={text} className={`intro-line${step === i + 1 ? ' intro-line-active' : ''}${step > i + 1 ? ' intro-line-done' : ''}`}>
              <Icon className="w-4 h-4 shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>
        <div className="intro-progress">
          <div className="intro-progress-fill" style={{ width: `${Math.min(step, LINES.length) * (100 / LINES.length)}%` }} />
        </div>
      </div>
    </div>
  );
}
