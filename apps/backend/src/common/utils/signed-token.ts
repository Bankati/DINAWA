import { createHmac, timingSafeEqual } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';

// Jeton autoporteur générique (signature HMAC + expiration), vérifié sans
// lecture en base — même mécanique que invitation-token.ts, généralisée pour
// la phase 12 (lien de paiement public, /architect unité 42, 2026-10-08).
// L'usage (`purpose`) fait partie de la charge signée : un jeton émis pour un
// usage n'est jamais accepté pour un autre, même avec le même secret.
export type SignedTokenPurpose = 'pay-link';

type SignedTokenPayload<T> = { p: SignedTokenPurpose; d: T; exp: number };

const INVALID_MESSAGE = 'Lien invalide';
const EXPIRED_MESSAGE = 'Lien expiré, demandez-en un nouveau';

function sign(encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

export function signToken<T>(
  params: { purpose: SignedTokenPurpose; data: T; expiresAt: Date },
  secret: string,
): string {
  const payload: SignedTokenPayload<T> = {
    p: params.purpose,
    d: params.data,
    exp: params.expiresAt.getTime(),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

// Lève BadRequestException (jamais `throw new Error`, code-standards.md). Le
// message reste volontairement générique : il ne dit jamais si c'est la
// signature, l'usage ou le format qui est en cause.
export function verifyToken<T>(
  token: string | undefined,
  purpose: SignedTokenPurpose,
  secret: string,
): T {
  if (!token) throw new BadRequestException(INVALID_MESSAGE);

  const [encodedPayload, signature, ...rest] = token.split('.');
  if (!encodedPayload || !signature || rest.length > 0) {
    throw new BadRequestException(INVALID_MESSAGE);
  }

  const provided = Buffer.from(signature);
  const expected = Buffer.from(sign(encodedPayload, secret));
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new BadRequestException(INVALID_MESSAGE);
  }

  let payload: SignedTokenPayload<T>;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as SignedTokenPayload<T>;
  } catch {
    throw new BadRequestException(INVALID_MESSAGE);
  }

  if (payload.p !== purpose || typeof payload.exp !== 'number') {
    throw new BadRequestException(INVALID_MESSAGE);
  }
  if (Date.now() > payload.exp) throw new BadRequestException(EXPIRED_MESSAGE);

  return payload.d;
}
