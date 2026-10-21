import { ServiceUnavailableException } from '@nestjs/common';
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
