// Plage d'envoi des notifications aux LOCATAIRES (unité 46, /review) :
// de 7 h inclus à 21 h exclu, heure de Lomé. Lomé est à UTC+0 toute
// l'année (pas d'heure d'été) : l'heure UTC suffit. Les tâches tournent
// toutes les heures ; hors plage, elles laissent l'échéance intacte et le
// passage de 7 h la reprend — rien à mémoriser, donc ni perte ni doublon.
// Vérifiée au moment réel de l'envoi (pas seulement au démarrage de la
// tâche). Ne concerne pas les alertes à l'agence.
export const TENANT_NOTIFICATION_START_HOUR = 7;
export const TENANT_NOTIFICATION_END_HOUR = 21;

export function isTenantNotificationHour(now: Date = new Date()): boolean {
  const hour = now.getUTCHours();
  return hour >= TENANT_NOTIFICATION_START_HOUR && hour < TENANT_NOTIFICATION_END_HOUR;
}
