'use client';

import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createIDBPersister } from '@/lib/query-persister';

// Fondation Phase 1 de la refonte design system (2026-08-11) — montée à la
// racine, sans effet visuel tant qu'aucune page n'utilise useQuery ou le
// ThemeProvider (thème par défaut = light, comportement actuel inchangé
// pour Gestionnaire/Admin/Locataire pas encore migrés).
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 24 * 60 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  const [persister] = useState(() => createIDBPersister());

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
        {children}
      </PersistQueryClientProvider>
    </ThemeProvider>
  );
}
