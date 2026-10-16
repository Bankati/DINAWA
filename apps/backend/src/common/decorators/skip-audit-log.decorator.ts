import { SetMetadata, CustomDecorator } from '@nestjs/common';

export const SKIP_AUDIT_LOG_KEY = 'skipAuditLog';

// Exclut une route de AuditLogInterceptor, qui stocke le corps de toute
// requête mutante dans AuditLog.metadata. Réservé aux routes dont le corps
// contient des données personnelles qu'aucun audit n'a à conserver : le
// webhook WhatsApp (texte des messages des locataires, numéros — unité 44,
// /architect 2026-10-13). Chaque usage doit être justifié en commentaire.
export const SkipAuditLog = (): CustomDecorator<string> => SetMetadata(SKIP_AUDIT_LOG_KEY, true);
