import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService, isTrivialPin } from './token.service';

const PEPPER = 'cle-de-test-du-code-whatsapp-32-caracteres-min';

function serviceWith(pepper: string | undefined): TokenService {
  return new TokenService({} as JwtService, {} as PrismaService, {
    get: (key: string) => (key === 'WHATSAPP_PIN_PEPPER' ? pepper : undefined),
  } as unknown as ConfigService);
}

// Seules les méthodes du code locataire WhatsApp (unités 42 et 45) sont
// couvertes ici : elles n'utilisent ni JWT ni Prisma.
describe('TokenService — code locataire', () => {
  const service = serviceWith(PEPPER);

  it('génère toujours exactement 6 chiffres, zéros de tête compris, jamais un code trop simple', () => {
    for (let i = 0; i < 500; i++) {
      const pin = service.generatePin();
      expect(pin).toMatch(/^\d{6}$/);
      expect(isTrivialPin(pin)).toBe(false);
    }
  });

  // bcrypt au coût réel de production (12 tours, voir BCRYPT_ROUNDS) : un
  // hachage + deux vérifications dépassent les 5 s par défaut de Jest sur une
  // machine chargée — délai explicite plutôt qu'un coût artificiellement bas.
  it('vérifie le bon code et refuse un code faux', async () => {
    const hash = await service.hashPin('048213');
    expect(hash).not.toContain('048213');
    await expect(service.verifyPin('048213', hash)).resolves.toBe(true);
    await expect(service.verifyPin('048214', hash)).resolves.toBe(false);
  }, 30_000);

  it('applique la clé avant bcrypt : une base volée sans la clé ne permet pas d’essayer les codes', async () => {
    const hash = await service.hashPin('048213');
    // bcrypt seul (sans HMAC) ne reconnaît pas le code.
    await expect(bcrypt.compare('048213', hash)).resolves.toBe(false);
    // Une autre clé non plus.
    await expect(serviceWith('une-autre-cle-de-32-caracteres-au-moins').verifyPin('048213', hash)).resolves.toBe(false);
  }, 30_000);

  it('sans clé configurée : refuse de créer un code mal protégé (503)', async () => {
    await expect(serviceWith(undefined).hashPin('048213')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('isTrivialPin', () => {
  it.each(['000000', '111111', '999999', '123456', '234567', '890123', '654321', '987654', '109876', '121212', '909090', '123123', '007007'])(
    'refuse %s',
    (pin) => {
      expect(isTrivialPin(pin)).toBe(true);
    },
  );

  it.each(['048213', '583920', '112358', '120000', '135790', '246802', '102938'])('accepte %s', (pin) => {
    expect(isTrivialPin(pin)).toBe(false);
  });
});

// Audit de sécurité du 2026-10-20 (E3) : un compte supprimé ne doit plus
// jamais obtenir de nouveau badge, et toutes ses sessions peuvent être coupées.
describe('TokenService — sessions', () => {
  function serviceWithPrisma(prisma: unknown): TokenService {
    return new TokenService({} as JwtService, prisma as PrismaService, {
      get: () => undefined,
    } as unknown as ConfigService);
  }

  it('refuse de renouveler la session d’un compte supprimé ou anonymisé', async () => {
    const prisma = {
      session: {
        findUnique: jest.fn().mockResolvedValue({
          id: 's1',
          revokedAt: null,
          expiresAt: new Date(Date.now() + 86_400_000),
          user: { id: 'u1', anonymizedAt: new Date() },
        }),
        update: jest.fn(),
      },
    };
    const service = serviceWithPrisma(prisma);

    await expect(service.rotateRefreshToken('ancien-refresh')).rejects.toThrow(UnauthorizedException);
    expect(prisma.session.update).not.toHaveBeenCalled();
  });

  it('revokeAllSessions coupe toutes les sessions encore ouvertes du compte', async () => {
    const prisma = { session: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) } };
    const service = serviceWithPrisma(prisma);

    await service.revokeAllSessions('u1');

    const [args] = prisma.session.updateMany.mock.calls[0] as [
      { where: Record<string, unknown>; data: { revokedAt: Date } },
    ];
    expect(args.where).toEqual({ userId: 'u1', revokedAt: null });
    expect(args.data.revokedAt).toBeInstanceOf(Date);
  });
});
