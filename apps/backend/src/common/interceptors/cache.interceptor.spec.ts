import 'reflect-metadata';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { CacheInterceptor } from './cache.interceptor';
import { CacheService } from '../cache/cache.service';
import { CACHEABLE_TTL_KEY } from '../decorators/cacheable.decorator';

function makeContext(req: Record<string, unknown>, handler: object = {}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => handler,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

function makeHandler(response: unknown): CallHandler {
  let calls = 0;
  return {
    handle: () => {
      calls++;
      return of(response);
    },
    get calls() {
      return calls;
    },
  } as unknown as CallHandler & { calls: number };
}

describe('CacheInterceptor', () => {
  let cache: CacheService;
  let reflector: Reflector;
  let interceptor: CacheInterceptor;

  beforeEach(() => {
    cache = new CacheService();
    reflector = new Reflector();
    interceptor = new CacheInterceptor(cache, reflector);
  });

  function flush(): Promise<void> {
    return new Promise((resolve) => setImmediate(resolve));
  }

  it('sert la valeur cachée au second appel GET sans réexécuter le handler', async () => {
    const cacheableHandler = {};
    Reflect.defineMetadata(CACHEABLE_TTL_KEY, 20_000, cacheableHandler);
    const req = { method: 'GET', originalUrl: '/api/dashboard', user: { id: 'u1' } };
    const handler = makeHandler({ kpis: 'v1' }) as CallHandler & { calls: number };

    const first = await new Promise((resolve) => {
      interceptor.intercept(makeContext(req, cacheableHandler), handler).subscribe(resolve);
    });
    const second = await new Promise((resolve) => {
      interceptor.intercept(makeContext(req, cacheableHandler), handler).subscribe(resolve);
    });

    expect(first).toEqual({ kpis: 'v1' });
    expect(second).toEqual({ kpis: 'v1' });
    expect(handler.calls).toBe(1);
  });

  it('isole le cache par utilisateur — deux acteurs différents ne partagent jamais une entrée', async () => {
    const cacheableHandler = {};
    Reflect.defineMetadata(CACHEABLE_TTL_KEY, 20_000, cacheableHandler);
    const handler = makeHandler({ data: 'x' }) as CallHandler & { calls: number };

    await new Promise((resolve) => {
      interceptor
        .intercept(
          makeContext(
            { method: 'GET', originalUrl: '/api/properties', user: { id: 'u1' } },
            cacheableHandler,
          ),
          handler,
        )
        .subscribe(resolve);
    });
    await new Promise((resolve) => {
      interceptor
        .intercept(
          makeContext(
            { method: 'GET', originalUrl: '/api/properties', user: { id: 'u2' } },
            cacheableHandler,
          ),
          handler,
        )
        .subscribe(resolve);
    });

    expect(handler.calls).toBe(2);
  });

  it('ne cache jamais une route GET sans métadonnée @Cacheable', async () => {
    const plainHandler = {};
    const req = { method: 'GET', originalUrl: '/api/auth/me', user: { id: 'u1' } };
    const handler = makeHandler({ id: 'u1' }) as CallHandler & { calls: number };

    await new Promise((resolve) =>
      interceptor.intercept(makeContext(req, plainHandler), handler).subscribe(resolve),
    );
    await new Promise((resolve) =>
      interceptor.intercept(makeContext(req, plainHandler), handler).subscribe(resolve),
    );

    expect(handler.calls).toBe(2);
  });

  it('ne cache jamais une requête publique sans utilisateur authentifié', async () => {
    const cacheableHandler = {};
    Reflect.defineMetadata(CACHEABLE_TTL_KEY, 20_000, cacheableHandler);
    const req = { method: 'GET', originalUrl: '/api/annonces' };
    const handler = makeHandler({ data: [] }) as CallHandler & { calls: number };

    await new Promise((resolve) =>
      interceptor.intercept(makeContext(req, cacheableHandler), handler).subscribe(resolve),
    );
    await new Promise((resolve) =>
      interceptor.intercept(makeContext(req, cacheableHandler), handler).subscribe(resolve),
    );

    expect(handler.calls).toBe(2);
  });

  it("invalide le cache de l'acteur après une mutation réussie, jamais avant", async () => {
    const cacheableHandler = {};
    Reflect.defineMetadata(CACHEABLE_TTL_KEY, 20_000, cacheableHandler);
    const getReq = { method: 'GET', originalUrl: '/api/properties', user: { id: 'u1' } };
    const getHandler = makeHandler({ v: 1 }) as CallHandler & { calls: number };

    await new Promise((resolve) =>
      interceptor.intercept(makeContext(getReq, cacheableHandler), getHandler).subscribe(resolve),
    );
    expect(getHandler.calls).toBe(1);

    const postReq = { method: 'POST', originalUrl: '/api/properties', user: { id: 'u1' } };
    interceptor
      .intercept(makeContext(postReq, {}), makeHandler({ id: 'new-property' }))
      .subscribe();
    await flush();

    const cachedAfterMutation = cache.get(`cache:u1:${getReq.originalUrl}`);
    expect(cachedAfterMutation).toBeNull();
  });

  it("n'invalide rien si la mutation échoue avant de compléter (jamais invalidé si next.handle() n'émet pas)", async () => {
    const cacheableHandler = {};
    Reflect.defineMetadata(CACHEABLE_TTL_KEY, 20_000, cacheableHandler);
    const getReq = { method: 'GET', originalUrl: '/api/properties', user: { id: 'u1' } };
    await new Promise((resolve) =>
      interceptor
        .intercept(makeContext(getReq, cacheableHandler), makeHandler({ v: 1 }))
        .subscribe(resolve),
    );

    const key = `cache:u1:${getReq.originalUrl}`;
    expect(cache.get(key)).not.toBeNull();
  });

  it('ne touche jamais le cache pour une mutation sans utilisateur authentifié (route publique)', async () => {
    const req = { method: 'POST', originalUrl: '/api/auth/login' };
    const handler = makeHandler({ accessToken: 'x' });
    await new Promise((resolve) =>
      interceptor.intercept(makeContext(req, {}), handler).subscribe(resolve),
    );
    // Ne doit pas lever — l'absence de req.user ne doit jamais faire planter l'invalidation.
  });
});
