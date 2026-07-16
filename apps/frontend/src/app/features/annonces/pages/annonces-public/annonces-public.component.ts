import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AnnoncesService } from '../../services/annonces.service';
import { Annonce } from '@core/models/annonce.model';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';

@Component({
  selector: 'app-annonces-public',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LokSkeletonComponent, LokEmptyStateComponent],
  template: `
    <div class="pub-page">

      <!-- Hero -->
      <div class="hero">
        <img
          src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
          alt="Lomé" class="hero-img">
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <div class="hero-nav">
            <a routerLink="/" class="hero-logo">
              <img src="/assets/WARAH-logo.png" alt="WARAH" class="nav-logo-img">
            </a>
            <a routerLink="/auth/login" class="hero-login-btn">Se connecter</a>
          </div>
          <div class="hero-text">
            <h1 class="hero-title">Trouvez votre logement idéal au Togo</h1>
            <p class="hero-sub">Appartements, maisons, bureaux — gérés en toute transparence</p>
            <div class="hero-stats">
              <div class="hero-stat">
                <span class="hero-stat-num">{{ annonces.length }}</span>
                <span class="hero-stat-label">annonces disponibles</span>
              </div>
              <div class="hero-stat-sep"></div>
              <div class="hero-stat">
                <span class="hero-stat-num">6</span>
                <span class="hero-stat-label">villes couvertes</span>
              </div>
              <div class="hero-stat-sep"></div>
              <div class="hero-stat">
                <span class="hero-stat-num">500+</span>
                <span class="hero-stat-label">propriétaires actifs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filtres sticky -->
      <div class="filters-bar">
        <div class="filters-inner">
          <div class="filter-item">
            <label class="filter-label">Type de bien</label>
            <select [(ngModel)]="typeFilter" (ngModelChange)="applyFilters()" class="filter-select">
              <option value="">Tous les types</option>
              <option value="maison">Maison</option>
              <option value="appartement">Appartement</option>
              <option value="bureau">Bureau</option>
              <option value="villa">Villa</option>
            </select>
          </div>
          <div class="filter-item">
            <label class="filter-label">Ville</label>
            <select [(ngModel)]="villeFilter" (ngModelChange)="applyFilters()" class="filter-select">
              <option value="">Toutes les villes</option>
              <option value="lome">Lomé</option>
              <option value="kpalime">Kpalimé</option>
              <option value="atakpame">Atakpamé</option>
              <option value="sokode">Sokodé</option>
              <option value="kara">Kara</option>
              <option value="tsevie">Tsévié</option>
            </select>
          </div>
          <div class="filter-item">
            <label class="filter-label">Budget maximum</label>
            <select [(ngModel)]="budgetFilter" (ngModelChange)="applyFilters()" class="filter-select">
              <option value="">Tous les prix</option>
              <option value="50000">- de 50 000 FCFA</option>
              <option value="100000">- de 100 000 FCFA</option>
              <option value="200000">- de 200 000 FCFA</option>
              <option value="500000">- de 500 000 FCFA</option>
            </select>
          </div>
          @if (hasActiveFilters()) {
            <button (click)="clearFilters()" class="filter-reset">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Effacer
            </button>
          }
          <div class="filter-count">
            <span>{{ filteredAnnonces.length }} résultat{{ filteredAnnonces.length > 1 ? 's' : '' }}</span>
          </div>
        </div>
      </div>

      <!-- Grille -->
      <div class="listings">
        @if (loading) {
          <div class="ann-grid">
            @for (i of [1,2,3,4,5,6]; track i) {
              <lok-skeleton type="card"></lok-skeleton>
            }
          </div>
        } @else if (filteredAnnonces.length === 0) {
          <lok-empty-state
            titre="Aucune annonce trouvée"
            description="Aucune annonce ne correspond à vos critères."
            ctaLabel="Effacer les filtres"
            icon="default"
            (ctaAction)="clearFilters()"
          ></lok-empty-state>
        } @else {
          <div class="ann-grid">
            @for (annonce of filteredAnnonces; track annonce.id) {
              <div class="ann-card" (click)="viewAnnonce(annonce.id)">
                <div class="ann-img-wrap">
                  <img
                    [src]="annonce.photos[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'"
                    [alt]="annonce.titre"
                    class="ann-img">
                  <span class="ann-type-badge" [class.badge-location]="annonce.type === 'LOCATION'" [class.badge-vente]="annonce.type === 'VENTE'">
                    {{ annonce.type === 'LOCATION' ? 'Location' : 'Vente' }}
                  </span>
                  @if (annonce.statut === 'ACTIVE') {
                    <span class="ann-dispo-badge">Disponible</span>
                  }
                  <div class="ann-price-overlay">
                    {{ annonce.prix | number:'1.0-0' }} FCFA{{ annonce.type === 'LOCATION' ? '/mois' : '' }}
                  </div>
                </div>
                <div class="ann-body">
                  <h3 class="ann-title">{{ annonce.titre }}</h3>
                  <p class="ann-location">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    {{ annonce.adresse.quartier }}, {{ annonce.adresse.ville }}
                  </p>
                  @if (annonce.typeBien) {
                    <span class="ann-bien-chip">{{ annonce.typeBien }}</span>
                  }
                  <button class="ann-cta">Voir le détail</button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .pub-page {
      min-height: 100vh;
      background: #F4F6F9;
      font-family: 'Inter', sans-serif;
    }

    /* ── Hero ── */
    .hero {
      position: relative;
      height: 260px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .hero-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(10,38,80,.92) 0%, rgba(15,76,129,.85) 60%, rgba(8,30,65,.9) 100%);
    }

    .hero-content {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 0 2.5rem;
      max-width: 1300px;
      margin: 0 auto;
      width: 100%;
    }

    .hero-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 0;
    }

    .hero-logo { display: flex; align-items: center; }

    .nav-logo-img {
      height: 44px;
      width: auto;
      object-fit: contain;
    }

    .hero-login-btn {
      display: inline-flex;
      align-items: center;
      padding: 0.5rem 1.25rem;
      background: rgba(255,255,255,.15);
      border: 1px solid rgba(255,255,255,.3);
      border-radius: 999px;
      color: white;
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
      transition: background 0.2s;
    }

    .hero-login-btn:hover { background: rgba(255,255,255,.25); }

    .hero-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.75rem;
      padding-bottom: 2rem;
    }

    .hero-title {
      font-size: 1.625rem;
      font-weight: 800;
      color: white;
      line-height: 1.2;
      max-width: 580px;
    }

    .hero-sub {
      font-size: 0.9375rem;
      color: rgba(255,255,255,.82);
    }

    .hero-stats {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      margin-top: 0.375rem;
    }

    .hero-stat {
      display: flex;
      align-items: baseline;
      gap: 0.375rem;
    }

    .hero-stat-num {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--color-accent);
    }

    .hero-stat-label {
      font-size: 0.6875rem;
      color: rgba(255,255,255,.7);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .hero-stat-sep {
      width: 1px;
      height: 20px;
      background: rgba(255,255,255,.2);
    }

    /* ── Filtres ── */
    .filters-bar {
      background: white;
      border-bottom: 1px solid #E5E7EB;
      position: sticky;
      top: 0;
      z-index: 20;
      box-shadow: 0 2px 8px rgba(0,0,0,.06);
    }

    .filters-inner {
      max-width: 1300px;
      margin: 0 auto;
      padding: 0.875rem 2.5rem;
      display: flex;
      align-items: flex-end;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .filter-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 160px;
      flex: 1;
    }

    .filter-label {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .filter-select {
      height: 40px;
      padding: 0 0.875rem;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      font-size: 0.875rem;
      color: var(--color-text);
      background: white;
      cursor: pointer;
      transition: border-color 0.2s;
    }

    .filter-select:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    .filter-reset {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      height: 40px;
      padding: 0 1rem;
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #FDE68A;
      border-radius: 8px;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      align-self: flex-end;
      transition: background 0.2s;
      white-space: nowrap;
    }

    .filter-reset svg { width: 14px; height: 14px; }

    .filter-reset:hover { background: #FDE68A; }

    .filter-count {
      align-self: flex-end;
      margin-left: auto;
      font-size: 0.875rem;
      color: var(--color-text-muted);
      white-space: nowrap;
      padding-bottom: 0.625rem;
    }

    /* ── Grille ── */
    .listings {
      max-width: 1300px;
      margin: 0 auto;
      padding: 2rem 2.5rem 3rem;
    }

    .ann-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    /* ── Card annonce ── */
    .ann-card {
      background: white;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid #E5E7EB;
      cursor: pointer;
      transition: transform 0.22s ease, box-shadow 0.22s ease;
    }

    .ann-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 16px 32px rgba(0,0,0,.12);
    }

    .ann-img-wrap {
      position: relative;
      height: 210px;
      overflow: hidden;
    }

    .ann-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.35s ease;
    }

    .ann-card:hover .ann-img { transform: scale(1.06); }

    .ann-type-badge {
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

    .badge-location {
      background: rgba(15, 76, 129, 0.9);
      color: white;
    }

    .badge-vente {
      background: rgba(201, 152, 46, 0.95);
      color: var(--color-primary-900);
    }

    .ann-dispo-badge {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: rgba(16, 185, 129, 0.92);
      color: white;
      padding: 0.2rem 0.625rem;
      border-radius: 999px;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .ann-price-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, rgba(10,38,80,.9) 0%, transparent 100%);
      color: white;
      padding: 1.5rem 0.875rem 0.625rem;
      font-size: 0.9375rem;
      font-weight: 700;
    }

    .ann-body {
      padding: 1rem 1.125rem 1.125rem;
    }

    .ann-title {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--color-text);
      margin-bottom: 0.375rem;
      line-height: 1.3;
    }

    .ann-location {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      margin-bottom: 0.625rem;
    }

    .ann-location svg { width: 13px; height: 13px; flex-shrink: 0; }

    .ann-bien-chip {
      display: inline-block;
      padding: 0.15rem 0.625rem;
      background: var(--color-primary-50);
      color: var(--color-primary);
      border-radius: 999px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: capitalize;
      margin-bottom: 0.75rem;
    }

    .ann-cta {
      display: block;
      width: 100%;
      height: 40px;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .ann-cta:hover { background: var(--color-primary-dark); }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .hero { height: 220px; }
      .hero-content { padding: 0 1.5rem; }
      .hero-title { font-size: 1.75rem; }
      .filters-inner { padding: 0.75rem 1.5rem; }
      .listings { padding: 1.5rem 1.5rem 2rem; }
    }

    @media (max-width: 640px) {
      .hero { height: auto; padding-bottom: 1.5rem; }
      .hero-stats { flex-wrap: wrap; gap: 1rem; }
      .hero-stat-sep { display: none; }
      .filters-inner { flex-direction: column; align-items: stretch; }
      .filter-item { min-width: auto; }
      .filter-count { display: none; }
      .ann-grid { grid-template-columns: 1fr; }
      .listings { padding: 1rem 1rem 2rem; }
    }
  `
})
export class AnnoncesPublicComponent implements OnInit {
  annonces: Annonce[] = [];
  filteredAnnonces: Annonce[] = [];
  loading = true;

  typeFilter = '';
  villeFilter = '';
  budgetFilter = '';

  constructor(
    private annoncesService: AnnoncesService,
    private router: Router,
    private route: ActivatedRoute,
    private titleService: Title,
    private metaService: Meta
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Annonces immobilières au Togo | WARAH');
    this.metaService.updateTag({
      name: 'description',
      content: 'Trouvez votre logement idéal au Togo : appartements, maisons et studios à louer ou à vendre, gérés en toute transparence sur WARAH.'
    });

    this.route.queryParams.subscribe(params => {
      this.typeFilter = params['type'] || '';
      this.villeFilter = params['ville'] || '';
      this.loadAnnonces();
    });
  }

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
    this.filteredAnnonces = this.annonces.filter(a => {
      if (this.typeFilter && a.typeBien?.toLowerCase() !== this.typeFilter) return false;
      if (this.villeFilter) {
        const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (norm(a.adresse?.ville ?? '') !== norm(this.villeFilter)) return false;
      }
      if (this.budgetFilter && a.prix > parseInt(this.budgetFilter)) return false;
      return true;
    });
  }

  hasActiveFilters(): boolean {
    return !!this.typeFilter || !!this.villeFilter || !!this.budgetFilter;
  }

  clearFilters(): void {
    this.typeFilter = '';
    this.villeFilter = '';
    this.budgetFilter = '';
    this.applyFilters();
  }

  viewAnnonce(id: string): void {
    this.router.navigate(['/annonces', id]);
  }
}
