import { api } from "./api";

export type PropertyType = "VILLA" | "APARTMENT" | "STUDIO" | "COMMERCIAL";
export type PropertyStatus = "OCCUPIED" | "VACANT" | "RENOVATION" | "ARCHIVED";

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  VILLA: "Villa",
  APARTMENT: "Appartement",
  STUDIO: "Studio",
  COMMERCIAL: "Local commercial",
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  OCCUPIED: "Occupé",
  VACANT: "Vacant",
  RENOVATION: "En travaux",
  ARCHIVED: "Archivé",
};

export interface PropertyPhoto {
  id: string;
  url: string;
  position: number;
}

// Correspond au type retourné par GET /api/properties[/:id]
export interface Property {
  id: string;
  ownerId: string;
  type: PropertyType;
  status: PropertyStatus;
  address: string;
  neighborhood: string;
  city: string;
  surfaceArea: number;
  roomsCount: number | null;
  monthlyRent: number;
  monthlyCharges: number;
  description: string | null;
  photos: PropertyPhoto[];
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Correspond à CreatePropertyDto — jamais de status/ownerId, voir backend
export interface CreatePropertyDto {
  type: PropertyType;
  address: string;
  neighborhood: string;
  city: string;
  surfaceArea: number;
  roomsCount?: number;
  monthlyRent: number;
  monthlyCharges?: number;
  description?: string;
}

// Correspond à UpdatePropertyDto — `status` uniquement VACANT/RENOVATION,
// OCCUPIED est piloté par la création d'un bail, ARCHIVED par archive()
export type UpdatePropertyDto = Partial<CreatePropertyDto> & {
  status?: "VACANT" | "RENOVATION";
};

export interface PaginatedProperties {
  data: Property[];
  page: number;
  limit: number;
  total: number;
}

export const propertiesApi = {
  // Le backend ne filtre que par statut/pagination (pas de recherche texte,
  // type ou ville côté serveur) — limit élevé pour charger tout le
  // portefeuille en un appel, filtres complémentaires appliqués côté client.
  list: (status?: PropertyStatus) =>
    api.get<PaginatedProperties>(
      `/properties?limit=500${status ? `&status=${status}` : ""}`,
    ),

  getById: (id: string) => api.get<Property>(`/properties/${id}`),

  create: (dto: CreatePropertyDto) => api.post<Property>("/properties", dto),

  update: (id: string, dto: UpdatePropertyDto) =>
    api.patch<Property>(`/properties/${id}`, dto),

  // Archivage logique — jamais de suppression physique
  archive: (id: string) => api.delete<Property>(`/properties/${id}`),

  addPhotos: (id: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append("photos", f));
    return api.post<PropertyPhoto[]>(`/properties/${id}/photos`, formData);
  },

  removePhoto: (propertyId: string, photoId: string) =>
    api.delete<void>(`/properties/${propertyId}/photos/${photoId}`),
};
