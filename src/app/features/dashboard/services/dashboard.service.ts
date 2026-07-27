import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, shareReplay, map } from 'rxjs';
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

interface BackendDashboard {
  kpis: DashboardKPI;
  revenusMensuels: RevenuMensuel[];
  derniersBiens: DernierBien[];
  derniersPaiements: DernierPaiement[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly dashboardUrl = `${environment.apiUrl}/dashboard`;

  // Cache partagé pour l'année courante — une seule requête HTTP
  // même si getKPIs(), getRevenusMensuels(), etc. sont appelés séparément.
  private cache$: Observable<BackendDashboard> | null = null;
  private cacheAnnee: number | null = null;

  constructor(private http: HttpClient) {}

  private getData(annee: number): Observable<BackendDashboard> {
    if (this.cache$ && this.cacheAnnee === annee) return this.cache$;
    this.cacheAnnee = annee;
    this.cache$ = this.http
      .get<BackendDashboard>(this.dashboardUrl, { params: { annee: annee.toString() } })
      .pipe(shareReplay(1));
    return this.cache$;
  }

  // Invalide le cache (à appeler après création/suppression d'un bien ou bail)
  invalidateCache(): void {
    this.cache$ = null;
    this.cacheAnnee = null;
  }

  getKPIs(annee = new Date().getFullYear()): Observable<DashboardKPI> {
    return this.getData(annee).pipe(map((d) => d.kpis));
  }

  getRevenusMensuels(annee = new Date().getFullYear()): Observable<RevenuMensuel[]> {
    return this.getData(annee).pipe(map((d) => d.revenusMensuels));
  }

  getAlertes(): Observable<Alerte[]> {
    return of([]);
  }

  getDerniersPaiements(_limit = 5): Observable<DernierPaiement[]> {
    return this.getData(new Date().getFullYear()).pipe(map((d) => d.derniersPaiements));
  }

  getDerniersBiens(_limit = 5): Observable<DernierBien[]> {
    return this.getData(new Date().getFullYear()).pipe(map((d) => d.derniersBiens));
  }

  marquerAlerteLue(_alerteId: string): Observable<void> {
    return of(undefined);
  }
}
