// Aligné sur le modèle Property du backend (Prisma)
// Les valeurs des types correspondent exactement aux enums Prisma (anglais)

export type PropertyType = 'VILLA' | 'APARTMENT' | 'STUDIO' | 'COMMERCIAL';
export type PropertyStatus = 'OCCUPIED' | 'VACANT' | 'RENOVATION' | 'ARCHIVED';

// Labels UI en français — utiliser dans les templates, pas dans la logique
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  VILLA: 'Villa',
  APARTMENT: 'Appartement',
  STUDIO: 'Studio',
  COMMERCIAL: 'Local commercial',
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  OCCUPIED: 'Occupé',
  VACANT: 'Vacant',
  RENOVATION: 'En travaux',
  ARCHIVED: 'Archivé',
};

// Classes Tailwind par statut — pour les badges
export const PROPERTY_STATUS_CLASSES: Record<PropertyStatus, string> = {
  OCCUPIED: 'bg-green-100 text-green-800',
  VACANT: 'bg-yellow-100 text-yellow-800',
  RENOVATION: 'bg-orange-100 text-orange-800',
  ARCHIVED: 'bg-gray-100 text-gray-600',
};

export interface PropertyPhoto {
  id: string;
  url: string;
  position: number;
}

// Interface principale — correspond au type Property retourné par GET /api/properties
export interface Bien {
  id: string;
  ownerId: string;
  type: PropertyType;
  status: PropertyStatus;
  address: string;         // adresse complète (ex : "12 Rue des Cocotiers")
  neighborhood: string;    // quartier (ex : "Adewui")
  city: string;
  surfaceArea: number;     // en m²
  roomsCount?: number | null;
  monthlyRent: number;     // en FCFA
  monthlyCharges: number;
  description?: string | null;
  photos: PropertyPhoto[];
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// DTO envoyé au backend pour créer un bien — correspond à CreatePropertyDto
export interface CreateBienRequest {
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

// DTO partiel pour la mise à jour — correspond à UpdatePropertyDto
export type UpdateBienRequest = Partial<CreateBienRequest> & {
  status?: PropertyStatus;
};
