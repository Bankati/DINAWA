import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BiensService, BiensFilters } from '../../services/biens.service';
import { Bien, PROPERTY_TYPE_LABELS } from '@core/models/bien.model';
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
    LokEmptyStateComponent,
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4 animate-fade-in">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="logo">
              <img src="/assets/WARAH-logo.png" alt="WARAH" class="logo-img">
            </div>
            <div class="h-8 w-px bg-gray-200"></div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Mes Biens</h1>
              <p class="text-sm text-gray-600">{{ total }} bien{{ total !== 1 ? 's' : '' }} au total</p>
            </div>
          </div>
          <button routerLink="/dashboard/biens/nouveau" class="btn-primary flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Ajouter un bien
          </button>
        </div>
      </div>

      <div class="p-6">
        <!-- Filtres -->
        <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="lg:col-span-1">
              <input
                type="text"
                [(ngModel)]="searchTerm"
                (ngModelChange)="onSearchChange()"
                placeholder="Rechercher (quartier, ville…)"
                class="input-field"
              />
            </div>
            <div>
              <select [(ngModel)]="filters.type" (ngModelChange)="loadBiens()" class="input-field">
                <option [ngValue]="undefined">Tous les types</option>
                <option value="VILLA">Villa</option>
                <option value="APARTMENT">Appartement</option>
                <option value="STUDIO">Studio</option>
                <option value="COMMERCIAL">Local commercial</option>
              </select>
            </div>
            <div>
              <select [(ngModel)]="filters.status" (ngModelChange)="loadBiens()" class="input-field">
                <option [ngValue]="undefined">Tous les statuts</option>
                <option value="OCCUPIED">Occupé</option>
                <option value="VACANT">Vacant</option>
                <option value="RENOVATION">En travaux</option>
                <option value="ARCHIVED">Archivé</option>
              </select>
            </div>
            <div>
              <select [(ngModel)]="filters.city" (ngModelChange)="loadBiens()" class="input-field">
                <option [ngValue]="undefined">Toutes les villes</option>
                <option>Lomé</option>
                <option>Sokodé</option>
                <option>Kara</option>
                <option>Atakpamé</option>
                <option>Kpalimé</option>
                <option>Dapaong</option>
              </select>
            </div>
          </div>
          @if (hasActiveFilters()) {
            <div class="flex items-center gap-2 mt-3">
              <span class="text-sm text-gray-500">Filtres actifs</span>
              <button (click)="clearFilters()" class="text-sm text-red-600 hover:underline">Effacer</button>
            </div>
          }
        </div>

        <!-- KPIs rapides -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center">
            <p class="text-sm text-gray-600">Total</p>
            <p class="text-2xl font-bold text-gray-900">{{ biens.length }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center">
            <p class="text-sm text-gray-600">Occupés</p>
            <p class="text-2xl font-bold text-green-600">{{ countByStatus('OCCUPIED') }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center">
            <p class="text-sm text-gray-600">Vacants</p>
            <p class="text-2xl font-bold text-blue-600">{{ countByStatus('VACANT') }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center">
            <p class="text-sm text-gray-600">En travaux</p>
            <p class="text-2xl font-bold text-orange-600">{{ countByStatus('RENOVATION') }}</p>
          </div>
        </div>

        <!-- Liste -->
        @if (loading) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (i of [1,2,3,4,5,6]; track i) {
              <lok-skeleton type="card"></lok-skeleton>
            }
          </div>
        } @else if (filteredBiens.length === 0) {
          <lok-empty-state
            titre="Aucun bien trouvé"
            description="Aucun bien ne correspond à vos critères. Commencez par ajouter votre premier bien."
            ctaLabel="Ajouter un bien"
            icon="bien"
            (ctaAction)="navigateToNew()"
          ></lok-empty-state>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (bien of filteredBiens; track bien.id) {
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                   (click)="navigateToDetail(bien.id)">
                <!-- Photo ou placeholder -->
                <div class="h-44 bg-gray-100 flex items-center justify-center overflow-hidden">
                  @if (bien.photos && bien.photos.length > 0) {
                    <img [src]="bien.photos[0].url" [alt]="bien.neighborhood" class="w-full h-full object-cover">
                  } @else {
                    <svg class="w-14 h-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                  }
                </div>

                <div class="p-4">
                  <div class="flex items-start justify-between mb-1">
                    <h3 class="text-base font-semibold text-gray-900 flex-1 leading-tight">
                      {{ typeLabel(bien.type) }} — {{ bien.neighborhood }}
                    </h3>
                    <lok-badge-statut [statut]="bien.status" class="ml-2 flex-shrink-0"></lok-badge-statut>
                  </div>

                  <p class="text-sm text-gray-500 mb-3">
                    {{ bien.city }}
                    @if (bien.surfaceArea) { · {{ bien.surfaceArea }} m² }
                    @if (bien.roomsCount) { · {{ bien.roomsCount }} p. }
                  </p>

                  <div class="flex items-center justify-between">
                    <lok-montant-fcfa [montant]="bien.monthlyRent" size="lg" color="primary"></lok-montant-fcfa>
                    <div class="flex gap-1" (click)="$event.stopPropagation()">
                      <button
                        (click)="navigateToEdit(bien.id)"
                        class="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                        title="Modifier"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
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
    .logo-img { height: 88px; width: auto; object-fit: contain; mix-blend-mode: multiply; }
  `],
})
export class BiensListComponent implements OnInit {
  biens: Bien[] = [];
  filteredBiens: Bien[] = [];
  loading = true;
  total = 0;

  searchTerm = '';
  filters: BiensFilters = {};

  constructor(
    private biensService: BiensService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadBiens();
  }

  loadBiens(): void {
    this.loading = true;
    const f: BiensFilters = {
      ...this.filters,
      search: this.searchTerm || undefined,
    };
    this.biensService.getBiens(f).subscribe({
      next: (res) => {
        this.biens = res.data;
        this.total = res.total;
        this.filteredBiens = res.data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onSearchChange(): void {
    // Filtre local immédiat (le serveur est appelé à nouveau après 300ms dans une vraie app)
    const term = this.searchTerm.toLowerCase();
    this.filteredBiens = this.biens.filter(
      (b) =>
        b.neighborhood.toLowerCase().includes(term) ||
        b.city.toLowerCase().includes(term) ||
        (b.description ?? '').toLowerCase().includes(term),
    );
  }

  hasActiveFilters(): boolean {
    return !!(this.filters.type || this.filters.status || this.filters.city || this.searchTerm);
  }

  clearFilters(): void {
    this.filters = {};
    this.searchTerm = '';
    this.loadBiens();
  }

  countByStatus(status: string): number {
    return this.biens.filter((b) => b.status === status).length;
  }

  typeLabel(type: string): string {
    return PROPERTY_TYPE_LABELS[type as keyof typeof PROPERTY_TYPE_LABELS] ?? type;
  }

  navigateToDetail(id: string): void {
    this.router.navigate(['/dashboard/biens', id]);
  }

  navigateToEdit(id: string): void {
    this.router.navigate(['/dashboard/biens', id, 'edit']);
  }

  navigateToNew(): void {
    this.router.navigate(['/dashboard/biens/nouveau']);
  }
}
