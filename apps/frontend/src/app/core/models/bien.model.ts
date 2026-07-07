/**
 * Modèle de données pour un bien immobilier
 */
export interface Bien {
  id: string;
  proprietaireId: string;
  titre: string;
  adresse: {
    quartier: string;
    ville: string;
    adresseComplete?: string;
  };
  typeBien: TypeBien;
  surface: number; // en m²
  nbPieces: number;
  loyer: number; // en FCFA
  charges?: number; // en FCFA, optionnel
  statut: StatutBien;
  photos: string[]; // URLs des photos (max 10)
  dateCreation: Date;
  locataireActuelId?: string;
  description?: string;
}

export enum TypeBien {
  VILLA = 'VILLA',
  APPARTEMENT = 'APPARTEMENT',
  STUDIO = 'STUDIO',
  CHAMBRE = 'CHAMBRE',
  BUREAU = 'BUREAU',
  LOCAL = 'LOCAL'
}

export enum StatutBien {
  OCCUPE = 'OCCUPE',
  VACANT = 'VACANT',
  EN_TRAVAUX = 'EN_TRAVAUX',
  ARCHIVE = 'ARCHIVE'
}
