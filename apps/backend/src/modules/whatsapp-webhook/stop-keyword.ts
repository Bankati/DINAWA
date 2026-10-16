// Mots qui arrêtent les messages WhatsApp de WARAH (unité 44, /architect
// 2026-10-13). Liste explicite : le message ENTIER doit être l'un d'eux,
// après mise en minuscules, retrait des accents, des espaces et de la
// ponctuation finale. « Je paie demain, stop aux pénalités » ne déclenche
// donc rien — un arrêt involontaire couperait les rappels du locataire.
const STOP_KEYWORDS: ReadonlySet<string> = new Set(['stop', 'arret', 'arreter']);
const TRAILING_PUNCTUATION = /[.!?]+$/;

export function isStopKeyword(text: string | null | undefined): boolean {
  if (!text) return false;
  const normalized = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(TRAILING_PUNCTUATION, '')
    .trim();
  return STOP_KEYWORDS.has(normalized);
}
