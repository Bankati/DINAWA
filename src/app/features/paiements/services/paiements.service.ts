import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Paiement, StatutPaiement, FrequencePaiement, ModePaiement } from '../../../core/models/paiement.model';
import { environment } from '@env/environment';

export interface PaiementsFilters {
  statut?: StatutPaiement;
  bienId?: string;
  locataireId?: string;
  dateDebut?: Date;
  dateFin?: Date;
  montantMin?: number;
  montantMax?: number;
}

// Champs envoyés au backend pour créer un paiement.
// Le backend ne lit que bienId, montant, modePaiement, datePaiement et note —
// il trouve lui-même le bail actif et l'échéance PENDING/OVERDUE correspondante.
// locataireId, frequence, dateEcheance et montantEcheance sont conservés dans
// l'interface pour l'affichage côté formulaire, mais ignorés par l'API.
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

@Injectable({ providedIn: 'root' })
export class PaiementsService {
  private readonly apiUrl = `${environment.apiUrl}/paiements`;

  constructor(private http: HttpClient) {}

  getPaiements(filters?: PaiementsFilters): Observable<Paiement[]> {
    let params = new HttpParams();
    if (filters?.statut)      params = params.set('statut', filters.statut);
    if (filters?.bienId)      params = params.set('bienId', filters.bienId);
    if (filters?.locataireId) params = params.set('locataireId', filters.locataireId);
    if (filters?.dateDebut)   params = params.set('dateDebut', filters.dateDebut.toISOString());
    if (filters?.dateFin)     params = params.set('dateFin', filters.dateFin.toISOString());
    if (filters?.montantMin)  params = params.set('montantMin', filters.montantMin);
    if (filters?.montantMax)  params = params.set('montantMax', filters.montantMax);
    return this.http.get<Paiement[]>(this.apiUrl, { params });
  }

  getPaiementById(id: string): Observable<Paiement> {
    return this.http.get<Paiement>(`${this.apiUrl}/${id}`);
  }

  createPaiement(paiement: PaiementRequest): Observable<Paiement> {
    return this.http.post<Paiement>(this.apiUrl, paiement);
  }

  updatePaiement(id: string, paiement: Partial<Paiement>): Observable<Paiement> {
    return this.http.put<Paiement>(`${this.apiUrl}/${id}`, paiement);
  }

  // La suppression est un no-op côté backend pour préserver l'intégrité comptable.
  deletePaiement(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Retourne les PaymentScheduleEntry en statut OVERDUE — pas les Payment rejetés.
  getImpayes(): Observable<Paiement[]> {
    return this.http.get<Paiement[]>(`${this.apiUrl}/impayes`);
  }

  envoyerRappel(paiementId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${paiementId}/rappel`, {});
  }

  getStatistiques(): Observable<{
    total: number;
    totalMontant: number;
    payes: number;
    impayes: number;
    enRetard: number;
    tauxRecouvrement: number;
  }> {
    return this.http.get<any>(`${this.apiUrl}/statistiques`);
  }

  // La quittance PDF n'est pas encore générée — le backend retourne les données brutes.
  telechargerQuittance(paiementId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${paiementId}/quittance`, { responseType: 'blob' });
  }

  envoyerQuittanceEmail(paiementId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${paiementId}/quittance/email`, {});
  }

  // Paiement Mobile Money via CashPay — intégration à implémenter côté backend.
  processMobileMoneyPayment(paymentData: {
    bienId: string;
    provider: 'tmoney' | 'flooz';
    telephone: string;
    pin: string;
    montant: number;
    periode: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/mobile-money`, paymentData);
  }
}
