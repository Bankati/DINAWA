import { BadRequestException } from '@nestjs/common';
import { signToken, verifyToken } from '../../common/utils/signed-token';
import { PIN_FLOW_TOKEN_TTL_MS } from '../../common/constants';

// Formulaire WhatsApp du code locataire (unité 50, /architect 2026-11-03) :
// UN Flow Meta sans serveur dédié, deux écrans. La réponse revient par le
// webhook habituel (message nfm_reply). Partagé par le webhook (seul à voir
// le code en clair) et le robot (qui envoie le formulaire).

export type PinFlowKind = 'CREATE' | 'ENTER';

// Identifiants des écrans dans le JSON du Flow publié chez Meta.
export const PIN_FLOW_SCREENS: Record<PinFlowKind, string> = {
  CREATE: 'CREER_CODE',
  ENTER: 'ENTRER_CODE',
};

// Valeur de « action » renvoyée par le bouton du bas de chaque écran (une
// Map : une clé comme « constructor » ne doit rien trouver).
export const PIN_FLOW_ACTIONS: ReadonlyMap<string, PinFlowKind> = new Map<string, PinFlowKind>([
  ['PIN_CREATE', 'CREATE'],
  ['PIN_ENTER', 'ENTER'],
]);

// Bouton qui ouvre le formulaire (30 caractères conseillés par Meta).
export const PIN_FLOW_CTA: Record<PinFlowKind, string> = {
  CREATE: 'Créer mon code',
  ENTER: 'Entrer mon code',
};

type PinFlowTokenData = { u: string; s: PinFlowKind };

// Lie un formulaire à UN locataire et à UN écran, pour 1 h. Signé avec
// PAY_LINK_SECRET : l'usage fait partie de la charge signée, un jeton de
// paiement n'est donc jamais accepté ici (et inversement). Jamais stocké.
export function signPinFlowToken(userId: string, kind: PinFlowKind, now: Date, secret: string): string {
  return signToken<PinFlowTokenData>(
    {
      purpose: 'whatsapp-pin-flow',
      data: { u: userId, s: kind },
      expiresAt: new Date(now.getTime() + PIN_FLOW_TOKEN_TTL_MS),
    },
    secret,
  );
}

// Ne lève jamais : un jeton absent, faux, expiré, d'un autre locataire ou
// d'un autre écran vaut simplement false.
export function isPinFlowTokenValid(
  token: string | null,
  userId: string,
  kind: PinFlowKind,
  secret: string | undefined,
): boolean {
  if (!token || !secret) return false;
  try {
    const data = verifyToken<PinFlowTokenData>(token, 'whatsapp-pin-flow', secret);
    return data?.u === userId && data?.s === kind;
  } catch (error) {
    if (error instanceof BadRequestException) return false;
    throw error;
  }
}
