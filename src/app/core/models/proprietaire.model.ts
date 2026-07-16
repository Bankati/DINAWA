/**
 * Modèle de données pour un propriétaire
 */
export interface Proprietaire {
  id: string;
  nom: string;
  prenoms: string;
  email?: string;
  telephone: string;
  adresse: {
    quartier: string;
    ville: string;
    adresseComplete?: string;
  };
  pieceIdentite: {
    type: 'CNI' | 'PASSEPORT' | 'CARTE_RESIDENCE';
    numero: string;
    dateExpiration?: Date;
  };
  statut: StatutProprietaire;
  nbBiens: number;
  dateCreation: Date;
}

export enum StatutProprietaire {
  ACTIF = 'ACTIF',
  INACTIF = 'INACTIF',
  SUSPENDU = 'SUSPENDU'
}
