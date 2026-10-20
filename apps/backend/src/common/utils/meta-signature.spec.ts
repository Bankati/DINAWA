import { createHmac } from 'node:crypto';
import { verifyMetaSignature } from './meta-signature';

const APP_SECRET = 'cle-secrete-app';
const body = Buffer.from('{"object":"whatsapp_business_account","entry":[]}');
const signatureOf = (payload: Buffer, secret = APP_SECRET): string =>
  `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;

describe('verifyMetaSignature', () => {
  it('accepte une signature correcte', () => {
    expect(verifyMetaSignature(body, signatureOf(body), APP_SECRET)).toBe(true);
  });

  it('refuse une signature calculée avec une autre clé', () => {
    expect(verifyMetaSignature(body, signatureOf(body, 'autre-cle'), APP_SECRET)).toBe(false);
  });

  it('refuse un corps modifié après signature (ex. JSON ré-encodé)', () => {
    const reencoded = Buffer.from(JSON.stringify(JSON.parse(body.toString()), null, 2));
    expect(verifyMetaSignature(reencoded, signatureOf(body), APP_SECRET)).toBe(false);
  });

  it.each([
    ['en-tête absent', undefined],
    ['préfixe manquant', createHmac('sha256', APP_SECRET).update(body).digest('hex')],
    ['mauvaise longueur', 'sha256=abc'],
  ])('refuse : %s', (_label, header) => {
    expect(verifyMetaSignature(body, header, APP_SECRET)).toBe(false);
  });

  it('refuse un corps absent', () => {
    expect(verifyMetaSignature(undefined, signatureOf(body), APP_SECRET)).toBe(false);
  });
});
