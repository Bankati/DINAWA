import { createHmac, timingSafeEqual } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';

// Token d'invitation locataire — autoporteur (signature + expiration), sans
// lecture DB nécessaire pour le valider. Le compte lui-même est créé dès
// l'invitation (voir AuthService.inviteTenant) ; ce token ne sert qu'à
// prouver que le porteur du lien est bien la personne invitée au moment de
// poser son mot de passe (voir build-plan.md unité 09, expiration 7 jours).
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type InvitationTokenPayload = { userId: string; exp: number };

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createInvitationToken(userId: string, secret: string): string {
  const payload: InvitationTokenPayload = { userId, exp: Date.now() + TOKEN_TTL_MS };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

// Lève BadRequestException plutôt qu'une erreur brute — cohérent avec le
// reste du code métier (voir code-standards.md, jamais `throw new Error`).
export function verifyInvitationToken(token: string | undefined, secret: string): string {
  if (!token) {
    throw new BadRequestException("Lien d'invitation invalide");
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    throw new BadRequestException("Lien d'invitation invalide");
  }

  const expectedSignature = sign(encodedPayload, secret);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new BadRequestException("Lien d'invitation invalide");
  }

  let payload: InvitationTokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as InvitationTokenPayload;
  } catch {
    throw new BadRequestException("Lien d'invitation invalide");
  }

  if (Date.now() > payload.exp) {
    throw new BadRequestException("Lien d'invitation expiré, demandez-en un nouveau");
  }

  return payload.userId;
}
