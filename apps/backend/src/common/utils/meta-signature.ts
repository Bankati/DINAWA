import { createHmac, timingSafeEqual } from 'node:crypto';

const SIGNATURE_PREFIX = 'sha256=';

// Vérifie l'en-tête `X-Hub-Signature-256` des webhooks Meta : HMAC-SHA256 du
// corps BRUT avec la clé secrète de l'application. Le calcul doit porter sur
// les octets exactement reçus — jamais sur un JSON ré-encodé, qui changerait
// l'ordre des clés ou les espaces et ferait échouer la vérification (voir
// main.ts, corps brut conservé pour /webhooks/whatsapp, unité 44).
// Comparaison en temps constant : un attaquant ne peut pas deviner la bonne
// signature octet par octet en mesurant le temps de réponse.
export function verifyMetaSignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!rawBody || !signatureHeader?.startsWith(SIGNATURE_PREFIX)) return false;

  const provided = Buffer.from(signatureHeader.slice(SIGNATURE_PREFIX.length), 'utf8');
  const expected = Buffer.from(
    createHmac('sha256', appSecret).update(rawBody).digest('hex'),
    'utf8',
  );
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
