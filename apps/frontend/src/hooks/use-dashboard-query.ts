"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  DashboardKPI,
  RevenuMensuel,
  RepartitionType,
  DernierPaiement,
  DernierBien,
} from "@/lib/dashboard";

export interface DashboardData {
  kpis: DashboardKPI;
  revenusMensuels: RevenuMensuel[];
  repartitionLoyersParType: RepartitionType[];
  derniersBiens: DernierBien[];
  derniersPaiements: DernierPaiement[];
}

// Remplace le cache maison de lib/dashboard.ts (localStorage + promesse
// partagée) pour la page pilote — React Query gère déjà staleTime/cache,
// et le PersistQueryClientProvider (voir components/providers.tsx) le rend
// automatiquement offline-first via IndexedDB, sans code supplémentaire ici.
export function useDashboardQuery(annee: number, mois: number) {
  return useQuery({
    queryKey: ["dashboard", annee, mois],
    queryFn: () =>
      api.get<DashboardData>(`/dashboard?annee=${annee}&mois=${mois}`),
    placeholderData: (previous) => previous,
  });
}
