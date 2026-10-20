import { Prisma } from '@prisma/client';
import { BotIdentityService } from './bot-identity.service';
import { PIN_LOCK_MS, PIN_VERIFICATION_VALIDITY_MS } from '../../common/constants';

jest.mock('@sentry/nestjs', () => ({ captureMessage: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Sentry = require('@sentry/nestjs') as { captureMessage: jest.Mock };

const NOW = new Date('2026-10-17T18:00:00.000Z');
const PHONE = '98646779';

function notFound(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('introuvable', {
    code: 'P2025',
    clientVersion: 'test',
  });
}

describe('BotIdentityService (unité 47, décision 2)', () => {
  let prisma: {
    tenantProfile: { update: jest.Mock; updateMany: jest.Mock; findUnique: jest.Mock };
  };
  let tokens: { verifyPinDigest: jest.Mock };
  let service: BotIdentityService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      tenantProfile: {
        update: jest.fn().mockResolvedValue({ pinFailedAttempts: 1, whatsappPinHash: '$2b$hash' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest
          .fn()
          .mockResolvedValue({ whatsappPinHash: '$2b$hash', pinLockedUntil: null }),
      },
    };
    tokens = { verifyPinDigest: jest.fn().mockResolvedValue(true) };
    service = new BotIdentityService(prisma as never, tokens as never);
  });

  describe('vérification encore valable (30 jours, même numéro)', () => {
    const verified = {
      whatsappPinHash: '$2b$hash',
      pinVerifiedAt: new Date(NOW.getTime() - 1000),
      pinVerifiedPhone: PHONE,
    };

    it('valable : code existant, moins de 30 jours, même numéro vérifié', () => {
      expect(service.isVerified(verified, PHONE, NOW)).toBe(true);
    });

    it('expirée après 30 jours', () => {
      const old = {
        ...verified,
        pinVerifiedAt: new Date(NOW.getTime() - PIN_VERIFICATION_VALIDITY_MS),
      };
      expect(service.isVerified(old, PHONE, NOW)).toBe(false);
    });

    it('autre numéro vérifié depuis : plus valable', () => {
      expect(service.isVerified(verified, '90000000', NOW)).toBe(false);
    });

    it('code effacé (nouveau code / réinitialisation) : plus valable', () => {
      expect(service.isVerified({ ...verified, whatsappPinHash: null }, PHONE, NOW)).toBe(false);
    });

    it('jamais vérifié : non', () => {
      expect(service.isVerified({ ...verified, pinVerifiedAt: null }, PHONE, NOW)).toBe(false);
    });
  });

  it('réserve l’essai (+1) AVANT de comparer, refusé si le code est bloqué', async () => {
    await service.check('tenant-1', 'empreinte', PHONE, NOW);
    expect(prisma.tenantProfile.update).toHaveBeenCalledWith({
      where: {
        userId: 'tenant-1',
        whatsappPinHash: { not: null },
        OR: [{ pinLockedUntil: null }, { pinLockedUntil: { lte: NOW } }],
      },
      data: { pinFailedAttempts: { increment: 1 } },
      select: { pinFailedAttempts: true, whatsappPinHash: true },
    });
  });

  it('bon code : compteur remis à zéro, vérification liée au numéro, seulement si le code n’a pas changé', async () => {
    await expect(service.check('tenant-1', 'empreinte', PHONE, NOW)).resolves.toEqual({
      result: 'OK',
    });
    expect(tokens.verifyPinDigest).toHaveBeenCalledWith('empreinte', '$2b$hash');
    expect(prisma.tenantProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: 'tenant-1', whatsappPinHash: '$2b$hash' },
      data: {
        pinFailedAttempts: 0,
        pinLockedUntil: null,
        pinVerifiedAt: NOW,
        pinVerifiedPhone: PHONE,
      },
    });
  });

  it('code faux : essais restants', async () => {
    tokens.verifyPinDigest.mockResolvedValue(false);
    prisma.tenantProfile.update.mockResolvedValue({
      pinFailedAttempts: 3,
      whatsappPinHash: '$2b$hash',
    });
    await expect(service.check('tenant-1', 'empreinte', PHONE, NOW)).resolves.toEqual({
      result: 'WRONG',
      remaining: 2,
    });
  });

  it('5e erreur : blocage d’une heure, compteur remis à zéro pour après', async () => {
    tokens.verifyPinDigest.mockResolvedValue(false);
    prisma.tenantProfile.update.mockResolvedValue({
      pinFailedAttempts: 5,
      whatsappPinHash: '$2b$hash',
    });
    const until = new Date(NOW.getTime() + PIN_LOCK_MS);
    await expect(service.check('tenant-1', 'empreinte', PHONE, NOW)).resolves.toEqual({
      result: 'LOCKED',
      until,
    });
    expect(prisma.tenantProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: 'tenant-1' },
      data: { pinLockedUntil: until, pinFailedAttempts: 0 },
    });
  });

  it('essais simultanés au-delà de 5 : jamais comparés (pas de 6e chance)', async () => {
    prisma.tenantProfile.update.mockResolvedValue({
      pinFailedAttempts: 6,
      whatsappPinHash: '$2b$hash',
    });
    prisma.tenantProfile.findUnique.mockResolvedValue({
      whatsappPinHash: '$2b$hash',
      pinLockedUntil: new Date(NOW.getTime() + 60_000),
    });
    await expect(service.check('tenant-1', 'empreinte', PHONE, NOW)).resolves.toMatchObject({
      result: 'LOCKED',
    });
    expect(tokens.verifyPinDigest).not.toHaveBeenCalled();
  });

  it('code déjà bloqué : la réservation échoue, aucune comparaison', async () => {
    const until = new Date(NOW.getTime() + 20 * 60_000);
    prisma.tenantProfile.update.mockRejectedValue(notFound());
    prisma.tenantProfile.findUnique.mockResolvedValue({
      whatsappPinHash: '$2b$hash',
      pinLockedUntil: until,
    });
    await expect(service.check('tenant-1', 'empreinte', PHONE, NOW)).resolves.toEqual({
      result: 'LOCKED',
      until,
    });
    expect(tokens.verifyPinDigest).not.toHaveBeenCalled();
  });

  it('pas de code créé : NO_PIN', async () => {
    prisma.tenantProfile.update.mockRejectedValue(notFound());
    prisma.tenantProfile.findUnique.mockResolvedValue({
      whatsappPinHash: null,
      pinLockedUntil: null,
    });
    await expect(service.check('tenant-1', 'empreinte', PHONE, NOW)).resolves.toEqual({
      result: 'NO_PIN',
    });
  });

  it('empreinte absente (clé du code non configurée) : rien n’est compté', async () => {
    await expect(service.check('tenant-1', null, PHONE, NOW)).resolves.toEqual({
      result: 'UNAVAILABLE',
    });
    expect(prisma.tenantProfile.update).not.toHaveBeenCalled();
  });

  it('beaucoup d’échecs tous comptes confondus : une alerte, sans code ni numéro', async () => {
    tokens.verifyPinDigest.mockResolvedValue(false);
    for (let i = 0; i < 60; i++) await service.check(`tenant-${i}`, 'empreinte', PHONE, NOW);
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    const [message] = Sentry.captureMessage.mock.calls[0] as [string];
    expect(message).toContain('codes locataire faux en 1 h');
    expect(message).not.toContain(PHONE);
    expect(message).not.toContain('empreinte');
  });
});
