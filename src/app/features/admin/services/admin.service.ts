import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import {
  CompteUtilisateur,
  RoleUtilisateur,
  StatutCompte,
  TransactionSupervisee,
  StatutTransaction,
  Litige,
  StatutLitige,
  PrioriteLitige,
  StatistiquesPlateforme
} from '@core/models/admin.model';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  getComptes(): Observable<CompteUtilisateur[]> {
    return this.http.get<CompteUtilisateur[]>(`${this.apiUrl}/comptes`).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la récupération des comptes:', error);
        return of(this.getMockComptes());
      })
    );
  }

  changerStatutCompte(id: string, statut: StatutCompte): Observable<CompteUtilisateur> {
    return this.http.patch<CompteUtilisateur>(`${this.apiUrl}/comptes/${id}`, { statut }).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la mise à jour du compte:', error);
        const compte = this.getMockComptes().find(c => c.id === id)!;
        return of({ ...compte, statut });
      })
    );
  }

  getTransactions(): Observable<TransactionSupervisee[]> {
    return this.http.get<TransactionSupervisee[]>(`${this.apiUrl}/transactions`).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la récupération des transactions:', error);
        return of(this.getMockTransactions());
      })
    );
  }

  getLitiges(): Observable<Litige[]> {
    return this.http.get<Litige[]>(`${this.apiUrl}/litiges`).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la récupération des litiges:', error);
        return of(this.getMockLitiges());
      })
    );
  }

  resoudreLitige(id: string, resolution: string): Observable<Litige> {
    return this.http.patch<Litige>(`${this.apiUrl}/litiges/${id}`, {
      statut: StatutLitige.RESOLU,
      resolution
    }).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la résolution du litige:', error);
        const litige = this.getMockLitiges().find(l => l.id === id)!;
        return of({ ...litige, statut: StatutLitige.RESOLU, resolution, dateResolution: new Date().toISOString() });
      })
    );
  }

  getStatistiques(): Observable<StatistiquesPlateforme> {
    return this.http.get<StatistiquesPlateforme>(`${this.apiUrl}/statistiques`).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la récupération des statistiques:', error);
        return of(this.getMockStatistiques());
      })
    );
  }

  private getMockComptes(): CompteUtilisateur[] {
    return [
      { id: '1', nom: 'Kouassi', prenom: 'Jean', email: 'jean.kouassi@WARAH.tg', telephone: '+228 90 12 34 56', role: RoleUtilisateur.PROPRIETAIRE, statut: StatutCompte.ACTIF, dateInscription: '2026-01-15', derniereConnexion: '2026-06-28', nombreBiens: 5 },
      { id: '2', nom: 'Adjavon', prenom: 'Akossiwa', email: 'akossiwa.adjavon@gmail.com', telephone: '+228 91 22 33 44', role: RoleUtilisateur.LOCATAIRE, statut: StatutCompte.ACTIF, dateInscription: '2026-02-03', derniereConnexion: '2026-06-29' },
      { id: '3', nom: 'Mensah', prenom: 'Komi', email: 'komi.mensah@WARAH.tg', telephone: '+228 92 33 44 55', role: RoleUtilisateur.GESTIONNAIRE, statut: StatutCompte.ACTIF, dateInscription: '2026-01-20', derniereConnexion: '2026-06-27', nombreBiens: 18 },
      { id: '4', nom: 'Agbodjan', prenom: 'Yawa', email: 'yawa.agbodjan@hotmail.com', telephone: '+228 93 44 55 66', role: RoleUtilisateur.PROPRIETAIRE, statut: StatutCompte.SUSPENDU, dateInscription: '2026-03-10', derniereConnexion: '2026-05-02', nombreBiens: 2 },
      { id: '5', nom: 'Dossou', prenom: 'Kossi', email: 'kossi.dossou@yahoo.fr', telephone: '+228 94 55 66 77', role: RoleUtilisateur.LOCATAIRE, statut: StatutCompte.EN_ATTENTE, dateInscription: '2026-06-25' },
      { id: '6', nom: 'Tchamie', prenom: 'Essowavana', email: 'essowavana.tchamie@WARAH.tg', telephone: '+228 95 66 77 88', role: RoleUtilisateur.PROPRIETAIRE, statut: StatutCompte.ACTIF, dateInscription: '2026-04-12', derniereConnexion: '2026-06-29', nombreBiens: 9 }
    ];
  }

  private getMockTransactions(): TransactionSupervisee[] {
    return [
      { id: '1', reference: 'TXN-2026-001245', montant: 150000, commission: 7500, modePaiement: 'T_MONEY', statut: StatutTransaction.REUSSIE, date: '2026-06-28', proprietaire: 'Jean Kouassi', locataire: 'Akossiwa Adjavon', bien: 'Appartement 3 chambres Lomé Centre' },
      { id: '2', reference: 'TXN-2026-001246', montant: 85000, commission: 4250, modePaiement: 'FLOOZ', statut: StatutTransaction.REUSSIE, date: '2026-06-27', proprietaire: 'Komi Mensah', locataire: 'Kossi Dossou', bien: 'Studio Adidogomé' },
      { id: '3', reference: 'TXN-2026-001247', montant: 200000, commission: 10000, modePaiement: 'T_MONEY', statut: StatutTransaction.EN_ATTENTE, date: '2026-06-29', proprietaire: 'Essowavana Tchamie', locataire: 'Yawa Agbodjan', bien: 'Villa Agoè' },
      { id: '4', reference: 'TXN-2026-001248', montant: 120000, commission: 6000, modePaiement: 'ESPECES', statut: StatutTransaction.ECHOUEE, date: '2026-06-26', proprietaire: 'Jean Kouassi', locataire: 'Kossi Dossou', bien: 'Appartement 2 chambres Bè' },
      { id: '5', reference: 'TXN-2026-001249', montant: 95000, commission: 4750, modePaiement: 'FLOOZ', statut: StatutTransaction.REUSSIE, date: '2026-06-25', proprietaire: 'Komi Mensah', locataire: 'Akossiwa Adjavon', bien: 'Studio Tokoin' }
    ];
  }

  private getMockLitiges(): Litige[] {
    return [
      { id: '1', sujet: 'Caution non remboursée', description: 'Le locataire signale que sa caution n\'a pas été remboursée 2 mois après la fin du bail.', statut: StatutLitige.OUVERT, priorite: PrioriteLitige.HAUTE, plaignant: 'Kossi Dossou', misEnCause: 'Jean Kouassi', dateOuverture: '2026-06-20' },
      { id: '2', sujet: 'Désaccord sur l\'état des lieux', description: 'Litige concernant des dégradations constatées à la sortie du logement.', statut: StatutLitige.EN_COURS, priorite: PrioriteLitige.MOYENNE, plaignant: 'Akossiwa Adjavon', misEnCause: 'Komi Mensah', dateOuverture: '2026-06-15' },
      { id: '3', sujet: 'Paiement de loyer contesté', description: 'Le propriétaire affirme ne pas avoir reçu un paiement que le locataire dit avoir effectué.', statut: StatutLitige.RESOLU, priorite: PrioriteLitige.HAUTE, plaignant: 'Yawa Agbodjan', misEnCause: 'Essowavana Tchamie', dateOuverture: '2026-05-28', dateResolution: '2026-06-05', resolution: 'Vérification de la transaction T-Money effectuée, paiement confirmé et solde mis à jour.' },
      { id: '4', sujet: 'Annonce trompeuse', description: 'Le candidat locataire signale que les photos de l\'annonce ne correspondent pas au bien visité.', statut: StatutLitige.REJETE, priorite: PrioriteLitige.BASSE, plaignant: 'Kossi Dossou', misEnCause: 'Jean Kouassi', dateOuverture: '2026-05-10', dateResolution: '2026-05-18', resolution: 'Après vérification, les photos correspondaient au bien. Réclamation non fondée.' }
    ];
  }

  private getMockStatistiques(): StatistiquesPlateforme {
    return {
      nombreUtilisateurs: 1284,
      nombreProprietaires: 412,
      nombreLocataires: 798,
      nombreGestionnaires: 74,
      nombreBiens: 956,
      nombreBiensOccupes: 781,
      volumeTransactionsMois: 48650000,
      commissionsMois: 2432500,
      nombreLitigesOuverts: 7,
      tauxOccupation: 81.7,
      croissanceUtilisateursMois: 12.4,
      repartitionVilles: [
        { ville: 'Lomé', pourcentage: 64 },
        { ville: 'Kara', pourcentage: 14 },
        { ville: 'Sokodé', pourcentage: 11 },
        { ville: 'Atakpamé', pourcentage: 7 },
        { ville: 'Autres', pourcentage: 4 }
      ]
    };
  }
}
