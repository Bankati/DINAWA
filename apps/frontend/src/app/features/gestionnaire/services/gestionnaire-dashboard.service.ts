import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface GestionnaireKPI {
  portefeuille: number;
  tauxOccupation: number;
  revenusMensuels: number;
  commissions: number;
}

export interface GestionnaireAlerte {
  id: string;
  type: 'critical' | 'warning' | 'info';
  titre: string;
  detail: string;
  badge: string;
}

export interface GestionnaireBien {
  id: string;
  titre: string;
  adresse: string;
  loyer: number;
  statut: 'OCCUPE' | 'VACANT';
}

@Injectable({ providedIn: 'root' })
export class GestionnaireDashboardService {
  private readonly apiUrl = `${environment.apiUrl}/gestionnaire/dashboard`;

  constructor(private http: HttpClient) {}

  getKPIs(): Observable<GestionnaireKPI> {
    return this.http.get<GestionnaireKPI>(`${this.apiUrl}/kpis`);
  }

  getAlertes(): Observable<GestionnaireAlerte[]> {
    return this.http.get<GestionnaireAlerte[]>(`${this.apiUrl}/alertes`);
  }

  getBiensRecents(): Observable<GestionnaireBien[]> {
    return this.http.get<GestionnaireBien[]>(`${this.apiUrl}/biens-recents`);
  }

  traiterAlerte(alerteId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/alertes/${alerteId}/traiter`, {});
  }
}
