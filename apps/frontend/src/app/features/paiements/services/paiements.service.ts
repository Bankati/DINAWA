import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Paiement, StatutPaiement, FrequencePaiement, ModePaiement } from '../../../core/models/paiement.model';

export interface PaiementsFilters {
  statut?: StatutPaiement;
  bienId?: string;
  locataireId?: string;
  dateDebut?: Date;
  dateFin?: Date;
  montantMin?: number;
  montantMax?: number;
}

export interface PaiementRequest {
  locataireId: string;
  bienId: string;
  montant: number;
  montantEcheance: number;
  frequence: FrequencePaiement;
  datePaiement: Date;
  dateEcheance: Date;
  modePaiement: ModePaiement;
  numeroTransaction?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaiementsService {
  private apiUrl = 'http://localhost:3000/api/paiements';

  constructor(private http: HttpClient) {}

  /**
   * Récupère tous les paiements avec filtres optionnels
   */
  getPaiements(filters?: PaiementsFilters): Observable<Paiement[]> {
    let url = this.apiUrl;
    
    if (filters) {
      const params = new URLSearchParams();
      if (filters.statut) params.append('statut', filters.statut);
      if (filters.bienId) params.append('bienId', filters.bienId);
      if (filters.locataireId) params.append('locataireId', filters.locataireId);
      if (filters.dateDebut) params.append('dateDebut', filters.dateDebut.toISOString());
      if (filters.dateFin) params.append('dateFin', filters.dateFin.toISOString());
      if (filters.montantMin) params.append('montantMin', filters.montantMin.toString());
      if (filters.montantMax) params.append('montantMax', filters.montantMax.toString());
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    return this.http.get<Paiement[]>(url).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la récupération des paiements:', error);
        return of(this.getMockPaiements());
      })
    );
  }

  /**
   * Récupère un paiement par son ID
   */
  getPaiementById(id: string): Observable<Paiement> {
    return this.http.get<Paiement>(`${this.apiUrl}/${id}`).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la récupération du paiement:', error);
        const mockPaiement = this.getMockPaiements().find(p => p.id === id);
        return of(mockPaiement || this.getMockPaiements()[0]);
      })
    );
  }

  /**
   * Crée un nouveau paiement
   */
  createPaiement(paiement: PaiementRequest): Observable<Paiement> {
    return this.http.post<Paiement>(this.apiUrl, paiement).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la création du paiement:', error);
        const newPaiement: Paiement = {
          id: Math.random().toString(36).substr(2, 9),
          locataireId: paiement.locataireId,
          bienId: paiement.bienId,
          montant: paiement.montant,
          montantEcheance: paiement.montantEcheance,
          frequence: paiement.frequence as FrequencePaiement,
          datePaiement: paiement.datePaiement,
          dateEcheance: paiement.dateEcheance,
          modePaiement: paiement.modePaiement as ModePaiement,
          statut: StatutPaiement.PAYE,
          numeroTransaction: paiement.numeroTransaction
        };
        return of(newPaiement);
      })
    );
  }

  /**
   * Met à jour un paiement existant
   */
  updatePaiement(id: string, paiement: Partial<Paiement>): Observable<Paiement> {
    return this.http.put<Paiement>(`${this.apiUrl}/${id}`, paiement).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la mise à jour du paiement:', error);
        const existing = this.getMockPaiements().find(p => p.id === id);
        if (existing) {
          const updatedPaiement: Paiement = { ...existing, ...paiement };
          return of(updatedPaiement);
        }
        return of();
      })
    );
  }

  /**
   * Supprime un paiement
   */
  deletePaiement(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la suppression du paiement:', error);
        return of();
      })
    );
  }

  /**
   * Récupère les impayés
   */
  getImpayes(): Observable<Paiement[]> {
    return this.http.get<Paiement[]>(`${this.apiUrl}/impayes`).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la récupération des impayés:', error);
        return of(this.getMockPaiements().filter(p => p.statut === StatutPaiement.IMPAYE));
      })
    );
  }

  /**
   * Envoie un rappel de paiement
   */
  envoyerRappel(paiementId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${paiementId}/rappel`, {}).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de l\'envoi du rappel:', error);
        return of();
      })
    );
  }

  /**
   * Récupère les statistiques de paiements
   */
  getStatistiques(): Observable<{
    total: number;
    totalMontant: number;
    payes: number;
    impayes: number;
    enRetard: number;
    tauxRecouvrement: number;
  }> {
    return this.http.get<any>(`${this.apiUrl}/statistiques`).pipe(
      catchError((error: any) => {
        console.error('Erreur lors de la récupération des statistiques:', error);
        return of(this.getMockStatistiques());
      })
    );
  }

  /**
   * Traite un paiement mobile money (T-Money/Flooz)
   */
  processMobileMoneyPayment(paymentData: {
    bienId: string;
    provider: 'tmoney' | 'flooz';
    telephone: string;
    pin: string;
    montant: number;
    periode: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/mobile-money`, paymentData).pipe(
      catchError((error: any) => {
        console.error('Erreur lors du paiement mobile money:', error);
        // Simulation de succès pour le développement
        return of({
          success: true,
          transactionId: 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
          montant: paymentData.montant,
          date: new Date().toISOString()
        });
      })
    );
  }

  // Données mockées pour le développement
  private getMockPaiements(): Paiement[] {
    return [
      {
        id: '1',
        locataireId: '1',
        bienId: '1',
        montant: 100000,
        montantEcheance: 100000,
        frequence: FrequencePaiement.MENSUEL,
        datePaiement: new Date('2024-06-01'),
        dateEcheance: new Date('2024-06-01'),
        modePaiement: ModePaiement.T_MONEY,
        statut: StatutPaiement.PAYE,
        numeroTransaction: 'TM123456'
      },
      {
        id: '2',
        locataireId: '2',
        bienId: '2',
        montant: 150000,
        montantEcheance: 150000,
        frequence: FrequencePaiement.MENSUEL,
        datePaiement: new Date('2024-06-05'),
        dateEcheance: new Date('2024-06-01'),
        modePaiement: ModePaiement.ESPECES,
        statut: StatutPaiement.EN_RETARD,
        numeroTransaction: 'CASH789'
      },
      {
        id: '3',
        locataireId: '3',
        bienId: '3',
        montant: 0,
        montantEcheance: 75000,
        frequence: FrequencePaiement.MENSUEL,
        datePaiement: new Date(),
        dateEcheance: new Date('2024-06-01'),
        modePaiement: ModePaiement.ESPECES,
        statut: StatutPaiement.IMPAYE
      },
      {
        id: '4',
        locataireId: '4',
        bienId: '4',
        montant: 125000,
        montantEcheance: 125000,
        frequence: FrequencePaiement.MENSUEL,
        datePaiement: new Date('2024-05-01'),
        dateEcheance: new Date('2024-05-01'),
        modePaiement: ModePaiement.FLOOZ,
        statut: StatutPaiement.PAYE,
        numeroTransaction: 'FL456789'
      },
      {
        id: '5',
        locataireId: '5',
        bienId: '5',
        montant: 200000,
        montantEcheance: 200000,
        frequence: FrequencePaiement.MENSUEL,
        datePaiement: new Date('2024-05-15'),
        dateEcheance: new Date('2024-05-01'),
        modePaiement: ModePaiement.ESPECES,
        statut: StatutPaiement.PAYE,
        numeroTransaction: 'CASH123'
      }
    ];
  }

  private getMockStatistiques() {
    const paiements = this.getMockPaiements();
    const totalMontant = paiements.reduce((sum, p) => sum + p.montant, 0);
    const payes = paiements.filter(p => p.statut === StatutPaiement.PAYE).length;
    const impayes = paiements.filter(p => p.statut === StatutPaiement.IMPAYE).length;
    const enRetard = paiements.filter(p => p.statut === StatutPaiement.EN_RETARD).length;
    
    return {
      total: paiements.length,
      totalMontant,
      payes,
      impayes,
      enRetard,
      tauxRecouvrement: paiements.length > 0 ? (payes / paiements.length) * 100 : 0
    };
  }
}
