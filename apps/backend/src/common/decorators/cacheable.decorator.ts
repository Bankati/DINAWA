import { SetMetadata } from '@nestjs/common';

export const CACHEABLE_TTL_KEY = 'cacheableTtlMs';

// Marque un endpoint GET comme cachable côté serveur (voir
// common/interceptors/cache.interceptor.ts) — réservé aux pages de
// consultation coûteuses (dashboards, listes), jamais aux mutations ni à
// /auth/me (l'état d'authentification doit toujours rester frais).
export const Cacheable = (ttlMs: number): MethodDecorator => SetMetadata(CACHEABLE_TTL_KEY, ttlMs);
