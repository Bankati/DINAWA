// Émis après l'enregistrement d'un message reçu qui attend un traitement
// (WhatsappMessage.inboundAction non nul). Signal en mémoire seulement : si
// le serveur redémarre avant le traitement, WhatsappInboundRecoveryTask le
// reprend depuis la base (unité 44, /architect 2026-10-13, décision 5).
export const WHATSAPP_INBOUND_RECEIVED = 'whatsapp.inbound';

export type WhatsappInboundReceivedEvent = { messageId: string };

// Traitements attendus d'un message reçu : réponse à un STOP (unité 44), à
// un « OUI » valable ou à un « REPRENDRE » (unité 45). Le robot (unité 47)
// ajoutera le sien.
export type InboundAction = 'STOP_CONFIRMATION' | 'CONSENT_WELCOME' | 'RESUME_CONFIRMATION';
