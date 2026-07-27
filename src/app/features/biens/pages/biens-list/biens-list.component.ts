import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BiensService, BiensFilters } from '../../services/biens.service';
import { Bien, PROPERTY_TYPE_LABELS } from '@core/models/bien.model';
import { LokBadgeStatutComponent } from '../../../../shared/components/lok-badge-statut/lok-badge-statut.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';
import { environment } from '@env/environment';

@Component({
  selector: 'app-biens-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LokBadgeStatutComponent,
    LokSkeletonComponent,
    LokEmptyStateComponent,
  ],
  template: `
    <div class="min-h-screen" style="background:#F0F4FA">

      <!-- ── HEADER ── -->
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-logo">
            <img src="/assets/WARAH-logo.png" alt="WARAH" class="logo-img">
          </div>
          <div class="page-divider"></div>
          <div>
            <h1 class="page-title">Mes Biens</h1>
            <p class="page-sub">{{ total }} bien{{ total!==1?'s':'' }} dans votre portefeuille</p>
          </div>
        </div>
        <button routerLink="/dashboard/biens/nouveau" class="btn-primary page-btn">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          <span class="page-btn-full">Ajouter un bien</span>
          <span class="page-btn-short">Nouveau</span>
        </button>
      </div>

      <!-- ── KPI cards ── -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <p class="kpi-label">Total</p>
          <p class="kpi-val" style="color:#111827">{{ biens.length }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Occupés</p>
          <p class="kpi-val" style="color:#16a34a">{{ countByStatus('OCCUPIED') }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Vacants</p>
          <p class="kpi-val" style="color:#2563eb">{{ countByStatus('VACANT') }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">En travaux</p>
          <p class="kpi-val" style="color:#ea580c">{{ countByStatus('RENOVATION') }}</p>
        </div>
      </div>

      <!-- ── BARRE FILTRES ── masquée si portefeuille vide -->
      @if (!loading && biens.length > 0) {
      <div class="px-6 mt-6 mb-6">
        <div class="bg-white rounded-2xl shadow-xl border border-white/80 p-3 flex gap-3 flex-wrap items-center"
             style="box-shadow:0 8px 40px rgba(10,38,80,.13)">
          <div class="relative flex-1 min-w-52">
            <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" stroke="#374151" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="onSearchChange()"
              placeholder="Quartier, ville, description…"
              class="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border-0 bg-gray-50 focus:outline-none focus:ring-2 transition-all"/>
          </div>
          <div class="flex gap-1.5 flex-wrap">
            <button (click)="filters.status=undefined; loadBiens()"
              [class]="!filters.status ? 'ftab-on' : 'ftab-off'">Tous</button>
            <button (click)="filters.status='OCCUPIED'; loadBiens()"
              [class]="filters.status==='OCCUPIED' ? 'ftab-on' : 'ftab-off'">
              <span class="w-1.5 h-1.5 rounded-full inline-block bg-green-400"></span> Occupés
            </button>
            <button (click)="filters.status='VACANT'; loadBiens()"
              [class]="filters.status==='VACANT' ? 'ftab-on' : 'ftab-off'">Vacants</button>
            <button (click)="filters.status='RENOVATION'; loadBiens()"
              [class]="filters.status==='RENOVATION' ? 'ftab-on' : 'ftab-off'">En travaux</button>
          </div>
          <select [(ngModel)]="filters.city" (ngModelChange)="loadBiens()"
            class="text-sm rounded-xl border-0 bg-gray-50 px-3 py-2.5 focus:outline-none transition-all">
            <option [ngValue]="undefined">Toutes les villes</option>
            <option>Lomé</option><option>Sokodé</option><option>Kara</option>
            <option>Atakpamé</option><option>Kpalimé</option><option>Dapaong</option>
          </select>
          @if (hasActiveFilters()) {
            <button (click)="clearFilters()" class="text-xs text-gray-400 hover:text-red-500 transition-colors px-1">✕</button>
          }
        </div>
      </div>
      }

      <!-- ── GRILLE ── -->
      <div class="px-6 pb-10 pt-2">
        @if (loading) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (i of [1,2,3,4,5,6]; track i) { <lok-skeleton type="card"></lok-skeleton> }
          </div>
        } @else if (biens.length === 0) {
          <!-- Portefeuille neuf — message d'accueil sans doublon de bouton -->
          <lok-empty-state
            titre="Bienvenue ! Votre portefeuille est vide"
            description="Cliquez sur « Ajouter un bien » en haut à droite pour enregistrer votre première propriété."
            icon="bien">
          </lok-empty-state>
        } @else if (filteredBiens.length === 0) {
          <!-- Recherche/filtre sans résultat -->
          <lok-empty-state
            titre="Aucun résultat"
            description="Aucun bien ne correspond à vos critères. Modifiez ou réinitialisez vos filtres."
            icon="search"
            ctaLabel="Réinitialiser les filtres"
            (ctaAction)="clearFilters()">
          </lok-empty-state>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (bien of filteredBiens; track bien.id) {
              <div class="bien-card bg-white rounded-2xl cursor-pointer group"
                   style="box-shadow:0 4px 24px rgba(10,38,80,.10); overflow:hidden"
                   (click)="navigateToDetail(bien.id)">

                <!-- IMAGE h-48 fixe -->
                <div class="relative overflow-hidden" style="height:192px">
                  @if (getPhotoUrl(bien); as photoUrl) {
                    <!-- Vraie photo -->
                    <img [src]="photoUrl" [alt]="bien.neighborhood"
                         class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                         (error)="onImgError(bien.id)">
                    <!-- Overlays uniquement sur photo réelle -->
                    <div class="absolute inset-0 pointer-events-none"
                         style="background:linear-gradient(to top,rgba(0,0,0,.5) 0%,transparent 55%)"></div>
                    <div class="absolute bottom-3 left-3">
                      <span class="text-white text-sm font-extrabold drop-shadow">
                        {{ bien.monthlyRent | number }} FCFA
                        <span class="text-xs font-medium opacity-70">/mois</span>
                      </span>
                    </div>
                  } @else {
                    <!-- Placeholder discret -->
                    <div class="w-full h-full flex flex-col items-center justify-center"
                         style="background:linear-gradient(135deg,#EEF4FF 0%,#dbeafe 100%)">
                      <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-1.5"
                           style="background:rgba(15,76,129,.1)">
                        <svg class="w-5 h-5" fill="none" stroke="#0F4C81" stroke-width="1.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round"
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                        </svg>
                      </div>
                      <p class="text-xs font-medium" style="color:#0F4C81;opacity:.4">Aucune photo</p>
                    </div>
                  }
                  <!-- Badges toujours visibles -->
                  <div class="absolute top-3 left-3">
                    <span class="px-2 py-0.5 rounded-md text-xs font-bold"
                          style="background:rgba(255,255,255,.9);color:#0A2650">{{ typeLabel(bien.type) }}</span>
                  </div>
                  <div class="absolute top-3 right-3">
                    <lok-badge-statut [statut]="bien.status"></lok-badge-statut>
                  </div>
                </div>

                <!-- INFOS -->
                <div class="p-4 flex flex-col gap-2">
                  <h3 class="text-sm font-extrabold text-gray-900 truncate">{{ bien.neighborhood }}</h3>

                  <!-- Localisation tronquée sur une ligne -->
                  <p class="text-xs text-gray-400 flex items-center gap-1 min-w-0">
                    <svg width="12" height="12" style="min-width:12px;min-height:12px" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <span class="truncate">
                      {{ bien.city }}{{ bien.surfaceArea ? ' · ' + bien.surfaceArea + ' m²' : '' }}{{ bien.roomsCount ? ' · ' + bien.roomsCount + ' p.' : '' }}
                    </span>
                  </p>

                  <!-- Description tronquée à 2 lignes -->
                  <p class="text-xs text-gray-500 desc-clamp">{{ getDescription(bien.description) }}</p>

                  <!-- Prix (uniquement si pas de vraie photo) -->
                  @if (!getPhotoUrl(bien)) {
                    <div class="px-3 py-2 rounded-xl" style="background:#F0F4FA">
                      <span class="text-sm font-extrabold" style="color:#0F4C81">
                        {{ bien.monthlyRent | number }} FCFA
                        <span class="text-xs font-normal text-gray-400">/mois</span>
                      </span>
                    </div>
                  }

                  <!-- Actions -->
                  <div class="flex gap-2 mt-1" (click)="$event.stopPropagation()">
                    <button type="button" (click)="navigateToEdit(bien.id)"
                      class="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                      style="background:#F0F4FA;color:#6b7280">Modifier</button>
                    <button type="button" (click)="navigateToDetail(bien.id)"
                      class="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                      style="background:#0F4C81;color:#fff">Voir le détail</button>
                  </div>
                </div>
              </div>
            }
          </div>
          <p class="text-center text-xs text-gray-400 mt-5">{{ filteredBiens.length }} bien{{ filteredBiens.length!==1?'s':'' }} affiché{{ filteredBiens.length!==1?'s':'' }}</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .logo-img { height: 88px; width: auto; object-fit: contain; background: transparent !important; mix-blend-mode: multiply; }
    .page-header { background: white; border-bottom: 1px solid #E5E7EB; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .page-header-left { display: flex; align-items: center; gap: 16px; min-width: 0; }
    .page-divider { width: 1px; height: 32px; background: #E5E7EB; flex-shrink: 0; }
    .page-title { font-size: 22px; font-weight: 700; color: #111827; line-height: 1.2; white-space: nowrap; }
    .page-sub { font-size: 13px; color: #6B7280; margin-top: 1px; }
    .page-btn { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .page-btn-short { display: none; }
    .btn-primary { background: #0F4C81; color: white; border: none; border-radius: .625rem; padding: .625rem 1.25rem; font-weight: 600; cursor: pointer; font-size: .9rem; transition: background .2s; }
    .btn-primary:hover { background: #0A2650; }
    .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; padding:32px 24px 24px; }
    .kpi-card { background:#fff; border-radius:14px; padding:20px 24px; box-shadow:0 2px 12px rgba(10,38,80,.08); border:1px solid #E8EDF5; }
    .kpi-label { font-size:13px; color:#6B7280; margin-bottom:8px; font-weight:500; }
    .kpi-val { font-size:2.25rem; font-weight:800; line-height:1; }
    @media(max-width:768px){ .kpi-grid { grid-template-columns:repeat(2,1fr); gap:12px; padding:20px 16px 16px; } }
    .ftab-on  { padding:7px 14px; border-radius:10px; font-size:12px; font-weight:700; background:#0F4C81; color:#fff; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:5px; transition:all .15s; }
    .ftab-off { padding:7px 14px; border-radius:10px; font-size:12px; font-weight:500; background:#F3F4F6; color:#6b7280; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:5px; transition:all .15s; }
    .ftab-off:hover { background:#E5E7EB; color:#374151; }
    .cni-banner {
      display:flex; align-items:center; gap:12px; flex-wrap:wrap;
      background:#FFF7ED; border-left:4px solid #F59E0B;
      padding:14px 24px; font-size:13.5px; color:#92400E;
    }
    .cni-btn {
      margin-left:auto; background:#F59E0B; color:white;
      border-radius:8px; padding:6px 14px; font-size:12px;
      font-weight:700; text-decoration:none; white-space:nowrap;
      transition:background .15s;
    }
    .cni-btn:hover { background:#D97706; }
    .bien-card { transition:transform .22s ease, box-shadow .22s ease; }
    .bien-card:hover { transform:translateY(-5px); box-shadow:0 16px 48px rgba(10,38,80,.18) !important; }
    .desc-clamp { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; min-height:2.4em; }
    @media (max-width: 640px) {
      .page-header { padding: 12px 16px 12px 64px; }
      .page-logo { display: none; }
      .page-divider { display: none; }
      .page-title { font-size: 18px; }
      .page-sub { display: none; }
      .page-btn-full { display: none; }
      .page-btn-short { display: inline; }
    }
  `],
})
export class BiensListComponent implements OnInit {
  biens: Bien[] = [];
  filteredBiens: Bien[] = [];
  loading = true;
  total = 0;
  searchTerm = '';
  filters: BiensFilters = {};
  imgErrors: Record<string, boolean> = {};

  onImgError(bienId: string): void {
    // Nouvelle référence d'objet — force Angular à re-rendre le template
    this.imgErrors = { ...this.imgErrors, [bienId]: true };
  }

  getPhotoUrl(bien: Bien): string | null {
    if (!bien.photos?.length || this.imgErrors[bien.id]) return null;
    const url = bien.photos[0]?.url;
    return url || null;
  }

  getDescription(desc?: string | null): string {
    const trimmed = (desc ?? '').trim();
    return trimmed.length >= 10 ? trimmed : 'Aucune description';
  }

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
