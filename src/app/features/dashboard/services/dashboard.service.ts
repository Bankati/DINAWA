import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StatutPaiement } from '@core/models/paiement.model';
import { PropertyStatus } from '@core/models/bien.model';
import { environment } from '@env/environment';

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
  neighborhood: string;
  type: string;
  city: string;
  monthlyRent: number;
  status: PropertyStatus;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  getKPIs(): Observable<DashboardKPI> {
    return this.http.get<DashboardKPI>(`${this.apiUrl}/kpis`);
  }

  getRevenusMensuels(annee: number = new Date().getFullYear()): Observable<RevenuMensuel[]> {
    return this.http.get<RevenuMensuel[]>(`${this.apiUrl}/revenus/${annee}`);
  }

  getAlertes(): Observable<Alerte[]> {
    return this.http.get<Alerte[]>(`${this.apiUrl}/alertes`);
  }

  getDerniersPaiements(limit: number = 5): Observable<DernierPaiement[]> {
    return this.http.get<any[]>(`${this.apiUrl}/paiements/recent`, { params: { limit } }).pipe(
      map(items => items.map(p => ({
        ...p,
        statut: this.mapStatutPaiement(p.statut),
      })))
    );
  }

  getDerniersBiens(limit: number = 5): Observable<DernierBien[]> {
    return this.http.get<any[]>(`${this.apiUrl}/biens/recent`, { params: { limit } }).pipe(
      map(items => items as DernierBien[])
    );
  }

  marquerAlerteLue(alerteId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/alertes/${alerteId}/lire`, {});
  }

  private mapStatutPaiement(s: string): StatutPaiement {
    const m: Record<string, StatutPaiement> = {
      PAID:    StatutPaiement.PAYE,
      PARTIAL: StatutPaiement.PARTIEL,
      LATE:    StatutPaiement.EN_RETARD,
      OVERDUE: StatutPaiement.IMPAYE,
      PENDING: StatutPaiement.EN_RETARD,
      PENDING_CONFIRMATION: StatutPaiement.EN_RETARD,
      REJECTED: StatutPaiement.IMPAYE,
    };
    return m[s] ?? (s as StatutPaiement);
  }
}
