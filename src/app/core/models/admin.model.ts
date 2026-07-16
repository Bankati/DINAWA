export enum RoleUtilisateur {
  PROPRIETAIRE = 'PROPRIETAIRE',
  LOCATAIRE = 'LOCATAIRE',
  GESTIONNAIRE = 'GESTIONNAIRE',
  ADMINISTRATEUR = 'ADMINISTRATEUR'
}

export enum StatutCompte {
  ACTIF = 'ACTIF',
  SUSPENDU = 'SUSPENDU',
  EN_ATTENTE = 'EN_ATTENTE'
}

export interface CompteUtilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  role: RoleUtilisateur;
  statut: StatutCompte;
  dateInscription: string;
  derniereConnexion?: string;
  nombreBiens?: number;
}

export enum StatutTransaction {
  REUSSIE = 'REUSSIE',
  EN_ATTENTE = 'EN_ATTENTE',
  ECHOUEE = 'ECHOUEE'
}

export interface TransactionSupervisee {
  id: string;
  reference: string;
  montant: number;
  commission: number;
  modePaiement: 'T_MONEY' | 'FLOOZ' | 'ESPECES';
  statut: StatutTransaction;
  date: string;
  proprietaire: string;
  locataire: string;
  bien: string;
}

export enum StatutLitige {
  OUVERT = 'OUVERT',
  EN_COURS = 'EN_COURS',
  RESOLU = 'RESOLU',
  REJETE = 'REJETE'
}

export enum PrioriteLitige {
  BASSE = 'BASSE',
  MOYENNE = 'MOYENNE',
  HAUTE = 'HAUTE'
}

export interface Litige {
  id: string;
  sujet: string;
  description: string;
  statut: StatutLitige;
  priorite: PrioriteLitige;
  plaignant: string;
  misEnCause: string;
  dateOuverture: string;
  dateResolution?: string;
  resolution?: string;
}

export interface RepartitionVille {
  ville: string;
  pourcentage: number;
}

export interface StatistiquesPlateforme {
  nombreUtilisateurs: number;
  nombreProprietaires: number;
  nombreLocataires: number;
  nombreGestionnaires: number;
  nombreBiens: number;
  nombreBiensOccupes: number;
  volumeTransactionsMois: number;
  commissionsMois: number;
  nombreLitigesOuverts: number;
  tauxOccupation: number;
  croissanceUtilisateursMois: number;
  repartitionVilles: RepartitionVille[];
}
