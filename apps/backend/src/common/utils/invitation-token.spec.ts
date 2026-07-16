import { createHmac } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { createInvitationToken, verifyInvitationToken } from './invitation-token';

describe('invitation-token', () => {
  const secret = 'test-secret';

  it('signe puis vérifie un token, retrouve le bon userId', () => {
    const token = createInvitationToken('user-1', secret);
    expect(verifyInvitationToken(token, secret)).toBe('user-1');
  });

  it('rejette un token dont la signature ne correspond pas au secret', () => {
    const token = createInvitationToken('user-1', secret);
    expect(() => verifyInvitationToken(token, 'wrong-secret')).toThrow(BadRequestException);
  });

  it('rejette un token dont le payload a été modifié après signature', () => {
    const token = createInvitationToken('user-1', secret);
    const [, signature] = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ userId: 'user-2', exp: Date.now() + 1000 }),
    ).toString('base64url');
    expect(() => verifyInvitationToken(`${tamperedPayload}.${signature}`, secret)).toThrow(
      BadRequestException,
    );
  });

  it('rejette un token malformé (pas de séparateur)', () => {
    expect(() => verifyInvitationToken('pas-un-token-valide', secret)).toThrow(BadRequestException);
  });

  it('rejette proprement un token absent (undefined) au lieu de planter (voir /review, /recover)', () => {
    expect(() => verifyInvitationToken(undefined, secret)).toThrow(BadRequestException);
  });

  it('rejette proprement une chaîne vide', () => {
    expect(() => verifyInvitationToken('', secret)).toThrow(BadRequestException);
  });

  it('rejette un token expiré', () => {
    const payload = Buffer.from(
      JSON.stringify({ userId: 'user-1', exp: Date.now() - 1000 }),
    ).toString('base64url');
    const signature = createHmac('sha256', secret).update(payload).digest('base64url');
    expect(() => verifyInvitationToken(`${payload}.${signature}`, secret)).toThrow(
      BadRequestException,
    );
  });
});
