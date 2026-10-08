import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from './token.service';

// Seules les méthodes du code locataire WhatsApp (unité 42) sont couvertes
// ici : elles n'utilisent ni JWT, ni Prisma, ni la configuration.
describe('TokenService — code locataire', () => {
  const service = new TokenService(
    {} as JwtService,
    {} as PrismaService,
    {} as ConfigService,
  );

  it('génère toujours exactement 6 chiffres, zéros de tête compris', () => {
    for (let i = 0; i < 200; i++) {
      expect(service.generatePin()).toMatch(/^\d{6}$/);
    }
  });

  it('vérifie le bon code et refuse un code faux', async () => {
    const hash = await service.hashPin('048213');
    expect(hash).not.toContain('048213');
    await expect(service.verifyPin('048213', hash)).resolves.toBe(true);
    await expect(service.verifyPin('048214', hash)).resolves.toBe(false);
  });
});
