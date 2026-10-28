import { createHmac } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import {
  createInvitationToken,
  passwordFingerprint,
  verifyInvitationToken,
  verifyInvitationTokenPayload,
} from './invitation-token';

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

// Audit de sécurité du 2026-10-20 (E2) : le lien porte une empreinte du mot
// de passe provisoire, jamais le hash lui-même.
describe('invitation-token — empreinte du mot de passe provisoire', () => {
  it("embarque l'empreinte, qui change dès que le mot de passe change", () => {
    const token = createInvitationToken('tenant-1', 'secret', '$2b$10$hash-provisoire');
    const payload = verifyInvitationTokenPayload(token, 'secret');

    expect(payload.pwd).toBe(passwordFingerprint('$2b$10$hash-provisoire'));
    expect(payload.pwd).not.toBe(passwordFingerprint('$2b$10$vrai-mot-de-passe'));
    expect(Buffer.from(token.split('.')[0], 'base64url').toString('utf8')).not.toContain('hash-provisoire');
  });

  it('sans mot de passe fourni, aucun champ pwd (liens émis avant le correctif)', () => {
    const token = createInvitationToken('tenant-1', 'secret');
    expect(verifyInvitationTokenPayload(token, 'secret').pwd).toBeUndefined();
  });
});
