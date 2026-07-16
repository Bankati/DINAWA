import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, PLATFORM_ID, inject,
  signal, WritableSignal,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PublicFooterComponent } from '../../../../shared/components/public-footer/public-footer.component';

interface HeroSlide { badge: string; title: string; subtitle: string; cta: string; link: string; }

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, PublicFooterComponent],
  template: `
<div class="lp">

  <!-- ── NAVBAR ── -->
  <nav class="nav" [class.nav-solid]="navScrolled()">
    <div class="nav-inner">
      <a routerLink="/" class="nav-logo">
        <img src="/assets/WARAH-logo.png" alt="WARAH" class="logo-img">
      </a>
      <ul class="nav-links">
        <li><a routerLink="/" class="nl" data-text="Accueil">Accueil</a></li>
        <li><a routerLink="/annonces" class="nl" data-text="Annonces">Annonces</a></li>
        <li><a routerLink="/a-propos" class="nl" data-text="À propos">À propos</a></li>
        <li><a href="#tarifs" class="nl" data-text="Tarifs" (click)="scrollTo('tarifs', $event)">Tarifs</a></li>
      </ul>
      <div class="nav-cta">
        <a routerLink="/auth/login" class="btn-ghost">Connexion</a>
        <a routerLink="/auth/register" class="btn-nav-primary">S'inscrire</a>
      </div>
      <button class="hamburger" (click)="menuOpen.set(!menuOpen())" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>
    @if (menuOpen()) {
      <div class="m-menu" (click)="menuOpen.set(false)">
        <a routerLink="/" class="mm-link">Accueil</a>
        <a routerLink="/annonces" class="mm-link">Annonces</a>
        <a routerLink="/a-propos" class="mm-link">À propos</a>
        <a href="#tarifs" class="mm-link" (click)="scrollTo('tarifs', $event); menuOpen.set(false)">Tarifs</a>
        <div class="mm-sep"></div>
        <a routerLink="/auth/login" class="mm-link">Connexion</a>
        <a routerLink="/auth/register" class="mm-cta">S'inscrire gratuitement</a>
      </div>
    }
  </nav>

  <!-- ── HERO ── -->
  <section class="hero">
    <!-- Formes organiques de fond (style split-hero) -->
    <div class="hero-shapes" aria-hidden="true">
      <svg class="hero-wave-svg" viewBox="0 0 1440 900" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="heroMainGrad" x1="20%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0A2650"/>
            <stop offset="55%" stop-color="#0F4C81"/>
            <stop offset="100%" stop-color="#081E41"/>
          </linearGradient>
        </defs>
        <!-- légère teinte bleue (transition douce) -->
        <path d="M870,0 C815,118 795,285 812,462 C830,636 800,776 782,900 L1440,900 L1440,0 Z" fill="#dbeafe" opacity="0.55"/>
        <!-- blob bleu principal -->
        <path d="M840,0 C782,118 762,285 778,462 C794,636 765,776 748,900 L1440,900 L1440,0 Z" fill="url(#heroMainGrad)"/>
      </svg>
      <!-- accent or bas-gauche -->
      <svg class="hero-gold-blob" viewBox="0 0 560 150" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,95 C90,52 210,32 320,68 C400,92 470,118 560,106 L560,150 L0,150 Z" fill="#C9982E" opacity="0.88"/>
      </svg>
    </div>
    <div class="slides">
      @for (s of slides; track s.badge; let i = $index) {
        <div class="slide" [class.slide-on]="currentSlide() === i">
          <div class="slide-text">
            <span class="s-badge">{{ s.badge }}</span>
            <h1 class="s-title">{{ s.title }}</h1>
            <p class="s-sub">{{ s.subtitle }}</p>
            <div class="s-btns">
              <a [routerLink]="s.link" class="s-cta">
                {{ s.cta }}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="s-arrow">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
              <a routerLink="/annonces" class="s-cta-ghost">
                Voir les annonces
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="s-arrow"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
            </div>
          </div>
          <div class="slide-visual">
            @switch (i) {
              @case (0) {
                <!-- Gestion immobilière — gestionnaire avec laptop et icône maison -->
                <div class="hero-photo-wrap">
                  <img src="/assets/man-showing-house-icon-couch.jpg.jpeg" alt="Gestionnaire immobilier avec laptop" class="hero-photo" loading="eager" style="object-position: center top;">
                  <div class="hbf hbf-1">
                    <div class="hbf-icon" style="background:#e8f0fa">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                    </div>
                    <div class="hbf-txt"><span class="hbf-n">12</span><span class="hbf-l">biens gérés</span></div>
                  </div>
                  <div class="hbf hbf-2">
                    <div class="hbf-icon" style="background:#fef3dc">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#C9982E" stroke-width="2" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                    </div>
                    <div class="hbf-txt"><span class="hbf-n">1 250 000 F</span><span class="hbf-l">revenus / mois</span></div>
                  </div>
                </div>
              }
              @case (1) {
                <!-- Paiements loyers — mobile money -->
                <div class="hero-photo-wrap">
                  <img src="/assets/handsome-young-african-man-holding-mobile-phone-gesturing-while-standing-against-grey-wall.jpg.jpeg" alt="Paiement mobile money" class="hero-photo" loading="lazy" style="object-position: center top;">
                  <div class="hbf hbf-1">
                    <div class="hbf-icon" style="background:#dcfce7">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div class="hbf-txt"><span class="hbf-n">98 %</span><span class="hbf-l">paiements à temps</span></div>
                  </div>
                  <div class="hbf hbf-2">
                    <div class="hbf-icon" style="background:#fce7f3">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#db2777" stroke-width="2" stroke-linecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    </div>
                    <div class="hbf-txt"><span class="hbf-n">0 impayé</span><span class="hbf-l">ce mois-ci</span></div>
                  </div>
                </div>
              }
              @case (2) {
                <!-- Quittances — professionnel immobilier avec maison et clés -->
                <div class="hero-photo-wrap">
                  <img src="/assets/black-businessman-happy-expression.jpg.jpeg" alt="Professionnel immobilier avec clés" class="hero-photo" loading="lazy" style="object-position: center center;">
                  <div class="hbf hbf-1">
                    <div class="hbf-icon" style="background:#e8f0fa">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></svg>
                    </div>
                    <div class="hbf-txt"><span class="hbf-n">PDF en 2 min</span><span class="hbf-l">quittance générée</span></div>
                  </div>
                  <div class="hbf hbf-2">
                    <div class="hbf-icon" style="background:#f3e8ff">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#9333ea" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <div class="hbf-txt"><span class="hbf-n">Signé &amp; horodaté</span><span class="hbf-l">valeur juridique</span></div>
                  </div>
                </div>
              }
              @case (3) {
                <!-- Annonces — propriétaire montrant sa maison -->
                <div class="hero-photo-wrap">
                  <img src="/assets/happy-man-with-house.jpg.jpeg" alt="Propriétaire heureux avec maison" class="hero-photo" loading="lazy" style="object-position: center center;">
                  <div class="hbf hbf-1">
                    <div class="hbf-icon" style="background:#fef3dc">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#C9982E" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <div class="hbf-txt"><span class="hbf-n">48 h</span><span class="hbf-l">délai moyen</span></div>
                  </div>
                  <div class="hbf hbf-2">
                    <div class="hbf-icon" style="background:#e8f0fa">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                    </div>
                    <div class="hbf-txt"><span class="hbf-n">+300 candidats</span><span class="hbf-l">locataires actifs</span></div>
                  </div>
                </div>
              }
            }
          </div>
        </div>
      }
    </div>
    <div class="hero-controls">
      <button class="h-arrow" (click)="prevSlide()" aria-label="Précédent">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </button>
      <div class="h-dots">
        @for (s of slides; track s.badge; let i = $index) {
          <button class="dot" [class.dot-on]="currentSlide() === i" (click)="goToSlide(i)"></button>
        }
      </div>
      <button class="h-arrow" (click)="nextSlide()" aria-label="Suivant">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>
    <div class="h-prog"><div class="h-prog-bar" [style.width.%]="((currentSlide()+1)/slides.length)*100"></div></div>
  </section>

  <!-- ── COMMENT ÇA FONCTIONNE ── -->
  <section class="howto-section" id="comment" #howtoSection [class.howto-on]="howtoVisible()">
    <div class="hw-glow hw-glow-a"></div>
    <div class="hw-glow hw-glow-b"></div>
    <div class="hw-glow hw-glow-c"></div>
    <div class="hw-dots"></div>
    <div class="sec-wrap">
      <div class="sec-head">
        <span class="sec-eye hw-eye">Simple &amp; rapide</span>
        <h2 class="sec-title hw-sec-title">Comment ça fonctionne ?</h2>
        <p class="sec-sub hw-sec-sub">Commencez à gérer vos biens en moins de 10 minutes</p>
      </div>
      <div class="hw-grid">
        @for (s of fonctionnement; track s.num; let i = $index; let last = $last) {
          <div class="hw-col" [style.--i]="i">
            <div class="hw-card">
              <span class="hw-bg-n">{{ s.num }}</span>
              <div class="hw-badge">{{ s.num }}</div>
              <div class="hw-icon" [style.animation-delay]="(i * 0.5) + 's'">
                @switch (i) {
                  @case (0) {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  }
                  @case (1) {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  }
                  @case (2) {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.23h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.94-1.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  }
                  @case (3) {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  }
                }
              </div>
              <h3 class="hw-card-title">{{ s.titre }}</h3>
              <p class="hw-card-desc">{{ s.desc }}</p>
              <div class="hw-tag">Étape {{ s.num }}</div>
            </div>
            @if (!last) {
              <div class="hw-arrow">
                <svg viewBox="0 0 56 24" fill="none">
                  <path d="M2 12 C14 2, 42 22, 54 12" stroke="#0F4C81" stroke-width="1.5" stroke-dasharray="5 4" stroke-linecap="round" opacity="0.45"/>
                  <polygon points="50,8 55,12 50,16" fill="#0F4C81" opacity="0.5"/>
                </svg>
              </div>
            }
          </div>
        }
      </div>
    </div>
  </section>

  <!-- ── POURQUOI WARAH ── -->
  <section class="why-section" #whySection [class.why-on]="whyVisible()">
    <div class="sec-wrap">
      <div class="sec-head">
        <span class="sec-eye">Nos avantages</span>
        <h2 class="sec-title">Pourquoi choisir WARAH ?</h2>
        <p class="sec-sub">Une solution pensée pour les propriétaires, locataires et gestionnaires immobiliers</p>
      </div>
      <div class="why-layout">

        <!-- ── Liste des fonctionnalités ── -->
        <div class="why-list">
          @for (a of avantages; track a.titre; let i = $index) {
            <button class="wi" [class.wi-on]="activeFeature() === i" (click)="selectFeature(i)" type="button">
              <div class="wi-icon">
                @switch (i) {
                  @case (0) { <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
                  @case (1) { <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> }
                  @case (2) { <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></svg> }
                  @case (3) { <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg> }
                  @case (4) { <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" stroke-width="3"/></svg> }
                  @case (5) { <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
                  @case (6) { <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg> }
                }
              </div>
              <div class="wi-body">
                <div class="wi-top">
                  <span class="wi-num">0{{ i + 1 }}</span>
                  <h3 class="wi-title">{{ a.titre }}</h3>
                </div>
                <p class="wi-desc">{{ a.desc }}</p>
              </div>
              <div class="wi-progress" [style.width.%]="activeFeature() === i ? 100 : 0"></div>
            </button>
          }
        </div>

        <!-- ── Panneau de prévisualisation ── -->
        <div class="why-preview">
          <div class="wp-pane">
            @switch (activeFeature()) {
              @case (0) {
                <div class="wp-c">
                  <p class="wp-label">Tableau de bord centralisé</p>
                  <div class="wp-kpis">
                    <div class="wp-kpi"><span class="wp-kpi-n">12</span><span class="wp-kpi-l">Biens</span></div>
                    <div class="wp-kpi"><span class="wp-kpi-n">9</span><span class="wp-kpi-l">Occupés</span></div>
                    <div class="wp-kpi"><span class="wp-kpi-n">75%</span><span class="wp-kpi-l">Taux occup.</span></div>
                  </div>
                  <div class="wp-table">
                    <div class="wp-th"><span>Bien</span><span>Localisation</span><span>Loyer</span><span>Statut</span></div>
                    <div class="wp-tr"><span>Villa Cocotiers</span><span>Adewui, Lomé</span><span>350 000 F</span><span class="wp-s wp-s-full">Occupé</span></div>
                    <div class="wp-tr"><span>Appart. Bè</span><span>Bè, Lomé</span><span>150 000 F</span><span class="wp-s wp-s-full">Occupé</span></div>
                    <div class="wp-tr"><span>Studio Agoè</span><span>Agoè, Lomé</span><span>85 000 F</span><span class="wp-s wp-s-empty">Vacant</span></div>
                  </div>
                </div>
              }
              @case (1) {
                <div class="wp-c">
                  <p class="wp-label">Suivi des paiements — Juillet 2026</p>
                  <div class="wp-bars">
                    @for (b of wpBars; track b.label) {
                      <div class="wp-bitem">
                        <div class="wp-bwrap"><div class="wp-bar" [class.wp-bar-hi]="b.hi" [style.height.%]="b.h"></div></div>
                        <span class="wp-blabel">{{ b.label }}</span>
                      </div>
                    }
                  </div>
                  <div class="wp-sum">
                    <div class="wp-sum-r"><span class="wp-sum-dot wp-dot-hi"></span><span>Collecté</span><strong>2 450 000 F</strong></div>
                    <div class="wp-sum-r"><span class="wp-sum-dot"></span><span>En attente</span><strong>450 000 F</strong></div>
                    <div class="wp-sum-r"><span class="wp-sum-dot wp-dot-lo"></span><span>Impayés</span><strong>150 000 F</strong></div>
                  </div>
                </div>
              }
              @case (2) {
                <div class="wp-c">
                  <p class="wp-label">Quittance générée automatiquement</p>
                  <div class="wp-doc">
                    <div class="wp-doc-hd"><strong>WARAH</strong><span>Quittance de loyer · Juil. 2026</span></div>
                    <div class="wp-doc-bd">
                      <div class="wp-doc-r"><span>Locataire</span><strong>Aminata Diallo</strong></div>
                      <div class="wp-doc-r"><span>Bien</span><strong>Villa des Cocotiers, Adewui</strong></div>
                      <div class="wp-doc-r"><span>Loyer</span><strong>320 000 F</strong></div>
                      <div class="wp-doc-r"><span>Charges</span><strong>30 000 F</strong></div>
                    </div>
                    <div class="wp-doc-total">350 000 FCFA</div>
                    <div class="wp-doc-ft">✓ Envoyée au locataire · ✓ Archivée automatiquement</div>
                  </div>
                </div>
              }
              @case (3) {
                <div class="wp-c">
                  <p class="wp-label">Centre de notifications</p>
                  <div class="wp-notifs">
                    <div class="wp-notif wp-notif-hi">
                      <svg class="wp-ni-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 1a5 5 0 0 1 5 5c0 4.5-2 6-2 6H3s-2-1.5-2-6a5 5 0 0 1 5-5z"/><path d="M6.5 13.5a1.5 1.5 0 0 0 3 0"/></svg>
                      <div><p class="wp-ni-t">Loyer impayé — Fatou Kéita</p><p class="wp-ni-s">Échéance dépassée de 5 jours · Studio Agoè</p></div>
                    </div>
                    <div class="wp-notif wp-notif-md">
                      <svg class="wp-ni-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 1a5 5 0 0 1 5 5c0 4.5-2 6-2 6H3s-2-1.5-2-6a5 5 0 0 1 5-5z"/><path d="M6.5 13.5a1.5 1.5 0 0 0 3 0"/></svg>
                      <div><p class="wp-ni-t">Rappel avant échéance — Ibrahim M.</p><p class="wp-ni-s">Loyer dû dans 3 jours · Appartement Bè</p></div>
                    </div>
                    <div class="wp-notif wp-notif-lo">
                      <svg class="wp-ni-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="2 8 6 12 14 4"/></svg>
                      <div><p class="wp-ni-t">Paiement confirmé — Kofi Agbenu</p><p class="wp-ni-s">85 000 F reçu · Studio Adewui</p></div>
                    </div>
                  </div>
                  <p class="wp-ft">Alertes email &amp; push · Configurables par bien et par locataire</p>
                </div>
              }
              @case (4) {
                <div class="wp-c wp-cc">
                  <p class="wp-label">Accessible sur tous vos appareils</p>
                  <div class="wp-devices">
                    <div class="wp-phone">
                      <div class="wpd-screen">
                        <div class="wpd-bar"></div>
                        <div class="wpd-line"></div>
                        <div class="wpd-line wpd-s"></div>
                      </div>
                      <div class="wp-phone-btn"></div>
                    </div>
                    <div class="wp-laptop">
                      <div class="wpd-screen">
                        <div class="wpd-bar"></div>
                        <div class="wpd-line"></div>
                        <div class="wpd-line"></div>
                        <div class="wpd-line wpd-s"></div>
                      </div>
                      <div class="wp-laptop-base"></div>
                    </div>
                  </div>
                  <div class="wp-chips">
                    <span class="wp-chip">✓ iPhone &amp; Android</span>
                    <span class="wp-chip">✓ Chrome / Safari</span>
                    <span class="wp-chip">✓ Tablette</span>
                    <span class="wp-chip">✓ Sans installation</span>
                  </div>
                </div>
              }
              @case (6) {
                <div class="wp-c">
                  <p class="wp-label">Annonces immobilières</p>
                  <div class="wp-search">
                    <svg viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-linecap="round"><circle cx="6.5" cy="6.5" r="4"/><path d="M11 11l3 3"/></svg>
                    <span>Rechercher un bien à Lomé…</span>
                  </div>
                  <div class="wp-ann-cards">
                    <div class="wp-ann-card">
                      <div class="wp-ann-top"><span class="wp-ann-type">Villa</span><span class="wp-ann-new">Nouveau</span></div>
                      <p class="wp-ann-name">Villa des Cocotiers</p>
                      <p class="wp-ann-loc">Adewui, Lomé · 5 pièces</p>
                      <div class="wp-ann-foot"><strong>350 000 F/mois</strong><span class="wp-ann-cand">4 candidatures</span></div>
                    </div>
                    <div class="wp-ann-card">
                      <div class="wp-ann-top"><span class="wp-ann-type">Studio</span></div>
                      <p class="wp-ann-name">Studio Adewui</p>
                      <p class="wp-ann-loc">Adewui, Lomé · 1 pièce</p>
                      <div class="wp-ann-foot"><strong>85 000 F/mois</strong><span class="wp-ann-cand">2 candidatures</span></div>
                    </div>
                  </div>
                  <p class="wp-ft">Vos annonces visibles par tous les locataires potentiels</p>
                </div>
              }
              @case (5) {
                <div class="wp-c wp-cc">
                  <p class="wp-label">Sécurité de vos données</p>
                  <div class="wp-shield-wrap">
                    <svg class="wp-shield-svg" viewBox="0 0 80 90" fill="none">
                      <path d="M40 5 L72 19 L72 50 C72 68 57 82 40 88 C23 82 8 68 8 50 L8 19 Z" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
                      <path d="M40 15 L66 26 L66 50 C66 65 54 77 40 83 C26 77 14 65 14 50 L14 26 Z" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
                      <polyline points="26,46 34,54 54,34" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <div class="wp-checks">
                    <div class="wp-ck">✓ Chiffrement AES-256</div>
                    <div class="wp-ck">✓ Sauvegardes quotidiennes</div>
                    <div class="wp-ck">✓ Authentification sécurisée</div>
                    <div class="wp-ck">✓ Données hébergées localement</div>
                  </div>
                </div>
              }
            }
          </div>
          <span class="wp-bg-n">0{{ activeFeature() + 1 }}</span>
        </div>

      </div>
    </div>
  </section>

  <!-- ── IMPACT EN CHIFFRES ── -->
  <section class="impact-section" #impactSection>
    <div class="sec-wrap">
      <div class="sec-head">
        <span class="sec-eye impact-eye">En chiffres</span>
        <h2 class="sec-title impact-title">L'impact WARAH au Togo</h2>
        <p class="sec-sub impact-sub">Des résultats concrets mesurés chaque mois sur notre plateforme</p>
      </div>
      <div class="impact-grid">
        <div class="impact-item">
          <span class="impact-n">{{ statAnnonces() }}<small>+</small></span>
          <span class="impact-l">Annonces publiées</span>
          <span class="impact-detail">Biens mis en location sur la plateforme</span>
        </div>
        <div class="impact-sep"></div>
        <div class="impact-item">
          <span class="impact-n">{{ statProprio() }}<small>+</small></span>
          <span class="impact-l">Propriétaires actifs</span>
          <span class="impact-detail">Font confiance à WARAH chaque mois</span>
        </div>
        <div class="impact-sep"></div>
        <div class="impact-item">
          <span class="impact-n">{{ statSatisfaction() }}<small>%</small></span>
          <span class="impact-l">Taux de satisfaction</span>
          <span class="impact-detail">Selon notre enquête utilisateurs 2026</span>
        </div>
        <div class="impact-sep"></div>
        <div class="impact-item">
          <span class="impact-n">{{ statVilles() }}</span>
          <span class="impact-l">Villes couvertes</span>
          <span class="impact-detail">Lomé, Kara, Sokodé, Atakpamé et plus</span>
        </div>
      </div>
    </div>
  </section>

  <!-- ── TÉMOIGNAGES ── -->
  <section class="temo-section" id="temoignages">

    <!-- En-tête centré avec lignes décoratives -->
    <div class="ts-head">
      <div class="ts-line"></div>
      <span class="ts-title">ILS PARLENT DE WARAH</span>
      <div class="ts-line"></div>
    </div>

    <!-- Piste du carousel -->
    <div class="ts-stage">
      @for (t of temoignages; track t.nom; let i = $index) {
        <div class="ts-card" [ngClass]="temoPos(i)" (click)="temoSlide.set(i)">
          <div class="ts-quote">&#10077;</div>
          <p class="ts-text">{{ t.texte }}</p>
          <div class="ts-sep"></div>
          <div class="ts-author">
            <img [src]="t.photo" [alt]="t.nom" class="ts-avatar" loading="lazy">
            <div class="ts-author-info">
              <span class="ts-name">{{ t.nom }}</span>
              <span class="ts-role">{{ t.role }}</span>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Navigation -->
    <div class="ts-nav">
      <button class="ts-arrow" (click)="prevTemo()" aria-label="Précédent">&#8249;</button>
      <div class="ts-dots">
        @for (t of temoignages; track t.nom; let i = $index) {
          <button class="ts-dot" [class.ts-dot-on]="temoSlide() === i" (click)="temoSlide.set(i)" [attr.aria-label]="'Témoignage ' + (i+1)"></button>
        }
      </div>
      <button class="ts-arrow" (click)="nextTemo()" aria-label="Suivant">&#8250;</button>
    </div>

  </section>

  <!-- ── FAQ ── -->
  <section class="faq-section">
    <div class="faq-inner">

      <!-- En-tête centré -->
      <div class="faq-head">
        <div class="faq-head-badge">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M6 6.3a2 2 0 1 1 2.6 1.9c-.4.1-.6.5-.6.8v.5"/><circle cx="8" cy="11.5" r=".6" fill="currentColor" stroke="none"/></svg>
          Questions fréquentes
        </div>
        <h2 class="faq-title">Tout ce que vous voulez<br>savoir sur WARAH</h2>
        <p class="faq-sub">Des réponses claires sur notre plateforme de gestion immobilière</p>
      </div>

      <!-- Grille 2 colonnes d'accordéons -->
      <div class="faq-grid">
        <div class="faq-col">
          @for (f of faqs.slice(0,4); track f.q; let i = $index) {
            <div class="faq-item" [class.faq-open]="selectedFaq() === i" (click)="selectedFaq.set(selectedFaq() === i ? -1 : i)">
              <div class="faq-row">
                <span class="faq-num">0{{ i + 1 }}</span>
                <span class="faq-q">{{ f.q }}</span>
                <svg class="faq-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 8l5 5 5-5"/></svg>
              </div>
              @if (selectedFaq() === i) {
                <div class="faq-ans"><p>{{ f.r }}</p></div>
              }
            </div>
          }
        </div>
        <div class="faq-col">
          @for (f of faqs.slice(4); track f.q; let i = $index) {
            <div class="faq-item" [class.faq-open]="selectedFaq() === i + 4" (click)="selectedFaq.set(selectedFaq() === i + 4 ? -1 : i + 4)">
              <div class="faq-row">
                <span class="faq-num">0{{ i + 5 }}</span>
                <span class="faq-q">{{ f.q }}</span>
                <svg class="faq-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 8l5 5 5-5"/></svg>
              </div>
              @if (selectedFaq() === i + 4) {
                <div class="faq-ans"><p>{{ f.r }}</p></div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Bas : contact -->
      <div class="faq-footer">
        <p>Vous ne trouvez pas la réponse ?</p>
        <a routerLink="/auth/register" class="faq-cta">Contactez-nous →</a>
      </div>

    </div>
  </section>

  <!-- ── ABONNEMENTS ── -->
  <section class="price-section" id="tarifs">
    <div class="sec-wrap">
      <div class="sec-head">
        <span class="sec-eye">Tarifs transparents</span>
        <h2 class="sec-title">Choisissez votre formule</h2>
        <p class="sec-sub">Des offres adaptées à chaque propriétaire — du débutant au gestionnaire immobilier professionnel.</p>
      </div>

      <div class="price-grid">

        <!-- Starter -->
        <div class="price-card">
          <div class="price-top">
            <span class="price-label">Starter</span>
            <div class="price-amount"><span class="price-n">2 000</span><span class="price-unit"> FCFA</span></div>
            <p class="price-period">par mois · jusqu'à 5 propriétés</p>
          </div>
          <ul class="price-feats">
            <li class="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round"><path d="M3 8l4 4 6-6"/></svg>Jusqu'à 5 propriétés</li>
            <li class="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round"><path d="M3 8l4 4 6-6"/></svg>Collecte T-Money / Flooz</li>
            <li class="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round"><path d="M3 8l4 4 6-6"/></svg>Quittances automatiques</li>
            <li class="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round"><path d="M3 8l4 4 6-6"/></svg>Rappels &amp; alertes impayés</li>
            <li class="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round"><path d="M3 8l4 4 6-6"/></svg>Tableau de bord basique</li>
            <li class="feat-no"><svg viewBox="0 0 16 16" fill="none" stroke="#D1D5DB" stroke-width="2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>Contrats de bail PDF</li>
            <li class="feat-no"><svg viewBox="0 0 16 16" fill="none" stroke="#D1D5DB" stroke-width="2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>Annonces biens vacants</li>
          </ul>
          <a routerLink="/auth/register" class="price-btn price-btn-ghost">Commencer avec Starter</a>
        </div>

        <!-- Pro (recommandé) -->
        <div class="price-card price-card-pro">
          <div class="price-badge-pop">
            <svg viewBox="0 0 14 14" fill="#C9982E"><path d="M7 1l1.6 3.2 3.5.5-2.5 2.5 1 3.5L7 9.2l-3.6 1.5 1-3.5L2 4.7l3.5-.5z"/></svg>
            Recommandé
          </div>
          <div class="price-top">
            <span class="price-label price-label-pro">Pro</span>
            <div class="price-amount"><span class="price-n">5 000</span><span class="price-unit"> FCFA</span></div>
            <p class="price-period">par mois · jusqu'à 15 propriétés</p>
          </div>
          <ul class="price-feats">
            <li class="feat-ok feat-ok-pro"><svg viewBox="0 0 16 16" fill="none" stroke="#C9982E" stroke-width="2" stroke-linecap="round"><path d="M3 8l4 4 6-6"/></svg>Jusqu'à 15 propriétés</li>
            <li class="feat-ok feat-ok-pro"><svg viewBox="0 0 16 16" fill="none" stroke="#C9982E" stroke-width="2" stroke-linecap="round"><path d="M3 8l4 4 6-6"/></svg>Tout ce qu'inclut Starter</li>
            <li class="feat-ok feat-ok-pro"><svg viewBox="0 0 16 16" fill="none" stroke="#C9982E" stroke-width="2" stroke-linecap="round"><path d="M3 8l4 4 6-6"/></svg>Contrats de bail PDF</li>
            <li class="feat-ok feat-ok-pro"><svg viewBox="0 0 16 16" fill="none" stroke="#C9982E" stroke-width="2" stroke-linecap="round"><path d="M3 8l4 4 6-6"/></svg>Historique exportable</li>
            <li class="feat-ok feat-ok-pro"><svg viewBox="0 0 16 16" fill="none" stroke="#C9982E" stroke-width="2" stroke-linecap="round"><path d="M3 8l4 4 6-6"/></svg>Annonces biens vacants</li>
            <li class="feat-ok feat-ok-pro"><svg viewBox="0 0 16 16" fill="none" stroke="#C9982E" stroke-width="2" stroke-linecap="round"><path d="M3 8l4 4 6-6"/></svg>Paiements mensuel / trim. / sem.</li>
          </ul>
          <a routerLink="/auth/register" class="price-btn price-btn-pro">Démarrer avec Pro</a>
        </div>

        <!-- Premium Gestionnaire -->
        <div class="price-card">
          <div class="price-top">
            <span class="price-label">Premium Gestionnaire</span>
            <div class="price-amount"><span class="price-n">10 000</span><span class="price-unit"> FCFA</span></div>
            <p class="price-period">par mois · propriétés illimitées</p>
          </div>
          <ul class="price-feats">
            <li class="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round"><path d="M3 8l4 4 6-6"/></svg>Propriétés illimitées</li>
            <li class="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round"><path d="M3 8l4 4 6-6"/></svg>Tout ce qu'inclut Pro</li>
            <li class="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round"><path d="M3 8l4 4 6-6"/></svg>Espace gestionnaire immobilier pro</li>
            <li class="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round"><path d="M3 8l4 4 6-6"/></svg>Portefeuille de mandats</li>
            <li class="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round"><path d="M3 8l4 4 6-6"/></svg>Rapports mensuels auto</li>
            <li class="feat-ok"><svg viewBox="0 0 16 16" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round"><path d="M3 8l4 4 6-6"/></svg>Profil vérifié &amp; support prioritaire</li>
          </ul>
          <a routerLink="/auth/register" class="price-btn price-btn-ghost">Démarrer Premium</a>
        </div>

      </div>

      <!-- Add-on Référencement -->
      <div class="price-addon">
        <div class="price-addon-left">
          <div class="price-addon-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12h18M3 6h18M3 18h18"/><circle cx="19" cy="6" r="3" fill="#C9982E" stroke="none"/></svg>
          </div>
          <div>
            <span class="price-addon-label">Option · Référencement gestionnaire immobilier</span>
            <p class="price-addon-desc">Mise en avant dans l'annuaire WARAH pour les gestionnaires immobiliers souhaitant maximiser leur visibilité auprès des propriétaires.</p>
          </div>
        </div>
        <div class="price-addon-right">
          <div class="price-addon-price">15 000 – 30 000 <span>FCFA/mois</span></div>
          <a routerLink="/auth/register" class="price-btn price-btn-addon">En savoir plus</a>
        </div>
      </div>

      <p class="price-note">Sans engagement · Résiliation à tout moment · Paiement sécurisé via T-Money &amp; Flooz</p>
    </div>
  </section>

  <!-- ── FOOTER ── -->
  <app-public-footer />

</div>
  `,
  styles: [`
    :host { display: block; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    ul { list-style: none; }
    a { text-decoration: none; }
    img { max-width: 100%; }
    .lp { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #1a2744; background: #fff; overflow-x: hidden; }

    /* ── NAVBAR ── */
    .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 200; background: white; box-shadow: 0 2px 16px rgba(0,0,0,0.08); transition: box-shadow .35s; }
    .nav.nav-solid { box-shadow: 0 4px 28px rgba(0,0,0,0.13); }
    .nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 80px; display: flex; align-items: center; gap: 32px; }
    .nav-logo { flex-shrink: 0; display: flex; align-items: center; }
    .logo-img { height: 54px; width: auto; display: block; }
    .nav-links { display: flex; gap: 28px; flex: 1; }
    .nl { color: #0A2650; font-size: 14.5px; font-weight: 500; transition: color .2s; position: relative; }
    .nl::after { content: attr(data-text); display: block; height: 0; overflow: hidden; font-weight: 700; visibility: hidden; pointer-events: none; }
    .nl:hover { color: #C9982E; }
    .nav-cta { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
    .btn-ghost { color: #0A2650; font-size: 14px; font-weight: 500; padding: 8px 16px; border-radius: 8px; transition: background .2s; }
    .btn-ghost:hover { background: rgba(10,38,80,0.07); }
    .btn-nav-primary { background: #0F4C81; color: #fff; font-size: 14px; font-weight: 700; padding: 9px 20px; border-radius: 8px; transition: background .2s; }
    .btn-nav-primary:hover { background: #0A2650; }
    .hamburger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 6px; }
    .hamburger span { display: block; width: 22px; height: 2px; background: #0A2650; border-radius: 2px; }
    .m-menu { background: white; padding: 16px 24px 24px; display: flex; flex-direction: column; gap: 4px; border-top: 1px solid #E5E7EB; box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
    .mm-link { color: #374151; font-size: 15px; padding: 12px 0; border-bottom: 1px solid #F3F4F6; text-decoration: none; display: block; }
    .mm-link:hover { color: #0F4C81; }
    .mm-sep { height: 12px; }
    .mm-cta { margin-top: 8px; background: #0F4C81; color: #fff; text-align: center; padding: 13px; border-radius: 8px; font-weight: 700; text-decoration: none; display: block; }

    /* ── HERO — fond sombre avec photos pro ── */
    .hero { position: relative; min-height: 100vh; background: linear-gradient(135deg, #081E41 0%, #0F4C81 55%, #0A2650 100%); overflow: hidden; display: flex; flex-direction: column; }

    /* Décor de fond */
    .hero-shapes { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
    .hero-wave-svg { display: none; }
    .hero-gold-blob { position: absolute; bottom: 0; left: 0; width: 520px; height: 130px; opacity: 0.75; }

    /* Slides */
    .slides { position: relative; flex: 1; z-index: 1; }
    .slide { position: absolute; inset: 0; display: flex; align-items: center; max-width: 1200px; padding: 80px 40px 60px; gap: 48px; opacity: 0; pointer-events: none; transition: opacity .7s cubic-bezier(.4,0,.2,1), transform .7s cubic-bezier(.4,0,.2,1); left: 50%; transform: translateX(calc(-50% + 40px)); }
    .slide.slide-on { opacity: 1; pointer-events: auto; transform: translateX(-50%); }
    .slide-text { flex: 1; max-width: 460px; }
    .s-badge { display: inline-block; background: rgba(201,152,46,0.2); color: #C9982E; border: 1px solid rgba(201,152,46,0.4); font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; margin-bottom: 14px; }
    .s-title { font-size: clamp(22px, 2.6vw, 36px); font-weight: 800; line-height: 1.18; color: #fff; margin-bottom: 14px; }
    .s-sub { font-size: 15px; line-height: 1.65; color: rgba(255,255,255,0.75); margin-bottom: 26px; max-width: 420px; }
    .s-btns { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .s-cta { display: inline-flex; align-items: center; gap: 10px; background: #C9982E; color: #fff; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 10px; transition: background .2s, transform .2s; box-shadow: 0 4px 22px rgba(201,152,46,0.42); }
    .s-cta:hover { background: #b8881f; transform: translateY(-1px); }
    .s-cta-ghost { display: inline-flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.88); font-weight: 600; font-size: 15px; border: 1.5px solid rgba(255,255,255,0.28); padding: 13px 22px; border-radius: 10px; transition: background .2s, border-color .2s; }
    .s-cta-ghost:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.5); }
    .s-arrow { width: 18px; height: 18px; }
    .slide-visual { flex: 0 0 400px; display: flex; align-items: center; justify-content: center; padding: 40px 0; }

    /* ── Photos héro professionnelles ── */
    .hero-photo-wrap { position: relative; width: 380px; flex-shrink: 0; }
    .hero-photo { width: 100%; height: 360px; object-fit: cover; border-radius: 32px 110px 32px 64px; display: block; box-shadow: 0 30px 90px rgba(0,0,0,0.55), 0 0 0 3px rgba(201,152,46,0.35); }
    .hero-photo-wrap::before { content: ''; position: absolute; inset: 0; background: linear-gradient(145deg, rgba(8,30,65,0.28) 0%, transparent 55%); border-radius: 32px 110px 32px 64px; pointer-events: none; z-index: 1; }

    /* Badges flottants */
    .hbf { position: absolute; background: rgba(255,255,255,0.97); backdrop-filter: blur(10px); border-radius: 14px; padding: 11px 16px; display: flex; align-items: center; gap: 10px; box-shadow: 0 8px 32px rgba(0,0,0,0.14); z-index: 2; min-width: 150px; }
    .hbf-1 { bottom: 56px; left: -32px; animation: hbfUp 4s ease-in-out infinite; }
    .hbf-2 { top: 20px; right: -28px; animation: hbfDown 4s ease-in-out infinite; }
    @keyframes hbfUp { 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-7px) } }
    @keyframes hbfDown { 0%,100%{ transform:translateY(-5px) } 50%{ transform:translateY(2px) } }
    .hbf-icon { width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .hbf-icon svg { width: 18px; height: 18px; }
    .hbf-txt { display: flex; flex-direction: column; gap: 1px; }
    .hbf-n { font-size: 15px; font-weight: 800; color: #0A2650; line-height: 1.1; }
    .hbf-l { font-size: 10px; font-weight: 600; color: #6B7280; letter-spacing: .03em; }

    /* Contrôles (fond sombre) */
    .hero-controls { position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 20px; z-index: 10; }
    .h-arrow { width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .2s; }
    .h-arrow:hover { background: rgba(255,255,255,0.22); }
    .h-arrow svg { width: 18px; height: 18px; }
    .h-dots { display: flex; gap: 8px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.35); border: none; cursor: pointer; transition: background .25s, width .25s; padding: 0; }
    .dot.dot-on { background: #C9982E; width: 24px; border-radius: 4px; }
    .h-prog { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.12); }
    .h-prog-bar { height: 100%; background: #C9982E; transition: width .4s ease; }

    /* ── SECTION HEADERS (shared) ── */
    .sec-wrap { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .sec-head { text-align: center; margin-bottom: 56px; }
    .sec-eye { display: inline-block; color: #C9982E; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 12px; }
    .sec-title { font-size: clamp(24px, 3vw, 36px); font-weight: 800; color: #0A2650; margin-bottom: 12px; }
    .sec-sub { font-size: 15px; color: #6b7280; max-width: 500px; margin: 0 auto; line-height: 1.65; }

    /* ── COMMENT ÇA FONCTIONNE ── */
    .howto-section {
      background: #f4f7fb;
      padding: 100px 0;
      position: relative;
      overflow: hidden;
    }
    .hw-glow {
      position: absolute; border-radius: 50%; pointer-events: none;
    }
    .hw-glow-a {
      width: 600px; height: 600px;
      background: radial-gradient(circle, rgba(15,76,129,0.08) 0%, transparent 70%);
      top: -200px; left: -150px;
    }
    .hw-glow-b {
      width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(15,76,129,0.06) 0%, transparent 70%);
      bottom: -100px; right: -100px;
    }
    .hw-glow-c { display: none; }
    .hw-dots {
      position: absolute; inset: 0; pointer-events: none;
      background-image: radial-gradient(rgba(15,76,129,0.08) 1px, transparent 1px);
      background-size: 28px 28px;
    }
    .hw-eye { color: #0F4C81; font-weight: 700; }
    .hw-sec-title { color: #0A2650; }
    .hw-sec-sub { color: #6b7280; }

    .hw-grid {
      display: flex;
      align-items: stretch;
      gap: 0;
    }
    .hw-col {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: stretch;
      opacity: 0;
      transform: translateY(48px) scale(0.93);
      transition:
        opacity 0.65s cubic-bezier(0.22,1,0.36,1) calc(var(--i, 0) * 0.13s),
        transform 0.65s cubic-bezier(0.34,1.56,0.64,1) calc(var(--i, 0) * 0.13s);
    }
    .howto-on .hw-col {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .hw-card {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      background: linear-gradient(145deg, #0A2650 0%, #0F4C81 100%);
      border-radius: 20px;
      padding: 32px 22px 28px;
      position: relative;
      overflow: hidden;
      cursor: default;
      box-shadow: 0 8px 32px rgba(15,76,129,0.22);
      transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease;
    }
    .hw-card::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 55%);
      pointer-events: none;
    }
    .hw-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 28px 64px rgba(15,76,129,0.38), 0 0 0 2px rgba(255,255,255,0.18);
    }

    .hw-bg-n {
      position: absolute;
      font-size: 110px; font-weight: 900;
      color: rgba(255,255,255,0.05);
      right: -8px; bottom: -22px;
      line-height: 1; pointer-events: none; user-select: none;
    }

    .hw-badge {
      width: 50px; height: 50px;
      border-radius: 14px;
      background: rgba(255,255,255,0.95);
      color: #0F4C81;
      font-size: 17px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 22px;
      box-shadow: 0 4px 18px rgba(0,0,0,0.2);
      position: relative; z-index: 1;
    }

    .hw-icon {
      color: rgba(255,255,255,0.8);
      margin-bottom: 16px;
      animation: hwFloat 3.5s ease-in-out infinite;
      position: relative; z-index: 1;
    }
    .hw-icon svg { width: 30px; height: 30px; }

    @keyframes hwFloat {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-7px); }
    }

    .hw-card-title {
      font-size: 16px; font-weight: 700;
      color: #fff; margin-bottom: 10px;
      position: relative; z-index: 1;
    }
    .hw-card-desc {
      flex: 1;
      font-size: 13px; color: rgba(255,255,255,0.65);
      line-height: 1.7; margin-bottom: 16px;
      position: relative; z-index: 1;
    }
    .hw-tag {
      display: inline-block;
      font-size: 10px; font-weight: 700; letter-spacing: .1em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.5);
      border: 1px solid rgba(255,255,255,0.18);
      padding: 3px 10px; border-radius: 20px;
      position: relative; z-index: 1;
    }

    .hw-arrow {
      flex-shrink: 0; padding: 0 4px;
      display: flex; align-items: center;
      align-self: center;
    }
    .hw-arrow svg { width: 56px; height: 24px; display: block; }

    /* ── POURQUOI WARAH ── */
    .why-section { background: #f4f7fb; padding: 100px 0; opacity: 0; transform: translateY(28px); transition: opacity .7s ease, transform .7s ease; }
    .why-section.why-on { opacity: 1; transform: translateY(0); }

    .why-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; align-items: start; }

    /* Liste gauche */
    .why-list { display: flex; flex-direction: column; gap: 5px; }
    .wi {
      position: relative; overflow: hidden;
      display: flex; align-items: flex-start; gap: 13px;
      padding: 14px 16px; border-radius: 12px;
      border: 1.5px solid transparent;
      background: white; cursor: pointer; text-align: left; width: 100%;
      transition: background .22s, border-color .22s, box-shadow .22s;
    }
    .wi:not(.wi-on):hover { background: #EEF4FC; border-color: rgba(15,76,129,0.15); }
    .wi.wi-on { background: #0F4C81; border-color: #0F4C81; box-shadow: 0 6px 24px rgba(15,76,129,0.28); }

    .wi-icon {
      width: 38px; height: 38px; border-radius: 9px; flex-shrink: 0;
      background: rgba(15,76,129,0.09); color: #0F4C81;
      display: flex; align-items: center; justify-content: center;
      transition: background .2s, color .2s; margin-top: 1px;
    }
    .wi.wi-on .wi-icon { background: rgba(255,255,255,0.15); color: #fff; }
    .wi-icon svg { width: 17px; height: 17px; }

    .wi-body { flex: 1; min-width: 0; }
    .wi-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .wi-num { font-size: 10px; font-weight: 700; color: #9CA3AF; letter-spacing: .08em; }
    .wi.wi-on .wi-num { color: rgba(255,255,255,0.45); }
    .wi-title { font-size: 14px; font-weight: 700; color: #0A2650; }
    .wi.wi-on .wi-title { color: #fff; }
    .wi-desc { font-size: 12px; color: #6B7280; line-height: 1.6; max-height: 0; overflow: hidden; transition: max-height .3s ease; }
    .wi.wi-on .wi-desc { max-height: 80px; color: rgba(255,255,255,0.65); }

    .wi-progress {
      position: absolute; bottom: 0; left: 0; height: 2px;
      background: rgba(255,255,255,0.5); width: 0;
      transition: width 3.5s linear;
    }

    /* Panneau droit */
    .why-preview {
      position: sticky; top: 20px;
      background: linear-gradient(145deg, #081E41 0%, #0F4C81 100%);
      border-radius: 22px; min-height: 380px; overflow: hidden;
      box-shadow: 0 20px 56px rgba(15,76,129,0.32);
    }
    .wp-pane { padding: 32px 28px; position: relative; z-index: 1; }
    .wp-bg-n {
      position: absolute; font-size: 200px; font-weight: 900;
      color: rgba(255,255,255,0.03); right: -20px; bottom: -50px;
      line-height: 1; pointer-events: none; user-select: none; z-index: 0;
    }
    .wp-timer-bar {
      position: absolute; bottom: 0; left: 0; height: 3px;
      background: rgba(255,255,255,0.35);
      animation: wpTimer 3.5s linear infinite;
    }
    @keyframes wpTimer { from { width: 0; } to { width: 100%; } }

    .wp-c { animation: wpIn .35s cubic-bezier(0.22,1,0.36,1); }
    .wp-cc { text-align: center; }
    @keyframes wpIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }

    .wp-label { font-size: 10.5px; font-weight: 700; color: rgba(255,255,255,0.42); letter-spacing: .1em; text-transform: uppercase; margin-bottom: 18px; }

    /* KPIs */
    .wp-kpis { display: flex; gap: 10px; margin-bottom: 18px; }
    .wp-kpi { flex: 1; background: rgba(255,255,255,0.08); border-radius: 10px; padding: 12px 10px; text-align: center; border: 1px solid rgba(255,255,255,0.07); }
    .wp-kpi-n { display: block; font-size: 24px; font-weight: 800; color: #fff; }
    .wp-kpi-l { display: block; font-size: 10px; color: rgba(255,255,255,0.45); margin-top: 3px; }

    /* Table */
    .wp-table { border-radius: 10px; overflow: hidden; font-size: 11.5px; }
    .wp-th { display: grid; grid-template-columns: 2fr 2fr 1.5fr 1fr; padding: 7px 10px; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.38); font-weight: 700; letter-spacing: .04em; font-size: 10px; }
    .wp-tr { display: grid; grid-template-columns: 2fr 2fr 1.5fr 1fr; padding: 9px 10px; color: rgba(255,255,255,0.75); border-top: 1px solid rgba(255,255,255,0.06); align-items: center; }
    .wp-s { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 8px; text-align: center; }
    .wp-s-full { background: rgba(255,255,255,0.15); color: white; }
    .wp-s-empty { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.4); }

    /* Bars paiement */
    .wp-bars { display: flex; align-items: flex-end; gap: 7px; height: 96px; margin-bottom: 14px; }
    .wp-bitem { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; height: 100%; }
    .wp-bwrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
    .wp-bar { width: 100%; background: rgba(255,255,255,0.15); border-radius: 4px 4px 0 0; transition: height .5s; }
    .wp-bar.wp-bar-hi { background: rgba(255,255,255,0.9); }
    .wp-blabel { font-size: 9.5px; color: rgba(255,255,255,0.38); }
    .wp-sum { display: flex; flex-direction: column; gap: 7px; }
    .wp-sum-r { display: flex; align-items: center; gap: 8px; font-size: 12px; color: rgba(255,255,255,0.6); }
    .wp-sum-r strong { margin-left: auto; color: white; font-size: 12.5px; }
    .wp-sum-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.25); flex-shrink: 0; }
    .wp-dot-hi { background: rgba(255,255,255,0.9); }
    .wp-dot-lo { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); }

    /* Document */
    .wp-doc { background: rgba(255,255,255,0.07); border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
    .wp-doc-hd { background: rgba(255,255,255,0.1); padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; }
    .wp-doc-hd strong { color: white; font-size: 13px; }
    .wp-doc-hd span { color: rgba(255,255,255,0.45); font-size: 10.5px; }
    .wp-doc-bd { padding: 12px 14px; display: flex; flex-direction: column; gap: 7px; }
    .wp-doc-r { display: flex; justify-content: space-between; font-size: 12px; }
    .wp-doc-r span { color: rgba(255,255,255,0.42); }
    .wp-doc-r strong { color: white; }
    .wp-doc-total { border-top: 1px solid rgba(255,255,255,0.1); text-align: center; font-size: 28px; font-weight: 800; color: white; padding: 14px 0 6px; margin: 0 14px; }
    .wp-doc-ft { text-align: center; font-size: 10px; color: rgba(255,255,255,0.32); padding: 6px 14px 12px; }

    /* Notifications */
    .wp-notifs { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
    .wp-notif { display: flex; align-items: flex-start; gap: 10px; background: rgba(255,255,255,0.06); border-radius: 10px; padding: 11px 12px; border-left: 3px solid; }
    .wp-notif-hi { border-left-color: rgba(255,255,255,0.8); }
    .wp-notif-md { border-left-color: rgba(255,255,255,0.4); }
    .wp-notif-lo { border-left-color: rgba(255,255,255,0.2); }
    .wp-ni-ico { width: 16px; height: 16px; flex-shrink: 0; color: rgba(255,255,255,0.55); margin-top: 2px; }
    .wp-ni-t { font-size: 12.5px; font-weight: 600; color: white; margin-bottom: 2px; }
    .wp-ni-s { font-size: 10.5px; color: rgba(255,255,255,0.45); }
    .wp-ft { font-size: 10.5px; color: rgba(255,255,255,0.32); text-align: center; }

    /* Devices */
    .wp-devices { display: flex; align-items: flex-end; justify-content: center; gap: 24px; margin: 22px 0 20px; }
    .wp-phone { width: 54px; }
    .wp-phone .wpd-screen { width: 54px; height: 92px; border: 2px solid rgba(255,255,255,0.3); border-radius: 10px; padding: 8px 7px; background: rgba(255,255,255,0.05); }
    .wp-phone-btn { width: 16px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; margin: 4px auto 0; }
    .wp-laptop .wpd-screen { width: 124px; height: 82px; border: 2px solid rgba(255,255,255,0.3); border-radius: 6px 6px 0 0; padding: 8px; background: rgba(255,255,255,0.05); }
    .wp-laptop-base { height: 7px; background: rgba(255,255,255,0.2); border-radius: 0 0 4px 4px; width: 144px; }
    .wpd-bar { height: 8px; background: rgba(255,255,255,0.25); border-radius: 3px; margin-bottom: 6px; }
    .wpd-line { height: 5px; background: rgba(255,255,255,0.12); border-radius: 2px; margin-bottom: 4px; }
    .wpd-s { width: 60%; }
    .wp-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
    .wp-chip { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.65); background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.14); padding: 5px 12px; border-radius: 20px; }

    /* Shield */
    .wp-shield-wrap { display: flex; justify-content: center; margin: 16px 0 20px; }
    .wp-shield-svg { width: 88px; height: 100px; }
    .wp-checks { display: flex; flex-direction: column; gap: 8px; align-items: center; }
    .wp-ck { font-size: 13px; color: rgba(255,255,255,0.72); font-weight: 500; }

    .wp-search { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 9px 12px; font-size: 12px; color: rgba(255,255,255,0.35); margin-bottom: 14px; }
    .wp-search svg { width: 14px; height: 14px; flex-shrink: 0; }
    .wp-ann-cards { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
    .wp-ann-card { background: rgba(255,255,255,0.07); border-radius: 10px; padding: 12px 14px; border: 1px solid rgba(255,255,255,0.08); }
    .wp-ann-top { display: flex; align-items: center; gap: 7px; margin-bottom: 6px; }
    .wp-ann-type { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 8px; }
    .wp-ann-new { font-size: 9.5px; font-weight: 700; color: white; background: rgba(255,255,255,0.2); padding: 2px 7px; border-radius: 8px; }
    .wp-ann-name { font-size: 13px; font-weight: 700; color: white; margin-bottom: 2px; }
    .wp-ann-loc { font-size: 11px; color: rgba(255,255,255,0.45); margin-bottom: 8px; }
    .wp-ann-foot { display: flex; justify-content: space-between; align-items: center; }
    .wp-ann-foot strong { font-size: 13px; color: white; }
    .wp-ann-cand { font-size: 10.5px; color: rgba(255,255,255,0.4); }

    /* ── IMPACT EN CHIFFRES ── */
    .impact-section { background: linear-gradient(135deg, #081E41 0%, #0F4C81 60%, #0A2650 100%); padding: 96px 0; }
    .impact-eye { color: rgba(201,152,46,0.9); }
    .impact-title { color: white; }
    .impact-sub { color: rgba(255,255,255,0.6); }
    .impact-grid { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; }
    .impact-item { flex: 1; min-width: 160px; text-align: center; padding: 0 32px; }
    .impact-n { display: block; font-size: 56px; font-weight: 800; color: white; line-height: 1; margin-bottom: 12px; font-variant-numeric: tabular-nums; }
    .impact-n small { font-size: 36px; color: #C9982E; vertical-align: super; }
    .impact-l { display: block; font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.92); margin-bottom: 6px; }
    .impact-detail { display: block; font-size: 12px; color: rgba(255,255,255,0.48); line-height: 1.5; }
    .impact-sep { width: 1px; height: 90px; background: rgba(255,255,255,0.15); flex-shrink: 0; }

    /* ── TÉMOIGNAGES carousel ── */
    .temo-section { background: #F8F9FC; padding: 88px 0 72px; overflow: hidden; }
    .ts-head { display: flex; align-items: center; gap: 20px; max-width: 520px; margin: 0 auto 56px; padding: 0 24px; }
    .ts-line { flex: 1; height: 1px; background: #D1D5DB; }
    .ts-title { font-size: 11.5px; font-weight: 800; letter-spacing: .14em; color: #6B7280; text-transform: uppercase; white-space: nowrap; }
    .ts-stage { position: relative; height: 300px; overflow: hidden; }
    .ts-stage::before, .ts-stage::after { content: ''; position: absolute; top: 0; bottom: 0; width: 220px; z-index: 4; pointer-events: none; }
    .ts-stage::before { left: 0; background: linear-gradient(to right, #F8F9FC 0%, rgba(248,249,252,0) 100%); }
    .ts-stage::after  { right: 0; background: linear-gradient(to left,  #F8F9FC 0%, rgba(248,249,252,0) 100%); }
    .ts-card { position: absolute; width: 360px; background: white; border-radius: 20px; padding: 28px 26px 24px; box-shadow: 0 4px 24px rgba(0,0,0,0.07); border: 1px solid #E5E7EB; transition: all .45s cubic-bezier(.4,0,.2,1); cursor: pointer; left: 50%; }
    .ts-card.ts-active { transform: translateX(-50%) scale(1); opacity: 1; z-index: 3; box-shadow: 0 16px 56px rgba(15,76,129,0.13); border-color: rgba(15,76,129,0.1); }
    .ts-card.ts-prev { transform: translateX(calc(-50% - 340px)) scale(0.88); opacity: 1; z-index: 1; }
    .ts-card.ts-next { transform: translateX(calc(-50% + 340px)) scale(0.88); opacity: 1; z-index: 1; }
    .ts-card.ts-hidden { transform: translateX(-50%) scale(0.75); opacity: 0; z-index: 0; pointer-events: none; }
    .ts-quote { font-size: 56px; line-height: 1; color: #0F4C81; opacity: 0.15; margin-bottom: 10px; font-family: Georgia, serif; }
    .ts-text { font-size: 13.5px; color: #374151; line-height: 1.75; margin-bottom: 18px; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
    .ts-sep { height: 1px; background: #E5E7EB; margin-bottom: 16px; }
    .ts-author { display: flex; align-items: center; gap: 12px; }
    .ts-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 2px solid #E5E7EB; }
    .ts-author-info { display: flex; flex-direction: column; gap: 2px; }
    .ts-name { font-size: 14px; font-weight: 700; color: #0A2650; }
    .ts-role { font-size: 12px; color: #0F4C81; font-weight: 500; }
    .ts-nav { display: flex; align-items: center; justify-content: center; gap: 20px; margin-top: 32px; }
    .ts-arrow { width: 38px; height: 38px; border-radius: 50%; border: 1.5px solid #D1D5DB; background: white; color: #374151; font-size: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .2s; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .ts-arrow:hover { border-color: #0F4C81; color: #0F4C81; background: #EEF4FC; }
    .ts-dots { display: flex; gap: 7px; }
    .ts-dot { width: 8px; height: 8px; border-radius: 50%; border: none; background: #D1D5DB; cursor: pointer; transition: all .25s; padding: 0; }
    .ts-dot.ts-dot-on { background: #0F4C81; width: 22px; border-radius: 4px; }

    /* ── FAQ ── */
    .faq-section { background: linear-gradient(135deg, #081E41 0%, #0A2650 50%, #0F4C81 100%); padding: 96px 0; }
    .faq-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .faq-head { text-align: center; margin-bottom: 56px; }
    .faq-head-badge { display: inline-flex; align-items: center; gap: 7px; background: rgba(201,152,46,0.15); border: 1px solid rgba(201,152,46,0.35); color: #C9982E; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; padding: 6px 14px; border-radius: 20px; margin-bottom: 18px; }
    .faq-head-badge svg { width: 13px; height: 13px; }
    .faq-title { font-size: clamp(26px, 3.5vw, 40px); font-weight: 800; color: white; line-height: 1.2; margin-bottom: 12px; text-wrap: balance; }
    .faq-sub { font-size: 15px; color: rgba(255,255,255,0.6); }
    .faq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 48px; }
    .faq-col { display: flex; flex-direction: column; gap: 12px; }
    .faq-item { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; cursor: pointer; transition: background .2s, border-color .2s; overflow: hidden; }
    .faq-item:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); }
    .faq-item.faq-open { background: rgba(255,255,255,0.1); border-color: rgba(201,152,46,0.5); }
    .faq-row { display: flex; align-items: center; gap: 14px; padding: 18px 20px; }
    .faq-num { font-size: 11px; font-weight: 800; color: #C9982E; letter-spacing: .06em; flex-shrink: 0; font-variant-numeric: tabular-nums; }
    .faq-q { font-size: 14px; font-weight: 600; color: white; flex: 1; line-height: 1.4; }
    .faq-chevron { width: 18px; height: 18px; flex-shrink: 0; color: rgba(255,255,255,0.5); transition: transform .25s ease; }
    .faq-open .faq-chevron { transform: rotate(180deg); color: #C9982E; }
    .faq-ans { padding: 0 20px 18px 48px; }
    .faq-ans p { font-size: 13.5px; color: rgba(255,255,255,0.72); line-height: 1.75; }
    .faq-footer { display: flex; align-items: center; justify-content: center; gap: 16px; padding-top: 8px; }
    .faq-footer p { font-size: 14px; color: rgba(255,255,255,0.6); }
    .faq-cta { background: #C9982E; color: white; font-size: 14px; font-weight: 700; padding: 10px 22px; border-radius: 8px; text-decoration: none; transition: background .2s; }
    .faq-cta:hover { background: #b8881f; }

    /* ── ANNONCES (conservé mais non utilisé) ── */
    .ann-section { background: #F8F9FC; padding: 96px 0; }
    .biens-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .bien-card { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.07); transition: transform .2s, box-shadow .2s; display: block; color: inherit; }
    .bien-card:hover { transform: translateY(-4px); box-shadow: 0 8px 32px rgba(15,76,129,0.14); }
    .bien-img { position: relative; height: 200px; overflow: hidden; }
    .bien-photo { width: 100%; height: 100%; object-fit: cover; }
    .bien-placeholder { width: 100%; height: 100%; background: linear-gradient(135deg, #0A2650, #0F4C81); display: flex; align-items: center; justify-content: center; }
    .bien-placeholder svg { width: 60px; height: 50px; }
    .bien-badge-type { position: absolute; top: 12px; left: 12px; background: #0F4C81; color: #fff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; }
    .bien-body { padding: 16px 18px 18px; }
    .bien-loc { font-size: 16px; font-weight: 700; color: #0A2650; margin-bottom: 4px; }
    .bien-addr { font-size: 13px; color: #9ca3af; margin-bottom: 10px; }
    .bien-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
    .bien-tag { background: #f0f4f8; color: #4b5563; font-size: 12px; padding: 3px 9px; border-radius: 5px; }
    .bien-footer { display: flex; align-items: center; justify-content: space-between; }
    .bien-price { font-size: 16px; font-weight: 800; color: #0F4C81; }
    .bien-price small { font-size: 11px; font-weight: 500; color: #9ca3af; }
    .bien-link { font-size: 13px; color: #C9982E; font-weight: 600; }
    .sk-card { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.07); }
    .sk-img { height: 200px; background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    .sk-body { padding: 16px 18px 18px; }
    .sk-line { height: 12px; border-radius: 6px; margin-bottom: 10px; background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    .sk-lg { width: 75%; } .sk-md { width: 55%; } .sk-sm { width: 40%; }
    @keyframes shimmer { to { background-position: -200% 0; } }
    .voir-plus { text-align: center; margin-top: 40px; }
    .btn-voir-plus { display: inline-block; border: 2px solid #0F4C81; color: #0F4C81; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; transition: background .2s, color .2s; }
    .btn-voir-plus:hover { background: #0F4C81; color: #fff; }
    .ann-empty { text-align: center; padding: 48px 0; }
    .ann-empty h3 { font-size: 20px; font-weight: 700; color: #0A2650; margin-bottom: 10px; }
    .ann-empty p { font-size: 14px; color: #6b7280; margin-bottom: 24px; }
    .btn-outline-blue { display: inline-block; border: 2px solid #0F4C81; color: #0F4C81; font-weight: 700; font-size: 14px; padding: 11px 24px; border-radius: 8px; transition: background .2s, color .2s; }
    .btn-outline-blue:hover { background: #0F4C81; color: #fff; }

    /* ── ABONNEMENTS ── */
    .price-section { background: white; padding: 96px 0; }
    .price-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 48px; align-items: start; }
    .price-card { background: #F8FAFF; border: 1.5px solid #E5E7EB; border-radius: 20px; padding: 32px 28px; display: flex; flex-direction: column; position: relative; transition: box-shadow .2s; }
    .price-card:hover { box-shadow: 0 8px 32px rgba(15,76,129,0.1); }
    .price-card-pro { background: #0A2650; border-color: #C9982E; box-shadow: 0 16px 56px rgba(10,38,80,0.28); transform: translateY(-10px); }
    .price-badge-pop { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: #C9982E; color: white; font-size: 11px; font-weight: 700; padding: 5px 14px; border-radius: 20px; white-space: nowrap; display: flex; align-items: center; gap: 5px; }
    .price-badge-pop svg { width: 11px; height: 11px; }
    .price-top { margin-bottom: 24px; }
    .price-label { font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #9CA3AF; display: block; margin-bottom: 12px; }
    .price-label-pro { color: rgba(201,152,46,0.9); }
    .price-amount { display: flex; align-items: baseline; gap: 4px; margin-bottom: 6px; }
    .price-n { font-size: 40px; font-weight: 900; color: #0A2650; line-height: 1; font-variant-numeric: tabular-nums; }
    .price-card-pro .price-n { color: white; }
    .price-unit { font-size: 14px; color: #6B7280; font-weight: 600; }
    .price-card-pro .price-unit { color: rgba(255,255,255,0.6); }
    .price-period { font-size: 12px; color: #9CA3AF; }
    .price-card-pro .price-period { color: rgba(255,255,255,0.5); }
    .price-feats { list-style: none; padding: 0; margin: 0 0 28px; display: flex; flex-direction: column; gap: 11px; flex: 1; border-top: 1px solid #E5E7EB; padding-top: 20px; }
    .price-card-pro .price-feats { border-top-color: rgba(255,255,255,0.1); }
    .feat-ok, .feat-no { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: #374151; }
    .price-card-pro .feat-ok { color: rgba(255,255,255,0.9); }
    .feat-no { color: #9CA3AF; text-decoration: line-through; }
    .feat-ok svg, .feat-no svg { width: 16px; height: 16px; flex-shrink: 0; }
    .feat-ok-pro svg { color: #C9982E; }
    .price-btn { display: block; text-align: center; font-weight: 700; font-size: 14px; padding: 14px 20px; border-radius: 10px; text-decoration: none; transition: all .2s; margin-top: auto; }
    .price-btn-ghost { border: 2px solid #0F4C81; color: #0F4C81; }
    .price-btn-ghost:hover { background: #0F4C81; color: white; }
    .price-btn-pro { background: #C9982E; color: white; border: 2px solid #C9982E; }
    .price-btn-pro:hover { background: #b8881f; border-color: #b8881f; }
    .price-addon { margin-top: 24px; background: linear-gradient(135deg, #FFF8EC 0%, #FFFBF2 100%); border: 1.5px solid rgba(201,152,46,0.35); border-radius: 16px; padding: 24px 28px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
    .price-addon-left { display: flex; align-items: flex-start; gap: 16px; flex: 1; }
    .price-addon-icon { width: 44px; height: 44px; background: rgba(201,152,46,0.15); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #C9982E; }
    .price-addon-icon svg { width: 22px; height: 22px; }
    .price-addon-label { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; color: #C9982E; display: block; margin-bottom: 5px; }
    .price-addon-desc { font-size: 13.5px; color: #6B7280; line-height: 1.6; }
    .price-addon-right { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; flex-shrink: 0; }
    .price-addon-price { font-size: 18px; font-weight: 800; color: #0A2650; white-space: nowrap; }
    .price-addon-price span { font-size: 12px; font-weight: 500; color: #9CA3AF; }
    .price-btn-addon { border: 2px solid #C9982E; color: #C9982E; padding: 9px 18px; font-size: 13px; }
    .price-btn-addon:hover { background: #C9982E; color: white; }
    .price-note { text-align: center; font-size: 12.5px; color: #9CA3AF; margin-top: 32px; }

    /* ── RESPONSIVE ── */
    @media (max-width: 1280px) {
      .slide-visual { flex: 0 0 340px; }
      .hero-photo-wrap { width: 320px; }
      .hero-photo { height: 300px; }
      .hbf-1 { left: -16px; }
      .hbf-2 { right: -12px; }
    }
    @media (max-width: 1024px) {
      .why-layout { grid-template-columns: 1fr; }
      .why-preview { position: static; }
      .biens-grid { grid-template-columns: repeat(2, 1fr); }
      .temo-layout { grid-template-columns: 1fr; }
      .temo-left { min-height: 260px; }
      .temo-left-content { min-height: 260px; }
      .faq-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .nav-links, .nav-cta { display: none; }
      .hamburger { display: flex; }
      .hero-shapes { display: none; }
      .slide { flex-direction: column; padding: 90px 24px 120px; text-align: center; gap: 28px; left: 0; transform: translateX(40px); }
      .slide.slide-on { transform: translateX(0); }
      .s-title { font-size: 26px; }
      .s-sub, .s-btns { margin: 0 auto; }
      .s-btns { justify-content: center; }
      .slide-visual { flex: 0 0 auto; padding: 0; }
      .hero-photo-wrap { width: 100%; max-width: 300px; }
      .hero-photo { height: 240px; border-radius: 20px 60px 20px 40px; }
      .hero-photo-wrap::before { border-radius: 20px 60px 20px 40px; }
      .hbf { display: none; }
      .hero-controls { bottom: 30px; }
      .hw-grid { flex-direction: column; gap: 16px; }
      .hw-col { flex-direction: column; width: 100%; }
      .hw-arrow { transform: rotate(90deg); }
      .impact-grid { gap: 0; }
      .impact-item { min-width: 50%; padding: 20px 16px; }
      .impact-sep { display: none; }
      .impact-n { font-size: 42px; }
      .temo-layout { gap: 24px; }
      .biens-grid { grid-template-columns: 1fr; }
      .price-grid { grid-template-columns: 1fr; }
      .price-card-pro { transform: none; }
      .price-addon { flex-direction: column; align-items: flex-start; }
      .price-addon-right { align-items: flex-start; width: 100%; }
      .price-btn-addon { width: 100%; text-align: center; }
      .cta-or { flex-direction: row; padding: 20px 0; }
      .cta-or-line { flex: 1; height: 1px; width: auto; }
    }
    @media (max-width: 480px) {
      .sec-title { font-size: 22px; }
      .impact-n { font-size: 36px; }
      .price-card { padding: 28px 20px; }
    }
  `]
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('impactSection') impactRef!: ElementRef;
  @ViewChild('howtoSection')  howtoRef!: ElementRef;
  @ViewChild('whySection')    whyRef!: ElementRef;

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private slideTimer?: ReturnType<typeof setInterval>;
  private statsObserver?: IntersectionObserver;
  private howtoObserver?: IntersectionObserver;
  private whyObserver?: IntersectionObserver;
  private featureTimer?: ReturnType<typeof setInterval>;
  private statsAnimated = false;

  howtoVisible   = signal(false);
  whyVisible     = signal(false);
  activeFeature  = signal(0);
  selectedTemo   = signal(0);
  temoSlide      = signal(0);
  selectedFaq    = signal(0);

  // ── Slider & carousel ──
  private temoTimer: ReturnType<typeof setInterval> | null = null;
  currentSlide = signal(0);
  navScrolled  = signal(false);
  menuOpen     = signal(false);


  // ── Impact — compteurs animés ──
  statAnnonces      = signal(0);
  statProprio       = signal(0);
  statSatisfaction  = signal(0);
  statVilles        = signal(0);

  // ── Données statiques ──
  readonly slides: HeroSlide[] = [
    { badge: 'Gestion immobilière',   title: 'Gérez vos biens en toute simplicité',      subtitle: 'Suivez l\'occupation, les baux et l\'historique de chaque bien depuis une seule interface intuitive.', cta: 'Commencer gratuitement', link: '/auth/register' },
    { badge: 'Paiements des loyers',  title: 'Encaissez vos loyers sans effort',          subtitle: 'Suivez chaque paiement en temps réel. Alertes automatiques pour les impayés, rappels avant échéance.',  cta: 'Découvrir WARAH',        link: '/auth/register' },
    { badge: 'Génération de quittances', title: 'Quittances professionnelles en un clic', subtitle: 'Créez et envoyez des quittances de loyer signées directement à vos locataires, à tout moment.',          cta: 'Essayer gratuitement',   link: '/auth/register' },
    { badge: 'Annonces immobilières', title: 'Trouvez vos locataires rapidement',          subtitle: 'Publiez vos annonces et recevez des candidatures qualifiées depuis partout au Togo.',                    cta: 'Voir les annonces',      link: '/annonces'       },
  ];

  readonly fonctionnement = [
    { num: '01', titre: 'Créez votre compte',       desc: 'Inscription gratuite en 2 minutes. Renseignez vos informations et téléchargez votre CNI ou passeport pour validation.' },
    { num: '02', titre: 'Ajoutez vos biens',        desc: 'Enregistrez vos propriétés avec photos, description et conditions de location. Biens disponibles immédiatement.' },
    { num: '03', titre: 'Invitez vos locataires',   desc: 'Envoyez une invitation par email ou SMS. Le locataire crée son compte et est associé à votre bail.' },
    { num: '04', titre: 'Gérez tout en temps réel', desc: 'Suivez les paiements, générez des quittances et recevez des alertes dès qu\'un loyer est en retard.' },
  ];

  readonly avantages = [
    { titre: 'Gestion centralisée',    desc: 'Tous vos biens, locataires et baux sur une seule plateforme. Fini les tableaux Excel et les papiers perdus.' },
    { titre: 'Suivi des paiements',    desc: 'Chaque loyer enregistré automatiquement. Alertes avant échéance et dès qu\'un retard est détecté.' },
    { titre: 'Quittances en un clic',  desc: 'Générées et envoyées au locataire automatiquement après chaque paiement confirmé.' },
    { titre: 'Alertes intelligentes',  desc: 'Notifications push et email pour les échéances, impayés et renouvellements de bail.' },
    { titre: 'Accès partout',          desc: 'Application web responsive. Gérez vos biens depuis votre téléphone, tablette ou ordinateur.' },
    { titre: 'Données sécurisées',     desc: 'Vos données chiffrées et sauvegardées. Conformité aux standards de sécurité en vigueur.' },
    { titre: 'Annonces intégrées',     desc: 'Publiez vos biens vacants en un clic et recevez des candidatures de locataires qualifiés directement sur la plateforme.' },
  ];

  readonly wpBars = [
    { label: 'Fév', h: 55, hi: false }, { label: 'Mar', h: 70, hi: false },
    { label: 'Avr', h: 62, hi: false }, { label: 'Mai', h: 85, hi: false },
    { label: 'Juin', h: 78, hi: false }, { label: 'Juil', h: 100, hi: true },
  ];

  readonly temoignages = [
    {
      nom: 'Kofi Assiamah', role: 'Propriétaire', ville: 'Lomé',
      initiale: 'K', couleur: '#0F4C81',
      photo: 'https://randomuser.me/api/portraits/men/36.jpg',
      texte: 'WARAH a transformé ma façon de gérer mes 5 biens. Les quittances automatiques et le suivi des paiements m\'ont fait économiser des heures chaque mois. Je recommande à tous les propriétaires.',
    },
    {
      nom: 'Adjoa Mensah', role: 'Gestionnaire immobilier', ville: 'Lomé',
      initiale: 'A', couleur: '#0A5940',
      photo: 'https://randomuser.me/api/portraits/women/56.jpg',
      texte: 'Je gère le portefeuille de plusieurs propriétaires. WARAH me donne une vue complète sur tous les baux, paiements et locataires en un seul endroit. Un gain de temps considérable.',
    },
    {
      nom: 'Ibrahim Touré', role: 'Propriétaire', ville: 'Kara',
      initiale: 'I', couleur: '#6D3AB0',
      photo: 'https://randomuser.me/api/portraits/men/9.jpg',
      texte: 'Même depuis Kara, je suis tout ce qui se passe à Lomé. Les alertes d\'impayés arrivent immédiatement sur mon téléphone. C\'est vraiment indispensable pour tout propriétaire sérieux.',
    },
    {
      nom: 'Afia Dossou', role: 'Locataire', ville: 'Lomé',
      initiale: 'A', couleur: '#B45309',
      photo: 'https://randomuser.me/api/portraits/women/31.jpg',
      texte: 'Grâce à WARAH j\'ai trouvé mon appartement en moins d\'une semaine. Le propriétaire était vérifié, le contrat de bail signé en ligne. Tout était transparent et rapide.',
    },
    {
      nom: 'Jean-Baptiste Kuma', role: 'Propriétaire', ville: 'Sokodé',
      initiale: 'J', couleur: '#0A2650',
      photo: 'https://randomuser.me/api/portraits/men/83.jpg',
      texte: 'Je possède 8 biens à Sokodé et Lomé. Avant WARAH, je perdais des journées entières à relancer les loyers. Maintenant tout est automatisé — je récupère du temps pour ma famille.',
    },
  ];

  readonly faqs = [
    {
      q: 'Comment fonctionne WARAH ?',
      r: 'WARAH est une plateforme de gestion immobilière tout-en-un. Vous créez un compte, ajoutez vos biens, invitez vos locataires et gérez tout depuis un tableau de bord unique : paiements, baux, quittances, alertes d\'impayés et annonces.',
    },
    {
      q: 'Est-ce gratuit de s\'inscrire ?',
      r: 'L\'inscription est entièrement gratuite. Vous pouvez commencer à gérer vos biens sans frais. Des formules premium sont disponibles pour les propriétaires avec un grand nombre de biens ou les gestionnaires immobiliers.',
    },
    {
      q: 'Comment ajouter un bien immobilier ?',
      r: 'Depuis votre tableau de bord, cliquez sur "Mes biens" puis "+ Nouveau bien". Renseignez l\'adresse, le type (villa, appartement…), le loyer mensuel, les photos et les caractéristiques. Votre bien est disponible en quelques minutes.',
    },
    {
      q: 'Comment inviter un locataire sur la plateforme ?',
      r: 'Depuis la fiche d\'un bien, cliquez sur "Inviter un locataire". Renseignez son nom, téléphone et email — WARAH lui envoie automatiquement un lien d\'activation sécurisé pour créer son espace locataire.',
    },
    {
      q: 'Les paiements et données sont-ils sécurisés ?',
      r: 'Oui. Toutes les communications sont chiffrées (HTTPS). Les données personnelles sont stockées en conformité avec les normes de protection des données. WARAH ne stocke aucun numéro de carte bancaire.',
    },
    {
      q: 'Puis-je gérer plusieurs biens depuis un seul compte ?',
      r: 'Absolument. WARAH est conçu pour les propriétaires multi-biens et les gestionnaires immobiliers de portefeuilles. Vous pouvez ajouter autant de biens que nécessaire, dans différentes villes du Togo, et tout visualiser depuis un seul tableau de bord.',
    },
    {
      q: 'Que se passe-t-il en cas d\'impayé de loyer ?',
      r: 'WARAH vous envoie une alerte dès qu\'un paiement est en retard. Vous pouvez envoyer une relance directement depuis la plateforme, suivre l\'historique des échanges et générer un récapitulatif d\'impayés pour vos démarches.',
    },
  ];

  ngOnInit(): void {
    if (this.isBrowser) {
      this.startSlider();
      this.startTemoCarousel();
      window.addEventListener('scroll', this.onScroll);
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    if (this.howtoRef) {
      this.howtoObserver = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { this.howtoVisible.set(true); this.howtoObserver?.disconnect(); } },
        { threshold: 0.12 }
      );
      this.howtoObserver.observe(this.howtoRef.nativeElement);
    }

    if (this.whyRef) {
      this.whyObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            this.whyVisible.set(true);
            this.whyObserver?.disconnect();
            this.startFeatureRotation();
          }
        },
        { threshold: 0.15 }
      );
      this.whyObserver.observe(this.whyRef.nativeElement);
    }

    if (this.impactRef) {
      this.statsObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !this.statsAnimated) {
            this.statsAnimated = true;
            this.animateCounter(this.statAnnonces, 1200, 1600);
            this.animateCounter(this.statProprio, 500, 1400);
            this.animateCounter(this.statSatisfaction, 98, 1200);
            this.animateCounter(this.statVilles, 6, 900);
          }
        },
        { threshold: 0.35 }
      );
      this.statsObserver.observe(this.impactRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (this.slideTimer) clearInterval(this.slideTimer);
    if (this.isBrowser) window.removeEventListener('scroll', this.onScroll);
    this.statsObserver?.disconnect();
    this.howtoObserver?.disconnect();
    this.whyObserver?.disconnect();
    if (this.featureTimer) clearInterval(this.featureTimer);
    if (this.temoTimer) clearInterval(this.temoTimer);
  }

  private readonly onScroll = (): void => { this.navScrolled.set(window.scrollY > 60); };

  private startSlider(): void {
    this.slideTimer = setInterval(() => {
      this.currentSlide.update(i => (i + 1) % this.slides.length);
    }, 6000);
  }

  goToSlide(i: number): void {
    this.currentSlide.set(i);
    if (this.slideTimer) { clearInterval(this.slideTimer); this.startSlider(); }
  }

  nextSlide(): void { this.goToSlide((this.currentSlide() + 1) % this.slides.length); }
  prevSlide(): void { this.goToSlide((this.currentSlide() - 1 + this.slides.length) % this.slides.length); }

  private animateCounter(sig: WritableSignal<number>, target: number, duration: number): void {
    const steps = 50;
    const delay = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      sig.set(Math.round((target / steps) * Math.min(step, steps)));
      if (step >= steps) clearInterval(timer);
    }, delay);
  }

  private startFeatureRotation(): void {
    this.featureTimer = setInterval(() => {
      this.activeFeature.update(i => (i + 1) % this.avantages.length);
    }, 3500);
  }

  selectFeature(i: number): void {
    this.activeFeature.set(i);
    if (this.featureTimer) { clearInterval(this.featureTimer); this.startFeatureRotation(); }
  }

  private startTemoCarousel(): void {
    this.temoTimer = setInterval(() => {
      this.temoSlide.update(i => (i + 1) % this.temoignages.length);
    }, 4000);
  }

  temoPos(i: number): string {
    const cur = this.temoSlide();
    const total = this.temoignages.length;
    const diff = ((i - cur) % total + total) % total;
    if (diff === 0) return 'ts-active';
    if (diff === 1) return 'ts-next';
    if (diff === total - 1) return 'ts-prev';
    return 'ts-hidden';
  }

  prevTemo(): void {
    if (this.temoTimer) { clearInterval(this.temoTimer); this.temoTimer = null; }
    this.temoSlide.update(i => (i - 1 + this.temoignages.length) % this.temoignages.length);
    this.startTemoCarousel();
  }

  nextTemo(): void {
    if (this.temoTimer) { clearInterval(this.temoTimer); this.temoTimer = null; }
    this.temoSlide.update(i => (i + 1) % this.temoignages.length);
    this.startTemoCarousel();
  }

  scrollTo(id: string, e: Event): void {
    e.preventDefault();
    if (this.isBrowser) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

}
