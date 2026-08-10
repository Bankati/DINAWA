import { api } from "./api";
import { formatFcfa } from "./format";

export type PropertyType = "VILLA" | "APARTMENT" | "STUDIO" | "COMMERCIAL";
export type PropertyStatus = "OCCUPIED" | "VACANT" | "RENOVATION" | "ARCHIVED";
export type PaymentStatus =
  | "PENDING"
  | "PENDING_CONFIRMATION"
  | "PAID"
  | "PARTIAL"
  | "LATE"
  | "OVERDUE"
  | "REJECTED";

export interface DashboardKPI {
  totalBiens: number;
  biensOccupes: number;
  biensVacants: number;
  totalLocataires: number;
  revenusMensuels: number;
  revenusAnnuels: number;
  impayes: number;
  tauxOccupation: number;
}

export interface RevenuMensuel {
  mois: string;
  montant: number;
  paiements: number;
}

export interface Alerte {
  id: string;
  type: "retard" | "impaye" | "bientot_expire" | "maintenance";
  titre: string;
  description: string;
  priorite: "haute" | "moyenne" | "basse";
}

export interface DernierPaiement {
  id: string;
  locataire: string;
  bien: string;
  montant: number;
  date: string | null;
  statut: PaymentStatus;
}

export interface DernierBien {
  id: string;
  neighborhood: string;
  type: PropertyType;
  city: string;
  monthlyRent: number;
  status: PropertyStatus;
  createdAt: string;
}

// Forme exacte de GET /dashboard?annee= (DashboardSummary côté backend) —
// calculée entièrement côté serveur, jamais ré-agrégée côté client (voir
// dashboard.service.ts : totalBiens/impayes/revenus... déjà scopés par
// propertyVisibilityWhere(user)).
interface DashboardData {
  kpis: DashboardKPI;
  revenusMensuels: RevenuMensuel[];
  derniersBiens: DernierBien[];
  derniersPaiements: DernierPaiement[];
}

let cache: { annee: number; promise: Promise<DashboardData> } | null = null;

const LS_KEY = "warah_dashboard_cache";

export function getDashboardStale(annee: number): DashboardData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.annee !== annee) return null;
    return parsed.data as DashboardData;
  } catch {
    return null;
  }
}

function saveDashboardCache(annee: number, data: DashboardData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ annee, data }));
  } catch {
    /* ignore */
  }
}

export function invalidateDashboardCache(): void {
  cache = null;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
  }
}

function getData(annee: number): Promise<DashboardData> {
  if (cache && cache.annee === annee) return cache.promise;
  const promise = api
    .get<DashboardData>(`/dashboard?annee=${annee}`)
    .then((data) => {
      saveDashboardCache(annee, data);
      return data;
    });
  cache = { annee, promise };
  return promise;
}

export async function getKPIs(
  annee = new Date().getFullYear(),
): Promise<DashboardKPI> {
  return (await getData(annee)).kpis;
}
export async function getRevenusMensuels(
  annee = new Date().getFullYear(),
): Promise<RevenuMensuel[]> {
  return (await getData(annee)).revenusMensuels;
}
// Aucun cron de génération d'alertes lisibles n'existe encore côté backend
// pour le propriétaire (seul le gestionnaire a GET /dashboard/manager/alerts)
// — liste honnêtement vide plutôt que simulée.
export async function getAlertes(): Promise<Alerte[]> {
  return [];
}
export async function getDerniersPaiements(): Promise<DernierPaiement[]> {
  return (await getData(new Date().getFullYear())).derniersPaiements;
}
export async function getDerniersBiens(): Promise<DernierBien[]> {
  return (await getData(new Date().getFullYear())).derniersBiens;
}

export const fcfa = formatFcfa;
