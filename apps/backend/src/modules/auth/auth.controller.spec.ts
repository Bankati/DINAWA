import 'reflect-metadata';
import { AuthController } from './auth.controller';
import {
  THROTTLE_LOGIN,
  THROTTLE_SIGNUP,
  THROTTLE_PASSWORD_RESET_REQUEST,
} from '../../common/constants';

// THROTTLER_LIMIT/THROTTLER_TTL ('THROTTLER:LIMIT'/'THROTTLER:TTL') sont des
// constantes internes de @nestjs/throttler (throttler.constants.ts), jamais
// réexportées par le point d'entrée public du package — valeurs recopiées
// ici après lecture du code source installé (@nestjs/throttler@6.2.0).
const THROTTLER_LIMIT = 'THROTTLER:LIMIT';
const THROTTLER_TTL = 'THROTTLER:TTL';

type Throttle = { limit: number | undefined; ttl: number | undefined };

// Les méthodes du prototype ne sont ici jamais appelées, seulement utilisées
// comme cible de Reflect.getMetadata() — unbound-method ne s'applique pas,
// désactivé ligne par ligne plutôt que pour le fichier entier.
function throttleOf(method: object): Throttle {
  return {
    limit: Reflect.getMetadata(THROTTLER_LIMIT + 'default', method) as number | undefined,
    ttl: Reflect.getMetadata(THROTTLER_TTL + 'default', method) as number | undefined,
  };
}

// Vérifie que les quotas de rate limiting renforcés (voir /architect Phase
// 11, 2026-08-13) sont bien appliqués sur les endpoints publics sensibles —
// pas de test d'intégration réel du 429 ici (couvert manuellement en
// conditions réelles), juste que la métadonnée @Throttle() est posée avec
// les bonnes valeurs sur la bonne méthode.
describe('AuthController — rate limiting renforcé', () => {
  it('applique THROTTLE_SIGNUP sur signup/owner, signup/manager et signup/tenant', () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    expect(throttleOf(AuthController.prototype.signupOwner)).toEqual(THROTTLE_SIGNUP.default);
    expect(throttleOf(AuthController.prototype.signupManager)).toEqual(THROTTLE_SIGNUP.default);
    expect(throttleOf(AuthController.prototype.signupTenant)).toEqual(THROTTLE_SIGNUP.default);
    /* eslint-enable @typescript-eslint/unbound-method */
  });

  it('applique THROTTLE_LOGIN sur login', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(throttleOf(AuthController.prototype.login)).toEqual(THROTTLE_LOGIN.default);
  });

  it('applique THROTTLE_PASSWORD_RESET_REQUEST sur password-reset/request', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(throttleOf(AuthController.prototype.requestPasswordReset)).toEqual(
      THROTTLE_PASSWORD_RESET_REQUEST.default,
    );
  });

  it("n'applique aucun throttle custom sur refresh/me (couverts par le défaut global uniquement)", () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    expect(throttleOf(AuthController.prototype.refresh)).toEqual({
      limit: undefined,
      ttl: undefined,
    });
    expect(throttleOf(AuthController.prototype.me)).toEqual({ limit: undefined, ttl: undefined });
    /* eslint-enable @typescript-eslint/unbound-method */
  });
});
