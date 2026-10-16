import { ExecutionContext, SetMetadata } from '@nestjs/common';
import { ThrottlerOptions } from '@nestjs/throttler';
import { tokenFingerprint } from '../utils/signed-token';
import { PAY_LINK_VIEW_LIMIT_PER_IP, PAY_LINK_VIEW_LIMIT_PER_LINK } from '../constants';

// Portier à deux niveaux des routes du lien de paiement public (unité 43,
// /review + revue technique du 2026-10-09). Les limites nommées de
// @nestjs/throttler s'appliquent par défaut à TOUTES les routes : celles-ci
// sont ignorées partout sauf sur les routes marquées @PayLinkThrottled(). La
// limite générale 'default' (100/min par adresse) continue de s'appliquer.
//
// - payLinkIp    : par adresse IP cliente — tolérante pour le CGNAT des
//   réseaux mobiles togolais (beaucoup de clients derrière une même adresse).
// - payLinkToken : par adresse ET par lien — empêche d'insister sur un même
//   loyer. Ne remplace pas payLinkIp : fabriquer de nouveaux jetons pour la
//   contourner ne mène nulle part (signature invalide), et payLinkIp limite
//   de toute façon l'adresse.
//
// L'adresse vient de `req.ip`, calculée par Express selon TRUST_PROXY_HOPS
// (main.ts) : un X-Forwarded-For forgé par le client n'est jamais cru tel quel.
const PAY_LINK_THROTTLED = 'payLinkThrottled';

export const PayLinkThrottled = (): MethodDecorator & ClassDecorator =>
  SetMetadata(PAY_LINK_THROTTLED, true);

function isPayLinkRoute(context: ExecutionContext): boolean {
  return Reflect.getMetadata(PAY_LINK_THROTTLED, context.getHandler()) === true;
}

type ThrottledRequest = { ip?: string; params?: { token?: string } };

export const PAY_LINK_THROTTLERS: ThrottlerOptions[] = [
  {
    name: 'payLinkIp',
    ttl: 60_000,
    limit: PAY_LINK_VIEW_LIMIT_PER_IP,
    skipIf: (context) => !isPayLinkRoute(context),
  },
  {
    name: 'payLinkToken',
    ttl: 60_000,
    limit: PAY_LINK_VIEW_LIMIT_PER_LINK,
    skipIf: (context) => !isPayLinkRoute(context),
    // La clé du compteur ne contient que l'empreinte du jeton, jamais le
    // jeton lui-même (le stockage du limiteur peut un jour être partagé).
    getTracker: (req: ThrottledRequest) => `${req.ip ?? ''}:${tokenFingerprint(req.params?.token)}`,
  },
];
