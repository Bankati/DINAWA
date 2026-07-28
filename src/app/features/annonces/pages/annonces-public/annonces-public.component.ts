import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import {
  PropertyType,
  PublicListingSummary,
  PROPERTY_TYPE_LABELS,
} from '@core/models/listing-public.model';
import { PublicListingsService } from '../../services/public-listings.service';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { PublicFooterComponent } from '../../../../shared/components/public-footer/public-footer.component';
import { PublicNavbarComponent } from '../../../../shared/components/public-navbar/public-navbar.component';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-annonces-public',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LokSkeletonComponent,
    LokEmptyStateComponent,
    LokAlerteComponent,
    PublicFooterComponent,
    PublicNavbarComponent,
  ],
  template: `
<div class="pub-page">

  <app-public-navbar></app-public-navbar>

  <!-- ── HERO ── -->
  <section class="hero">
    <img
      src="/assets/happy-man-with-house.jpg.jpeg"
      alt="Immobilier Lomé Togo"
      class="hero-bg"
      style="object-position: center top;">
    <div class="hero-ov"></div>
    <div class="hero-content">
      <h1 class="hero-title">Trouvez votre <span class="hero-title-accent">logement idéal</span> au Togo</h1>

      <!-- FILTRE -->
      <div class="filter-wrap">
    <div class="filter-card">
      <div class="filter-row">
          <div class="fg">
            <label class="fg-label">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l5-7 5 7v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><polyline points="6 16 6 9 10 9 10 16"/></svg>
              Type de bien
            </label>
            <select [(ngModel)]="typeFilter" (ngModelChange)="onFilter()" class="fg-select">
              <option value="">Tous les types</option>
              <option value="VILLA">Villa</option>
              <option value="APARTMENT">Appartement</option>
              <option value="STUDIO">Studio</option>
              <option value="COMMERCIAL">Bureau / Commerce</option>
            </select>
          </div>
          <div class="fg-divider"></div>
          <div class="fg">
            <label class="fg-label">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 1C5.2 1 3 3.2 3 6c0 4 5 9 5 9s5-5 5-9c0-2.8-2.2-5-5-5z"/><circle cx="8" cy="6" r="2"/></svg>
              Ville
            </label>
            <select [(ngModel)]="villeFilter" (ngModelChange)="onFilter()" class="fg-select">
              <option value="">Toutes les villes</option>
              <option value="Lomé">Lomé</option>
              <option value="Kara">Kara</option>
              <option value="Sokodé">Sokodé</option>
              <option value="Atakpamé">Atakpamé</option>
              <option value="Kpalimé">Kpalimé</option>
              <option value="Tsévié">Tsévié</option>
            </select>
          </div>
          <div class="fg-divider"></div>
          <div class="fg">
            <label class="fg-label">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M1 7h14"/></svg>
              Budget maximum
            </label>
            <select [(ngModel)]="budgetFilter" (ngModelChange)="onFilter()" class="fg-select">
              <option value="">Tous les budgets</option>
              <option value="75000">— 75 000 FCFA</option>
              <option value="150000">— 150 000 FCFA</option>
              <option value="300000">— 300 000 FCFA</option>
              <option value="500000">— 500 000 FCFA</option>
            </select>
          </div>
          <button class="fg-btn" (click)="onFilter()">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M15 15l3.5 3.5"/></svg>
            Rechercher
          </button>
        </div>
        @if (hasFilters()) {
          <div class="filter-active">
            <span class="fa-count">{{ total() }} résultat{{ total() !== 1 ? 's' : '' }}</span>
            <button class="fa-reset" (click)="clearFilters()">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4L4 12M4 4l8 8"/></svg>
              Effacer les filtres
            </button>
          </div>
        }
      </div>
      </div><!-- /filter-wrap -->
    </div><!-- /hero-content -->
  </section>

  <!-- ── ANNONCES ── -->
  <section class="listings">

    <!-- Barre outils : compteur + tri -->
    <div class="listings-head">
      <p class="listings-count">
        @if (!loading()) { {{ total() }} bien{{ total() !== 1 ? 's' : '' }} disponible{{ total() !== 1 ? 's' : '' }} }
        @else { Chargement… }
      </p>
      <div class="head-right">
        <select class="sort-select" [(ngModel)]="sortOrder" (ngModelChange)="onSortChange()">
          <option value="recent">Plus récents</option>
          <option value="prix_asc">Prix croissant</option>
          <option value="prix_desc">Prix décroissant</option>
        </select>
      </div>
    </div>

      @if (error()) {
        <lok-alerte
          type="error"
          titre="Impossible de charger les annonces"
          message="Une erreur est survenue lors du chargement. Réessayez dans un instant."
        ></lok-alerte>
      } @else if (loading() && listings().length === 0) {
        <div class="ann-grid">
          @for (i of [1,2,3,4,5,6,7,8,9]; track i) {
            <lok-skeleton type="card"></lok-skeleton>
          }
        </div>
      } @else if (sortedListings().length === 0) {
        <lok-empty-state
          titre="Aucun bien trouvé"
          description="Aucune annonce ne correspond à vos critères de recherche."
          ctaLabel="Effacer les filtres"
          icon="default"
          (ctaAction)="clearFilters()"
        ></lok-empty-state>
      } @else {
        <div class="ann-grid">
          @for (a of sortedListings(); track a.id; let i = $index) {
            @if (i === 3) {
              <div class="promo-banner">
                <img src="/assets/bridge-with-city.jpg" alt="" class="promo-bg" loading="lazy">
                <div class="promo-scrim"></div>
                <div class="promo-dots" aria-hidden="true">
                  <span class="pd pd-1"></span><span class="pd pd-2"></span><span class="pd pd-3"></span><span class="pd pd-4"></span>
                </div>
                <div class="promo-body">
                  <h3 class="promo-title">Passons à l'action</h3>
                  <p class="promo-sub">Vous êtes propriétaire ? Publiez votre annonce et gérez vos loyers sur WARAH en toute simplicité.</p>
                  <a routerLink="/auth/register" class="promo-cta">
                    Déposer une annonce
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h12M11 5l5 5-5 5"/></svg>
                  </a>
                </div>
                <div class="promo-icon">
                  <svg viewBox="0 0 64 64" fill="none">
                    <circle cx="32" cy="32" r="26" fill="rgba(255,255,255,0.06)"/>
                    <circle cx="32" cy="32" r="19" stroke="rgba(201,152,46,0.35)" stroke-width="1.5"/>
                    <path d="M32 16L48 28v20a2 2 0 01-2 2h-9v-12h-10v12h-9a2 2 0 01-2-2V28z" fill="#C9982E"/>
                  </svg>
                </div>
              </div>
            }
            <article class="ann-card" (click)="viewAnnonce(a.slug)" tabindex="0" role="button">
              <div class="ann-img-wrap">
                @if (a.photo) {
                  <img [src]="a.photo" [alt]="typeLabel(a.type) + ' — ' + a.neighborhood" class="ann-img" loading="lazy">
                } @else {
                  <div class="ann-img-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                  </div>
                }
                <div class="ann-img-gradient"></div>
                <span class="ann-badge-type">{{ typeLabel(a.type) }}</span>
                <span class="ann-badge-dispo">Disponible</span>
                <div class="ann-price">
                  {{ a.monthlyRent | number:'1.0-0' }} FCFA<small>/mois</small>
                </div>
              </div>
              <div class="ann-body">
                <div class="ann-meta">
                  <span class="ann-quartier">
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 1a3.5 3.5 0 0 1 3.5 3.5c0 3-3.5 6.5-3.5 6.5S2.5 7.5 2.5 4.5A3.5 3.5 0 0 1 6 1z"/><circle cx="6" cy="4.5" r="1.2"/></svg>
                    {{ a.neighborhood }}, {{ a.city }}
                  </span>
                </div>
                <h3 class="ann-title">{{ typeLabel(a.type) }} — {{ a.neighborhood }}</h3>
                <p class="ann-desc">
                  {{ a.surfaceArea }} m²@if (a.roomsCount) { · {{ a.roomsCount }} pièce{{ a.roomsCount > 1 ? 's' : '' }} }
                </p>
                <div class="ann-footer">
                  <span class="ann-charges">
                    @if (a.monthlyCharges) { + {{ a.monthlyCharges | number:'1.0-0' }} FCFA charges }
                  </span>
                  <button class="ann-cta">Voir le bien →</button>
                </div>
              </div>
            </article>
          }
        </div>

        @if (canLoadMore()) {
          <div class="load-more-wrap">
            <button class="load-more-btn" (click)="loadMore()" [disabled]="loading()">
              {{ loading() ? 'Chargement…' : 'Voir plus de biens' }}
            </button>
          </div>
        }
      }

  </section>

  <!-- ── CTA DE CLÔTURE ── -->
  <section class="closing-cta">
    <img src="/assets/photo-beach-town-view-from.jpg" alt="" class="cc-bg" loading="lazy">
    <div class="cc-scrim"></div>
    <div class="cc-dots" aria-hidden="true">
      <span class="pd pd-1"></span><span class="pd pd-2"></span><span class="pd pd-3"></span><span class="pd pd-4"></span>
    </div>
    <div class="cc-inner">
      <h2 class="cc-title">Propriétaire et gestionnaire immobilier, WARAH est fait pour vous</h2>
      <p class="cc-sub">Publiez vos annonces, gérez vos biens et vos locataires sur WARAH, en toute confiance.</p>
      <div class="cc-actions">
        <a routerLink="/auth/register" class="cc-btn-primary">Créer un compte gratuitement</a>
        <a routerLink="/auth/register" class="cc-btn-ghost">Devenir propriétaire</a>
      </div>
    </div>
  </section>

  <app-public-footer></app-public-footer>

</div>
  `,
  styles: `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .pub-page { min-height: 100vh; background: #f4f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; }


    /* ── HERO ── */
    .hero { position: relative; min-height: 560px; display: flex; flex-direction: column; overflow: hidden; }
    .hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 40%; }
    .hero-ov { position: absolute; inset: 0; background: rgba(6,12,24,0.42); }
    .hero-content {
      position: relative; z-index: 2; flex: 1;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 44px;
      max-width: 1200px; width: 100%; margin: 0 auto; padding: 60px 32px; text-align: center;
    }
    .hero-title {
      font-size: clamp(32px, 4.6vw, 54px); font-weight: 800; color: white; line-height: 1.18; margin: 0;
      letter-spacing: -.01em; text-shadow: 0 2px 24px rgba(0,0,0,0.35);
    }
    .hero-title-accent { color: #E0B655; }

    /* ── FILTER WRAP ── */
    .filter-wrap { max-width: 1100px; width: 100%; margin: 0 auto; }

    .filter-card { background: white; border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06); padding: 0; overflow: hidden; }
    .filter-row { display: flex; align-items: stretch; min-height: 76px; }
    .fg { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 5px; padding: 14px 22px; }
    .fg-divider { width: 1px; background: #E5E7EB; flex-shrink: 0; margin: 14px 0; }
    .fg-label { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: .1em; display: flex; align-items: center; gap: 5px; }
    .fg-label svg { width: 11px; height: 11px; }
    .fg-select { border: none; outline: none; font-size: 15px; font-weight: 600; color: #0A2650; background: transparent; cursor: pointer; padding: 0; width: 100%; appearance: none; -webkit-appearance: none; }
    .fg-btn { flex-shrink: 0; background: #0F4C81; color: white; border: none; cursor: pointer; margin: 8px 8px 8px 0; padding: 0 28px; font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; transition: background .2s; border-radius: 12px; }
    .fg-btn:hover { background: #0A2650; }
    .fg-btn svg { width: 16px; height: 16px; }
    .filter-active { display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; background: #EEF4FC; border-top: 1px solid #DBEAFE; }
    .fa-count { font-size: 13px; font-weight: 700; color: #0F4C81; }
    .fa-reset { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: #6B7280; background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: background .2s; }
    .fa-reset:hover { background: rgba(15,76,129,0.08); color: #0F4C81; }
    .fa-reset svg { width: 12px; height: 12px; }

    /* ── LISTINGS ── */
    .listings { max-width: 1280px; margin: 0 auto; padding: 48px 32px 60px; }
    .listings-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; gap: 12px; flex-wrap: wrap; }
    .listings-count { font-size: 15px; color: #6B7280; font-weight: 500; }
    .head-right { display: flex; align-items: center; gap: 12px; }
    .sort-select { border: 1px solid #E5E7EB; border-radius: 8px; padding: 8px 14px; font-size: 13px; color: #374151; background: white; cursor: pointer; outline: none; }

    .ann-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }

    /* ── BANNIÈRE PROMO ── */
    .promo-banner {
      grid-column: 1 / -1; position: relative; overflow: hidden;
      border-radius: 18px; min-height: 200px;
      display: flex; align-items: center; padding: 36px 44px;
    }
    .promo-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 55%; }
    .promo-scrim { position: absolute; inset: 0; background: linear-gradient(100deg, rgba(8,20,42,0.92) 0%, rgba(10,38,80,0.82) 45%, rgba(10,38,80,0.35) 100%); }
    .promo-dots { position: absolute; inset: 0; pointer-events: none; }
    .pd { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: rgba(201,152,46,0.55); }
    .pd-1 { top: 22%; right: 18%; } .pd-2 { top: 60%; right: 10%; } .pd-3 { top: 40%; right: 26%; } .pd-4 { top: 75%; right: 22%; }
    .promo-body { position: relative; z-index: 1; max-width: 460px; }
    .promo-title { font-size: 24px; font-weight: 800; color: white; margin: 0 0 10px; }
    .promo-sub { font-size: 14.5px; color: rgba(255,255,255,0.75); line-height: 1.6; margin: 0 0 22px; }
    .promo-cta {
      display: inline-flex; align-items: center; gap: 8px;
      background: #C9982E; color: white; font-size: 14px; font-weight: 700;
      padding: 12px 22px; border-radius: 999px; text-decoration: none;
      transition: background .2s, transform .15s;
    }
    .promo-cta:hover { background: #B8861F; transform: translateY(-1px); }
    .promo-cta svg { width: 16px; height: 16px; }
    .promo-icon { position: absolute; right: 48px; top: 50%; transform: translateY(-50%); z-index: 1; }
    .promo-icon svg { width: 84px; height: 84px; }

    /* ── CARD ── */
    .ann-card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.07); transition: transform .25s cubic-bezier(0.34,1.56,0.64,1), box-shadow .25s ease; cursor: pointer; border: 1px solid #E5E7EB; }
    .ann-card:hover { transform: translateY(-6px); box-shadow: 0 20px 48px rgba(15,76,129,0.14); }
    .ann-card:focus { outline: 2px solid #0F4C81; outline-offset: 2px; }
    .ann-img-wrap { position: relative; height: 220px; overflow: hidden; }
    .ann-img { width: 100%; height: 100%; object-fit: cover; transition: transform .4s ease; }
    .ann-card:hover .ann-img { transform: scale(1.06); }
    .ann-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #E5E7EB; color: #9CA3AF; }
    .ann-img-placeholder svg { width: 56px; height: 56px; }
    .ann-img-gradient { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,38,80,0.75) 0%, transparent 55%); }
    .ann-badge-type { position: absolute; top: 12px; left: 12px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; padding: 4px 10px; border-radius: 20px; background: rgba(15,76,129,0.92); color: white; }
    .ann-badge-dispo { position: absolute; top: 12px; right: 12px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; padding: 4px 10px; border-radius: 20px; background: rgba(255,255,255,0.2); backdrop-filter: blur(4px); color: white; border: 1px solid rgba(255,255,255,0.4); }
    .ann-price { position: absolute; bottom: 12px; left: 12px; font-size: 17px; font-weight: 800; color: white; }
    .ann-price small { font-size: 11px; font-weight: 500; opacity: 0.75; }
    .ann-body { padding: 16px 18px 18px; }
    .ann-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
    .ann-quartier { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #9CA3AF; }
    .ann-quartier svg { width: 11px; height: 11px; flex-shrink: 0; }
    .ann-title { font-size: 15px; font-weight: 700; color: #0A2650; margin-bottom: 6px; line-height: 1.3; }
    .ann-desc { font-size: 12.5px; color: #6B7280; line-height: 1.6; margin-bottom: 14px; }
    .ann-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .ann-charges { font-size: 11.5px; color: #9CA3AF; }
    .ann-cta { background: #0F4C81; color: white; border: none; border-radius: 8px; padding: 9px 16px; font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background .2s; }
    .ann-cta:hover { background: #0A2650; }

    /* ── VOIR PLUS ── */
    .load-more-wrap { display: flex; justify-content: center; margin-top: 36px; }
    .load-more-btn { background: white; border: 1.5px solid #0F4C81; color: #0F4C81; font-size: 14px; font-weight: 700; padding: 12px 32px; border-radius: 999px; cursor: pointer; transition: background .2s, color .2s; }
    .load-more-btn:hover:not(:disabled) { background: #0F4C81; color: white; }
    .load-more-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    /* ── CTA DE CLÔTURE ── */
    .closing-cta { position: relative; overflow: hidden; padding: 88px 32px; text-align: center; }
    .cc-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 60%; }
    .cc-scrim { position: absolute; inset: 0; background: linear-gradient(160deg, rgba(156,115,32,0.93) 0%, rgba(201,152,46,0.90) 55%, rgba(212,165,53,0.82) 100%); }
    .cc-dots { position: absolute; inset: 0; pointer-events: none; }
    .cc-dots .pd { background: rgba(10,38,80,0.4); }
    .cc-inner { position: relative; z-index: 1; max-width: 640px; margin: 0 auto; }
    .cc-title { font-size: clamp(24px, 3.2vw, 36px); font-weight: 800; color: white; margin: 0 0 14px; line-height: 1.25; text-shadow: 0 2px 18px rgba(10,38,80,0.35); }
    .cc-sub { font-size: 15.5px; color: rgba(255,255,255,0.9); line-height: 1.65; margin: 0 0 32px; }
    .cc-actions { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }
    .cc-btn-primary { background: #0A2650; color: white; font-size: 14.5px; font-weight: 700; padding: 13px 28px; border-radius: 999px; text-decoration: none; transition: background .2s, transform .15s; box-shadow: 0 6px 20px rgba(10,38,80,0.35); }
    .cc-btn-primary:hover { background: #081E41; transform: translateY(-1px); }
    .cc-btn-ghost { border: 1.5px solid rgba(10,38,80,0.55); color: #0A2650; background: rgba(255,255,255,0.18); font-size: 14.5px; font-weight: 700; padding: 13px 28px; border-radius: 999px; text-decoration: none; transition: border-color .2s, background .2s; }
    .cc-btn-ghost:hover { border-color: #0A2650; background: rgba(255,255,255,0.32); }

    /* ── RESPONSIVE ── */
    @media (max-width: 1024px) { .ann-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 900px) {
      .hero-content { padding: 60px 24px; gap: 32px; }
    }
    @media (max-width: 768px) {
      .hero { min-height: 460px; }
      .hero-content { padding: 40px 20px; gap: 24px; }
      .hero-title { font-size: 26px; }
      .filter-card { border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); }
      .filter-row { flex-direction: column; min-height: unset; }
      .fg-divider { width: auto; height: 1px; margin: 0 20px; }
      .fg-btn { border-radius: 8px; margin: 8px 12px 12px; padding: 14px; justify-content: center; }
      .listings { padding: 24px 20px 48px; }
      .ann-grid { grid-template-columns: 1fr; }
      .promo-banner { padding: 28px 24px; min-height: 0; }
      .promo-icon { display: none; }
      .promo-body { max-width: 100%; }
    }
  `
})
export class AnnoncesPublicComponent implements OnInit {
  loading      = signal(true);
  error        = signal(false);
  typeFilter: PropertyType | '' = '';
  villeFilter   = '';
  budgetFilter  = '';
  sortOrder     = 'recent';

  listings = signal<PublicListingSummary[]>([]);
  total    = signal(0);
  page     = signal(1);

  sortedListings = computed(() => {
    const list = [...this.listings()];
    if (this.sortOrder === 'prix_asc')  list.sort((a, b) => a.monthlyRent - b.monthlyRent);
    if (this.sortOrder === 'prix_desc') list.sort((a, b) => b.monthlyRent - a.monthlyRent);
    return list;
  });

  canLoadMore = computed(() => this.listings().length < this.total());

  constructor(
    private readonly publicListingsService: PublicListingsService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly titleService: Title,
    private readonly metaService: Meta,
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Annonces immobilières au Togo | WARAH');
    this.metaService.updateTag({ name: 'description', content: 'Trouvez villas, appartements et studios à louer au Togo sur WARAH.' });

    this.route.queryParams.subscribe(p => {
      this.typeFilter  = (p['type']  as PropertyType) || '';
      this.villeFilter = p['ville'] || '';
      this.loadListings(1);
    });
  }

  private loadListings(page: number): void {
    this.loading.set(true);
    this.error.set(false);
    this.publicListingsService.getListings({
      page,
      limit: PAGE_SIZE,
      type: this.typeFilter || undefined,
      city: this.villeFilter || undefined,
      maxRent: this.budgetFilter ? +this.budgetFilter : undefined,
    }).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (result) => {
        this.listings.set(page === 1 ? result.data : [...this.listings(), ...result.data]);
        this.total.set(result.total);
        this.page.set(result.page);
      },
      error: () => this.error.set(true),
    });
  }

  onFilter(): void { this.loadListings(1); }

  onSortChange(): void { /* tri appliqué côté client via sortedListings() */ }

  loadMore(): void { this.loadListings(this.page() + 1); }

  hasFilters(): boolean { return !!(this.typeFilter || this.villeFilter || this.budgetFilter); }

  clearFilters(): void {
    this.typeFilter = ''; this.villeFilter = ''; this.budgetFilter = '';
    this.loadListings(1);
  }

  typeLabel(type: PropertyType): string { return PROPERTY_TYPE_LABELS[type]; }

  viewAnnonce(slug: string): void { this.router.navigate(['/annonces', slug]); }
}
