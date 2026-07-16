import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AnnoncesService } from '../../services/annonces.service';
import { Annonce, StatutAnnonce, TypeAnnonce } from '@core/models/annonce.model';
import { LokBadgeStatutAnnonceComponent } from '../../../../shared/components/lok-badge-statut-annonce/lok-badge-statut-annonce.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokConfirmModalComponent } from '../../../../shared/components/lok-confirm-modal/lok-confirm-modal.component';

@Component({
  selector: 'app-annonce-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LokBadgeStatutAnnonceComponent, LokSkeletonComponent, LokConfirmModalComponent],
  template: `
    <div class="detail-page">

      <!-- Topbar de gestion -->
      <div class="mgmt-topbar">
        <button (click)="goBack()" class="back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Mes annonces
        </button>
        @if (annonce) {
          <div class="mgmt-actions">
            <button (click)="editAnnonce()" class="mgmt-btn mgmt-edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Modifier
            </button>
            <button (click)="deleteAnnonce()" class="mgmt-btn mgmt-del">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
              Supprimer
            </button>
          </div>
        }
      </div>

      @if (loading) {
        <div class="loading-wrap">
          <lok-skeleton type="card"></lok-skeleton>
          <lok-skeleton type="card"></lok-skeleton>
        </div>
      } @else if (annonce) {
        <div class="detail-body">

          <!-- Photo principale -->
          <div class="photo-block">
            @if (annonce.photos[0]) {
              <img [src]="photoPrincipale" [alt]="annonce.titre" class="main-photo">
            } @else {
              <div class="photo-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
              </div>
            }
            @if (annonce.photos && annonce.photos.length > 1) {
              <div class="thumb-row">
                @for (photo of annonce.photos; track photo) {
                  <button class="thumb" [class.thumb-active]="photoPrincipale === photo" (click)="photoPrincipale = photo">
                    <img [src]="photo" [alt]="annonce.titre" class="thumb-img">
                  </button>
                }
              </div>
            }
          </div>

          <!-- Titre + badges -->
          <div class="title-block">
            <div class="title-badges">
              <span class="type-badge" [class.badge-loc]="annonce.type === TypeAnnonce.LOCATION" [class.badge-ven]="annonce.type === TypeAnnonce.VENTE">
                {{ annonce.type === TypeAnnonce.LOCATION ? 'Location' : 'Vente' }}
              </span>
              @if (annonce.typeBien) {
                <span class="bien-badge">{{ annonce.typeBien }}</span>
              }
              <lok-badge-statut-annonce [statut]="annonce.statut"></lok-badge-statut-annonce>
            </div>
            <h1 class="detail-title">{{ annonce.titre }}</h1>
            <p class="detail-location">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              {{ annonce.adresse.quartier }}, {{ annonce.adresse.ville }}
              @if (annonce.adresse.adresseComplete) {
                · {{ annonce.adresse.adresseComplete }}
              }
            </p>
          </div>

          <!-- Grid contenu -->
          <div class="content-grid">
            <!-- Colonne principale -->
            <div class="col-main">
              <div class="info-card">
                <h2 class="card-title">Description</h2>
                <p class="card-text">{{ annonce.description }}</p>
              </div>
              <div class="info-card">
                <h2 class="card-title">Contact propriétaire</h2>
                <div class="contact-rows">
                  <div class="contact-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>{{ annonce.contact.nom }}</span>
                  </div>
                  <div class="contact-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.68a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .82h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                    <a [href]="'tel:' + annonce.contact.telephone" class="contact-link">{{ annonce.contact.telephone }}</a>
                  </div>
                  @if (annonce.contact.email) {
                    <div class="contact-row">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                      <a [href]="'mailto:' + annonce.contact.email" class="contact-link">{{ annonce.contact.email }}</a>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Colonne latérale -->
            <div class="col-aside">
              <!-- Prix + statut -->
              <div class="price-card">
                <div class="price-amount">{{ annonce.prix | number:'1.0-0' }} <span class="price-currency">FCFA</span></div>
                <div class="price-period">{{ annonce.type === TypeAnnonce.LOCATION ? 'par mois' : 'prix de vente' }}</div>
              </div>

              <!-- Dates -->
              <div class="info-card">
                <h2 class="card-title">Dates</h2>
                <div class="dates-rows">
                  <div class="date-row">
                    <span class="date-lbl">Création</span>
                    <span class="date-val">{{ annonce.dateCreation | date:'dd MMM yyyy' }}</span>
                  </div>
                  <div class="date-row">
                    <span class="date-lbl">Expiration</span>
                    <span class="date-val">{{ annonce.dateExpiration | date:'dd MMM yyyy' }}</span>
                  </div>
                </div>
              </div>

              <!-- Bien associé -->
              <div class="info-card">
                <h2 class="card-title">Bien associé</h2>
                <div class="bien-row">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  <span>Bien #{{ annonce.bienId }}</span>
                </div>
                <button (click)="viewBien()" class="voir-bien-btn">Voir le bien</button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>

    @if (showConfirmModal) {
      <lok-confirm-modal
        titre="Supprimer l'annonce"
        message="Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible."
        confirmLabel="Supprimer"
        (onConfirm)="confirmerSuppression()"
        (onCancel)="annulerSuppression()"
      ></lok-confirm-modal>
    }
  `,
  styles: `
    .detail-page {
      min-height: 100vh;
      background: #F4F6F9;
      font-family: 'Inter', sans-serif;
    }

    /* ── Topbar gestion ── */
    .mgmt-topbar {
      background: white;
      border-bottom: 1px solid #E5E7EB;
      padding: 0 2rem;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-muted);
      background: none;
      border: none;
      cursor: pointer;
      transition: color 0.2s;
    }

    .back-btn svg { width: 18px; height: 18px; }
    .back-btn:hover { color: var(--color-primary); }

    .mgmt-actions { display: flex; gap: 0.625rem; }

    .mgmt-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      height: 38px;
      padding: 0 1rem;
      border-radius: 8px;
      border: 1px solid;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .mgmt-btn svg { width: 16px; height: 16px; }

    .mgmt-edit {
      background: var(--color-primary-50);
      border-color: rgba(15,76,129,.25);
      color: var(--color-primary);
    }

    .mgmt-edit:hover { background: var(--color-primary); color: white; border-color: var(--color-primary); }

    .mgmt-del {
      background: #FEF2F2;
      border-color: #FECACA;
      color: #DC2626;
    }

    .mgmt-del:hover { background: #DC2626; color: white; border-color: #DC2626; }

    .loading-wrap {
      max-width: 1100px;
      margin: 2rem auto;
      padding: 0 2rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* ── Body ── */
    .detail-body {
      max-width: 1100px;
      margin: 0 auto;
      padding: 2rem 2rem 3rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* ── Photo ── */
    .photo-block {
      background: white;
      border-radius: 14px;
      border: 1px solid #E5E7EB;
      overflow: hidden;
    }

    .main-photo {
      width: 100%;
      height: 360px;
      object-fit: cover;
      display: block;
    }

    .photo-placeholder {
      height: 360px;
      background: #F3F4F6;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .photo-placeholder svg { width: 80px; height: 80px; color: #9CA3AF; }

    .thumb-row {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      overflow-x: auto;
    }

    .thumb {
      width: 72px;
      height: 54px;
      border-radius: 6px;
      overflow: hidden;
      border: 2px solid #E5E7EB;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
      transition: border-color 0.18s;
    }

    .thumb.thumb-active { border-color: var(--color-primary); }
    .thumb-img { width: 100%; height: 100%; object-fit: cover; }

    /* ── Titre ── */
    .title-block {
      background: white;
      border-radius: 14px;
      border: 1px solid #E5E7EB;
      padding: 1.5rem;
    }

    .title-badges {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 0.75rem;
    }

    .type-badge, .bien-badge {
      display: inline-flex;
      padding: 0.2rem 0.75rem;
      border-radius: 999px;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .badge-loc { background: rgba(15,76,129,.1); color: var(--color-primary); }
    .badge-ven { background: rgba(201,152,46,.15); color: #92400E; }
    .bien-badge { background: #F3F4F6; color: #374151; }

    .detail-title {
      font-size: 1.625rem;
      font-weight: 800;
      color: var(--color-text);
      margin-bottom: 0.5rem;
    }

    .detail-location {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.9375rem;
      color: var(--color-text-muted);
    }

    .detail-location svg { width: 16px; height: 16px; flex-shrink: 0; }

    /* ── Content grid ── */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 1.25rem;
      align-items: start;
    }

    .col-main { display: flex; flex-direction: column; gap: 1.25rem; }
    .col-aside { display: flex; flex-direction: column; gap: 1.25rem; }

    .info-card {
      background: white;
      border-radius: 14px;
      border: 1px solid #E5E7EB;
      padding: 1.25rem;
    }

    .card-title {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--color-text);
      margin-bottom: 0.875rem;
    }

    .card-text {
      font-size: 0.9375rem;
      color: #374151;
      line-height: 1.65;
    }

    /* Contact */
    .contact-rows { display: flex; flex-direction: column; gap: 0.75rem; }

    .contact-row {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      font-size: 0.9375rem;
      color: var(--color-text);
    }

    .contact-row svg { width: 18px; height: 18px; color: var(--color-text-muted); flex-shrink: 0; }

    .contact-link { color: var(--color-primary); text-decoration: none; }
    .contact-link:hover { text-decoration: underline; }

    /* Prix */
    .price-card {
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
      border-radius: 14px;
      padding: 1.5rem;
      text-align: center;
    }

    .price-amount {
      font-size: 1.875rem;
      font-weight: 800;
      color: white;
      line-height: 1;
    }

    .price-currency { font-size: 1.125rem; font-weight: 600; }

    .price-period {
      font-size: 0.875rem;
      color: rgba(255,255,255,.7);
      margin-top: 0.375rem;
    }

    /* Dates */
    .dates-rows { display: flex; flex-direction: column; gap: 0.625rem; }

    .date-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
    }

    .date-lbl { color: var(--color-text-muted); }
    .date-val { font-weight: 600; color: var(--color-text); }

    /* Bien */
    .bien-row {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      font-size: 0.9375rem;
      color: var(--color-text);
      margin-bottom: 1rem;
    }

    .bien-row svg { width: 18px; height: 18px; color: var(--color-text-muted); }

    .voir-bien-btn {
      width: 100%;
      height: 40px;
      background: var(--color-primary-50);
      color: var(--color-primary);
      border: 1px solid rgba(15,76,129,.2);
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .voir-bien-btn:hover { background: var(--color-primary); color: white; border-color: var(--color-primary); }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .content-grid { grid-template-columns: 1fr; }
      .detail-body { padding: 1.25rem 1.25rem 2rem; }
      .main-photo { height: 240px; }
    }

    @media (max-width: 600px) {
      .mgmt-topbar { padding: 0 1rem; }
      .detail-body { padding: 1rem 1rem 2rem; }
      .main-photo { height: 200px; }
      .detail-title { font-size: 1.375rem; }
      .mgmt-actions { gap: 0.375rem; }
      .mgmt-btn { padding: 0 0.625rem; font-size: 0.8125rem; }
    }
  `
})
export class AnnonceDetailComponent implements OnInit {
  annonce: Annonce | null = null;
  loading = true;
  showConfirmModal = false;
  TypeAnnonce = TypeAnnonce;
  photoPrincipale = '';

  constructor(
    private annoncesService: AnnoncesService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.loadAnnonce(id);
    });
  }

  loadAnnonce(id: string): void {
    this.loading = true;
    this.annoncesService.getAnnonceById(id).subscribe({
      next: (data) => {
        this.annonce = data;
        this.photoPrincipale = data.photos?.[0] ?? '';
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  goBack(): void { this.router.navigate(['/annonces/list']); }

  editAnnonce(): void {
    if (this.annonce) this.router.navigate(['/annonces/list', this.annonce.id, 'edit']);
  }

  deleteAnnonce(): void {
    if (this.annonce) this.showConfirmModal = true;
  }

  confirmerSuppression(): void {
    if (this.annonce) {
      this.annoncesService.deleteAnnonce(this.annonce.id).subscribe({
        next: () => this.router.navigate(['/annonces/list'])
      });
    }
  }

  annulerSuppression(): void {
    this.showConfirmModal = false;
  }

  viewBien(): void {
    if (this.annonce) this.router.navigate(['/dashboard/biens', this.annonce.bienId]);
  }
}
