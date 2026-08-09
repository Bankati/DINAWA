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

interface Bien {
  id: string;
  type: PropertyType;
  status: PropertyStatus;
  neighborhood: string;
  city: string;
  monthlyRent: number;
  createdAt: string;
}

interface PersonSummary {
  id: string;
  firstName: string;
  lastName: string;
}

interface Payment {
  id: string;
  lease?: {
    property?: { neighborhood: string; city: string };
    tenant?: PersonSummary;
  };
  status: PaymentStatus;
  paidAmount: number;
  paidAt?: string | null;
  createdAt: string;
}

interface PaginatedBiens {
  data: Bien[];
  total: number;
}
interface PaginatedPayments {
  data: Payment[];
  total: number;
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

interface DashboardData {
  kpis: DashboardKPI;
  revenusMensuels: RevenuMensuel[];
  derniersBiens: DernierBien[];
  derniersPaiements: DernierPaiement[];
}

const PAGE_LIMIT = 100;
const MAX_PAGES = 5; // plafond 500 paiements/an — largement suffisant pour un graphique mensuel

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
  const promise = buildDashboard(annee).then((data) => {
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
// Les alertes automatiques (rappels/impayés) dépendent d'un cron non
// construit côté backend — liste honnêtement vide plutôt que simulée.
export async function getAlertes(): Promise<Alerte[]> {
  return [];
}
export async function getDerniersPaiements(): Promise<DernierPaiement[]> {
  return (await getData(new Date().getFullYear())).derniersPaiements;
}
export async function getDerniersBiens(): Promise<DernierBien[]> {
  return (await getData(new Date().getFullYear())).derniersBiens;
}

async function buildDashboard(annee: number): Promise<DashboardData> {
  const yearStart = new Date(Date.UTC(annee, 0, 1)).toISOString();
  const yearEnd = new Date(Date.UTC(annee, 11, 31, 23, 59, 59)).toISOString();

  const [
    total,
    occupes,
    vacants,
    biensRecent,
    locataires,
    paiementsAnnee,
    paiementsRecents,
    overdue,
  ] = await Promise.all([
    api.get<PaginatedBiens>("/properties?limit=1"),
    api.get<PaginatedBiens>("/properties?status=OCCUPIED&limit=1"),
    api.get<PaginatedBiens>("/properties?status=VACANT&limit=1"),
    api.get<PaginatedBiens>("/properties?limit=5"),
    api.get<unknown[]>("/tenants"),
    fetchAllPaidPayments(yearStart, yearEnd),
    api.get<PaginatedPayments>("/payments?limit=5"),
    api.get<PaginatedPayments>("/payments?status=OVERDUE&limit=1"),
  ]);

  const now = new Date();
  const isCurrentYear = annee === now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  const revenusAnnuels = paiementsAnnee.reduce((s, p) => s + p.paidAmount, 0);
  const revenusMensuels = isCurrentYear
    ? paiementsAnnee
        .filter(
          (p) => p.paidAt && new Date(p.paidAt).getUTCMonth() === currentMonth,
        )
        .reduce((s, p) => s + p.paidAmount, 0)
    : 0;

  const kpis: DashboardKPI = {
    totalBiens: total.total,
    biensOccupes: occupes.total,
    biensVacants: vacants.total,
    totalLocataires: locataires.length,
    revenusMensuels,
    revenusAnnuels,
    impayes: overdue.total,
    tauxOccupation:
      total.total > 0 ? Math.round((occupes.total / total.total) * 100) : 0,
  };

  return {
    kpis,
    revenusMensuels: bucketByMonth(paiementsAnnee, annee),
    derniersBiens: biensRecent.data.map((b) => ({
      id: b.id,
      neighborhood: b.neighborhood,
      type: b.type,
      city: b.city,
      monthlyRent: b.monthlyRent,
      status: b.status,
      createdAt: b.createdAt,
    })),
    derniersPaiements: paiementsRecents.data.map(toDernierPaiement),
  };
}

function toDernierPaiement(p: Payment): DernierPaiement {
  return {
    id: p.id,
    locataire: p.lease?.tenant
      ? `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}`
      : "Locataire",
    bien: p.lease?.property
      ? `${p.lease.property.neighborhood}, ${p.lease.property.city}`
      : "Bien",
    montant: p.paidAmount,
    date: new Date(p.paidAt ?? p.createdAt),
    statut: p.status,
  };
}

function bucketByMonth(payments: Payment[], annee: number): RevenuMensuel[] {
  const buckets = new Map<string, { montant: number; paiements: number }>();
  for (let m = 0; m < 12; m++) {
    buckets.set(`${annee}-${String(m + 1).padStart(2, "0")}`, {
      montant: 0,
      paiements: 0,
    });
  }
  for (const p of payments) {
    if (!p.paidAt) continue;
    const d = new Date(p.paidAt);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.montant += p.paidAmount;
      bucket.paiements += 1;
    }
  }
  return Array.from(buckets.entries()).map(([mois, v]) => ({ mois, ...v }));
}

// Récupère tous les paiements PAID d'une période (jusqu'à MAX_PAGES pages)
// pour alimenter le graphique annuel — aucun endpoint d'agrégation SUM
// n'existe côté backend.
async function fetchAllPaidPayments(
  from: string,
  to: string,
): Promise<Payment[]> {
  const qs = (page: number) =>
    `/payments?status=PAID&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=${page}&limit=${PAGE_LIMIT}`;
  const first = await api.get<PaginatedPayments>(qs(1));
  const totalPages = Math.min(Math.ceil(first.total / PAGE_LIMIT), MAX_PAGES);
  if (totalPages <= 1) return first.data;
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      api.get<PaginatedPayments>(qs(i + 2)),
    ),
  );
  return [...first.data, ...rest.flatMap((r) => r.data)];
}

export const fcfa = formatFcfa;
