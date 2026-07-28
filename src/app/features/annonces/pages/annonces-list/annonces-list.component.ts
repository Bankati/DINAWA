import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { BiensService } from '../../../biens/services/biens.service';
import { Bien, PROPERTY_TYPE_LABELS } from '@core/models/bien.model';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';
import { AuthService } from '../../../../core/services/auth.service';

// Il n'existe plus de CRUD manuel d'annonces côté backend — une annonce se
// publie/se désactive automatiquement quand un bien passe VACANT/OCCUPIED
// (voir /architect module Annonces, 2026-07-28). Cette page est donc une vue
// lecture seule des biens actuellement en annonce (status === VACANT),
// avec un lien vers la recherche publique plutôt qu'un deep-link exact
// (aucun slug d'annonce n'est exposé par GET /properties).
@Component({
  selector: 'app-annonces-list',
  standalone: true,
  imports: [CommonModule, RouterModule, LokSkeletonComponent, LokEmptyStateComponent],
  template: `
    <div class="min-h-screen" style="background:#F0F4FA">

      <!-- ── EN-TÊTE ── -->
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-logo">
            <img src="/assets/warah-icon.png" alt="" class="logo-img">
          </div>
          <div class="page-divider"></div>
          <div>
            <h1 class="page-title">Mes annonces</h1>
            <p class="page-sub">{{ biens.length }} bien{{ biens.length !== 1 ? 's' : '' }} actuellement en annonce</p>
          </div>
        </div>
        <button [routerLink]="basePath + '/biens'" class="btn-secondary page-btn">
          Gérer mes biens
        </button>
      </div>

      <p class="info-banner">
        La publication est automatique : un bien vacant est immédiatement visible sur l'annonce publique, et retiré dès qu'un locataire y est installé.
      </p>

      <!-- ── GRILLE ── -->
      <div class="px-6 pb-8">
        @if (loading) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            @for (i of [1,2,3]; track i) { <lok-skeleton type="card"></lok-skeleton> }
          </div>
        } @else if (biens.length === 0) {
          <lok-empty-state
            titre="Aucune annonce active"
            description="Dès qu'un de vos biens passera au statut Vacant, il apparaîtra automatiquement ici et sur la page publique."
            ctaLabel="Voir mes biens"
            icon="bien"
            (ctaAction)="goToBiens()">
          </lok-empty-state>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            @for (bien of biens; track bien.id) {
              <div class="ann-card bg-white rounded-2xl overflow-hidden" style="box-shadow:0 2px 16px rgba(10,38,80,.07)">
                <div class="relative h-48 overflow-hidden">
                  @if (bien.photos[0]) {
                    <img [src]="bien.photos[0].url" [alt]="bien.neighborhood" class="w-full h-full object-cover">
                  } @else {
                    <div class="w-full h-full flex items-center justify-center" style="background:linear-gradient(135deg,#EEF4FF 0%,#dbeafe 100%)">
                      <div class="w-16 h-16 rounded-2xl flex items-center justify-center" style="background:rgba(15,76,129,.1)">
                        <svg class="w-8 h-8" fill="none" stroke="var(--color-primary)" stroke-width="1.5" viewBox="0 0 24 24">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                      </div>
                    </div>
                  }
                  <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                  <div class="absolute top-3 left-3">
                    <span class="px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-sm" style="background:rgba(255,255,255,.9);color:var(--color-primary-dark)">
                      {{ typeLabel(bien.type) }}
                    </span>
                  </div>
                  <div class="absolute top-3 right-3">
                    <span class="px-2.5 py-1 rounded-lg text-xs font-bold" style="background:rgba(16,185,129,.9);color:white">Active</span>
                  </div>
                  <div class="absolute bottom-3 left-3">
                    <span class="text-white text-sm font-extrabold drop-shadow">
                      {{ bien.monthlyRent | number }} FCFA <span class="text-xs font-medium opacity-70">/mois</span>
                    </span>
                  </div>
                </div>
                <div class="p-4">
                  <h3 class="text-sm font-extrabold text-gray-900 mb-1 truncate">{{ bien.neighborhood }}, {{ bien.city }}</h3>
                  <p class="text-xs text-gray-400 mb-4">{{ bien.surfaceArea }} m²@if (bien.roomsCount) { · {{ bien.roomsCount }} pièce{{ bien.roomsCount > 1 ? 's' : '' }} }</p>
                  <div class="flex gap-2">
                    <button [routerLink]="basePath + '/biens/' + bien.id" class="flex-1 py-2 rounded-xl text-xs font-bold transition-all" style="background:#F0F4FA;color:#6b7280">
                      Voir le bien
                    </button>
                    <button (click)="voirAnnoncePublique(bien)" class="flex-1 py-2 rounded-xl text-xs font-bold transition-all" style="background:var(--color-primary);color:#fff">
                      Annonce publique
                    </button>
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
    .logo-img { height: 34px; width: auto; display: block; }
    .page-header { background: white; border-bottom: 1px solid #E5E7EB; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .page-header-left { display: flex; align-items: center; gap: 16px; min-width: 0; }
    .page-divider { width: 1px; height: 32px; background: #E5E7EB; flex-shrink: 0; }
    .page-title { font-size: 22px; font-weight: 700; color: #111827; line-height: 1.2; white-space: nowrap; }
    .page-sub { font-size: 13px; color: #6B7280; margin-top: 1px; }
    .page-btn { flex-shrink: 0; }
    .btn-secondary { background: #F3F4F6; color: #374151; border: none; border-radius: .625rem; padding: .625rem 1.25rem; font-weight: 600; cursor: pointer; font-size: .9rem; transition: background .2s; }
    .btn-secondary:hover { background: #E5E7EB; }

    .info-banner { margin: 20px 24px 4px; padding: 12px 16px; background: var(--color-primary-50); color: var(--color-primary-dark); border-radius: 10px; font-size: 13px; }

    .ann-card { transition: transform .2s, box-shadow .2s; }
    .ann-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(10,38,80,.15) !important; }

    @media (max-width: 640px) {
      .page-header { padding: 12px 16px 12px 64px; }
      .page-logo { display: none; }
      .page-divider { display: none; }
      .page-title { font-size: 18px; }
      .page-sub { display: none; }
    }
  `]
})
export class AnnoncesListComponent implements OnInit {
  biens: Bien[] = [];
  loading = true;
  basePath: string;

  constructor(
    private biensService: BiensService,
    private authService: AuthService,
    private router: Router,
  ) {
    this.basePath = this.authService.getWorkspacePrefix();
  }

  ngOnInit(): void {
    this.loading = true;
    this.biensService.getBiens({ status: 'VACANT' }).subscribe({
      next: (res) => {
        this.biens = res.data;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  typeLabel(type: string): string {
    return PROPERTY_TYPE_LABELS[type as keyof typeof PROPERTY_TYPE_LABELS] ?? type;
  }

  voirAnnoncePublique(bien: Bien): void {
    window.open(`/annonces?type=${bien.type}&ville=${encodeURIComponent(bien.city)}`, '_blank');
  }

  goToBiens(): void {
    this.router.navigate([this.basePath, 'biens']);
  }
}
