// Cache persistant localStorage + mémoire.
// Stratégie stale-while-revalidate : les données sont servies immédiatement
// depuis le cache (même périmées), et une requête fraîche tourne en fond.

const STORAGE_PREFIX = "warah_cache:";
const MAX_STALE_MS = 10 * 60 * 1000; // affiche les données jusqu'à 10 min même périmées

interface Entry<T> {
  data: T;
  ts: number;
}

const mem = new Map<string, Entry<unknown>>();

function lsKey(key: string) {
  return STORAGE_PREFIX + key;
}

export function cacheGet<T>(key: string): T | null {
  // 1. mémoire d'abord (la plus rapide)
  const m = mem.get(key) as Entry<T> | undefined;
  if (m) return m.data;
  // 2. localStorage (survit aux rechargements)
  try {
    const raw = localStorage.getItem(lsKey(key));
    if (raw) {
      const e = JSON.parse(raw) as Entry<T>;
      if (Date.now() - e.ts < MAX_STALE_MS) {
        mem.set(key, e); // promote en mémoire
        return e.data;
      }
      localStorage.removeItem(lsKey(key));
    }
  } catch {
    /* localStorage indisponible (SSR, private browsing) */
  }
  return null;
}

export function cacheSet<T>(key: string, data: T): void {
  const entry: Entry<T> = { data, ts: Date.now() };
  mem.set(key, entry);
  try {
    localStorage.setItem(lsKey(key), JSON.stringify(entry));
  } catch {
    /* quota exceeded */
  }
}

export function cacheIsStale(key: string, ttlMs: number): boolean {
  const m = mem.get(key);
  if (m) return Date.now() - m.ts > ttlMs;
  try {
    const raw = localStorage.getItem(lsKey(key));
    if (raw) {
      const e = JSON.parse(raw) as Entry<unknown>;
      return Date.now() - e.ts > ttlMs;
    }
  } catch {
    /* ignore */
  }
  return true;
}

export function cacheInvalidate(prefix: string): void {
  for (const key of mem.keys()) {
    if (key.startsWith(prefix)) mem.delete(key);
  }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX + prefix))
        localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}
