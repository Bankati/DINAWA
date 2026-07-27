import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AnnoncesService, AnnoncesFilters } from '../../services/annonces.service';
import { Annonce, TypeAnnonce, StatutAnnonce } from '@core/models/annonce.model';
import { LokBadgeStatutAnnonceComponent } from '../../../../shared/components/lok-badge-statut-annonce/lok-badge-statut-annonce.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';
import { LokConfirmModalComponent } from '../../../../shared/components/lok-confirm-modal/lok-confirm-modal.component';
import { LokDatePipe } from '../../../../shared/pipes/lok-date.pipe';

@Component({
  selector: 'app-annonces-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    LokBadgeStatutAnnonceComponent,
    LokSkeletonComponent, LokEmptyStateComponent, LokConfirmModalComponent, LokDatePipe
  ],
  template: `
    <div class="min-h-screen" style="background:#F0F4FA">

      <!-- ── EN-TÊTE ── -->
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-logo">
            <img src="/assets/WARAH-logo.png" alt="WARAH" class="logo-img">
          </div>
          <div class="page-divider"></div>
          <div>
            <h1 class="page-title">Annonces</h1>
            <p class="page-sub">{{ annonces.length }} annonce{{ annonces.length !== 1 ? 's' : '' }} publiée{{ annonces.length !== 1 ? 's' : '' }}</p>
          </div>
        </div>
        <button (click)="navigateToNew()" class="btn-primary page-btn">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          <span class="page-btn-full">Publier un bien</span>
          <span class="page-btn-short">Publier</span>
        </button>
      </div>

      <!-- ── KPI ── -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <p class="kpi-label">Total</p>
          <p class="kpi-val" style="color:#111827">{{ annonces.length }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Actives</p>
          <p class="kpi-val" style="color:#16a34a">{{ countByStatut('ACTIVE') }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Réservées</p>
          <p class="kpi-val" style="color:#d97706">{{ countByStatut('RESERVEE') }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Expirées</p>
          <p class="kpi-val" style="color:#6b7280">{{ countByStatut('EXPIREE') }}</p>
        </div>
      </div>

      <!-- ── FILTRES — masqués si aucune annonce ── -->
      @if (!loading && annonces.length > 0) {
        <div class="px-6 mt-6 mb-6">
          <div class="bg-white rounded-2xl border border-white/80 p-3 flex gap-3 flex-wrap items-center"
               style="box-shadow:0 8px 40px rgba(10,38,80,.13)">
            <!-- Recherche -->
            <div class="relative flex-1 min-w-52">
              <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" stroke="#374151" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input type="text" [(ngModel)]="recherche" (ngModelChange)="applyFilters()"
                placeholder="Titre, quartier, ville..."
                class="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border-0 bg-gray-50 focus:outline-none focus:ring-2 transition-all">
            </div>
            <!-- Pills type -->
            <div class="flex gap-1.5 flex-wrap">
              <button (click)="setType(undefined)"
                [class]="!filters.type ? 'ftab-on' : 'ftab-off'">Tous types</button>
              <button (click)="setType(TypeAnnonce.LOCATION)"
                [class]="filters.type === TypeAnnonce.LOCATION ? 'ftab-on' : 'ftab-off'">Location</button>
              <button (click)="setType(TypeAnnonce.VENTE)"
                [class]="filters.type === TypeAnnonce.VENTE ? 'ftab-on' : 'ftab-off'">Vente</button>
            </div>
            <!-- Select statut -->
            <select [(ngModel)]="filters.statut" (ngModelChange)="applyFilters()"
              class="text-sm rounded-xl border-0 bg-gray-50 px-3 py-2.5 focus:outline-none transition-all">
              <option [ngValue]="undefined">Tous statuts</option>
              <option value="ACTIVE">Active</option>
              <option value="RESERVEE">Réservée</option>
              <option value="EXPIREE">Expirée</option>
            </select>
            <!-- Select ville -->
            <select [(ngModel)]="filters.ville" (ngModelChange)="applyFilters()"
              class="text-sm rounded-xl border-0 bg-gray-50 px-3 py-2.5 focus:outline-none transition-all">
              <option [ngValue]="undefined">Toutes villes</option>
              <option value="Lomé">Lomé</option>
              <option value="Sokodé">Sokodé</option>
              <option value="Kara">Kara</option>
              <option value="Atakpamé">Atakpamé</option>
              <option value="Kpalimé">Kpalimé</option>
            </select>
            @if (hasActiveFilters()) {
              <button (click)="clearAllFilters()" class="text-xs text-gray-400 hover:text-red-500 transition-colors px-1">✕</button>
            }
          </div>
        </div>
      }

      <!-- ── GRILLE ── -->
      <div class="px-6 pb-8">
        @if (loading) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            @for (i of [1,2,3,4,5,6]; track i) { <lok-skeleton type="card"></lok-skeleton> }
          </div>

        } @else if (annonces.length === 0) {
          <lok-empty-state
            titre="Aucune annonce pour l'instant"
            description="Ouvrez la fiche d'un bien VACANT et cliquez sur 'Publier en annonce'."
            ctaLabel="Voir mes biens"
            icon="default"
            (ctaAction)="navigateToNew()">
          </lok-empty-state>

        } @else if (filteredAnnonces.length === 0) {
          <lok-empty-state
            titre="Aucun résultat"
            description="Aucune annonce ne correspond à vos critères. Modifiez ou réinitialisez vos filtres."
            icon="search"
            ctaLabel="Réinitialiser les filtres"
            (ctaAction)="clearAllFilters()">
          </lok-empty-state>

        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            @for (annonce of filteredAnnonces; track annonce.id) {

              <div class="ann-card bg-white rounded-2xl overflow-hidden group"
                   style="box-shadow:0 2px 16px rgba(10,38,80,.07)"
                   (click)="viewAnnonce(annonce.id)">

                <!-- Image -->
                <div class="relative h-48 overflow-hidden">
                  @if (annonce.photos[0]) {
                    <img [src]="annonce.photos[0]" [alt]="annonce.titre"
                         class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                  } @else {
                    <div class="w-full h-full flex items-center justify-center"
                         style="background:linear-gradient(135deg,#EEF4FF 0%,#dbeafe 100%)">
                      <div class="w-16 h-16 rounded-2xl flex items-center justify-center"
                           style="background:rgba(15,76,129,.1)">
                        <svg class="w-8 h-8" fill="none" stroke="#0F4C81" stroke-width="1.5" viewBox="0 0 24 24">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                      </div>
                    </div>
                  }
                  <!-- Gradient -->
                  <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                  <!-- Type chip haut-gauche -->
                  <div class="absolute top-3 left-3">
                    <span class="px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-sm"
                          [style]="annonce.type === TypeAnnonce.LOCATION
                            ? 'background:rgba(255,255,255,.9);color:#0A2650'
                            : 'background:#C9982E;color:white'">
                      {{ annonce.type === TypeAnnonce.LOCATION ? 'Location' : 'Vente' }}
                    </span>
                  </div>
                  <!-- Statut haut-droit -->
                  <div class="absolute top-3 right-3">
                    <lok-badge-statut-annonce [statut]="annonce.statut"></lok-badge-statut-annonce>
                  </div>
                  <!-- Prix bas-gauche -->
                  <div class="absolute bottom-3 left-3">
                    <span class="text-white text-sm font-extrabold drop-shadow">
                      {{ annonce.prix | number }} FCFA
                      @if (annonce.type === TypeAnnonce.LOCATION) {
                        <span class="text-xs font-medium opacity-70">/mois</span>
                      }
                    </span>
                  </div>
                </div>

                <!-- Corps -->
                <div class="p-4">
                  <h3 class="text-sm font-extrabold text-gray-900 mb-1 truncate">{{ annonce.titre }}</h3>
                  <p class="text-xs text-gray-400 flex items-center gap-1 mb-4">
                    <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    {{ annonce.adresse.quartier }}, {{ annonce.adresse.ville }}
                    · {{ annonce.dateCreation | lokDate }}
                  </p>
                  <div class="flex gap-2" (click)="$event.stopPropagation()">
                    <button (click)="viewPublicAnnonce(annonce.id)"
                      class="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                      style="background:#F0F4FA;color:#6b7280">
                      Aperçu
                    </button>
                    <button (click)="viewAnnonce(annonce.id)"
                      class="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                      style="background:#0F4C81;color:#fff">
                      Gérer
                    </button>
                    <button (click)="editAnnonce(annonce.id)"
                      class="px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center"
                      style="background:#F0FDF4;color:#059669"
                      title="Modifier">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button (click)="deleteAnnonce(annonce.id)"
                      class="px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center"
                      style="background:#FEF2F2;color:#DC2626"
                      title="Supprimer">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                </div>

              </div>
            }
          </div>
          <p class="text-center text-xs text-gray-400 mt-5">
            {{ filteredAnnonces.length }} annonce{{ filteredAnnonces.length !== 1 ? 's' : '' }} affichée{{ filteredAnnonces.length !== 1 ? 's' : '' }}
          </p>
        }
      </div>

    </div>

    @if (showConfirmModal) {
      <lok-confirm-modal
        titre="Supprimer l'annonce"
        message="Êtes-vous sûr de vouloir supprimer cette annonce ?"
        confirmLabel="Supprimer"
        (onConfirm)="confirmerSuppression()"
        (onCancel)="annulerSuppression()"
      ></lok-confirm-modal>
    }
  `,
  styles: [`
    /* ── En-tête ── */
    .logo-img { height: 88px; width: auto; object-fit: contain; mix-blend-mode: multiply; }
    .page-header { background: white; border-bottom: 1px solid #E5E7EB; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .page-header-left { display: flex; align-items: center; gap: 16px; min-width: 0; }
    .page-divider { width: 1px; height: 32px; background: #E5E7EB; flex-shrink: 0; }
    .page-title { font-size: 22px; font-weight: 700; color: #111827; line-height: 1.2; white-space: nowrap; }
    .page-sub { font-size: 13px; color: #6B7280; margin-top: 1px; }
    .page-btn { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .page-btn-short { display: none; }
    .btn-primary { background: #0F4C81; color: white; border: none; border-radius: .625rem; padding: .625rem 1.25rem; font-weight: 600; cursor: pointer; font-size: .9rem; transition: background .2s; }
    .btn-primary:hover { background: #0A2650; }

    /* ── KPI ── */
    .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; padding: 32px 24px 24px; }
    .kpi-card { background: #fff; border-radius: 14px; padding: 20px 24px; box-shadow: 0 2px 12px rgba(10,38,80,.08); border: 1px solid #E8EDF5; }
    .kpi-label { font-size: 13px; color: #6B7280; margin-bottom: 8px; font-weight: 500; }
    .kpi-val { font-size: 2.25rem; font-weight: 800; line-height: 1; }

    /* ── Pills filtres ── */
    .ftab-on  { padding: 7px 14px; border-radius: 10px; font-size: 12px; font-weight: 700; background: #0F4C81; color: #fff; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all .15s; }
    .ftab-off { padding: 7px 14px; border-radius: 10px; font-size: 12px; font-weight: 500; background: #F3F4F6; color: #6b7280; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all .15s; }
    .ftab-off:hover { background: #E5E7EB; color: #374151; }

    /* ── Card ── */
    .ann-card { transition: transform .2s, box-shadow .2s; cursor: pointer; }
    .ann-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(10,38,80,.15) !important; }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .kpi-grid { grid-template-columns: repeat(2,1fr); gap: 12px; padding: 20px 16px 16px; }
    }
    @media (max-width: 640px) {
      .page-header { padding: 12px 16px 12px 64px; }
      .page-logo { display: none; }
      .page-divider { display: none; }
      .page-title { font-size: 18px; }
      .page-sub { display: none; }
      .page-btn-full { display: none; }
      .page-btn-short { display: inline; }
    }
  `]
})
export class AnnoncesListComponent implements OnInit {
  annonces: Annonce[] = [];
  filteredAnnonces: Annonce[] = [];
  loading = true;
  showConfirmModal = false;
  annonceIdPendingDelete: string | null = null;

  TypeAnnonce = TypeAnnonce;
  StatutAnnonce = StatutAnnonce;

  recherche = '';
  filters: AnnoncesFilters = { type: undefined, statut: undefined, ville: undefined };

  constructor(
    private annoncesService: AnnoncesService,
    private router: Router
  ) {}

  ngOnInit(): void { this.loadAnnonces(); }

  loadAnnonces(): void {
    this.loading = true;
    this.annoncesService.getMesAnnonces().subscribe({
      next: (data) => {
        this.annonces = data;
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilters(): void {
    this.annoncesService.filterAnnonces({ ...this.filters, recherche: this.recherche }).subscribe({
      next: (data) => { this.filteredAnnonces = data; }
    });
  }

  setType(type: TypeAnnonce | undefined): void {
    this.filters.type = type;
    this.applyFilters();
  }

  countByStatut(statut: string): number {
    return this.annonces.filter(a => a.statut === statut).length;
  }

  hasActiveFilters(): boolean {
    return !!this.filters.type || !!this.filters.statut || !!this.filters.ville || !!this.recherche;
  }

  clearAllFilters(): void {
    this.filters = { type: undefined, statut: undefined, ville: undefined };
    this.recherche = '';
    this.applyFilters();
  }

  navigateToNew(): void { this.router.navigate(['/dashboard/biens']); }
  viewAnnonce(id: string): void { this.router.navigate(['/dashboard/annonces', id]); }
  viewPublicAnnonce(id: string): void { window.open('/annonces/' + id, '_blank'); }
  editAnnonce(id: string): void { this.router.navigate(['/dashboard/annonces', id, 'edit']); }

  deleteAnnonce(id: string): void {
    this.annonceIdPendingDelete = id;
    this.showConfirmModal = true;
  }

  confirmerSuppression(): void {
    if (!this.annonceIdPendingDelete) return;
    this.annoncesService.deleteAnnonce(this.annonceIdPendingDelete).subscribe({
      next: () => {
        this.annulerSuppression();
        this.loadAnnonces();
      }
    });
  }

  annulerSuppression(): void {
    this.showConfirmModal = false;
    this.annonceIdPendingDelete = null;
  }
}
