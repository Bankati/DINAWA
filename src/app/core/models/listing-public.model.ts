export type PropertyType = 'APARTMENT' | 'VILLA' | 'STUDIO' | 'COMMERCIAL';

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
  APARTMENT: 'Appartement',
  VILLA: 'Villa',
  STUDIO: 'Studio',
  COMMERCIAL: 'Bureau / Commerce',
};
