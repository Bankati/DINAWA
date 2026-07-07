import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProprietairesService, ProprietairesFilters } from '../../services/proprietaires.service';
import { Proprietaire, StatutProprietaire } from '@core/models/proprietaire.model';
import { LokBadgeStatutProprietaireComponent } from '../../../../shared/components/lok-badge-statut-proprietaire/lok-badge-statut-proprietaire.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';

@Component({
  selector: 'app-proprietaires-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LokBadgeStatutProprietaireComponent,
    LokSkeletonComponent,
    LokEmptyStateComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Propriétaires</h1>
            <p class="text-sm text-gray-600">Gérez vos propriétaires</p>
          </div>
          <button
            (click)="navigateToNew()"
            class="btn-primary flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Nouveau propriétaire
          </button>
        </div>
      </div>

      <!-- Filtres -->
      <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Recherche -->
          <div class="md:col-span-2">
            <input
              type="text"
              [(ngModel)]="recherche"
              (ngModelChange)="onRechercheChange()"
              placeholder="Rechercher un propriétaire..."
              class="input-field"
            />
          </div>

          <!-- Filtre Statut -->
          <div>
            <select [(ngModel)]="filters.statut" (ngModelChange)="applyFilters()" class="input-field">
              <option value="">Tous les statuts</option>
              <option value="ACTIF">Actif</option>
              <option value="INACTIF">Inactif</option>
              <option value="SUSPENDU">Suspendu</option>
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

      <!-- Liste des propriétaires -->
      @if (loading) {
        <lok-skeleton type="list" [count]="5"></lok-skeleton>
      } @else if (filteredProprietaires.length === 0) {
        <lok-empty-state
          titre="Aucun propriétaire trouvé"
          description="Aucun propriétaire ne correspond à vos critères de recherche."
          ctaLabel="Ajouter un propriétaire"
          icon="default"
          (ctaAction)="navigateToNew()"
        ></lok-empty-state>
      } @else {
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ville</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Biens</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              @for (proprietaire of filteredProprietaires; track proprietaire.id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="flex-shrink-0 h-10 w-10 bg-primary-light rounded-full flex items-center justify-center text-primary font-bold">
                        {{ proprietaire.prenoms.charAt(0) }}{{ proprietaire.nom.charAt(0) }}
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">{{ proprietaire.prenoms }} {{ proprietaire.nom }}</div>
                        <div class="text-sm text-gray-500">{{ proprietaire.email || 'Pas d\'email' }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ proprietaire.telephone }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ proprietaire.adresse.ville }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ proprietaire.nbBiens }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <lok-badge-statut-proprietaire [statut]="proprietaire.statut"></lok-badge-statut-proprietaire>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div class="flex items-center gap-2">
                      <button
                        (click)="viewProprietaire(proprietaire.id)"
                        class="text-gray-600 hover:text-primary transition-colors"
                        title="Voir détails"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                      </button>
                      <button
                        (click)="editProprietaire(proprietaire.id)"
                        class="text-gray-600 hover:text-primary transition-colors"
                        title="Modifier"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button
                        (click)="deleteProprietaire(proprietaire.id)"
                        class="text-gray-600 hover:text-red-600 transition-colors"
                        title="Supprimer"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
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
  `,
})
export class ProprietairesListComponent implements OnInit {
  proprietaires: Proprietaire[] = [];
  filteredProprietaires: Proprietaire[] = [];
  loading: boolean = true;

  StatutProprietaire = StatutProprietaire; // Pour l'accès dans le template

  recherche: string = '';
  filters: ProprietairesFilters = {
    statut: undefined
  };

  constructor(
    private proprietairesService: ProprietairesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProprietaires();
  }

  loadProprietaires(): void {
    this.loading = true;
    this.proprietairesService.getAllProprietaires().subscribe({
      next: (data) => {
        this.proprietaires = data;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.proprietairesService.filterProprietaires({ ...this.filters, recherche: this.recherche }).subscribe({
      next: (data) => {
        this.filteredProprietaires = data;
      }
    });
  }

  onRechercheChange(): void {
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!this.filters.statut || !!this.recherche;
  }

  clearFilter(filter: keyof ProprietairesFilters): void {
    this.filters[filter] = undefined;
    this.applyFilters();
  }

  clearRecherche(): void {
    this.recherche = '';
    this.applyFilters();
  }

  clearAllFilters(): void {
    this.filters = {
      statut: undefined
    };
    this.recherche = '';
    this.applyFilters();
  }

  navigateToNew(): void {
    this.router.navigate(['/proprietaires/new']);
  }

  viewProprietaire(id: string): void {
    this.router.navigate(['/proprietaires', id]);
  }

  editProprietaire(id: string): void {
    this.router.navigate(['/proprietaires', id, 'edit']);
  }

  deleteProprietaire(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce propriétaire ?')) {
      this.proprietairesService.deleteProprietaire(id).subscribe({
        next: () => {
          this.loadProprietaires();
        }
      });
    }
  }
}
