import { WHATSAPP_REPLY_WINDOW_MS } from '../../common/constants';

// Fenêtre de service client de Meta (unité 45, décision 4) : une réponse
// libre, sans modèle validé, n'est permise que peu après le message du
// locataire. Vérifiée au moment de l'envoi (pas à la réception), pour toute
// réponse libre : confirmation de STOP, bienvenue, reprise, puis le robot.
// inboundReceivedAt = heure Meta du message du locataire auquel on répond.
export function isWithinReplyWindow(inboundReceivedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - inboundReceivedAt.getTime() < WHATSAPP_REPLY_WINDOW_MS;
}
