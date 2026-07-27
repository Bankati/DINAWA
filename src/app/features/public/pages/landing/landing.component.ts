import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, PLATFORM_ID, inject,
  signal, WritableSignal,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PublicFooterComponent } from '../../../../shared/components/public-footer/public-footer.component';

interface HeroSlide { badge: string; title: string; subtitle: string; cta: string; link: string; photo: string; }

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
    <div class="slides">
      @for (s of slides; track s.badge; let i = $index) {
        <div class="slide" [class.slide-on]="currentSlide() === i" [style.backgroundImage]="'url(' + s.photo + ')'">
          <div class="slide-overlay" aria-hidden="true"></div>
          <div class="slide-content">
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
          </div>
        </div>
      }
    </div>

    <!-- Bande bas : témoignages + opérateurs + contrôles -->
    <div class="hero-bottom">
      <div class="hb-right">
        <div class="hb-controls">
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
      </div>
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
        @for (s of fonctionnement; track s.num; let i = $index) {
          <div [class]="'hw-card hw-c' + i" [style.--i]="i">
            <div class="hw-card-top">
              <span class="hw-step-num">0{{ s.num }}</span>
              <h3 class="hw-card-title">{{ s.titre }}</h3>
              <div class="hw-blob">
                @switch (i) {
                  @case (0) {
                    <!-- Compte vérifié : bouclier + coche -->
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <polyline points="9 12 11 14 15 10"/>
                    </svg>
                  }
                  @case (1) {
                    <!-- Bien immobilier : épingle de localisation -->
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  }
                  @case (2) {
                    <!-- Locataires : groupe de personnes -->
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  }
                  @case (3) {
                    <!-- Temps réel : activité / graphique -->
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                  }
                }
              </div>
            </div>
            <div class="hw-card-body">
              <p class="hw-card-desc">{{ s.desc }}</p>
            </div>
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
    <div class="temo-inner">

      <div class="ts-head">
        <div class="ts-line"></div>
        <span class="ts-title">ILS PARLENT DE WARAH</span>
        <div class="ts-line"></div>
      </div>

      <!-- Grille dark neon 2×2 -->
      <div class="ob-grid">
        @for (t of temoignages.slice(0,4); track t.nom; let i = $index) {
          <div [class]="'tb-card tb-c' + i">

            <!-- Zone haute : vagues SVG + cercle avatar néon -->
            <div class="tb-top">
              <svg class="tb-wsv" viewBox="0 0 280 140" preserveAspectRatio="none" aria-hidden="true">
                <path class="tw tw1" d="M 0,70 C 33,103 67,103 100,70 C 133,37 167,37 200,70 C 233,103 260,103 280,90"/>
                <path class="tw tw2" d="M 0,60 C 33,27 67,27 100,60 C 133,93 167,93 200,60 C 233,27 260,27 280,42"/>
                <path class="tw tw3" d="M 0,80 C 33,113 67,113 100,80 C 133,47 167,47 200,80 C 233,113 260,113 280,98"/>
                <path class="tw tw4" d="M 0,50 C 40,16 80,16 110,50 C 140,84 170,84 200,50 C 230,16 258,20 280,38"/>
                <path class="tw tw5" d="M 0,90 C 40,124 80,124 110,90 C 140,56 170,56 200,90 C 230,124 258,118 280,102"/>
                <path class="tw tw6" d="M 0,55 C 55,10 95,130 140,55 C 185,10 225,130 280,55"/>
              </svg>
              <div class="tb-ava">
                <img [src]="t.photo" [alt]="t.nom" class="tb-ava-img" loading="lazy">
              </div>
            </div>

            <!-- Contenu -->
            <div class="tb-body">
              <div class="tb-oq">&ldquo;</div>
              <p class="tb-text">{{ t.texte }}</p>
              <div class="tb-stars">★★★★★</div>
              <span class="tb-name">{{ t.nom }}</span>
              <span class="tb-role">{{ t.role }}, {{ t.ville }}</span>
            </div>

          </div>
        }
      </div>

    </div>
  </section>

  <!-- ── FAQ ── -->
  <section class="faq-section">

    <!-- Blobs aurora animés -->
    <div class="faq-aurora" aria-hidden="true">
      <div class="fa-b fa-b1"></div>
      <div class="fa-b fa-b2"></div>
      <div class="fa-b fa-b3"></div>
      <div class="fa-b fa-b4"></div>
    </div>

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
              <div class="faq-ans"><div class="faq-ans-in"><p>{{ f.r }}</p></div></div>
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
              <div class="faq-ans"><div class="faq-ans-in"><p>{{ f.r }}</p></div></div>
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

      <!-- Diaporama des formules -->
      <div class="pc-wrap">
        <div class="pc-stage">

          <!-- Starter -->
          <div class="pc-card" [ngClass]="pricePos(0)" (click)="priceSlide.set(0)">
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
          <div class="pc-card price-card-pro" [ngClass]="pricePos(1)" (click)="priceSlide.set(1)">
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
          <div class="pc-card" [ngClass]="pricePos(2)" (click)="priceSlide.set(2)">
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

        <!-- Navigation diaporama -->
        <div class="pc-nav">
          <button class="pc-arrow" (click)="prevPrice()" aria-label="Précédent">&#8249;</button>
          <div class="pc-dots">
            <button class="pc-dot" [class.pc-dot-on]="priceSlide() === 0" (click)="priceSlide.set(0)" aria-label="Starter"></button>
            <button class="pc-dot" [class.pc-dot-on]="priceSlide() === 1" (click)="priceSlide.set(1)" aria-label="Pro"></button>
            <button class="pc-dot" [class.pc-dot-on]="priceSlide() === 2" (click)="priceSlide.set(2)" aria-label="Premium"></button>
          </div>
          <button class="pc-arrow" (click)="nextPrice()" aria-label="Suivant">&#8250;</button>
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
    .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 200; background: transparent; box-shadow: none; transition: background .45s ease, box-shadow .45s ease, backdrop-filter .45s ease; }
    .nav.nav-solid { background: rgba(8,20,52,0.96); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); box-shadow: 0 4px 32px rgba(0,0,0,0.38); }
    .nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 80px; display: flex; align-items: center; gap: 32px; }
    .nav-logo { flex-shrink: 0; display: flex; align-items: center; background: rgba(255,255,255,0.95); border-radius: 10px; padding: 4px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
    .logo-img { height: 54px; width: auto; display: block; }
    .nav-links { display: flex; gap: 28px; flex: 1; }
    .nl { color: rgba(255,255,255,0.88); font-size: 14.5px; font-weight: 500; transition: color .2s; position: relative; }
    .nl::after { content: attr(data-text); display: block; height: 0; overflow: hidden; font-weight: 700; visibility: hidden; pointer-events: none; }
    .nl:hover { color: #C9982E; }
    .nav-cta { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
    .btn-ghost { color: rgba(255,255,255,0.88); font-size: 14px; font-weight: 500; padding: 8px 16px; border-radius: 8px; transition: background .2s, color .2s; }
    .btn-ghost:hover { background: rgba(255,255,255,0.12); }
    .btn-nav-primary { background: #C9982E; color: #fff; font-size: 14px; font-weight: 700; padding: 9px 20px; border-radius: 8px; transition: background .3s; }
    .btn-nav-primary:hover { background: #a87d22; }
    .hamburger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 6px; }
    .hamburger span { display: block; width: 22px; height: 2px; background: rgba(255,255,255,0.88); border-radius: 2px; }
    .m-menu { background: white; padding: 16px 24px 24px; display: flex; flex-direction: column; gap: 4px; border-top: 1px solid #E5E7EB; box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
    .mm-link { color: #374151; font-size: 15px; padding: 12px 0; border-bottom: 1px solid #F3F4F6; text-decoration: none; display: block; }
    .mm-link:hover { color: #0F4C81; }
    .mm-sep { height: 12px; }
    .mm-cta { margin-top: 8px; background: #0F4C81; color: #fff; text-align: center; padding: 13px; border-radius: 8px; font-weight: 700; text-decoration: none; display: block; }

    /* ── HERO — plein écran photo ── */
    .hero { position: relative; min-height: 100vh; background: #081E41; overflow: hidden; display: flex; flex-direction: column; }

    /* Slides plein écran */
    .slides { position: relative; flex: 1; z-index: 1; }
    .slide {
      position: absolute; inset: 0;
      background-size: cover; background-position: center 20%;
      opacity: 0; pointer-events: none;
      transition: opacity .9s cubic-bezier(.4,0,.2,1);
      display: flex; flex-direction: column;
    }
    .slide.slide-on { opacity: 1; pointer-events: auto; }

    /* Voile dégradé sur la photo */
    .slide-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(108deg, rgba(4,13,44,0.92) 0%, rgba(8,28,62,0.72) 45%, rgba(8,30,65,0.22) 100%);
      pointer-events: none;
    }

    /* Contenu texte — centré sur la largeur, aligné en bas */
    .slide-content {
      position: relative; z-index: 1;
      max-width: 1200px; width: 100%; margin: 0 auto;
      padding: 100px 60px 160px;
      flex: 1; display: flex; align-items: flex-end;
    }
    .slide-text { max-width: 600px; }

    .s-badge { display: inline-block; background: rgba(201,152,46,0.18); color: #E0B655; border: 1px solid rgba(201,152,46,0.38); font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; margin-bottom: 18px; }
    .s-title { font-size: clamp(34px, 4.8vw, 64px); font-weight: 900; line-height: 1.06; color: #fff; margin-bottom: 18px; white-space: pre-line; text-wrap: balance; }
    .s-sub { font-size: 16px; line-height: 1.7; color: rgba(255,255,255,0.72); margin-bottom: 32px; max-width: 460px; }
    .s-btns { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .s-cta { display: inline-flex; align-items: center; gap: 10px; background: #C9982E; color: #fff; font-weight: 700; font-size: 15px; padding: 15px 30px; border-radius: 10px; transition: background .2s, transform .15s; box-shadow: 0 6px 28px rgba(201,152,46,0.45); }
    .s-cta:hover { background: #b8881f; transform: translateY(-2px); }
    .s-cta-ghost { display: inline-flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.88); font-weight: 600; font-size: 15px; border: 1.5px solid rgba(255,255,255,0.3); padding: 14px 24px; border-radius: 10px; transition: background .2s, border-color .2s; }
    .s-cta-ghost:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.55); }
    .s-arrow { width: 18px; height: 18px; }

    /* ── Bande bas : témoignages + logos + contrôles ── */
    .hero-bottom {
      position: absolute; bottom: 3px; left: 0; right: 0; z-index: 10;
      padding: 48px 60px 28px;
      display: flex; align-items: flex-end; justify-content: space-between; gap: 24px;
      background: linear-gradient(to top, rgba(4,13,44,0.78) 0%, transparent 100%);
      pointer-events: none;
    }
    .hb-temos { display: flex; gap: 36px; pointer-events: auto; }
    .hb-t { display: flex; flex-direction: column; gap: 3px; }
    .hb-t-name { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.88); }
    .hb-t-stars { font-size: 11px; color: #C9982E; letter-spacing: 1px; }
    .hb-t-role { font-size: 11px; color: rgba(255,255,255,0.42); }
    .hb-right { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; pointer-events: auto; }
    .hb-logos { text-align: right; }
    .hb-logos-label { display: block; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .09em; color: rgba(255,255,255,0.38); margin-bottom: 5px; }
    .hb-logos-row { display: flex; align-items: center; gap: 8px; }
    .hb-logo { font-size: 13px; font-weight: 800; color: rgba(255,255,255,0.82); }
    .hb-logo-dot { color: rgba(255,255,255,0.28); }
    .hb-controls { display: flex; align-items: center; gap: 12px; }

    /* Contrôles (intégrés dans hb-right) */
    .h-arrow { width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.22); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .2s; }
    .h-arrow:hover { background: rgba(255,255,255,0.2); }
    .h-arrow svg { width: 16px; height: 16px; }
    .h-dots { display: flex; gap: 7px; }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,0.32); border: none; cursor: pointer; transition: background .25s, width .25s; padding: 0; }
    .dot.dot-on { background: #C9982E; width: 22px; border-radius: 4px; }
    .h-prog { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.1); z-index: 11; }
    .h-prog-bar { height: 100%; background: #C9982E; transition: width .4s ease; }

    /* ── SECTION HEADERS (shared) ── */
    .sec-wrap { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .sec-head { text-align: center; margin-bottom: 56px; }
    .sec-eye { display: inline-block; color: #C9982E; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 12px; }
    .sec-title { font-size: clamp(24px, 3vw, 36px); font-weight: 800; color: #0A2650; margin-bottom: 12px; }
    .sec-sub { font-size: 15px; color: #6b7280; max-width: 500px; margin: 0 auto; line-height: 1.65; }

    /* ── COMMENT ÇA FONCTIONNE ── */
    .howto-section { background: #f0f4f8; padding: 100px 0; }
    .hw-glow { display: none; } .hw-glow-a { display: none; } .hw-glow-b { display: none; } .hw-glow-c { display: none; } .hw-dots { display: none; }
    .hw-eye { color: #C9982E; font-weight: 700; }
    .hw-sec-title { color: #0A2650; }
    .hw-sec-sub { color: #6b7280; }

    /* Grille 4 cartes */
    .hw-grid { display: flex; gap: 20px; align-items: stretch; }

    /* Carte */
    .hw-card {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column;
      position: relative;
      opacity: 0; transform: translateY(40px);
      transition: opacity .55s ease calc(var(--i,0) * .13s),
                  transform .55s cubic-bezier(.22,1,.36,1) calc(var(--i,0) * .13s);
    }
    .howto-on .hw-card { opacity: 1; transform: translateY(0); }
    .hw-card:hover .hw-card-top { filter: brightness(1.06); }
    .hw-card:hover .hw-blob { transform: translateX(-50%) scale(1.12); box-shadow: 0 8px 32px rgba(0,0,0,0.28), 0 0 0 5px rgba(255,255,255,0.18); }

    /* Partie haute colorée — arche arrondie */
    .hw-card-top {
      border-radius: 999px 999px 0 0;
      padding: 40px 20px 0;
      text-align: center;
      position: relative;
      min-height: 210px;
      display: flex; flex-direction: column; align-items: center;
      transition: filter .3s;
    }
    .hw-c0 .hw-card-top { background: linear-gradient(170deg,#D4A535 0%,#B8861F 100%); }
    .hw-c1 .hw-card-top { background: linear-gradient(170deg,#1565a8 0%,#0A2650 100%); }
    .hw-c2 .hw-card-top { background: linear-gradient(170deg,#2590d7 0%,#0F4C81 100%); }
    .hw-c3 .hw-card-top { background: linear-gradient(170deg,#3da8a8 0%,#1a7a7a 100%); }

    /* Numéro d'étape */
    .hw-step-num {
      display: block;
      font-size: 11px; font-weight: 800; letter-spacing: .14em;
      color: rgba(255,255,255,.6);
      margin-bottom: 10px;
      text-transform: uppercase;
    }

    /* Titre dans la partie colorée */
    .hw-card-title {
      font-size: 16px; font-weight: 800;
      color: #fff; line-height: 1.3;
      margin-bottom: 0; flex: 1;
    }

    /* Cercle icône suspendu à la jonction */
    .hw-blob {
      width: 78px; height: 78px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #fff;
      position: absolute; bottom: -39px; left: 50%;
      transform: translateX(-50%);
      transition: transform .3s cubic-bezier(.34,1.56,.64,1);
      z-index: 3;
      box-shadow: 0 6px 22px rgba(0,0,0,0.18);
    }
    .hw-blob svg { width: 32px; height: 32px; transition: transform .35s cubic-bezier(.34,1.56,.64,1); }
    .hw-card:hover .hw-blob svg { transform: rotate(15deg) scale(1.15); }
    .hw-blob::before {
      content: ''; position: absolute; inset: 0; border-radius: 50%;
      border: 3px solid rgba(255,255,255,0.55); opacity: 0; transform: scale(1);
      animation: blob-ping 2.8s ease-out infinite;
      animation-delay: calc(var(--i,0) * 0.7s); pointer-events: none;
    }
    @keyframes blob-ping {
      0%   { transform: scale(1);   opacity: 0.65; }
      80%  { opacity: 0.08; }
      100% { transform: scale(2.5); opacity: 0; }
    }
    .hw-c0 .hw-blob { background: linear-gradient(135deg,#C9982E,#D4A535); }
    .hw-c1 .hw-blob { background: linear-gradient(135deg,#0F4C81,#1565a8); }
    .hw-c2 .hw-blob { background: linear-gradient(135deg,#0F4C81,#2590d7); }
    .hw-c3 .hw-blob { background: linear-gradient(135deg,#1a7a7a,#3da8a8); }

    /* Partie basse blanche */
    .hw-card-body {
      background: #fff;
      border-radius: 0 0 18px 18px;
      padding: 58px 20px 28px;
      text-align: center; flex: 1;
      box-shadow: 0 8px 28px rgba(0,0,0,0.08);
    }
    .hw-card-desc { font-size: 13.5px; color: #6b7280; line-height: 1.75; margin: 0; }

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

    /* ── TÉMOIGNAGES dark neon ── */
    .temo-section { background: #0C0C18; padding: 88px 0 80px; }
    .temo-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
    .ts-head { display: flex; align-items: center; gap: 20px; max-width: 520px; margin: 0 auto 52px; }
    .ts-line { flex: 1; height: 1px; background: rgba(255,255,255,0.12); }
    .ts-title { font-size: 11.5px; font-weight: 800; letter-spacing: .14em; color: rgba(255,255,255,0.4); text-transform: uppercase; white-space: nowrap; }

    /* Grille 2×2 */
    .ob-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }

    /* Carte sombre */
    .tb-card {
      background: #13131F; border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px; overflow: hidden;
      display: flex; flex-direction: column;
      transition: transform .28s ease, box-shadow .28s ease;
    }
    .tb-card:hover { transform: translateY(-5px); box-shadow: 0 20px 48px var(--tb-glow); }

    /* Accent néon par carte */
    .tb-c0 { --tb-accent: #00D4FF; --tb-glow: rgba(0,212,255,0.35); }
    .tb-c1 { --tb-accent: #BBFF00; --tb-glow: rgba(187,255,0,0.30); }
    .tb-c2 { --tb-accent: #FF33CC; --tb-glow: rgba(255,51,204,0.35); }
    .tb-c3 { --tb-accent: #00FF88; --tb-glow: rgba(0,255,136,0.30); }

    /* Zone haute : fond sombre + vagues + avatar */
    .tb-top { position: relative; height: 144px; background: #090910; overflow: hidden; }

    /* SVG vagues sinusoïdales animées */
    .tb-wsv {
      position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1;
      filter: drop-shadow(0 0 5px var(--tb-accent));
    }
    @keyframes tb-flow {
      0%   { stroke-dashoffset: 1400; }
      100% { stroke-dashoffset: 0; }
    }
    .tw {
      stroke: var(--tb-accent); stroke-width: 1.6; fill: none; stroke-linecap: round;
      stroke-dasharray: 700 700;
    }
    .tw1 { animation: tb-flow 3s   linear infinite;                opacity: 0.50; }
    .tw2 { animation: tb-flow 3.6s linear infinite; animation-delay: -0.7s;  opacity: 0.72; }
    .tw3 { animation: tb-flow 4.2s linear infinite; animation-delay: -1.5s;  opacity: 0.38; }
    .tw4 { animation: tb-flow 3.3s linear infinite; animation-delay: -0.35s; opacity: 0.55; }
    .tw5 { animation: tb-flow 3.9s linear infinite; animation-delay: -1.2s;  opacity: 0.42; }
    .tw6 { animation: tb-flow 4.6s linear infinite; animation-delay: -2.3s;  opacity: 0.28; }

    /* Cercle avatar néon centré */
    .tb-ava {
      position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
      width: 88px; height: 88px; border-radius: 50%;
      background: var(--tb-accent);
      overflow: hidden; z-index: 2;
      box-shadow: 0 0 20px var(--tb-glow), 0 0 48px var(--tb-glow);
    }
    .tb-ava-img { width: 100%; height: 100%; object-fit: cover; display: block; }

    /* Corps texte */
    .tb-body {
      padding: 18px 22px 28px; text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    .tb-oq {
      font-size: 42px; font-family: Georgia, serif; font-weight: 900;
      color: var(--tb-accent); line-height: 1; margin-bottom: -2px; opacity: 0.85;
    }
    .tb-text {
      font-size: 13px; line-height: 1.78; color: rgba(255,255,255,0.72);
      display: -webkit-box; -webkit-line-clamp: 4;
      -webkit-box-orient: vertical; overflow: hidden;
    }
    .tb-stars { color: #FFD700; font-size: 14px; letter-spacing: 3px; }
    .tb-name { font-size: 14px; font-weight: 800; color: #fff; }
    .tb-role { font-size: 11.5px; color: rgba(255,255,255,0.44); }

    @media (max-width: 680px) {
      .ob-grid { grid-template-columns: 1fr; gap: 18px; }
    }

    /* ── FAQ ── */
    .faq-section {
      background: linear-gradient(135deg, #060D1F 0%, #09142E 50%, #0D1C3F 100%);
      padding: 96px 0; position: relative; overflow: hidden;
    }

    /* Blobs aurora flottants */
    .faq-aurora { position: absolute; inset: 0; pointer-events: none; }
    .fa-b { position: absolute; border-radius: 50%; filter: blur(90px); }
    .fa-b1 {
      width: 700px; height: 500px;
      background: radial-gradient(ellipse, rgba(201,152,46,0.2) 0%, transparent 68%);
      top: -180px; left: -220px;
      animation: fa1 16s ease-in-out infinite;
    }
    .fa-b2 {
      width: 650px; height: 650px;
      background: radial-gradient(ellipse, rgba(15,76,129,0.45) 0%, transparent 68%);
      bottom: -120px; right: -180px;
      animation: fa2 20s ease-in-out infinite;
    }
    .fa-b3 {
      width: 450px; height: 350px;
      background: radial-gradient(ellipse, rgba(37,144,215,0.16) 0%, transparent 68%);
      top: 35%; left: 25%;
      animation: fa3 12s ease-in-out infinite;
    }
    .fa-b4 {
      width: 300px; height: 300px;
      background: radial-gradient(ellipse, rgba(201,152,46,0.12) 0%, transparent 68%);
      top: 60%; right: 20%;
      animation: fa1 9s ease-in-out infinite reverse;
    }
    @keyframes fa1 {
      0%,100% { transform: translate(0,0) scale(1); }
      33%      { transform: translate(70px, 90px) scale(1.14); }
      66%      { transform: translate(-50px, 30px) scale(0.9); }
    }
    @keyframes fa2 {
      0%,100% { transform: translate(0,0) scale(1); }
      50%      { transform: translate(-90px, -70px) scale(1.12); }
    }
    @keyframes fa3 {
      0%,100% { transform: translate(0,0); }
      50%      { transform: translate(-70px, 70px); }
    }

    .faq-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 1; }
    .faq-head { text-align: center; margin-bottom: 56px; }

    @keyframes faq-badge-pulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(201,152,46,0), 0 0 0 0 rgba(201,152,46,0); }
      50%      { box-shadow: 0 0 16px 3px rgba(201,152,46,0.28), 0 0 40px 8px rgba(201,152,46,0.08); }
    }
    .faq-head-badge {
      display: inline-flex; align-items: center; gap: 7px;
      background: rgba(201,152,46,0.12); border: 1px solid rgba(201,152,46,0.4);
      color: #C9982E; font-size: 12px; font-weight: 700; letter-spacing: .08em;
      text-transform: uppercase; padding: 7px 16px; border-radius: 20px; margin-bottom: 18px;
      animation: faq-badge-pulse 3.5s ease-in-out infinite;
    }
    .faq-head-badge svg { width: 13px; height: 13px; }
    .faq-title { font-size: clamp(26px, 3.5vw, 40px); font-weight: 800; color: white; line-height: 1.2; margin-bottom: 12px; text-wrap: balance; }
    .faq-sub { font-size: 15px; color: rgba(255,255,255,0.52); }
    .faq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 48px; }
    .faq-col { display: flex; flex-direction: column; gap: 12px; }

    /* Carte accordéon glassmorphism */
    .faq-item {
      position: relative;
      background: rgba(255,255,255,0.035);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px; cursor: pointer; overflow: hidden;
      transition: background .3s, border-color .3s, box-shadow .35s, transform .28s;
    }
    .faq-item:hover {
      background: rgba(255,255,255,0.065); border-color: rgba(201,152,46,0.3);
      box-shadow:
        inset 3px 0 0 rgba(201,152,46,0.55),
        0 0 0 1px rgba(201,152,46,0.15),
        0 0 28px rgba(201,152,46,0.1),
        0 10px 40px rgba(0,0,0,0.4);
      transform: translateX(4px);
    }
    .faq-item.faq-open {
      background: rgba(255,255,255,0.08); border-color: rgba(201,152,46,0.5);
      box-shadow:
        inset 4px 0 0 #C9982E,
        0 0 0 1px rgba(201,152,46,0.28),
        0 0 40px rgba(201,152,46,0.14),
        0 16px 56px rgba(0,0,0,0.45);
      transform: translateX(4px);
    }

    /* Shimmer doré qui balaye le haut de l'item ouvert */
    .faq-item.faq-open::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0; height: 1.5px;
      background: linear-gradient(90deg, transparent 0%, #C9982E 40%, rgba(255,220,140,0.9) 50%, #C9982E 60%, transparent 100%);
      background-size: 200% 100%;
      animation: faq-shimmer 2.2s linear infinite;
    }
    @keyframes faq-shimmer {
      0%   { background-position: -100% center; }
      100% { background-position: 200% center; }
    }

    .faq-row { display: flex; align-items: center; gap: 14px; padding: 18px 20px; }

    /* Orbe numéroté lumineux */
    .faq-num {
      width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 800; color: #C9982E;
      background: rgba(201,152,46,0.12); border: 1.5px solid rgba(201,152,46,0.3);
      font-variant-numeric: tabular-nums;
      transition: background .3s, border-color .3s, box-shadow .3s;
    }
    .faq-open .faq-num {
      background: rgba(201,152,46,0.22); border-color: #C9982E;
      box-shadow: 0 0 14px rgba(201,152,46,0.55), 0 0 30px rgba(201,152,46,0.2);
    }
    .faq-q { font-size: 14px; font-weight: 600; color: white; flex: 1; line-height: 1.4; }
    .faq-chevron {
      width: 18px; height: 18px; flex-shrink: 0; color: rgba(255,255,255,0.38);
      transition: transform .38s cubic-bezier(.4,0,.2,1), color .25s;
    }
    .faq-open .faq-chevron { transform: rotate(180deg); color: #C9982E; }

    /* Expansion fluide */
    .faq-ans {
      display: grid; grid-template-rows: 0fr;
      transition: grid-template-rows .4s cubic-bezier(.4,0,.2,1);
    }
    .faq-open .faq-ans { grid-template-rows: 1fr; }
    .faq-ans-in { min-height: 0; overflow: hidden; }
    .faq-ans-in p {
      font-size: 13.5px; color: rgba(255,255,255,0.68); line-height: 1.78;
      padding: 0 22px 20px 70px;
      opacity: 0; filter: blur(5px);
      transition: opacity .35s ease .12s, filter .35s ease .12s;
    }
    .faq-open .faq-ans-in p { opacity: 1; filter: blur(0); }

    .faq-footer { display: flex; align-items: center; justify-content: center; gap: 16px; padding-top: 8px; }
    .faq-footer p { font-size: 14px; color: rgba(255,255,255,0.52); }
    .faq-cta {
      background: linear-gradient(135deg, #C9982E 0%, #D4A535 100%);
      color: white; font-size: 14px; font-weight: 700;
      padding: 11px 26px; border-radius: 10px; text-decoration: none;
      transition: transform .22s, box-shadow .22s;
      box-shadow: 0 4px 18px rgba(201,152,46,0.35);
    }
    .faq-cta:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(201,152,46,0.5); }

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

    /* ── ABONNEMENTS diaporama ── */
    .price-section { background: #F0F4F8; padding: 96px 0; }

    /* Conteneur du carousel */
    .pc-wrap { margin-top: 48px; }
    .pc-stage { position: relative; height: 560px; overflow: hidden; }

    /* Carte générique */
    .pc-card {
      position: absolute; width: 400px; left: 50%; top: 0;
      background: #F8FAFF; border: 1.5px solid #E5E7EB;
      border-radius: 20px; padding: 36px 32px;
      display: flex; flex-direction: column;
      transition: transform .55s cubic-bezier(.4,0,.2,1), opacity .45s ease, filter .45s ease, box-shadow .45s ease;
    }
    /* Active : centrée, pleine taille */
    .pc-active {
      transform: translateX(-50%) scale(1);
      opacity: 1; z-index: 3; filter: none;
      box-shadow: 0 20px 60px rgba(10,38,80,0.18);
      cursor: default;
    }
    /* Précédente : gauche, réduite, floue */
    .pc-prev {
      transform: translateX(calc(-50% - 430px)) scale(0.70);
      opacity: 0.5; z-index: 1; filter: blur(1.5px); cursor: pointer;
    }
    /* Suivante : droite */
    .pc-next {
      transform: translateX(calc(-50% + 430px)) scale(0.70);
      opacity: 0.5; z-index: 1; filter: blur(1.5px); cursor: pointer;
    }

    .price-card-pro { background: #0A2650; border-color: #C9982E; }

    /* Navigation diaporama */
    .pc-nav { display: flex; align-items: center; justify-content: center; gap: 20px; margin-top: 28px; }
    .pc-arrow {
      width: 44px; height: 44px; border-radius: 50%;
      border: 1.5px solid #D1D5DB; background: white;
      font-size: 26px; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all .2s; box-shadow: 0 2px 10px rgba(0,0,0,0.07); color: #374151;
    }
    .pc-arrow:hover { border-color: #0F4C81; color: #0F4C81; background: #EEF4FC; box-shadow: 0 4px 18px rgba(15,76,129,0.15); }
    .pc-dots { display: flex; gap: 8px; }
    .pc-dot { width: 9px; height: 9px; border-radius: 50%; border: none; background: #D1D5DB; cursor: pointer; transition: all .28s; padding: 0; }
    .pc-dot.pc-dot-on { background: #0F4C81; width: 26px; border-radius: 4px; }

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
      .slide-content { padding: 80px 24px 180px; }
      .slide-text { max-width: 100%; }
      .s-title { font-size: clamp(28px, 8vw, 38px); white-space: normal; }
      .s-sub { font-size: 15px; }
      .hb-temos { display: none; }
      .hero-bottom { padding: 40px 24px 20px; justify-content: flex-end; }
      .hb-right { flex-direction: row; align-items: center; gap: 16px; }
      .hw-grid { flex-wrap: wrap; gap: 16px; }
      .hw-card { min-width: calc(50% - 8px); }
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
  private temoTimer:  ReturnType<typeof setInterval> | null = null;
  private priceTimer: ReturnType<typeof setInterval> | null = null;
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
    { badge: 'Gestion immobilière',      title: 'Gérez vos biens\nen toute simplicité',        subtitle: 'Suivez l\'occupation, les baux et l\'historique de chaque bien depuis une seule interface intuitive.', cta: 'Commencer gratuitement', link: '/auth/register', photo: '/assets/man-showing-house-icon-couch.jpg.jpeg' },
    { badge: 'Paiements des loyers',     title: 'Encaissez vos loyers\nsans effort',            subtitle: 'Suivez chaque paiement en temps réel. Alertes automatiques pour les impayés, rappels avant échéance.',  cta: 'Découvrir WARAH',        link: '/auth/register', photo: '/assets/handsome-young-african-man-holding-mobile-phone-gesturing-while-standing-against-grey-wall.jpg.jpeg' },
    { badge: 'Quittances automatiques',  title: 'Quittances professionnelles\nen un clic',      subtitle: 'Créez et envoyez des quittances de loyer signées directement à vos locataires, à tout moment.',          cta: 'Essayer gratuitement',   link: '/auth/register', photo: '/assets/black-businessman-happy-expression.jpg.jpeg' },
    { badge: 'Annonces immobilières',    title: 'Trouvez vos locataires\nrapidement',            subtitle: 'Publiez vos annonces et recevez des candidatures qualifiées depuis partout au Togo.',                    cta: 'Voir les annonces',      link: '/annonces',      photo: '/assets/happy-man-with-house.jpg.jpeg' },
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

  readonly heroTemos = this.temoignages.slice(0, 3);

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
      this.startPriceCarousel();
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
    if (this.temoTimer)  clearInterval(this.temoTimer);
    if (this.priceTimer) clearInterval(this.priceTimer);
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

  /* ── Diaporama tarifs ── */
  priceSlide = signal(1); // Pro centré par défaut

  pricePos(i: number): string {
    const diff = ((i - this.priceSlide()) + 3) % 3;
    if (diff === 0) return 'pc-active';
    if (diff === 2) return 'pc-prev';
    return 'pc-next';
  }

  private startPriceCarousel(): void {
    this.priceTimer = setInterval(() => {
      this.priceSlide.update(i => (i + 1) % 3);
    }, 3500);
  }

  prevPrice(): void {
    if (this.priceTimer) { clearInterval(this.priceTimer); this.priceTimer = null; }
    this.priceSlide.update(i => (i - 1 + 3) % 3);
    this.startPriceCarousel();
  }

  nextPrice(): void {
    if (this.priceTimer) { clearInterval(this.priceTimer); this.priceTimer = null; }
    this.priceSlide.update(i => (i + 1) % 3);
    this.startPriceCarousel();
  }

  scrollTo(id: string, e: Event): void {
    e.preventDefault();
    if (this.isBrowser) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

}
