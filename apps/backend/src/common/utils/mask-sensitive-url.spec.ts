import { maskSensitiveUrl } from './mask-sensitive-url';
import { tokenFingerprint } from './signed-token';

const TOKEN = 'eyJwIjoicGF5LWxpbmsiLCJkIjp7ImUiOiJlbnRyeS0xIn19.c2lnbmF0dXJl';

describe('maskSensitiveUrl', () => {
  it.each([
    [`/api/pay-links/${TOKEN}`, `/api/pay-links/[jeton:${tokenFingerprint(TOKEN)}]`],
    [`/api/pay-links/${TOKEN}/initiate`, `/api/pay-links/[jeton:${tokenFingerprint(TOKEN)}]/initiate`],
    [
      `https://warahcontact.com/payer/${TOKEN}/merci`,
      `https://warahcontact.com/payer/[jeton:${tokenFingerprint(TOKEN)}]/merci`,
    ],
    [`/api/auth/signup/tenant?token=${TOKEN}&x=1`, '/api/auth/signup/tenant?token=[masqué]&x=1'],
  ])('masque le jeton de %s', (url, expected) => {
    const masked = maskSensitiveUrl(url);
    expect(masked).toBe(expected);
    expect(masked).not.toContain(TOKEN);
  });

  it('laisse intactes les URL sans jeton', () => {
    expect(maskSensitiveUrl('/api/payments?page=2')).toBe('/api/payments?page=2');
  });

  it('accepte une URL absente', () => {
    expect(maskSensitiveUrl(undefined)).toBeUndefined();
  });
});
