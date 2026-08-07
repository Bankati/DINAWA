import { api } from "./api";
import { formatFcfa } from "./format";
import { cacheGet, cacheSet } from "./cache";

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
  date: Date;
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

export interface DashboardData {
  kpis: DashboardKPI;
  revenusMensuels: RevenuMensuel[];
  derniersBiens: DernierBien[];
  derniersPaiements: DernierPaiement[];
}

// Réponse brute de l'API backend
interface ApiDashboardResponse {
  kpis: DashboardKPI;
  revenusMensuels: RevenuMensuel[];
  derniersBiens: {
    id: string;
    type: string;
    status: string;
    neighborhood: string;
    city: string;
    monthlyRent: number;
    createdAt: string;
  }[];
  derniersPaiements: {
    id: string;
    locataire: string;
    bien: string;
    montant: number;
    date: string | null;
    statut: string;
  }[];
}

let memCache: { annee: number; promise: Promise<DashboardData> } | null = null;

export function invalidateDashboardCache(): void {
  memCache = null;
}

export function getDashboardStale(annee: number): DashboardData | null {
  return cacheGet<DashboardData>(`/dashboard/${annee}`);
}

function getData(annee: number): Promise<DashboardData> {
  if (memCache && memCache.annee === annee) return memCache.promise;
  const promise = fetchDashboard(annee).then((d) => {
    cacheSet(`/dashboard/${annee}`, d);
    return d;
  });
  memCache = { annee, promise };
  return promise;
}

async function fetchDashboard(annee: number): Promise<DashboardData> {
  const raw = await api.get<ApiDashboardResponse>(`/dashboard?annee=${annee}`);

  return {
    kpis: raw.kpis,
    revenusMensuels: raw.revenusMensuels,
    derniersBiens: raw.derniersBiens.map((b) => ({
      id: b.id,
      neighborhood: b.neighborhood,
      type: b.type as PropertyType,
      city: b.city,
      monthlyRent: b.monthlyRent,
      status: b.status as PropertyStatus,
      createdAt: b.createdAt,
    })),
    derniersPaiements: raw.derniersPaiements.map((p) => ({
      id: p.id,
      locataire: p.locataire,
      bien: p.bien,
      montant: p.montant,
      date: new Date(p.date ?? p.id),
      statut: p.statut as PaymentStatus,
    })),
  };
}

export async function getKPIs(annee = new Date().getFullYear()): Promise<DashboardKPI> {
  return (await getData(annee)).kpis;
}
export async function getRevenusMensuels(annee = new Date().getFullYear()): Promise<RevenuMensuel[]> {
  return (await getData(annee)).revenusMensuels;
}
// Les alertes automatiques dépendent d'un cron non construit — liste vide honnête.
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
