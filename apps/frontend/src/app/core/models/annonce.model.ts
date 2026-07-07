/**
 * Modèle de données pour une annonce immobilière
 */
export interface Annonce {
  id: string;
  titre: string;
  description: string;
  type: TypeAnnonce;
  typeBien?: string;
  prix: number;
  adresse: {
    quartier: string;
    ville: string;
    adresseComplete?: string;
  };
  bienId: string;
  photos: string[];
  statut: StatutAnnonce;
  dateCreation: Date;
  dateExpiration: Date;
  contact: {
    nom: string;
    telephone: string;
    email?: string;
    note?: number;
    nombreBiensGeres?: number;
  };
}

export enum TypeAnnonce {
  LOCATION = 'LOCATION',
  VENTE = 'VENTE'
}

export enum StatutAnnonce {
  ACTIVE = 'ACTIVE',
  RESERVEE = 'RESERVEE',
  VENDUE = 'VENDUE',
  EXPIREE = 'EXPIREE'
}
