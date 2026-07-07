import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PaiementsService, PaiementsFilters } from '../../services/paiements.service';
import { Paiement, StatutPaiement, ModePaiement } from '@core/models/paiement.model';
import { LokMontantFcfaComponent } from '../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component';
import { LokBadgePaiementComponent } from '../../../../shared/components/lok-badge-paiement/lok-badge-paiement.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';

@Component({
  selector: 'app-paiements-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LokMontantFcfaComponent,
    LokBadgePaiementComponent,
    LokSkeletonComponent,
    LokEmptyStateComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4 animate-fade-in">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="logo">
              <img src="/assets/warah-logo.png" alt="WARAH" class="logo-img">
            </div>
            <div class="h-8 w-px bg-gray-200"></div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Paiements</h1>
              <p class="text-sm text-gray-600">Gestion des loyers et paiements</p>
            </div>
          </div>
          <button
            routerLink="/dashboard/paiements/nouveau"
            class="btn-primary flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Enregistrer un paiement
          </button>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="p-6">
        <!-- Statistiques rapides -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Total collecté</p>
            <lok-montant-fcfa [montant]="statistiques.totalMontant" size="lg" color="primary"></lok-montant-fcfa>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Payés</p>
            <p class="text-2xl font-bold text-green-600">{{ statistiques.payes }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">En retard</p>
            <p class="text-2xl font-bold text-orange-600">{{ statistiques.enRetard }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Impayés</p>
            <p class="text-2xl font-bold text-red-600">{{ statistiques.impayes }}</p>
          </div>
        </div>

        <!-- Filtres -->
        <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Filtre Statut -->
            <div>
              <select [(ngModel)]="filters.statut" (ngModelChange)="applyFilters()" class="input-field">
                <option [value]="undefined">Tous les statuts</option>
                <option [value]="StatutPaiement.PAYE">Payé</option>
                <option [value]="StatutPaiement.PARTIEL">Partiel</option>
                <option [value]="StatutPaiement.EN_RETARD">En retard</option>
                <option [value]="StatutPaiement.IMPAYE">Impayé</option>
              </select>
            </div>

            <!-- Filtre Mode de paiement -->
            <div>
              <select [(ngModel)]="filters.modePaiement" (ngModelChange)="applyFilters()" class="input-field">
                <option [value]="undefined">Tous les modes</option>
                <option value="T_MONEY">T-Money</option>
                <option value="FLOOZ">Flooz</option>
                <option value="ESPECES">Espèces</option>
              </select>
            </div>

            <!-- Filtre Montant min -->
            <div>
              <input
                type="number"
                [(ngModel)]="filters.montantMin"
                (ngModelChange)="applyFilters()"
                placeholder="Montant min (FCFA)"
                class="input-field"
              />
            </div>

            <!-- Filtre Montant max -->
            <div>
              <input
                type="number"
                [(ngModel)]="filters.montantMax"
                (ngModelChange)="applyFilters()"
                placeholder="Montant max (FCFA)"
                class="input-field"
              />
            </div>
          </div>

          <!-- Tags de filtres actifs -->
          @if (hasActiveFilters()) {
            <div class="flex items-center gap-2 mt-4">
              <span class="text-sm text-gray-600">Filtres actifs :</span>
              @if (filters.statut) {
                <span class="bg-primary-light text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  {{ filters.statut }}
                  <button (click)="clearFilter('statut')" class="hover:text-primary-dark">×</button>
                </span>
              }
              @if (filters.modePaiement) {
                <span class="bg-primary-light text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  {{ filters.modePaiement }}
                  <button (click)="clearFilter('modePaiement')" class="hover:text-primary-dark">×</button>
                </span>
              }
              @if (filters.montantMin || filters.montantMax) {
                <span class="bg-primary-light text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  {{ filters.montantMin || 0 }} - {{ filters.montantMax || '∞' }} FCFA
                  <button (click)="clearMontantFilters()" class="hover:text-primary-dark">×</button>
                </span>
              }
              <button (click)="clearAllFilters()" class="text-sm text-red-600 hover:underline">
                Effacer tout
              </button>
            </div>
          }
        </div>

        <!-- Liste des paiements -->
        @if (loading) {
          <div class="space-y-4">
            @for (i of [1, 2, 3, 4, 5]; track i) {
              <lok-skeleton type="card"></lok-skeleton>
            }
          </div>
        } @else if (filteredPaiements.length === 0) {
          <lok-empty-state
            titre="Aucun paiement trouvé"
            description="Aucun paiement ne correspond à vos critères de recherche."
            ctaLabel="Enregistrer un paiement"
            icon="paiement"
            (ctaAction)="navigateToNew()"
          ></lok-empty-state>
        } @else {
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Locataire</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bien</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                @for (paiement of filteredPaiements; track paiement.id) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {{ paiement.datePaiement | date:'dd/MM/yyyy' }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Locataire #{{ paiement.locataireId }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Bien #{{ paiement.bienId }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <lok-montant-fcfa [montant]="paiement.montant" size="sm"></lok-montant-fcfa>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {{ paiement.modePaiement }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <lok-badge-paiement [statut]="paiement.statut"></lok-badge-paiement>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div class="flex items-center gap-2">
                        <button
                          (click)="viewPaiement(paiement.id)"
                          class="text-gray-600 hover:text-primary transition-colors"
                          title="Voir détails"
                        >
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                          </svg>
                        </button>
                        @if (paiement.statut === StatutPaiement.IMPAYE || paiement.statut === StatutPaiement.EN_RETARD) {
                          <button
                            (click)="envoyerRappel(paiement.id)"
                            class="text-gray-600 hover:text-primary transition-colors"
                            title="Envoyer rappel"
                          >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .logo-img {
      height: 88px;
      width: auto;
      object-fit: contain;
      background: transparent !important;
      mix-blend-mode: multiply;
    }

    .logo-text {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-primary);
      letter-spacing: 0.5px;
    }
  `]
})
export class PaiementsListComponent implements OnInit {
  paiements: Paiement[] = [];
  filteredPaiements: Paiement[] = [];
  loading: boolean = true;

  StatutPaiement = StatutPaiement; // Pour l'accès dans le template
  statistiques: any = {
    totalMontant: 0,
    payes: 0,
    impayes: 0,
    enRetard: 0
  };

  filters: any = {
    statut: undefined,
    modePaiement: undefined,
    montantMin: undefined,
    montantMax: undefined
  };

  constructor(
    private paiementsService: PaiementsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPaiements();
  }

  /**
   * Charge tous les paiements
   */
  loadPaiements(): void {
    this.loading = true;
    this.paiementsService.getPaiements().subscribe({
      next: (data: any) => {
        this.paiements = data;
        this.filteredPaiements = data;
        this.loadStatistiques();
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement des paiements:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Charge les statistiques
   */
  loadStatistiques(): void {
    this.paiementsService.getStatistiques().subscribe({
      next: (data: any) => {
        this.statistiques = data;
      }
    });
  }

  /**
   * Applique les filtres
   */
  applyFilters(): void {
    this.filteredPaiements = this.paiements.filter(paiement => {
      // Filtre par statut
      if (this.filters.statut && paiement.statut !== this.filters.statut) {
        return false;
      }

      // Filtre par mode de paiement
      if (this.filters.modePaiement && paiement.modePaiement !== this.filters.modePaiement) {
        return false;
      }

      // Filtre par montant min
      if (this.filters.montantMin && paiement.montant < this.filters.montantMin) {
        return false;
      }

      // Filtre par montant max
      if (this.filters.montantMax && paiement.montant > this.filters.montantMax) {
        return false;
      }

      return true;
    });
  }

  /**
   * Vérifie si des filtres sont actifs
   */
  hasActiveFilters(): boolean {
    return !!this.filters.statut || 
           !!this.filters.modePaiement || 
           !!this.filters.montantMin || 
           !!this.filters.montantMax;
  }

  /**
   * Efface un filtre spécifique
   */
  clearFilter(filter: string): void {
    this.filters[filter] = undefined;
    this.applyFilters();
  }

  /**
   * Efface les filtres de montant
   */
  clearMontantFilters(): void {
    this.filters.montantMin = undefined;
    this.filters.montantMax = undefined;
    this.applyFilters();
  }

  /**
   * Efface tous les filtres
   */
  clearAllFilters(): void {
    this.filters = {
      statut: undefined,
      modePaiement: undefined,
      montantMin: undefined,
      montantMax: undefined
    };
    this.filteredPaiements = [...this.paiements];
  }

  /**
   * Voir les détails d'un paiement
   */
  viewPaiement(id: string): void {
    this.router.navigate(['/dashboard/paiements', id]);
  }

  /**
   * Envoyer un rappel
   */
  envoyerRappel(id: string): void {
    this.paiementsService.envoyerRappel(id).subscribe({
      next: () => {
        alert('Rappel envoyé avec succès');
      },
      error: (error: any) => {
        console.error('Erreur lors de l\'envoi du rappel:', error);
        alert('Erreur lors de l\'envoi du rappel');
      }
    });
  }

  /**
   * Navigue vers la page de création
   */
  navigateToNew(): void {
    this.router.navigate(['/paiements/nouveau']);
  }
}
