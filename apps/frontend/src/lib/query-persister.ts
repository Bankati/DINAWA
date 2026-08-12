import { get, set, del } from "idb-keyval";
import type { Persister } from "@tanstack/react-query-persist-client";

// IndexedDB plutôt que localStorage — pas de limite ~5 Mo, ne bloque jamais
// le thread principal (idb-keyval est asynchrone). Support offline-first :
// les données React Query survivent à une fermeture de l'onglet/app.
export function createIDBPersister(
  key: string = "warah-query-cache",
): Persister {
  return {
    persistClient: async (client) => {
      await set(key, client);
    },
    restoreClient: async () => {
      return await get(key);
    },
    removeClient: async () => {
      await del(key);
    },
  };
}
