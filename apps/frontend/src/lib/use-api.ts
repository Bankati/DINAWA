"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "./api";
import { cacheGet, cacheSet, cacheIsStale } from "./cache";

// TTL après lequel on rafraîchit en arrière-plan (la donnée reste affichée)
export const TTL = {
  LIST: 30_000, // listes — refresh silencieux après 30s
  DETAIL: 60_000, // détails — refresh après 60s
  STABLE: 5 * 60_000, // données peu volatiles — 5 min
};

interface UseApiResult<T> {
  data: T | null;
  loading: boolean; // true SEULEMENT si aucune donnée en cache (premier chargement)
  error: string;
  reload: () => void;
}

export function useApi<T>(
  path: string | null,
  ttlMs: number = TTL.LIST,
): UseApiResult<T> {
  const cached = path ? cacheGet<T>(path) : null;

  const [data, setData] = useState<T | null>(cached);
  // loading = true seulement quand on n'a rien du tout à montrer
  const [loading, setLoading] = useState<boolean>(!cached && !!path);
  const [error, setError] = useState("");
  const counter = useRef(0);

  const doFetch = useCallback((p: string, showLoader: boolean) => {
    const id = ++counter.current;
    if (showLoader) setLoading(true);
    setError("");

    api
      .get<T>(p)
      .then((d) => {
        if (id !== counter.current) return;
        cacheSet(p, d);
        setData(d);
      })
      .catch((e) => {
        if (id !== counter.current) return;
        // Si on avait des données en cache, on ne montre pas l'erreur — on garde ce qu'on a
        if (!data) setError(e?.message ?? "Erreur de chargement");
      })
      .finally(() => {
        if (id === counter.current) setLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!path) return;

    // Resynchronise volontairement au changement de `path` (pas seulement au
    // montage, déjà couvert par l'initialiseur de useState ci-dessus).
    const c = cacheGet<T>(path);
    if (c) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(c);
      setLoading(false);
      // Stale ? Rafraîchir en silence (pas de loader, données restent visibles)
      if (cacheIsStale(path, ttlMs)) doFetch(path, false);
    } else {
      doFetch(path, true);
    }

    return () => {
      counter.current++;
    }; // annule la requête en vol si path change
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => {
    if (path) doFetch(path, !data);
  }, [path, data, doFetch]);

  return { data, loading, error, reload };
}
