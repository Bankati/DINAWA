import { Injectable } from '@nestjs/common';

interface Entry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly store = new Map<string, Entry<unknown>>();

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as Entry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  del(key: string): void {
    this.store.delete(key);
  }

  delByPrefix(prefix: string): void {
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) this.store.delete(k);
    }
  }

  // Raccourci : retourne le cache si valide, sinon exécute fn() et met en cache
  async wrap<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fn();
    this.set(key, value, ttlMs);
    return value;
  }
}
