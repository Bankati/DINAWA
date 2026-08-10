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

// Relance des déclarations de paiement en attente de confirmation (voir
// build-plan.md unité 20) — un passage quotidien suffit, contrairement aux
// rappels d'échéance (unité 24, pas encore construite) qui devront rester horaires.
export const CRON_PAYMENT_DECLARATION_REMINDERS = '0 8 * * *';
export const PAYMENT_DECLARATION_REMINDER_DAYS = [3, 7] as const;

// Rappels d'échéance et alertes d'impayés (voir build-plan.md unités 24-25,
// /architect 2026-07-28) — horaires pour rester réactifs aux baux non
// mensuels, où la fenêtre de rappel/grâce peut tomber n'importe quelle heure
// du jour selon la date d'échéance exacte.
export const CRON_PAYMENT_REMINDERS = '0 * * * *';
export const CRON_OVERDUE_ALERTS = '30 * * * *';

// Supabase free tier met le projet en veille après ~5 min d'inactivité — ce
// ping maintient la connexion PostgreSQL active (voir supabase-keepalive.task.ts).
export const CRON_SUPABASE_KEEPALIVE = '0 */4 * * * *';

// Rapports mensuels automatiques (voir build-plan.md unité 33) — le 1er de
// chaque mois à 8h Lomé (UTC+0). Premier cron mensuel du projet.
export const CRON_MONTHLY_REPORTS = '0 8 1 * *';

// Forfaits d'abonnement (voir build-plan.md/code-standards.md unité 35) —
// `managedPropertiesQuota: null` = illimité (Premium).
export const SUBSCRIPTION_TIERS = {
  STARTER: { priceFcfa: 2_000, managedPropertiesQuota: 5 },
  PRO: { priceFcfa: 5_000, managedPropertiesQuota: 15 },
  PREMIUM: { priceFcfa: 10_000, managedPropertiesQuota: null },
} as const;

// Période bêta — 3 mois gratuits à l'inscription (voir /architect unité 35),
// y compris pour les comptes rétro-remplis lors de la sortie de cette unité.
export const BETA_FREE_MONTHS = 3;
