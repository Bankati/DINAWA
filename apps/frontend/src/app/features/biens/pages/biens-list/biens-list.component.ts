import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BiensService, BiensFilters } from '../../services/biens.service';
import { Bien, TypeBien, StatutBien } from '@core/models/bien.model';
import { LokBadgeStatutComponent } from '../../../../shared/components/lok-badge-statut/lok-badge-statut.component';
import { LokMontantFcfaComponent } from '../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';

@Component({
  selector: 'app-biens-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LokBadgeStatutComponent,
    LokMontantFcfaComponent,
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
              <h1 class="text-2xl font-bold text-gray-900">Mes Biens</h1>
              <p class="text-sm text-gray-600">Gérez vos biens immobiliers</p>
            </div>
          </div>
          <button
            routerLink="/dashboard/biens/nouveau"
            class="btn-primary flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Ajouter un bien
          </button>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="p-6">
        <!-- Filtres et recherche -->
        <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <!-- Recherche -->
            <div class="lg:col-span-2">
              <input
                type="text"
                [(ngModel)]="recherche"
                (ngModelChange)="onRechercheChange()"
                placeholder="Rechercher un bien..."
                class="input-field"
              />
            </div>

            <!-- Filtre Type -->
            <div>
              <select [(ngModel)]="filters.type" (ngModelChange)="applyFilters()" class="input-field">
                <option value="">Tous les types</option>
                <option value="VILLA">Villa</option>
                <option value="APPARTEMENT">Appartement</option>
                <option value="STUDIO">Studio</option>
                <option value="CHAMBRE">Chambre</option>
                <option value="BUREAU">Bureau</option>
                <option value="LOCAL">Local</option>
              </select>
            </div>

            <!-- Filtre Statut -->
            <div>
              <select [(ngModel)]="filters.statut" (ngModelChange)="applyFilters()" class="input-field">
                <option value="">Tous les statuts</option>
                <option value="OCCUPE">Occupé</option>
                <option value="VACANT">Vacant</option>
                <option value="EN_TRAVAUX">En travaux</option>
                <option value="ARCHIVE">Archivé</option>
              </select>
            </div>

            <!-- Filtre Ville -->
            <div>
              <select [(ngModel)]="filters.ville" (ngModelChange)="applyFilters()" class="input-field">
                <option value="">Toutes les villes</option>
                <option value="Lomé">Lomé</option>
                <option value="Sokodé">Sokodé</option>
                <option value="Kara">Kara</option>
                <option value="Atakpamé">Atakpamé</option>
                <option value="Kpalimé">Kpalimé</option>
                <option value="Dapaong">Dapaong</option>
              </select>
            </div>
          </div>

          <!-- Tags de filtres actifs -->
          @if (hasActiveFilters()) {
            <div class="flex items-center gap-2 mt-4">
              <span class="text-sm text-gray-600">Filtres actifs :</span>
              @if (filters.type) {
                <span class="bg-primary-light text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  {{ filters.type }}
                  <button (click)="clearFilter('type')" class="hover:text-primary-dark">×</button>
                </span>
              }
              @if (filters.statut) {
                <span class="bg-primary-light text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  {{ filters.statut }}
                  <button (click)="clearFilter('statut')" class="hover:text-primary-dark">×</button>
                </span>
              }
              @if (filters.ville) {
                <span class="bg-primary-light text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  {{ filters.ville }}
                  <button (click)="clearFilter('ville')" class="hover:text-primary-dark">×</button>
                </span>
              }
              @if (recherche) {
                <span class="bg-primary-light text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  "{{ recherche }}"
                  <button (click)="clearRecherche()" class="hover:text-primary-dark">×</button>
                </span>
              }
              <button (click)="clearAllFilters()" class="text-sm text-red-600 hover:underline">
                Effacer tout
              </button>
            </div>
          }
        </div>

        <!-- Statistiques rapides -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Total</p>
            <p class="text-2xl font-bold text-gray-900">{{ biens.length || 0 }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Occupés</p>
            <p class="text-2xl font-bold text-green-600">{{ getOccupesCount() }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Vacants</p>
            <p class="text-2xl font-bold text-blue-600">{{ getVacantsCount() }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">En travaux</p>
            <p class="text-2xl font-bold text-orange-600">{{ getEnTravauxCount() }}</p>
          </div>
        </div>

        <!-- Liste des biens -->
        @if (loading) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (i of [1, 2, 3, 4, 5, 6]; track i) {
              <lok-skeleton type="card"></lok-skeleton>
            }
          </div>
        } @else if (filteredBiens.length === 0) {
          <lok-empty-state
            titre="Aucun bien trouvé"
            description="Aucun bien ne correspond à vos critères de recherche."
            ctaLabel="Ajouter un bien"
            icon="bien"
            (ctaAction)="navigateToNew()"
          ></lok-empty-state>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (bien of filteredBiens; track bien.id) {
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <!-- Photo placeholder -->
                <div class="h-48 bg-gray-200 flex items-center justify-center">
                  <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                  </svg>
                </div>

                <!-- Contenu -->
                <div class="p-4">
                  <div class="flex items-start justify-between mb-2">
                    <h3 class="text-lg font-semibold text-gray-900 flex-1">{{ bien.titre }}</h3>
                    <lok-badge-statut [statut]="bien.statut"></lok-badge-statut>
                  </div>
                  
                  <p class="text-sm text-gray-600 mb-2">{{ bien.adresse.ville }}</p>
                  <p class="text-sm text-gray-500 mb-3">{{ bien.typeBien }} • {{ bien.surface }}m² • {{ bien.nbPieces }} pièces</p>
                  
                  <div class="flex items-center justify-between">
                    <lok-montant-fcfa [montant]="bien.loyer" size="lg" color="primary"></lok-montant-fcfa>
                    <div class="flex gap-2">
                      <button
                        (click)="navigateToDetail(bien.id)"
                        class="p-2 text-gray-600 hover:text-primary transition-colors"
                        title="Voir détails"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                      </button>
                      <button
                        (click)="navigateToEdit(bien.id)"
                        class="p-2 text-gray-600 hover:text-primary transition-colors"
                        title="Modifier"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            }
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
  `]
})
export class BiensListComponent implements OnInit {
  biens: Bien[] = [];
  filteredBiens: Bien[] = [];
  loading: boolean = true;

  StatutBien = StatutBien; // Pour l'accès dans le template

  recherche: string = '';
  filters: BiensFilters = {
    type: undefined,
    statut: undefined,
    ville: undefined
  };

  constructor(
    private biensService: BiensService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadBiens();
  }

  /**
   * Charge tous les biens
   */
  loadBiens(): void {
    this.loading = true;
    this.biensService.getBiens().subscribe({
      next: (data: any) => {
        this.biens = data;
        this.filteredBiens = data;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement des biens:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Applique les filtres
   */
  applyFilters(): void {
    this.filteredBiens = this.biens.filter(bien => {
      // Filtre par type
      if (this.filters.type && bien.typeBien !== this.filters.type) {
        return false;
      }

      // Filtre par statut
      if (this.filters.statut && bien.statut !== this.filters.statut) {
        return false;
      }

      // Filtre par ville
      if (this.filters.ville && bien.adresse.ville !== this.filters.ville) {
        return false;
      }

      // Filtre par recherche
      if (this.recherche) {
        const searchLower = this.recherche.toLowerCase();
        const matchTitre = bien.titre.toLowerCase().includes(searchLower);
        const matchVille = bien.adresse.ville.toLowerCase().includes(searchLower);
        const matchType = bien.typeBien.toLowerCase().includes(searchLower);
        
        if (!matchTitre && !matchVille && !matchType) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Gère le changement de recherche
   */
  onRechercheChange(): void {
    this.applyFilters();
  }

  /**
   * Vérifie si des filtres sont actifs
   */
  hasActiveFilters(): boolean {
    return !!this.filters.type || !!this.filters.statut || !!this.filters.ville || !!this.recherche;
  }

  /**
   * Retourne le nombre de biens occupés
   */
  getOccupesCount(): number {
    return this.biens?.filter(b => b.statut === StatutBien.OCCUPE).length || 0;
  }

  /**
   * Retourne le nombre de biens vacants
   */
  getVacantsCount(): number {
    return this.biens?.filter(b => b.statut === StatutBien.VACANT).length || 0;
  }

  /**
   * Retourne le nombre de biens en travaux
   */
  getEnTravauxCount(): number {
    return this.biens?.filter(b => b.statut === StatutBien.EN_TRAVAUX).length || 0;
  }

  /**
   * Efface un filtre spécifique
   */
  clearFilter(filter: keyof BiensFilters): void {
    this.filters[filter] = undefined;
    this.applyFilters();
  }

  /**
   * Efface la recherche
   */
  clearRecherche(): void {
    this.recherche = '';
    this.applyFilters();
  }

  /**
   * Efface tous les filtres
   */
  clearAllFilters(): void {
    this.filters = {
      type: undefined,
      statut: undefined,
      ville: undefined
    };
    this.recherche = '';
    this.filteredBiens = [...this.biens];
  }

  /**
   * Navigue vers la page de détail
   */
  navigateToDetail(id: string): void {
    this.router.navigate(['/dashboard/biens', id]);
  }

  /**
   * Navigue vers la page d'édition
   */
  navigateToEdit(id: string): void {
    this.router.navigate(['/dashboard/biens', id, 'edit']);
  }

  /**
   * Navigue vers la page de création
   */
  navigateToNew(): void {
    this.router.navigate(['/dashboard/biens/nouveau']);
  }
}
