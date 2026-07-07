import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AnnoncesService, AnnoncesFilters } from '../../services/annonces.service';
import { Annonce, TypeAnnonce, StatutAnnonce } from '@core/models/annonce.model';
import { LokBadgeStatutAnnonceComponent } from '../../../../shared/components/lok-badge-statut-annonce/lok-badge-statut-annonce.component';
import { LokMontantFcfaComponent } from '../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';

@Component({
  selector: 'app-annonces-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    LokBadgeStatutAnnonceComponent, LokMontantFcfaComponent,
    LokSkeletonComponent, LokEmptyStateComponent
  ],
  template: `
    <div class="ann-page">

      <!-- En-tête de section -->
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div>
            <h1 class="page-title">Mes annonces</h1>
            <p class="page-sub">{{ annonces.length }} annonce{{ annonces.length > 1 ? 's' : '' }} publiée{{ annonces.length > 1 ? 's' : '' }}</p>
          </div>
        </div>
        <button (click)="navigateToNew()" class="new-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nouvelle annonce
        </button>
      </div>

      <!-- Stats rapides -->
      <div class="stats-row">
        <div class="stat-chip stat-chip-blue">
          <span class="stat-val">{{ annonces.length }}</span>
          <span class="stat-lbl">Total</span>
        </div>
        <div class="stat-chip stat-chip-green">
          <span class="stat-val">{{ countByStatut('ACTIVE') }}</span>
          <span class="stat-lbl">Actives</span>
        </div>
        <div class="stat-chip stat-chip-gold">
          <span class="stat-val">{{ countByStatut('RESERVEE') }}</span>
          <span class="stat-lbl">Réservées</span>
        </div>
        <div class="stat-chip stat-chip-gray">
          <span class="stat-val">{{ countByStatut('EXPIREE') }}</span>
          <span class="stat-lbl">Expirées</span>
        </div>
      </div>

      <!-- Barre de filtres -->
      <div class="filter-bar">
        <div class="search-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            [(ngModel)]="recherche"
            (ngModelChange)="applyFilters()"
            placeholder="Rechercher une annonce..."
            class="search-input">
          @if (recherche) {
            <button (click)="recherche = ''; applyFilters()" class="search-clear">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          }
        </div>
        <select [(ngModel)]="filters.type" (ngModelChange)="applyFilters()" class="filter-sel">
          <option value="">Tous types</option>
          <option value="LOCATION">Location</option>
          <option value="VENTE">Vente</option>
        </select>
        <select [(ngModel)]="filters.statut" (ngModelChange)="applyFilters()" class="filter-sel">
          <option value="">Tous statuts</option>
          <option value="ACTIVE">Active</option>
          <option value="RESERVEE">Réservée</option>
          <option value="EXPIREE">Expirée</option>
        </select>
        <select [(ngModel)]="filters.ville" (ngModelChange)="applyFilters()" class="filter-sel">
          <option value="">Toutes villes</option>
          <option value="Lomé">Lomé</option>
          <option value="Sokodé">Sokodé</option>
          <option value="Kara">Kara</option>
          <option value="Atakpamé">Atakpamé</option>
          <option value="Kpalimé">Kpalimé</option>
        </select>
        @if (hasActiveFilters()) {
          <button (click)="clearAllFilters()" class="reset-btn">Tout effacer</button>
        }
      </div>

      <!-- Liste -->
      @if (loading) {
        <div class="ann-grid">
          @for (i of [1,2,3,4,5,6]; track i) {
            <lok-skeleton type="card"></lok-skeleton>
          }
        </div>
      } @else if (filteredAnnonces.length === 0) {
        <lok-empty-state
          titre="Aucune annonce"
          description="Créez votre première annonce pour démarrer."
          ctaLabel="Nouvelle annonce"
          icon="default"
          (ctaAction)="navigateToNew()"
        ></lok-empty-state>
      } @else {
        <div class="ann-grid">
          @for (annonce of filteredAnnonces; track annonce.id) {
            <div class="ann-card">
              <!-- Image -->
              <div class="ann-img-wrap" (click)="viewAnnonce(annonce.id)">
                @if (annonce.photos[0]) {
                  <img [src]="annonce.photos[0]" [alt]="annonce.titre" class="ann-img">
                } @else {
                  <div class="ann-img-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                  </div>
                }
                <span class="type-chip" [class.chip-loc]="annonce.type === TypeAnnonce.LOCATION" [class.chip-ven]="annonce.type === TypeAnnonce.VENTE">
                  {{ annonce.type === TypeAnnonce.LOCATION ? 'Location' : 'Vente' }}
                </span>
              </div>

              <!-- Corps -->
              <div class="ann-body">
                <div class="ann-top" (click)="viewAnnonce(annonce.id)">
                  <div class="ann-top-left">
                    <h3 class="ann-title">{{ annonce.titre }}</h3>
                    <p class="ann-location">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      {{ annonce.adresse.quartier }}, {{ annonce.adresse.ville }}
                    </p>
                  </div>
                  <div class="ann-top-right">
                    <lok-badge-statut-annonce [statut]="annonce.statut"></lok-badge-statut-annonce>
                  </div>
                </div>

                <div class="ann-meta">
                  <lok-montant-fcfa [montant]="annonce.prix" size="sm"></lok-montant-fcfa>
                  <span class="ann-date">{{ annonce.dateCreation | date:'dd/MM/yy' }}</span>
                </div>

                <!-- Actions -->
                <div class="ann-actions">
                  <button (click)="viewAnnonce(annonce.id)" class="action-btn action-view" title="Voir">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    Voir
                  </button>
                  <button (click)="editAnnonce(annonce.id)" class="action-btn action-edit" title="Modifier">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Modifier
                  </button>
                  <button (click)="deleteAnnonce(annonce.id)" class="action-btn action-del" title="Supprimer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                    </svg>
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .ann-page {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* ── En-tête ── */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .page-header-left {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }

    .page-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: var(--color-primary-50);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .page-icon svg {
      width: 22px;
      height: 22px;
      stroke: var(--color-primary);
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--color-text);
    }

    .page-sub {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    .new-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      height: 44px;
      padding: 0 1.25rem;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, transform 0.15s;
      white-space: nowrap;
    }

    .new-btn svg { width: 18px; height: 18px; }
    .new-btn:hover { background: var(--color-primary-dark); transform: translateY(-1px); }

    /* ── Stats ── */
    .stats-row {
      display: flex;
      gap: 0.875rem;
      flex-wrap: wrap;
    }

    .stat-chip {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.75rem 1.5rem;
      border-radius: 10px;
      border: 1px solid transparent;
      min-width: 90px;
    }

    .stat-val { font-size: 1.5rem; font-weight: 800; }
    .stat-lbl { font-size: 0.75rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 0.125rem; }

    .stat-chip-blue  { background: rgba(15,76,129,.08); border-color: rgba(15,76,129,.2); }
    .stat-chip-blue .stat-val { color: var(--color-primary); }
    .stat-chip-blue .stat-lbl { color: var(--color-primary); opacity: .7; }

    .stat-chip-green { background: rgba(16,185,129,.08); border-color: rgba(16,185,129,.2); }
    .stat-chip-green .stat-val { color: #059669; }
    .stat-chip-green .stat-lbl { color: #059669; opacity: .7; }

    .stat-chip-gold  { background: rgba(201,152,46,.1); border-color: rgba(201,152,46,.25); }
    .stat-chip-gold .stat-val { color: #92400E; }
    .stat-chip-gold .stat-lbl { color: #92400E; opacity: .7; }

    .stat-chip-gray  { background: rgba(107,114,128,.08); border-color: rgba(107,114,128,.2); }
    .stat-chip-gray .stat-val { color: #374151; }
    .stat-chip-gray .stat-lbl { color: #374151; opacity: .7; }

    /* ── Filtres ── */
    .filter-bar {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      align-items: center;
      background: white;
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 0.875rem 1.125rem;
    }

    .search-wrap {
      position: relative;
      flex: 1;
      min-width: 200px;
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: var(--color-text-muted);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      height: 40px;
      padding: 0 2.25rem 0 2.25rem;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      font-size: 0.875rem;
      color: var(--color-text);
      box-sizing: border-box;
      transition: border-color 0.2s;
    }

    .search-input:focus { outline: none; border-color: var(--color-primary); }

    .search-clear {
      position: absolute;
      right: 0.625rem;
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--color-text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .search-clear svg { width: 14px; height: 14px; }

    .filter-sel {
      height: 40px;
      padding: 0 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      font-size: 0.875rem;
      color: var(--color-text);
      background: white;
      cursor: pointer;
      min-width: 130px;
    }

    .filter-sel:focus { outline: none; border-color: var(--color-primary); }

    .reset-btn {
      height: 40px;
      padding: 0 0.875rem;
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #FDE68A;
      border-radius: 8px;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.2s;
    }

    .reset-btn:hover { background: #FDE68A; }

    /* ── Grille ── */
    .ann-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.25rem;
    }

    /* ── Card ── */
    .ann-card {
      background: white;
      border-radius: 14px;
      border: 1px solid var(--color-border);
      overflow: hidden;
      transition: box-shadow 0.2s;
    }

    .ann-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.08); }

    .ann-img-wrap {
      position: relative;
      height: 180px;
      overflow: hidden;
      cursor: pointer;
    }

    .ann-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }

    .ann-card:hover .ann-img { transform: scale(1.04); }

    .ann-img-placeholder {
      width: 100%;
      height: 100%;
      background: #F3F4F6;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ann-img-placeholder svg { width: 48px; height: 48px; color: #9CA3AF; }

    .type-chip {
      position: absolute;
      top: 0.75rem;
      left: 0.75rem;
      padding: 0.2rem 0.625rem;
      border-radius: 999px;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .chip-loc { background: rgba(15,76,129,.9); color: white; }
    .chip-ven { background: rgba(201,152,46,.95); color: var(--color-primary-900); }

    .ann-body { padding: 1rem; }

    .ann-top {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.625rem;
      cursor: pointer;
    }

    .ann-title {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--color-text);
      line-height: 1.3;
      margin-bottom: 0.25rem;
    }

    .ann-location {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .ann-location svg { width: 12px; height: 12px; flex-shrink: 0; }

    .ann-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.625rem 0;
      border-top: 1px solid #F3F4F6;
      border-bottom: 1px solid #F3F4F6;
      margin-bottom: 0.75rem;
    }

    .ann-date {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .ann-actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.3rem;
      height: 36px;
      border-radius: 8px;
      border: 1px solid;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .action-btn svg { width: 13px; height: 13px; }

    .action-view {
      background: var(--color-primary-50);
      border-color: rgba(15,76,129,.2);
      color: var(--color-primary);
    }

    .action-view:hover { background: var(--color-primary); color: white; border-color: var(--color-primary); }

    .action-edit {
      background: #F0FDF4;
      border-color: #BBF7D0;
      color: #059669;
    }

    .action-edit:hover { background: #059669; color: white; border-color: #059669; }

    .action-del {
      background: #FEF2F2;
      border-color: #FECACA;
      color: #DC2626;
    }

    .action-del:hover { background: #DC2626; color: white; border-color: #DC2626; }

    @media (max-width: 768px) {
      .ann-page { padding: 1rem; gap: 1rem; }
      .page-header { flex-direction: column; align-items: flex-start; }
      .new-btn { align-self: stretch; justify-content: center; }
      .stats-row { gap: 0.5rem; }
      .stat-chip { padding: 0.625rem 1rem; min-width: 70px; }
      .filter-bar { flex-direction: column; }
      .search-wrap, .filter-sel { width: 100%; }
      .ann-grid { grid-template-columns: 1fr; }
    }
  `
})
export class AnnoncesListComponent implements OnInit {
  annonces: Annonce[] = [];
  filteredAnnonces: Annonce[] = [];
  loading = true;

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
    this.annoncesService.getAllAnnonces().subscribe({
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

  navigateToNew(): void { this.router.navigate(['/annonces/new']); }
  viewAnnonce(id: string): void { this.router.navigate(['/annonces/list', id]); }
  editAnnonce(id: string): void { this.router.navigate(['/annonces/list', id, 'edit']); }

  deleteAnnonce(id: string): void {
    if (confirm('Supprimer cette annonce ?')) {
      this.annoncesService.deleteAnnonce(id).subscribe({ next: () => this.loadAnnonces() });
    }
  }
}
