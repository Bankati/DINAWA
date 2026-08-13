import 'reflect-metadata';
import { ContactController } from './contact.controller';
import { THROTTLE_CONTACT } from '../../common/constants';

// Voir auth.controller.spec.ts pour le contexte de ces constantes internes
// à @nestjs/throttler@6.2.0, jamais réexportées par le package.
const THROTTLER_LIMIT = 'THROTTLER:LIMIT';
const THROTTLER_TTL = 'THROTTLER:TTL';

describe('ContactController — rate limiting renforcé', () => {
  it('applique THROTTLE_CONTACT sur submit (POST /contact)', () => {
    // La méthode n'est jamais appelée, seulement utilisée comme cible de
    // Reflect.getMetadata() — unbound-method ne s'applique pas ici.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const { submit } = ContactController.prototype;
    const limit = Reflect.getMetadata(THROTTLER_LIMIT + 'default', submit) as number | undefined;
    const ttl = Reflect.getMetadata(THROTTLER_TTL + 'default', submit) as number | undefined;
    expect({ limit, ttl }).toEqual(THROTTLE_CONTACT.default);
  });
});
