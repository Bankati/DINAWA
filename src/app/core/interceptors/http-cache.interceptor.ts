import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

interface CacheEntry { response: HttpResponse<unknown>; expiresAt: number }

const store = new Map<string, CacheEntry>();

// TTL par préfixe d'URL (en ms)
const TTL_MAP: [string, number][] = [
  ['/dashboard',      60_000],  // 60 s — agrégat KPIs, priorité max
  ['/notifications',  15_000],  // 15 s
  ['/properties',     45_000],  // 45 s
  ['/tenants',        45_000],  // 45 s — liste locataires
  ['/leases',         45_000],  // 45 s — liste baux
  ['/listings',       45_000],  // 45 s — annonces publiques
  ['/admin/comptes',  30_000],
  ['/admin/stats',    60_000],
  ['/delegation',     20_000],
  ['/profile',        60_000],
];

function ttlFor(url: string): number {
  for (const [prefix, ttl] of TTL_MAP) {
    if (url.includes(prefix)) return ttl;
  }
  return 0; // 0 = pas de cache
}

export function httpCacheInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  if (req.method !== 'GET') return next(req);

  const ttl = ttlFor(req.urlWithParams);
  if (!ttl) return next(req);

  const entry = store.get(req.urlWithParams);
  if (entry && Date.now() < entry.expiresAt) {
    return of(entry.response.clone());
  }

  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        store.set(req.urlWithParams, { response: event, expiresAt: Date.now() + ttl });
      }
    }),
  );
}

// Invalide toutes les entrées dont l'URL contient un préfixe donné
export function invalidateCache(prefix: string): void {
  for (const key of store.keys()) {
    if (key.includes(prefix)) store.delete(key);
  }
}
