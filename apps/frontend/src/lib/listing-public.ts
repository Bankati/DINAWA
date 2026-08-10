import { api } from "./api";

export type PropertyType = "APARTMENT" | "VILLA" | "STUDIO" | "COMMERCIAL";

export interface PublicListingSummary {
  id: string;
  slug: string;
  type: PropertyType;
  neighborhood: string;
  city: string;
  surfaceArea: number;
  roomsCount: number | null;
  monthlyRent: number;
  monthlyCharges: number;
  publishedAt: string;
  photo: string | null;
}

export interface PublicListingDetail {
  id: string;
  slug: string;
  type: PropertyType;
  neighborhood: string;
  city: string;
  address: string;
  surfaceArea: number;
  roomsCount: number | null;
  monthlyRent: number;
  monthlyCharges: number;
  description: string | null;
  publishedAt: string;
  photos: string[];
  contactName: string;
  contactPhone: string | null;
}

export interface PaginatedPublicListings {
  data: PublicListingSummary[];
  page: number;
  limit: number;
  total: number;
}

export interface PublicListingsFilters {
  page?: number;
  limit?: number;
  type?: PropertyType;
  city?: string;
  neighborhood?: string;
  minRent?: number;
  maxRent?: number;
  roomsCount?: number;
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  APARTMENT: "Appartement",
  VILLA: "Villa",
  STUDIO: "Studio",
  COMMERCIAL: "Bureau / Commerce",
};

export function getPublicListings(
  filters: PublicListingsFilters = {},
): Promise<PaginatedPublicListings> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.type) params.set("type", filters.type);
  if (filters.city) params.set("city", filters.city);
  if (filters.neighborhood) params.set("neighborhood", filters.neighborhood);
  if (filters.minRent !== undefined)
    params.set("minRent", String(filters.minRent));
  if (filters.maxRent !== undefined)
    params.set("maxRent", String(filters.maxRent));
  if (filters.roomsCount !== undefined)
    params.set("roomsCount", String(filters.roomsCount));
  const qs = params.toString();
  return api.get<PaginatedPublicListings>(
    `/public/listings${qs ? `?${qs}` : ""}`,
  );
}

export function getPublicListingBySlug(
  slug: string,
): Promise<PublicListingDetail> {
  return api.get<PublicListingDetail>(`/public/listings/${slug}`);
}
