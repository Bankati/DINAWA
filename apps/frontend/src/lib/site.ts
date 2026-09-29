// Domaine canonique du site public — même valeur que FRONTEND_URL côté
// backend (voir docs/ENV.md). Utilisé par sitemap.ts et robots.ts, qui ont
// besoin d'URLs absolues et ne peuvent pas déduire le domaine de la requête
// (générés au build/à intervalle régulier, pas à la demande d'un visiteur).
export const SITE_URL = "https://www.warahcontact.com";
