// Limites de taille — Supabase Storage (voir architecture.md, Storage Model)
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 Mo
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 Mo

// Plafond dur — toute URL signée expose un fichier privé au maximum 15 minutes
// (voir architecture.md, invariant #19)
export const SIGNED_URL_EXPIRY_SECONDS = 900;

// Expressions cron centralisées (voir code-standards.md, "Cron Jobs et
// Tâches Planifiées") — jamais de chaîne cron en dur dans un décorateur.
// UTC = heure de Lomé (Togo en UTC+0, sans DST).
export const CRON_INACTIVITY = '0 7 * * *';

// Blocage automatique des comptes inactifs (voir build-plan.md unité 11)
export const INACTIVITY_SUSPENSION_DAYS = 60;
export const INACTIVITY_WARNING_DAYS = [30, 7, 1] as const;

// Plafonds cumulatifs par bien (voir build-plan.md unité 13) — comptés sur
// les lignes déjà en base, jamais seulement sur la taille de l'appel en cours.
export const MAX_PHOTOS_PER_PROPERTY = 10;
export const MAX_DOCUMENTS_PER_PROPERTY = 20;
