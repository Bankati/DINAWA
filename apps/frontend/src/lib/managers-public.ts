import { api } from "./api";

export interface PublicManagerSummary {
  id: string;
  firstName: string;
  lastName: string;
  city: string | null;
  zonesOfIntervention: string[];
  ratingAverage: number;
  ratingCount: number;
  memberSince: string;
}

export interface PublicManagerReview {
  id: string;
  rating: number;
  comment: string | null;
  ownerName: string;
  createdAt: string;
}

export interface PublicManagerPortfolio {
  totalManagedProperties: number;
  byType: Array<{ type: string; count: number }>;
}

export interface PublicManagerDetail extends PublicManagerSummary {
  /** Réservé aux appelants authentifiés — c'est l'email à utiliser pour créer une délégation. */
  email: string | null;
  pricingNote: string | null;
  portfolio: PublicManagerPortfolio;
  reviews: PublicManagerReview[];
}

export interface PaginatedPublicManagers {
  data: PublicManagerSummary[];
  page: number;
  limit: number;
  total: number;
}

export interface PublicManagersFilters {
  page?: number;
  limit?: number;
  zone?: string;
  minRating?: number;
  search?: string;
}

export function getPublicManagers(
  filters: PublicManagersFilters = {},
): Promise<PaginatedPublicManagers> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.minRating !== undefined)
    params.set("minRating", String(filters.minRating));
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  return api.get<PaginatedPublicManagers>(
    `/public/managers${qs ? `?${qs}` : ""}`,
  );
}

export function getPublicManagerById(id: string): Promise<PublicManagerDetail> {
  return api.get<PublicManagerDetail>(`/public/managers/${id}`);
}
