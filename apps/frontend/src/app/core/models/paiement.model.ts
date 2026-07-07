/**
 * Modèle de données pour un paiement de loyer
 */
export interface Paiement {
  id: string;
  bienId: string;
  locataireId: string;
  montant: number; // Montant payé en FCFA
  montantEcheance: number; // Montant de l'échéance en FCFA
  frequence: FrequencePaiement;
  datePaiement: Date;
  dateEcheance: Date;
  statut: StatutPaiement;
  modePaiement: ModePaiement;
  numeroTransaction?: string;
  quittanceUrl?: string;
}

export enum FrequencePaiement {
  MENSUEL = 'MENSUEL',
  TRIMESTRIEL = 'TRIMESTRIEL',
  SEMESTRIEL = 'SEMESTRIEL',
  ANNUEL = 'ANNUEL'
}

export enum StatutPaiement {
  PAYE = 'PAYE',
  PARTIEL = 'PARTIEL',
  EN_RETARD = 'EN_RETARD',
  IMPAYE = 'IMPAYE'
}

export enum ModePaiement {
  T_MONEY = 'T_MONEY',
  FLOOZ = 'FLOOZ',
  ESPECES = 'ESPECES'
}
