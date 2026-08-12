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

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  VILLA: "Villa",
  APARTMENT: "Appartement",
  STUDIO: "Studio",
  COMMERCIAL: "Commercial",
};

const MOIS_COURTS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];
const MOIS_LONGS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

// `mois` est toujours au format "YYYY-MM" (voir DashboardService.bucketByMonth
// côté backend) — parsing manuel plutôt que Date() pour éviter tout piège de
// fuseau horaire sur un simple libellé d'axe.
export function formatMoisCourt(mois: string): string {
  const [, m] = mois.split("-").map(Number);
  return m >= 1 && m <= 12 ? MOIS_COURTS[m - 1] : mois;
}
export function formatMoisLong(mois: string): string {
  const [y, m] = mois.split("-").map(Number);
  return m >= 1 && m <= 12 ? `${MOIS_LONGS[m - 1]} ${y}` : mois;
}

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

export interface RepartitionType {
  type: string;
  montant: number;
  nombreBiens: number;
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

// Forme exacte de GET /dashboard?annee=&mois= (DashboardSummary côté backend)
// — calculée entièrement côté serveur, jamais ré-agrégée côté client (voir
// dashboard.service.ts : totalBiens/impayes/revenus... déjà scopés par
// propertyVisibilityWhere(user)).
interface DashboardData {
  kpis: DashboardKPI;
  revenusMensuels: RevenuMensuel[];
  repartitionLoyersParType: RepartitionType[];
  derniersBiens: DernierBien[];
  derniersPaiements: DernierPaiement[];
}

let cache: { key: string; promise: Promise<DashboardData> } | null = null;

const LS_KEY = "warah_dashboard_cache";

function cacheKey(annee: number, mois: number): string {
  return `${annee}-${mois}`;
}

export function getDashboardStale(
  annee: number,
  mois: number,
): DashboardData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.key !== cacheKey(annee, mois)) return null;
    return parsed.data as DashboardData;
  } catch {
    return null;
  }
}

function saveDashboardCache(
  annee: number,
  mois: number,
  data: DashboardData,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ key: cacheKey(annee, mois), data }),
    );
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

function getData(annee: number, mois: number): Promise<DashboardData> {
  const key = cacheKey(annee, mois);
  if (cache && cache.key === key) return cache.promise;
  const promise = api
    .get<DashboardData>(`/dashboard?annee=${annee}&mois=${mois}`)
    .then((data) => {
      saveDashboardCache(annee, mois, data);
      return data;
    });
  cache = { key, promise };
  return promise;
}

export async function getKPIs(
  annee = new Date().getFullYear(),
  mois = new Date().getMonth() + 1,
): Promise<DashboardKPI> {
  return (await getData(annee, mois)).kpis;
}
export async function getRevenusMensuels(
  annee = new Date().getFullYear(),
  mois = new Date().getMonth() + 1,
): Promise<RevenuMensuel[]> {
  return (await getData(annee, mois)).revenusMensuels;
}
export async function getRepartitionLoyersParType(
  annee = new Date().getFullYear(),
  mois = new Date().getMonth() + 1,
): Promise<RepartitionType[]> {
  return (await getData(annee, mois)).repartitionLoyersParType;
}
export async function getDerniersPaiements(
  annee = new Date().getFullYear(),
  mois = new Date().getMonth() + 1,
): Promise<DernierPaiement[]> {
  return (await getData(annee, mois)).derniersPaiements;
}
export async function getDerniersBiens(
  annee = new Date().getFullYear(),
  mois = new Date().getMonth() + 1,
): Promise<DernierBien[]> {
  return (await getData(annee, mois)).derniersBiens;
}

export const fcfa = formatFcfa;
