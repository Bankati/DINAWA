import { WHATSAPP_CONSENT_PREFILL_TEXT } from '../../common/constants';

// Mots qui changent le consentement WhatsApp (unité 44 pour STOP, unité 45
// pour OUI et REPRENDRE). Liste explicite : le message ENTIER doit être l'un
// d'eux, après mise en minuscules, retrait des accents, des espaces en trop
// et de la ponctuation finale. « Je paie demain, stop aux pénalités » ou
// « oui je passe demain » ne déclenchent donc rien — un changement
// involontaire couperait (ou activerait) les messages du locataire.
export type ConsentKeyword = 'STOP' | 'CONFIRM' | 'RESUME';

const TRAILING_PUNCTUATION = /[.!?]+$/;

export function normalizeKeywordText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(TRAILING_PUNCTUATION, '')
    .trim();
}

const KEYWORDS: ReadonlyMap<string, ConsentKeyword> = new Map<string, ConsentKeyword>([
  ['stop', 'STOP'],
  ['arret', 'STOP'],
  ['arreter', 'STOP'],
  // « OUI » tapé à la main, ou la phrase pré-remplie par le lien / QR code
  // « Écrire à WARAH » (unité 45). Ne vaut accord que face à une demande
  // de l'agence encore valable (voir decideConsent).
  ['oui', 'CONFIRM'],
  [normalizeKeywordText(WHATSAPP_CONSENT_PREFILL_TEXT), 'CONFIRM'],
  ['reprendre', 'RESUME'],
]);

export function parseConsentKeyword(text: string | null | undefined): ConsentKeyword | null {
  if (!text) return null;
  return KEYWORDS.get(normalizeKeywordText(text)) ?? null;
}
