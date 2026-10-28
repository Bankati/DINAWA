import { BadRequestException } from '@nestjs/common';
import { signToken, verifyToken } from './signed-token';

const SECRET = 'secret-de-test';
const inOneDay = (): Date => new Date(Date.now() + 24 * 60 * 60 * 1000);

describe('signed-token', () => {
  it('rend les données d un jeton valide', () => {
    const token = signToken({ purpose: 'pay-link', data: { entryId: 'e1' }, expiresAt: inOneDay() }, SECRET);
    expect(verifyToken<{ entryId: string }>(token, 'pay-link', SECRET)).toEqual({ entryId: 'e1' });
  });

  it('refuse un jeton expiré avec un message dédié', () => {
    const token = signToken(
      { purpose: 'pay-link', data: { entryId: 'e1' }, expiresAt: new Date(Date.now() - 1000) },
      SECRET,
    );
    expect(() => verifyToken(token, 'pay-link', SECRET)).toThrow('Lien expiré, demandez-en un nouveau');
  });

  it('refuse un jeton dont les données ont été modifiées', () => {
    const token = signToken({ purpose: 'pay-link', data: { entryId: 'e1' }, expiresAt: inOneDay() }, SECRET);
    const [, signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ p: 'pay-link', d: { entryId: 'e2' }, exp: inOneDay().getTime() }),
    ).toString('base64url');
    expect(() => verifyToken(`${forged}.${signature}`, 'pay-link', SECRET)).toThrow(BadRequestException);
  });

  it('refuse un jeton signé avec un autre secret', () => {
    const token = signToken({ purpose: 'pay-link', data: {}, expiresAt: inOneDay() }, 'autre-secret');
    expect(() => verifyToken(token, 'pay-link', SECRET)).toThrow('Lien invalide');
  });

  it('refuse un jeton émis pour un autre usage', () => {
    const token = signToken(
      { purpose: 'other' as unknown as 'pay-link', data: {}, expiresAt: inOneDay() },
      SECRET,
    );
    expect(() => verifyToken(token, 'pay-link', SECRET)).toThrow('Lien invalide');
  });

  it.each([undefined, '', 'sans-point', 'a.b.c', 'pas-du-base64.signature'])(
    'refuse un jeton mal formé (%s)',
    (token) => {
      expect(() => verifyToken(token, 'pay-link', SECRET)).toThrow(BadRequestException);
    },
  );
});
