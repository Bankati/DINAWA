/**
 * Modèle de données pour un locataire
 */
export interface Locataire {
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
  dateNaissance?: Date;
  pieceIdentite: {
    type: 'CNI' | 'PASSEPORT' | 'CARTE_RESIDENCE';
    numero: string;
    dateExpiration?: Date;
  };
  bienId: string;
  dateDebutBail: Date;
  dateFinBail?: Date;
  caution?: number;
  garantNom?: string;
  garantTelephone?: string;
  statut: StatutLocataire;
  dateCreation: Date;
}

export enum StatutLocataire {
  ACTIF = 'ACTIF',
  INACTIF = 'INACTIF',
  EN_RETARD = 'EN_RETARD'
}
