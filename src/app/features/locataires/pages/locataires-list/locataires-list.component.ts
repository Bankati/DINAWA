import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LocatairesService, LocatairesFilters } from '../../services/locataires.service';
import { Locataire } from '@core/models/locataire.model';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';

@Component({
  selector: 'app-locataires-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LokSkeletonComponent,
    LokEmptyStateComponent,
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
          <button routerLink="/dashboard/locataires/nouveau" class="btn-primary flex items-center gap-2">
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
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                [(ngModel)]="recherche"
                (ngModelChange)="applyFilters()"
                placeholder="Rechercher un locataire..."
                class="input-field"
              />
            </div>
            <div>
              <select [(ngModel)]="filters.statut" (ngModelChange)="applyFilters()" class="input-field">
                <option value="">Tous les statuts</option>
                <option value="ACTIVE">Actif</option>
                <option value="INACTIVE">Inactif</option>
                <option value="SUSPENDED">Suspendu</option>
              </select>
            </div>
          </div>
          @if (hasActiveFilters()) {
            <div class="flex items-center gap-2 mt-3">
              <span class="text-sm text-gray-500">Filtres actifs</span>
              <button (click)="clearAllFilters()" class="text-sm text-red-600 hover:underline">Effacer tout</button>
            </div>
          }
        </div>

        <!-- Statistiques rapides -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Total</p>
            <p class="text-2xl font-bold text-gray-900">{{ locataires.length }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Actifs</p>
            <p class="text-2xl font-bold text-green-600">{{ countByStatus('ACTIVE') }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Inactifs</p>
            <p class="text-2xl font-bold text-gray-600">{{ countByStatus('INACTIVE') }}</p>
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
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  @for (locataire of filteredLocataires; track locataire.id) {
                    <tr class="hover:bg-gray-50">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <div class="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm">
                            {{ locataire.firstName.charAt(0) }}{{ locataire.lastName.charAt(0) }}
                          </div>
                          <div class="ml-4">
                            <p class="text-sm font-medium text-gray-900">{{ locataire.firstName }} {{ locataire.lastName }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {{ locataire.phone ?? '—' }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {{ locataire.email ?? '—' }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span [class]="statusBadge(locataire.accountStatus)"
                              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold">
                          {{ locataire.accountStatus }}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div class="flex items-center gap-2">
                          <button
                            (click)="viewLocataire(locataire.id)"
                            class="text-gray-600 hover:text-blue-700 transition-colors"
                            title="Voir détails"
                          >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
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
  loading = true;

  recherche = '';
  filters: LocatairesFilters = {};

  constructor(
    private locatairesService: LocatairesService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadLocataires();
  }

  loadLocataires(): void {
    this.loading = true;
    this.locatairesService.getLocataires().subscribe({
      next: (data) => {
        this.locataires = data;
        this.filteredLocataires = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    this.filteredLocataires = this.locataires.filter((loc) => {
      if (this.filters.statut && loc.accountStatus !== this.filters.statut) return false;
      if (this.recherche) {
        const q = this.recherche.toLowerCase();
        const match =
          loc.firstName.toLowerCase().includes(q) ||
          loc.lastName.toLowerCase().includes(q) ||
          (loc.email ?? '').toLowerCase().includes(q) ||
          (loc.phone ?? '').includes(q);
        if (!match) return false;
      }
      return true;
    });
  }

  hasActiveFilters(): boolean {
    return !!(this.filters.statut || this.recherche);
  }

  clearAllFilters(): void {
    this.filters = {};
    this.recherche = '';
    this.filteredLocataires = [...this.locataires];
  }

  countByStatus(status: string): number {
    return this.locataires.filter((l) => l.accountStatus === status).length;
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'ACTIVE':    return 'bg-green-100 text-green-800';
      case 'INACTIVE':  return 'bg-gray-100 text-gray-800';
      case 'SUSPENDED': return 'bg-red-100 text-red-800';
      default:          return 'bg-gray-100 text-gray-800';
    }
  }

  viewLocataire(id: string): void {
    this.router.navigate(['/dashboard/locataires', id]);
  }

  navigateToNew(): void {
    this.router.navigate(['/dashboard/locataires/nouveau']);
  }
}
