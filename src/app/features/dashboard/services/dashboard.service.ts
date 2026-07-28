import { Injectable } from '@angular/core';
import { Observable, of, forkJoin, shareReplay, map, switchMap } from 'rxjs';
import { PropertyStatus } from '@core/models/bien.model';
import { PaymentStatus, Payment } from '@core/models/payment.model';
import { BiensService } from '../../biens/services/biens.service';
import { LocatairesService } from '../../locataires/services/locataires.service';
import { PaiementsService } from '../../paiements/services/paiements.service';

// Le backend n'expose pas (encore) d'endpoint /dashboard agrégé — ces
// données sont calculées côté client à partir des vraies routes
// /properties, /tenants et /payments. Un endpoint d'agrégation dédié
// serait plus efficace si le volume de paiements grandit (voir
// fetchAllPaidPayments ci-dessous, plafonné à 500 paiements/an).

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
  mois: string; // 'YYYY-MM'
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
  statut: PaymentStatus;
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

interface DashboardData {
  kpis: DashboardKPI;
  revenusMensuels: RevenuMensuel[];
  derniersBiens: DernierBien[];
  derniersPaiements: DernierPaiement[];
}

const PAGE_LIMIT = 100;
const MAX_PAGES = 5; // plafond 500 paiements/an — largement suffisant pour un graphique mensuel

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private cache$: Observable<DashboardData> | null = null;
  private cacheAnnee: number | null = null;

  constructor(
    private biensService: BiensService,
    private locatairesService: LocatairesService,
    private paiementsService: PaiementsService,
  ) {}

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
    // Les alertes automatiques (rappels/impayés) dépendent d'un cron non
    // construit côté backend — liste honnêtement vide plutôt que simulée.
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

  private getData(annee: number): Observable<DashboardData> {
    if (this.cache$ && this.cacheAnnee === annee) return this.cache$;
    this.cacheAnnee = annee;
    this.cache$ = this.buildDashboard(annee).pipe(shareReplay(1));
    return this.cache$;
  }

  private buildDashboard(annee: number): Observable<DashboardData> {
    const yearStart = new Date(Date.UTC(annee, 0, 1)).toISOString();
    const yearEnd = new Date(Date.UTC(annee, 11, 31, 23, 59, 59)).toISOString();

    return forkJoin({
      total: this.biensService.getBiens({ limit: 1 }),
      occupes: this.biensService.getBiens({ status: 'OCCUPIED', limit: 1 }),
      vacants: this.biensService.getBiens({ status: 'VACANT', limit: 1 }),
      biensRecent: this.biensService.getBiens({ limit: 5 }),
      locataires: this.locatairesService.getLocataires(),
      paiementsAnnee: this.fetchAllPaidPayments(yearStart, yearEnd),
      paiementsRecents: this.paiementsService.list({ limit: 5 }),
      overdue: this.paiementsService.list({ status: 'OVERDUE', limit: 1 }),
    }).pipe(
      map(({ total, occupes, vacants, biensRecent, locataires, paiementsAnnee, paiementsRecents, overdue }) => {
        const now = new Date();
        const isCurrentYear = annee === now.getUTCFullYear();
        const currentMonth = now.getUTCMonth();

        const revenusAnnuels = paiementsAnnee.reduce((s, p) => s + p.paidAmount, 0);
        const revenusMensuels = isCurrentYear
          ? paiementsAnnee
              .filter((p) => p.paidAt && new Date(p.paidAt).getUTCMonth() === currentMonth)
              .reduce((s, p) => s + p.paidAmount, 0)
          : 0;

        const kpis: DashboardKPI = {
          totalBiens: total.total,
          biensOccupes: occupes.total,
          biensVacants: vacants.total,
          totalLocataires: locataires.length,
          revenusMensuels,
          revenusAnnuels,
          impayes: overdue.total,
          tauxOccupation: total.total > 0 ? Math.round((occupes.total / total.total) * 100) : 0,
        };

        return {
          kpis,
          revenusMensuels: this.bucketByMonth(paiementsAnnee, annee),
          derniersBiens: biensRecent.data.map((b) => ({
            id: b.id,
            neighborhood: b.neighborhood,
            type: b.type,
            city: b.city,
            monthlyRent: b.monthlyRent,
            status: b.status,
            createdAt: b.createdAt,
          })),
          derniersPaiements: paiementsRecents.data.map((p) => this.toDernierPaiement(p)),
        };
      }),
    );
  }

  private toDernierPaiement(p: Payment): DernierPaiement {
    return {
      id: p.id,
      locataire: p.lease?.tenant ? `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}` : 'Locataire',
      bien: p.lease?.property ? `${p.lease.property.neighborhood}, ${p.lease.property.city}` : 'Bien',
      montant: p.paidAmount,
      date: new Date(p.paidAt ?? p.createdAt),
      statut: p.status,
    };
  }

  private bucketByMonth(payments: Payment[], annee: number): RevenuMensuel[] {
    const buckets = new Map<string, { montant: number; paiements: number }>();
    for (let m = 0; m < 12; m++) {
      buckets.set(`${annee}-${String(m + 1).padStart(2, '0')}`, { montant: 0, paiements: 0 });
    }
    for (const p of payments) {
      if (!p.paidAt) continue;
      const d = new Date(p.paidAt);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.montant += p.paidAmount;
        bucket.paiements += 1;
      }
    }
    return Array.from(buckets.entries()).map(([mois, v]) => ({ mois, ...v }));
  }

  // Récupère tous les paiements PAID d'une période (jusqu'à MAX_PAGES pages)
  // pour alimenter le graphique annuel — aucun endpoint d'agrégation SUM
  // n'existe côté backend.
  private fetchAllPaidPayments(from: string, to: string): Observable<Payment[]> {
    return this.paiementsService.list({ status: 'PAID', from, to, page: 1, limit: PAGE_LIMIT }).pipe(
      switchMap((first) => {
        const totalPages = Math.min(Math.ceil(first.total / PAGE_LIMIT), MAX_PAGES);
        if (totalPages <= 1) return of(first.data);
        const extraPages$ = Array.from({ length: totalPages - 1 }, (_, i) =>
          this.paiementsService.list({ status: 'PAID', from, to, page: i + 2, limit: PAGE_LIMIT }),
        );
        return forkJoin(extraPages$).pipe(
          map((rest) => [...first.data, ...rest.flatMap((r) => r.data)]),
        );
      }),
    );
  }
}
