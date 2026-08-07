'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api';
import { cacheSet, cacheIsStale } from '@/lib/cache';

const TTL_30 = 30_000;

// Pré-charge silencieusement les routes sans déclencher la barre de progression.
// Appelé uniquement si les données sont périmées ou absentes du cache.
function prefetchPaths(paths: string[]) {
  paths.forEach(path => {
    if (cacheIsStale(path, TTL_30)) {
      api.prefetch(path).then(data => cacheSet(path, data)).catch(() => {});
    }
  });
}

const OWNER_PATHS = [
  '/properties?limit=50',
  '/tenants',
  '/payments',
  '/payments?source=TENANT_DECLARATION&status=PENDING_CONFIRMATION',
];

const TENANT_PATHS = [
  '/payments',
  '/notifications?limit=50',
];

export function OwnerPrefetcher() {
  useEffect(() => {
    // Léger délai pour ne pas concurrencer les requêtes de la page courante
    const t = setTimeout(() => prefetchPaths(OWNER_PATHS), 800);
    return () => clearTimeout(t);
  }, []);
  return null;
}

export function TenantPrefetcher() {
  useEffect(() => {
    const t = setTimeout(() => prefetchPaths(TENANT_PATHS), 800);
    return () => clearTimeout(t);
  }, []);
  return null;
}
