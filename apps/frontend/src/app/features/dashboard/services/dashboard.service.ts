import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { StatutPaiement } from '@core/models/paiement.model';
import { StatutBien } from '@core/models/bien.model';

export interface DashboardKPI {
  totalBiens: number;
  biensOccupes: number;
  biensVacants: number;
  totalLocataires: number;
  revenusMensuels: number;
  revenusAnnuels: number;
  impayes: number;
  tauxOccupation: number;
}

export interface RevenuMensuel {
  mois: string;
  montant: number;
  paiements: number;
}

export interface Alerte {
  id: string;
  type: 'retard' | 'impaye' | 'bientot_expire' | 'maintenance';
  titre: string;
  description: string;
  date: Date;
  priorite: 'haute' | 'moyenne' | 'basse';
  bienId?: string;
  locataireId?: string;
}

export interface DernierPaiement {
  id: string;
  locataire: string;
  bien: string;
  montant: number;
  date: Date;
  statut: StatutPaiement;
}

export interface DernierBien {
  id: string;
  titre: string;
  type: string;
  ville: string;
  loyer: number;
  statut: StatutBien;
  dateAjout: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://localhost:3000/api/dashboard';

  constructor(private http: HttpClient) {}

  /**
   * Récupère les KPIs du tableau de bord
   */
  getKPIs(): Observable<DashboardKPI> {
    return this.http.get<DashboardKPI>(`${this.apiUrl}/kpis`).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la récupération des KPIs:', error);
        // Retourner des données mockées en cas d'erreur
        return of(this.getMockKPIs());
      })
    );
  }

  /**
   * Récupère les revenus mensuels pour le graphique
   */
  getRevenusMensuels(annee: number = new Date().getFullYear()): Observable<RevenuMensuel[]> {
    return this.http.get<RevenuMensuel[]>(`${this.apiUrl}/revenus/${annee}`).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la récupération des revenus:', error);
        return of(this.getMockRevenus());
      })
    );
  }

  /**
   * Récupère les alertes actives
   */
  getAlertes(): Observable<Alerte[]> {
    return this.http.get<Alerte[]>(`${this.apiUrl}/alertes`).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la récupération des alertes:', error);
        return of(this.getMockAlertes());
      })
    );
  }

  /**
   * Récupère les derniers paiements
   */
  getDerniersPaiements(limit: number = 5): Observable<DernierPaiement[]> {
    return this.http.get<DernierPaiement[]>(`${this.apiUrl}/paiements/recent?limit=${limit}`).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la récupération des paiements:', error);
        return of(this.getMockPaiements());
      })
    );
  }

  /**
   * Récupère les derniers biens ajoutés
   */
  getDerniersBiens(limit: number = 5): Observable<DernierBien[]> {
    return this.http.get<DernierBien[]>(`${this.apiUrl}/biens/recent?limit=${limit}`).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la récupération des biens:', error);
        return of(this.getMockBiens());
      })
    );
  }

  /**
   * Marque une alerte comme lue
   */
  marquerAlerteLue(alerteId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/alertes/${alerteId}/lire`, {}).pipe(
      catchError((error: any) => {
        console.error('Erreur lors du marquage de l\'alerte:', error);
        return of();
      })
    );
  }

  // Données mockées pour le développement
  private getMockKPIs(): DashboardKPI {
    return {
      totalBiens: 12,
      biensOccupes: 8,
      biensVacants: 4,
      totalLocataires: 8,
      revenusMensuels: 850000,
      revenusAnnuels: 10200000,
      impayes: 2,
      tauxOccupation: 67
    };
  }

  private getMockRevenus(): RevenuMensuel[] {
    return [
      { mois: 'Jan', montant: 750000, paiements: 7 },
      { mois: 'Fév', montant: 800000, paiements: 8 },
      { mois: 'Mar', montant: 850000, paiements: 8 },
      { mois: 'Avr', montant: 820000, paiements: 8 },
      { mois: 'Mai', montant: 850000, paiements: 8 },
      { mois: 'Juin', montant: 850000, paiements: 8 }
    ];
  }

  private getMockAlertes(): Alerte[] {
    return [
      {
        id: '1',
        type: 'retard',
        titre: 'Paiement en retard',
        description: 'Kofi Mensa n\'a pas payé son loyer de mai',
        date: new Date(),
        priorite: 'haute',
        bienId: '1',
        locataireId: '1'
      },
      {
        id: '2',
        type: 'impaye',
        titre: 'Loyer impayé',
        description: 'Awa Koné a 2 mois de retard',
        date: new Date(Date.now() - 86400000),
        priorite: 'haute',
        bienId: '2',
        locataireId: '2'
      },
      {
        id: '3',
        type: 'maintenance',
        titre: 'Maintenance requise',
        description: 'Plomberie à vérifier au bien #3',
        date: new Date(Date.now() - 172800000),
        priorite: 'moyenne',
        bienId: '3'
      }
    ];
  }

  private getMockPaiements(): DernierPaiement[] {
    return [
      {
        id: '1',
        locataire: 'Kofi Mensa',
        bien: 'Appartement Lomé Centre',
        montant: 100000,
        date: new Date(),
        statut: StatutPaiement.PAYE
      },
      {
        id: '2',
        locataire: 'Awa Koné',
        bien: 'Villa Sokodé',
        montant: 150000,
        date: new Date(Date.now() - 86400000),
        statut: StatutPaiement.EN_RETARD
      },
      {
        id: '3',
        locataire: 'Yao Koffi',
        bien: 'Studio Kara',
        montant: 75000,
        date: new Date(Date.now() - 172800000),
        statut: StatutPaiement.PAYE
      },
      {
        id: '4',
        locataire: 'Mame Diop',
        bien: 'Bureau Kpalimé',
        montant: 125000,
        date: new Date(Date.now() - 259200000),
        statut: StatutPaiement.IMPAYE
      },
      {
        id: '5',
        locataire: 'Kouassi Tété',
        bien: 'Magasin Lomé',
        montant: 200000,
        date: new Date(Date.now() - 345600000),
        statut: StatutPaiement.PAYE
      }
    ];
  }

  private getMockBiens(): DernierBien[] {
    return [
      {
        id: '1',
        titre: 'Appartement Lomé Centre',
        type: 'APPARTEMENT',
        ville: 'Lomé',
        loyer: 100000,
        statut: StatutBien.OCCUPE,
        dateAjout: new Date()
      },
      {
        id: '2',
        titre: 'Villa Sokodé',
        type: 'VILLA',
        ville: 'Sokodé',
        loyer: 150000,
        statut: StatutBien.OCCUPE,
        dateAjout: new Date(Date.now() - 604800000)
      },
      {
        id: '3',
        titre: 'Studio Kara',
        type: 'STUDIO',
        ville: 'Kara',
        loyer: 75000,
        statut: StatutBien.VACANT,
        dateAjout: new Date(Date.now() - 1209600000)
      },
      {
        id: '4',
        titre: 'Bureau Kpalimé',
        type: 'BUREAU',
        ville: 'Kpalimé',
        loyer: 125000,
        statut: StatutBien.OCCUPE,
        dateAjout: new Date(Date.now() - 1814400000)
      },
      {
        id: '5',
        titre: 'Magasin Lomé',
        type: 'COMMERCIAL',
        ville: 'Lomé',
        loyer: 200000,
        statut: StatutBien.VACANT,
        dateAjout: new Date(Date.now() - 2419200000)
      }
    ];
  }
}
