import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LocatairesService, LocatairesFilters } from '../../services/locataires.service';
import { Locataire, StatutLocataire } from '@core/models/locataire.model';
import { LokBadgeStatutLocataireComponent } from '../../../../shared/components/lok-badge-statut-locataire/lok-badge-statut-locataire.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';

@Component({
  selector: 'app-locataires-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LokBadgeStatutLocataireComponent,
    LokSkeletonComponent,
    LokEmptyStateComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Locataires</h1>
            <p class="text-sm text-gray-600">Gestion des locataires</p>
          </div>
          <button
            routerLink="/locataires/nouveau"
            class="btn-primary flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Ajouter un locataire
          </button>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="p-6">
        <!-- Filtres et recherche -->
        <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Recherche -->
            <div class="lg:col-span-2">
              <input
                type="text"
                [(ngModel)]="recherche"
                (ngModelChange)="onRechercheChange()"
                placeholder="Rechercher un locataire..."
                class="input-field"
              />
            </div>

            <!-- Filtre Statut -->
            <div>
              <select [(ngModel)]="filters.statut" (ngModelChange)="applyFilters()" class="input-field">
                <option value="">Tous les statuts</option>
                <option value="ACTIF">Actif</option>
                <option value="INACTIF">Inactif</option>
                <option value="EN_RETARD">En retard</option>
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
              </select>
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
            <p class="text-2xl font-bold text-gray-900">{{ locataires.length }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Actifs</p>
            <p class="text-2xl font-bold text-green-600">{{ statistiques.actifs }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Inactifs</p>
            <p class="text-2xl font-bold text-gray-600">{{ statistiques.inactifs }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">En retard</p>
            <p class="text-2xl font-bold text-orange-600">{{ statistiques.enRetard }}</p>
          </div>
        </div>

        <!-- Liste des locataires -->
        @if (loading) {
          <div class="space-y-4">
            @for (i of [1, 2, 3, 4, 5]; track i) {
              <lok-skeleton type="card"></lok-skeleton>
            }
          </div>
        } @else if (filteredLocataires.length === 0) {
          <lok-empty-state
            titre="Aucun locataire trouvé"
            description="Aucun locataire ne correspond à vos critères de recherche."
            ctaLabel="Ajouter un locataire"
            icon="locataire"
            (ctaAction)="navigateToNew()"
          ></lok-empty-state>
        } @else {
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ville</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bien</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Début bail</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                @for (locataire of filteredLocataires; track locataire.id) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center text-primary font-semibold">
                          {{ locataire.prenoms.charAt(0) }}{{ locataire.nom.charAt(0) }}
                        </div>
                        <div class="ml-4">
                          <p class="text-sm font-medium text-gray-900">{{ locataire.prenoms }} {{ locataire.nom }}</p>
                          <p class="text-xs text-gray-500">{{ locataire.email || 'Pas d\'email' }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {{ locataire.telephone }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {{ locataire.adresse.ville }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Bien #{{ locataire.bienId }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {{ locataire.dateDebutBail | date:'dd/MM/yyyy' }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <lok-badge-statut-locataire [statut]="locataire.statut"></lok-badge-statut-locataire>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div class="flex items-center gap-2">
                        <button
                          (click)="viewLocataire(locataire.id)"
                          class="text-gray-600 hover:text-primary transition-colors"
                          title="Voir détails"
                        >
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                          </svg>
                        </button>
                        <button
                          (click)="editLocataire(locataire.id)"
                          class="text-gray-600 hover:text-primary transition-colors"
                          title="Modifier"
                        >
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
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
})
export class LocatairesListComponent implements OnInit {
  locataires: Locataire[] = [];
  filteredLocataires: Locataire[] = [];
  loading: boolean = true;

  StatutLocataire = StatutLocataire; // Pour l'accès dans le template
  statistiques: any = {
    actifs: 0,
    inactifs: 0,
    enRetard: 0
  };

  recherche: string = '';
  filters: LocatairesFilters = {
    statut: undefined,
    ville: undefined
  };

  constructor(
    private locatairesService: LocatairesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLocataires();
  }

  /**
   * Charge tous les locataires
   */
  loadLocataires(): void {
    this.loading = true;
    this.locatairesService.getLocataires().subscribe({
      next: (data: any) => {
        this.locataires = data;
        this.filteredLocataires = data;
        this.loadStatistiques();
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement des locataires:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Charge les statistiques
   */
  loadStatistiques(): void {
    this.locatairesService.getStatistiques().subscribe({
      next: (data: any) => {
        this.statistiques = data;
      }
    });
  }

  /**
   * Applique les filtres
   */
  applyFilters(): void {
    this.filteredLocataires = this.locataires.filter(locataire => {
      // Filtre par statut
      if (this.filters.statut && locataire.statut !== this.filters.statut) {
        return false;
      }

      // Filtre par ville
      if (this.filters.ville && locataire.adresse.ville !== this.filters.ville) {
        return false;
      }

      // Filtre par recherche
      if (this.recherche) {
        const searchLower = this.recherche.toLowerCase();
        const matchNom = locataire.nom.toLowerCase().includes(searchLower);
        const matchPrenoms = locataire.prenoms.toLowerCase().includes(searchLower);
        const matchEmail = locataire.email?.toLowerCase().includes(searchLower);
        const matchTelephone = locataire.telephone.includes(searchLower);
        
        if (!matchNom && !matchPrenoms && !matchEmail && !matchTelephone) {
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
    return !!this.filters.statut || !!this.filters.ville || !!this.recherche;
  }

  /**
   * Efface un filtre spécifique
   */
  clearFilter(filter: keyof LocatairesFilters): void {
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
      statut: undefined,
      ville: undefined
    };
    this.recherche = '';
    this.filteredLocataires = [...this.locataires];
  }

  /**
   * Voir les détails d'un locataire
   */
  viewLocataire(id: string): void {
    this.router.navigate(['/locataires', id]);
  }

  /**
   * Modifier un locataire
   */
  editLocataire(id: string): void {
    this.router.navigate(['/locataires', id, 'edit']);
  }

  /**
   * Navigue vers la page de création
   */
  navigateToNew(): void {
    this.router.navigate(['/locataires/nouveau']);
  }
}
