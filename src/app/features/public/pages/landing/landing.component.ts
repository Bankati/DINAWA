import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, PLATFORM_ID, inject,
  signal, WritableSignal,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import AOS from 'aos';
import { PublicFooterComponent } from '../../../../shared/components/public-footer/public-footer.component';
import { PublicNavbarComponent } from '../../../../shared/components/public-navbar/public-navbar.component';

interface HeroSlide { badge: string; title: string; subtitle: string; cta: string; link: string; photo: string; }

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, PublicFooterComponent, PublicNavbarComponent],
  template: `
<div class="lp">

  <app-public-navbar></app-public-navbar>

  <!-- ── HERO ── -->
  <section class="hero">
    <img src="/assets/bridge-with-city.jpg" alt="" class="hero-bg-photo" loading="lazy">
    <div class="hero-ov"></div>

    <div class="hero-inner">

      <!-- Colonne gauche : texte -->
      <div class="hero-left" [class.hero-fade-out]="!slideFade()">
        <h1 class="s-title">{{ slides[currentSlide()].title }}</h1>
        <p class="s-sub">{{ slides[currentSlide()].subtitle }}</p>
        <div class="s-btns">
          <a [routerLink]="slides[currentSlide()].link" class="s-cta">
            {{ slides[currentSlide()].cta }}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="s-arrow">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
          <a routerLink="/annonces" class="s-cta-ghost">
            Voir les annonces
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="s-arrow"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>

        <div class="hero-slide-controls">
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

      <!-- Colonne droite : forme décorative + mockup téléphone -->
      <div class="hero-right">
        <div class="hero-ring" aria-hidden="true"></div>
        <div class="hero-glow-dots" aria-hidden="true">
          <span class="pd pd-1"></span><span class="pd pd-2"></span><span class="pd pd-3"></span><span class="pd pd-4"></span>
        </div>

        <!-- Notification flottante : paiement reçu -->
        <div class="hero-toast hero-toast-top">
          <div class="ht-icon ht-icon-ok">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8"/><path d="M6.5 10l2.5 2.5 4.5-5"/></svg>
          </div>
          <div class="ht-text"><strong>Paiement reçu</strong><span>150 000 FCFA confirmé</span></div>
        </div>

        <!-- Notification flottante : quittance générée -->
        <div class="hero-toast hero-toast-bottom">
          <div class="ht-icon ht-icon-doc">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h6l4 4v12a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M12 2v4h4"/></svg>
          </div>
          <div class="ht-text"><strong>Quittance générée</strong><span>PDF prêt à télécharger</span></div>
        </div>

        <div class="hero-phone">
          <div class="hp-notch"></div>
          <div class="hp-screen">
            <div class="hp-greet">
              <span class="hp-greet-hi">Bonjour, Kofi 👋</span>
              <span class="hp-greet-title">Tableau de bord</span>
            </div>
            <div class="hp-kpis">
              <div class="hp-kpi"><span class="hp-kpi-n">12</span><span class="hp-kpi-l">Biens</span></div>
              <div class="hp-kpi"><span class="hp-kpi-n">9</span><span class="hp-kpi-l">Occupés</span></div>
              <div class="hp-kpi"><span class="hp-kpi-n">320k</span><span class="hp-kpi-l">FCFA</span></div>
            </div>
            <div class="hp-pay-card">
              <div class="hp-pay-top">
                <span class="hp-pay-label">Dernier paiement</span>
                <span class="hp-pay-pill">Confirmé ✓</span>
              </div>
              <div class="hp-pay-amount">150 000 <small>FCFA</small></div>
              <div class="hp-pay-sub">via T-Money · 3 Juil 2026</div>
              <div class="hp-pay-track"><span class="hp-pay-fill"></span></div>
            </div>
            <div class="hp-hist-label">Historique</div>
            <div class="hp-hist-row">
              <div class="hp-hist-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.5"/><path d="M5.2 8l2 2 3.6-4"/></svg></div>
              <div class="hp-hist-info"><span class="hp-l1"></span><span class="hp-l2"></span></div>
              <span class="hp-hist-amount">150k</span>
            </div>
          </div>
          <div class="hp-logo-badge"><img src="/assets/warah-icon.png" alt="" class="hp-logo-img"></div>
        </div>
      </div>

    </div>

    <!-- Bande de stats (façon app store) -->
    <div class="hero-stats-band">
      <div class="hsb-stat"><span class="hsb-n">1 200+</span><span class="hsb-l">Annonces</span></div>
      <div class="hsb-sep"></div>
      <div class="hsb-stat"><span class="hsb-n">500+</span><span class="hsb-l">Propriétaires</span></div>
      <div class="hsb-sep"></div>
      <div class="hsb-stat"><span class="hsb-n">98%</span><span class="hsb-l">Satisfaction</span></div>
      <div class="hsb-sep"></div>
      <div class="hsb-stat"><span class="hsb-n">50+</span><span class="hsb-l">Villes</span></div>
    </div>
  </section>


  <!-- ── COMMENT ÇA FONCTIONNE ── -->
  <section class="howto-section" id="comment">
    <div class="hw-glow hw-glow-a"></div>
    <div class="hw-glow hw-glow-b"></div>
    <div class="hw-glow hw-glow-c"></div>
    <div class="hw-dots"></div>
    <div class="sec-wrap">
      <div class="sec-head" data-aos="fade-down">
        <span class="sec-eye hw-eye">Simple &amp; rapide</span>
        <h2 class="sec-title hw-sec-title">Comment ça fonctionne ?</h2>
        <p class="sec-sub hw-sec-sub">Commencez à gérer vos biens en moins de 10 minutes</p>
      </div>
      <div class="hw-grid">
        @for (s of fonctionnement; track s.num; let i = $index) {
          <div class="hw-step" data-aos="fade-down" [attr.data-aos-delay]="i * 100">
            @if (i < 3) { <div class="hw-connector"></div> }
            <div [class]="'hw-icon hw-icon-' + i">
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
              <span class="hw-icon-num">{{ s.num }}</span>
            </div>
            <h3 class="hw-step-title">{{ s.titre }}</h3>
            <p class="hw-step-desc">{{ s.desc }}</p>
          </div>
        }
      </div>
    </div>
  </section>

  <!-- ── POURQUOI WARAH : APPLI MOBILE ── -->
  <section class="why-section">
    <div class="sec-wrap">
      <div class="why-layout">

        <!-- Colonne gauche : titre + fonctionnalités -->
        <div class="why-text">
          <span class="sec-eye" data-aos="fade-down">Sur tous vos appareils</span>
          <h2 class="why-title" data-aos="fade-down">Gérez tout<br>depuis votre téléphone</h2>
          <p class="why-sub" data-aos="fade-down">Web, Android, iOS — WARAH vous suit partout, sans rien installer de compliqué.</p>

          <div class="why-feats">
            @for (f of avantages; track f.titre; let i = $index) {
              <div class="wf-item" data-aos="zoom-in-right" [attr.data-aos-delay]="i * 120">
                <div [class]="'wf-icon wf-icon-' + (i % 4)">
                  @switch (i % 4) {
                    @case (0) { <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
                    @case (1) { <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> }
                    @case (2) { <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></svg> }
                    @case (3) { <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg> }
                  }
                </div>
                <div class="wf-body">
                  <h3 class="wf-title">{{ f.titre }}</h3>
                  <p class="wf-desc">{{ f.desc }}</p>
                </div>
                <div [class]="'wf-visual wf-visual-' + (i % 4)" aria-hidden="true">
                  @switch (i % 4) {
                    @case (0) {
                      <div class="wfv-row wfv-row-a"><span class="wfv-dot"></span><span class="wfv-bar" style="width:70%"></span></div>
                      <div class="wfv-row wfv-row-b"><span class="wfv-dot"></span><span class="wfv-bar" style="width:55%"></span></div>
                      <div class="wfv-row wfv-row-c"><span class="wfv-dot"></span><span class="wfv-bar" style="width:60%"></span></div>
                    }
                    @case (1) {
                      <span class="wfv-amount">150 000<small>&nbsp;FCFA</small></span>
                      <div class="wfv-track"><span class="wfv-fill"></span></div>
                      <span class="wfv-alert">● Retard détecté</span>
                    }
                    @case (2) {
                      <svg class="wfv-doc" viewBox="0 0 36 36" fill="none">
                        <path d="M9 3h13l7 7v23a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="#fff" stroke="#C9D3E0" stroke-width="1.4"/>
                        <path d="M22 3v7h7" fill="none" stroke="#C9D3E0" stroke-width="1.4"/>
                        <path class="wfv-check" d="M11.5 19l4 4.2 9-9.4" fill="none" stroke="#1F7A5C" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      <span class="wfv-doc-label">Quittance.pdf</span>
                    }
                    @case (3) {
                      <svg class="wfv-bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                      </svg>
                      <span class="wfv-badge">3</span>
                    }
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Colonne droite : mockups téléphones -->
        <div class="why-devices" data-aos="fade-left">
          <div class="wd-phone wd-phone-back">
            <div class="wd-notch"></div>
            <div class="wd-screen">
              <div class="wd-bar"><span></span><span></span><span></span></div>
              <div class="wd-chart-label">Revenus — Juillet</div>
              <div class="wd-chart">
                <div class="wd-chart-bar" style="height:38%"></div>
                <div class="wd-chart-bar" style="height:58%"></div>
                <div class="wd-chart-bar" style="height:48%"></div>
                <div class="wd-chart-bar" style="height:72%"></div>
                <div class="wd-chart-bar wd-chart-bar-hi" style="height:92%"></div>
              </div>
              <div class="wd-stats">
                <div class="wd-stat"><span class="wd-stat-n">12</span><span class="wd-stat-l">Biens</span></div>
                <div class="wd-stat"><span class="wd-stat-n">75%</span><span class="wd-stat-l">Occupation</span></div>
              </div>
            </div>
          </div>
          <div class="wd-phone wd-phone-front">
            <div class="wd-notch"></div>
            <div class="wd-screen">
              <div class="wd-greet">
                <span class="wd-greet-hi">Bonjour, Ama 👋</span>
                <span class="wd-greet-title">Mes paiements</span>
              </div>
              <div class="wd-card">
                <div class="wd-card-top">
                  <span class="wd-card-label">Loyer reçu</span>
                  <span class="wd-card-pill">Confirmé ✓</span>
                </div>
                <span class="wd-card-amount">150 000 FCFA</span>
                <span class="wd-card-sub">via Flooz · 3 Juil 2026</span>
              </div>
              <div class="wd-hist-row"><div class="wd-hist-icon wd-hist-ok"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.5"/><path d="M5.2 8l2 2 3.6-4"/></svg></div><div class="wd-hist-info"><span class="wd-hist-t">Villa Agoè</span><span class="wd-hist-s">Avr 2026</span></div><span class="wd-hist-badge wd-hist-badge-ok">Payé</span></div>
              <div class="wd-hist-row"><div class="wd-hist-icon wd-hist-warn"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.5"/><path d="M8 4.5V8l2.4 2"/></svg></div><div class="wd-hist-info"><span class="wd-hist-t">Studio Bè</span><span class="wd-hist-s">Avr 2026</span></div><span class="wd-hist-badge wd-hist-badge-warn">Attente</span></div>
            </div>
            <div class="wd-logo-badge">
              <img src="/assets/warah-icon.png" alt="" class="wd-logo-img">
            </div>
          </div>
        </div>

      </div>
    </div>
  </section>

  <!-- ── IMPACT EN CHIFFRES ── -->
  <section class="impact-section" #impactSection>
    <div class="sec-wrap">
      <div class="sec-head" data-aos="fade-down">
        <span class="sec-eye impact-eye">En chiffres</span>
        <h2 class="sec-title impact-title">L'impact WARAH au Togo</h2>
        <p class="sec-sub impact-sub">Des résultats concrets mesurés chaque mois sur notre plateforme</p>
      </div>
      <div class="impact-grid">
        <div class="impact-item" data-aos="fade-down">
          <span class="impact-n">{{ statAnnonces() }}<small>+</small></span>
          <span class="impact-l">Annonces publiées</span>
          <span class="impact-detail">Biens mis en location sur la plateforme</span>
        </div>
        <div class="impact-sep"></div>
        <div class="impact-item" data-aos="fade-down" data-aos-delay="100">
          <span class="impact-n">{{ statProprio() }}<small>+</small></span>
          <span class="impact-l">Propriétaires actifs</span>
          <span class="impact-detail">Font confiance à WARAH chaque mois</span>
        </div>
        <div class="impact-sep"></div>
        <div class="impact-item" data-aos="fade-down" data-aos-delay="200">
          <span class="impact-n">{{ statSatisfaction() }}<small>%</small></span>
          <span class="impact-l">Taux de satisfaction</span>
          <span class="impact-detail">Selon notre enquête utilisateurs 2026</span>
        </div>
        <div class="impact-sep"></div>
        <div class="impact-item" data-aos="fade-down" data-aos-delay="300">
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

      <div class="ts-head" data-aos="fade-down">
        <span class="ts-eyebrow">Témoignages</span>
        <h2 class="ts-title2">Ils nous font confiance<span class="ts-title2-accent">, chaque jour.</span></h2>
        <p class="ts-sub">Propriétaires, gestionnaires et locataires racontent leur expérience avec WARAH.</p>
      </div>

      <!-- Ligne unique -->
      <div class="ob-grid">
        @for (t of temoignages.slice(temoPage()*3, temoPage()*3+3); track t.nom; let i = $index) {
          <div class="tb-card" data-aos="fade-down" [attr.data-aos-delay]="i * 100">
            <div class="tb-top">
              <img [src]="t.photo" [alt]="t.nom" class="tb-ava-img" loading="lazy">
              <span class="tb-oq">&ldquo;</span>
            </div>
            <div class="tb-body">
              <p class="tb-text">{{ t.texte }}</p>
              <div class="tb-stars">★★★★★</div>
              <span class="tb-name">{{ t.nom }}</span>
              <span class="tb-role">{{ t.role }}, {{ t.ville }}</span>
            </div>
          </div>
        }
      </div>

      <!-- Pagination par points -->
      @if (temoPagesArr.length > 1) {
        <div class="ts-dots">
          @for (p of temoPagesArr; track p) {
            <button class="ts-dot" [class.ts-dot-on]="temoPage() === p" (click)="goToTemoPage(p)" [attr.aria-label]="'Page ' + (p+1)"></button>
          }
        </div>
      }

    </div>
  </section>

  <!-- ── FAQ ── -->
  <section class="faq-section">
    <div class="faq-split">

      <!-- Photo à gauche -->
      <div class="faq-photo" data-aos="fade-down">
        <img src="/assets/customer-service-representative.jpg" alt="Support WARAH" class="faq-photo-img" loading="lazy">
        <div class="faq-photo-scrim"></div>
        <div class="faq-photo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="5"/><path d="M12 13a1 1 0 0 0-1 1v4"/><circle cx="12" cy="19.5" r=".6" fill="currentColor" stroke="none"/></svg>
        </div>
        <div class="faq-photo-content">
          <h2 class="faq-photo-title">Foire aux<br><span>questions</span></h2>
          <p class="faq-photo-sub">Vous avez des questions ? Nous sommes là pour vous aider.</p>
        </div>
      </div>

      <!-- Accordéon à droite -->
      <div class="faq-panel">
        <div class="faq-panel-scroll">
          @for (f of faqs; track f.q; let i = $index) {
            <div class="faq-item" data-aos="fade-down" [attr.data-aos-delay]="i * 60" [class.faq-open]="selectedFaq() === i" (click)="selectedFaq.set(selectedFaq() === i ? -1 : i)">
              <div class="faq-row">
                <span class="faq-q">{{ f.q }}</span>
                <span class="faq-toggle">{{ selectedFaq() === i ? '−' : '+' }}</span>
              </div>
              <div class="faq-ans"><div class="faq-ans-in"><p>{{ f.r }}</p></div></div>
            </div>
          }
        </div>
        <div class="faq-footer">
          <p>Vous ne trouvez pas la réponse ?</p>
          <a routerLink="/auth/register" class="faq-cta">Contactez-nous →</a>
        </div>
      </div>

    </div>
  </section>

  <!-- ── ABONNEMENTS ── -->
  <section class="price-section" id="tarifs">
    <div class="sec-wrap">
      <div class="sec-head" data-aos="fade-down">
        <span class="sec-eye">Tarifs transparents</span>
        <h2 class="sec-title">Choisissez votre formule</h2>
        <p class="sec-sub">Des offres adaptées à chaque propriétaire — du débutant au gestionnaire immobilier professionnel.</p>
      </div>

      <!-- Diaporama des formules -->
      <div class="pc-wrap">
        <div class="pc-stage">

          <!-- Starter -->
          <div class="pc-card" data-aos="fade-down">
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
          <div class="pc-card price-card-pro" data-aos="fade-down" data-aos-delay="120">
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
          <div class="pc-card" data-aos="fade-down" data-aos-delay="240">
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
      </div>

      <!-- Add-on Référencement -->
      <div class="price-addon" data-aos="fade-down">
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

    /* ── HERO — photo plein fond + mockup ── */
    .hero { position: relative; overflow: hidden; padding-top: 8px; }
    .hero-bg-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 40%; }
    .hero-ov { position: absolute; inset: 0; background: linear-gradient(160deg, rgba(8,20,42,0.80) 0%, rgba(10,38,80,0.72) 55%, rgba(8,30,65,0.82) 100%); }

    .hero-inner {
      position: relative; z-index: 1;
      max-width: 1280px; margin: 0 auto; padding: 76px 32px 64px;
      display: grid; grid-template-columns: 1fr 0.9fr; gap: 48px; align-items: center;
    }

    /* Colonne gauche */
    .hero-left { max-width: 560px; transition: opacity .3s ease, transform .3s ease; }
    .hero-left.hero-fade-out { opacity: 0; transform: translateY(10px); }
    .s-title { font-size: clamp(32px, 4.2vw, 52px); font-weight: 900; line-height: 1.12; color: #fff; margin-bottom: 18px; white-space: pre-line; text-wrap: balance; text-shadow: 0 2px 24px rgba(0,0,0,0.35); }
    .s-sub { font-size: 16px; line-height: 1.7; color: rgba(255,255,255,.82); margin-bottom: 32px; max-width: 460px; }
    .s-btns { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 36px; }
    .s-cta { display: inline-flex; align-items: center; gap: 10px; background: #C9982E; color: #fff; font-weight: 700; font-size: 15px; padding: 15px 30px; border-radius: 10px; transition: background .2s, transform .15s; box-shadow: 0 10px 28px rgba(201,152,46,0.35); }
    .s-cta:hover { background: #B8861F; transform: translateY(-2px); }
    .s-cta-ghost { display: inline-flex; align-items: center; gap: 8px; color: #fff; font-weight: 600; font-size: 15px; border: 1.5px solid rgba(255,255,255,.4); padding: 14px 24px; border-radius: 10px; transition: background .2s, border-color .2s; }
    .s-cta-ghost:hover { background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.6); }
    .s-arrow { width: 18px; height: 18px; }

    .hero-slide-controls { display: flex; align-items: center; gap: 14px; }
    .h-arrow { width: 38px; height: 38px; border-radius: 50%; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.3); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .2s, border-color .2s; }
    .h-arrow:hover { background: rgba(255,255,255,.24); border-color: rgba(255,255,255,.5); }
    .h-arrow svg { width: 15px; height: 15px; }
    .h-dots { display: flex; gap: 7px; }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,.35); border: none; cursor: pointer; transition: background .25s, width .25s; padding: 0; }
    .dot.dot-on { background: #C9982E; width: 22px; border-radius: 4px; }

    /* Colonne droite : mockup téléphone */
    .hero-right { position: relative; height: 480px; display: flex; align-items: center; justify-content: center; }
    .hero-ring {
      position: absolute; z-index: 1; width: 400px; height: 400px; right: 0; top: 50%; transform: translateY(-50%);
      border-radius: 50%;
      background: radial-gradient(circle at 32% 28%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.03) 55%, rgba(255,255,255,0) 75%);
      border: 1.5px solid rgba(201,152,46,0.4);
      box-shadow: 0 0 90px rgba(201,152,46,0.22), inset 0 0 60px rgba(255,255,255,0.05);
      backdrop-filter: blur(1px);
    }
    .hero-ring::before {
      content: ''; position: absolute; inset: 22px; border-radius: 50%;
      border: 1px dashed rgba(255,255,255,0.18);
    }
    .hero-glow-dots { position: absolute; z-index: 1; width: 400px; height: 400px; right: 0; top: 50%; transform: translateY(-50%); pointer-events: none; }
    .hero-glow-dots .pd { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: #E0B655; box-shadow: 0 0 8px rgba(224,182,85,0.7); }
    .hero-glow-dots .pd-1 { top: 8%; left: 18%; } .hero-glow-dots .pd-2 { top: 78%; left: 8%; } .hero-glow-dots .pd-3 { top: 14%; left: 82%; } .hero-glow-dots .pd-4 { top: 88%; left: 68%; }

    .hero-phone {
      position: relative; z-index: 2; width: 230px; height: 460px; border-radius: 34px;
      background: #0A2650; border: 7px solid #081E41; box-shadow: 0 30px 70px rgba(10,38,80,0.32);
      overflow: hidden; margin-left: auto; margin-right: 24px;
      animation: heroFloat 5s ease-in-out infinite;
    }
    @keyframes heroFloat {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-14px); }
    }
    .hp-notch { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 74px; height: 19px; background: #081E41; border-radius: 0 0 14px 14px; z-index: 3; }
    .hp-screen { position: absolute; inset: 0; background: #F7F8FA; padding: 28px 14px 14px; display: flex; flex-direction: column; gap: 11px; }
    .hp-greet { display: flex; flex-direction: column; gap: 3px; padding-right: 34px; }
    .hp-greet-hi { font-size: 10.5px; color: #9CA3AF; font-weight: 600; }
    .hp-greet-title { font-size: 15px; color: #0A2650; font-weight: 800; }
    .hp-kpis { display: flex; gap: 7px; }
    .hp-kpi { flex: 1; background: #fff; border-radius: 11px; padding: 9px 6px; text-align: center; box-shadow: 0 2px 8px rgba(15,23,42,0.06); }
    .hp-kpi-n { display: block; font-size: 15px; font-weight: 800; color: #0A2650; }
    .hp-kpi-l { display: block; font-size: 8.5px; color: #9CA3AF; margin-top: 2px; text-transform: uppercase; letter-spacing: .03em; }
    .hp-pay-card {
      background: linear-gradient(150deg, #1F7A5C 0%, #17604A 100%); border-radius: 13px; padding: 12px 13px 11px;
      box-shadow: 0 8px 20px rgba(31,122,92,0.28);
    }
    .hp-pay-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .hp-pay-label { font-size: 9.5px; color: rgba(255,255,255,.8); font-weight: 600; }
    .hp-pay-pill { font-size: 8.5px; font-weight: 700; color: #fff; background: rgba(255,255,255,.2); padding: 3px 8px; border-radius: 20px; }
    .hp-pay-amount { font-size: 20px; font-weight: 800; color: #fff; line-height: 1; }
    .hp-pay-amount small { font-size: 11px; font-weight: 600; opacity: .85; }
    .hp-pay-sub { font-size: 9px; color: rgba(255,255,255,.75); margin-top: 4px; }
    .hp-pay-track { height: 4px; border-radius: 2px; background: rgba(255,255,255,.22); margin-top: 10px; overflow: hidden; }
    .hp-pay-fill { display: block; height: 100%; width: 72%; background: #fff; border-radius: 2px; }
    .hp-hist-label { font-size: 9px; color: #9CA3AF; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
    .hp-hist-row { display: flex; align-items: center; gap: 8px; background: #fff; border-radius: 11px; padding: 9px 10px; box-shadow: 0 2px 8px rgba(15,23,42,0.06); }
    .hp-hist-icon { width: 22px; height: 22px; border-radius: 50%; background: rgba(31,122,92,0.12); color: #1F7A5C; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .hp-hist-icon svg { width: 12px; height: 12px; }
    .hp-hist-info { display: flex; flex-direction: column; gap: 5px; flex: 1; }
    .hp-hist-info .hp-l1 { height: 7px; width: 70%; border-radius: 4px; background: #D2E3F0; }
    .hp-hist-info .hp-l2 { height: 6px; width: 45%; border-radius: 4px; background: #E5E7EB; margin-top: 5px; }
    .hp-hist-amount { font-size: 11.5px; font-weight: 800; color: #0A2650; flex-shrink: 0; }
    .hp-logo-badge {
      position: absolute; top: 15px; right: 13px; z-index: 4;
      width: 32px; height: 32px; border-radius: 9px; background: #fff;
      box-shadow: 0 4px 14px rgba(10,38,80,0.3);
      display: flex; align-items: center; justify-content: center; padding: 5px;
    }
    .hp-logo-img { width: 100%; height: 100%; object-fit: contain; }

    /* Notifications flottantes autour du téléphone */
    .hero-toast {
      position: absolute; z-index: 5; display: flex; align-items: center; gap: 10px;
      background: #fff; border-radius: 14px; padding: 11px 14px; box-shadow: 0 14px 34px rgba(8,20,42,0.28);
      max-width: 208px;
    }
    .hero-toast-top { top: -30px; right: -14px; animation: heroFloat 5s ease-in-out infinite; }
    .hero-toast-bottom { bottom: 54px; left: -30px; animation: heroFloat 5s ease-in-out infinite 0.4s; }
    .ht-icon { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ht-icon svg { width: 16px; height: 16px; }
    .ht-icon-ok { background: rgba(31,122,92,0.12); color: #1F7A5C; }
    .ht-icon-doc { background: rgba(15,76,129,0.12); color: #0F4C81; }
    .ht-text { display: flex; flex-direction: column; gap: 1px; }
    .ht-text strong { font-size: 12.5px; color: #0A2650; font-weight: 700; }
    .ht-text span { font-size: 11px; color: #6b7280; }

    /* Bande de stats façon app store */
    .hero-stats-band {
      position: relative; z-index: 1;
      border-top: 1px solid rgba(255,255,255,0.16);
      max-width: 1280px; margin: 0 auto; padding: 28px 32px;
      display: flex; align-items: center; justify-content: center; gap: 40px; flex-wrap: wrap;
    }
    .hsb-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .hsb-n { font-size: 24px; font-weight: 800; color: #E0B655; line-height: 1; }
    .hsb-l { font-size: 12px; color: rgba(255,255,255,.7); }
    .hsb-sep { width: 1px; height: 32px; background: rgba(255,255,255,0.16); }

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

    /* Rangée de 4 étapes reliées par une ligne */
    .hw-grid { display: flex; gap: 28px; align-items: flex-start; }

    .hw-step {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column; align-items: center;
      position: relative; text-align: center;
    }

    /* Ligne de connexion vers l'étape suivante */
    .hw-connector {
      position: absolute; top: 32px; left: calc(50% + 40px); right: calc(-50% + 40px);
      height: 2px; background: repeating-linear-gradient(90deg, #D2E3F0 0 8px, transparent 8px 14px);
      z-index: 0;
    }

    .hw-icon {
      width: 64px; height: 64px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      color: #fff; position: relative; z-index: 1;
      box-shadow: 0 6px 18px rgba(15,23,42,0.14);
      transition: transform .3s cubic-bezier(.34,1.56,.64,1);
      margin-bottom: 20px;
    }
    .hw-step:hover .hw-icon { transform: scale(1.08); }
    .hw-icon svg { width: 26px; height: 26px; }
    .hw-icon-0 { background: linear-gradient(135deg,#C9982E,#B8861F); }
    .hw-icon-1 { background: linear-gradient(135deg,#0F4C81,#0A2650); }
    .hw-icon-2 { background: linear-gradient(135deg,#2590d7,#0F4C81); }
    .hw-icon-3 { background: linear-gradient(135deg,#1F7A5C,#175c45); }
    .hw-icon-num {
      position: absolute; top: -4px; right: -4px;
      width: 22px; height: 22px; border-radius: 50%;
      background: #fff; color: #0A2650;
      font-size: 11px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(15,23,42,0.2);
    }

    .hw-step-title { font-size: 15.5px; font-weight: 800; color: #0A2650; margin-bottom: 8px; }
    .hw-step-desc { font-size: 13.5px; color: #6b7280; line-height: 1.75; margin: 0; max-width: 240px; }

    /* ── POURQUOI WARAH : APPLI MOBILE ── */
    .why-section { background: #f4f7fb; padding: 100px 0; overflow: hidden; }
    .why-layout { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 64px; align-items: center; }

    .why-title { font-size: clamp(26px, 3.2vw, 40px); font-weight: 800; color: #0A2650; line-height: 1.2; margin: 14px 0 16px; }
    .why-sub { font-size: 15.5px; color: #6b7280; line-height: 1.65; max-width: 440px; margin-bottom: 40px; }

    .why-feats { display: flex; flex-direction: column; gap: 26px; }
    .wf-item { display: flex; gap: 16px; align-items: flex-start; }

    .wf-icon { width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #fff; }
    .wf-icon svg { width: 21px; height: 21px; }
    .wf-icon-0 { background: linear-gradient(135deg,#0F4C81,#0A2650); }
    .wf-icon-1 { background: linear-gradient(135deg,#C9982E,#B8861F); }
    .wf-icon-2 { background: linear-gradient(135deg,#1F7A5C,#175c45); }
    .wf-icon-3 { background: linear-gradient(135deg,#B5563A,#96432c); }

    .wf-body { flex: 1; min-width: 0; }
    .wf-title { font-size: 16px; font-weight: 800; color: #0A2650; margin-bottom: 5px; }
    .wf-desc { font-size: 13.5px; color: #6B7280; line-height: 1.65; margin: 0; max-width: 340px; }

    /* Mini-mockups animés par fonctionnalité */
    .wf-visual {
      flex-shrink: 0; width: 122px; height: 88px; background: #fff; border-radius: 13px;
      padding: 11px 12px; box-shadow: 0 6px 18px rgba(15,23,42,0.08);
      display: flex; flex-direction: column; justify-content: center; gap: 7px;
      position: relative; overflow: hidden;
    }

    /* 0 — Gestion centralisée : lignes qui apparaissent en boucle */
    .wf-visual-0 .wfv-row { display: flex; align-items: center; gap: 6px; opacity: 0; animation: wfRowIn 3.6s ease-in-out infinite; }
    .wf-visual-0 .wfv-row-a { animation-delay: 0s; }
    .wf-visual-0 .wfv-row-b { animation-delay: .35s; }
    .wf-visual-0 .wfv-row-c { animation-delay: .7s; }
    .wfv-dot { width: 6px; height: 6px; border-radius: 50%; background: #0F4C81; flex-shrink: 0; }
    .wfv-bar { height: 6px; border-radius: 3px; background: #DDE6F0; }
    @keyframes wfRowIn {
      0% { opacity: 0; transform: translateX(-6px); }
      12%, 82% { opacity: 1; transform: translateX(0); }
      95%, 100% { opacity: 0; }
    }

    /* 1 — Suivi des paiements : montant + barre qui se remplit, alerte qui clignote */
    .wf-visual-1 { align-items: flex-start; }
    .wfv-amount { font-size: 13.5px; font-weight: 800; color: #0A2650; }
    .wfv-amount small { font-size: 9px; font-weight: 600; color: #9CA3AF; }
    .wfv-track { width: 100%; height: 5px; border-radius: 3px; background: #EEF1F5; overflow: hidden; }
    .wfv-fill { display: block; height: 100%; width: 0%; background: linear-gradient(90deg,#C9982E,#E0B655); border-radius: 3px; animation: wfFill 3.6s ease-in-out infinite; }
    @keyframes wfFill { 0% { width: 0%; } 55%, 75% { width: 88%; } 100% { width: 88%; } }
    .wfv-alert { font-size: 9px; font-weight: 700; color: #B5563A; animation: wfBlink 1.6s ease-in-out infinite; }
    @keyframes wfBlink { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }

    /* 2 — Quittances en un clic : coche qui se dessine en boucle */
    .wf-visual-2 { align-items: center; justify-content: center; gap: 4px; }
    .wfv-doc { width: 40px; height: 40px; }
    .wfv-check { stroke-dasharray: 20; stroke-dashoffset: 20; animation: wfCheck 3.2s ease-in-out infinite; }
    @keyframes wfCheck { 0%, 25% { stroke-dashoffset: 20; } 55%, 85% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 20; } }
    .wfv-doc-label { font-size: 9.5px; font-weight: 700; color: #6B7280; }

    /* 3 — Alertes intelligentes : cloche qui sonne + badge qui apparaît */
    .wf-visual-3 { align-items: center; justify-content: center; }
    .wfv-bell { width: 34px; height: 34px; color: #B5563A; transform-origin: top center; animation: wfRing 3.2s ease-in-out infinite; }
    @keyframes wfRing {
      0%, 60% { transform: rotate(0deg); }
      63% { transform: rotate(14deg); } 66% { transform: rotate(-12deg); } 69% { transform: rotate(9deg); }
      72% { transform: rotate(-6deg); } 75% { transform: rotate(3deg); } 78%, 100% { transform: rotate(0deg); }
    }
    .wfv-badge {
      position: absolute; top: 18px; right: 34px; min-width: 15px; height: 15px; padding: 0 3px; border-radius: 8px;
      background: #C9982E; color: #fff; font-size: 9px; font-weight: 800; display: flex; align-items: center; justify-content: center;
      opacity: 0; animation: wfBadgeIn 3.2s ease-in-out infinite;
    }
    @keyframes wfBadgeIn { 0%, 62% { opacity: 0; transform: scale(.4); } 72%, 96% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(.4); } }

    /* Mockups téléphones */
    .why-devices { position: relative; height: 460px; display: flex; align-items: center; justify-content: center; }
    .wd-phone {
      position: absolute; width: 220px; height: 440px; border-radius: 34px;
      background: #0A2650; border: 6px solid #081E41; box-shadow: 0 24px 60px rgba(10,38,80,0.28);
      overflow: hidden;
    }
    .wd-phone-back { transform: translate(58px, -18px) rotate(4deg); opacity: 0.9; z-index: 1; }
    .wd-phone-front { transform: translate(-58px, 18px) rotate(-4deg); z-index: 2; }
    .wd-notch { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 70px; height: 18px; background: #081E41; border-radius: 0 0 12px 12px; z-index: 3; }
    .wd-screen { position: absolute; inset: 0; background: #F7F8FA; padding: 26px 14px 14px; display: flex; flex-direction: column; gap: 10px; }

    .wd-bar { display: flex; gap: 5px; margin-bottom: 10px; }
    .wd-bar span { width: 8px; height: 8px; border-radius: 50%; background: #D2E3F0; }
    .wd-bar span:first-child { background: #C9982E; }
    .wd-chart-label { font-size: 10px; color: #9CA3AF; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 8px; }
    .wd-chart { display: flex; align-items: flex-end; gap: 6px; height: 84px; margin-bottom: 10px; }
    .wd-chart-bar { flex: 1; background: #D2E3F0; border-radius: 4px 4px 0 0; }
    .wd-chart-bar-hi { background: linear-gradient(180deg,#E0B655,#C9982E); }

    .wd-logo-badge {
      position: absolute; top: 16px; right: 14px; z-index: 4;
      width: 34px; height: 34px; border-radius: 10px; background: #fff;
      box-shadow: 0 4px 14px rgba(10,38,80,0.25);
      display: flex; align-items: center; justify-content: center; padding: 5px;
    }
    .wd-logo-img { width: 100%; height: 100%; object-fit: contain; }

    .wd-stats { display: flex; gap: 8px; margin-top: auto; }
    .wd-stat { flex: 1; background: #fff; border-radius: 10px; padding: 9px 6px; text-align: center; box-shadow: 0 2px 8px rgba(15,23,42,0.06); }
    .wd-stat-n { display: block; font-size: 15px; font-weight: 800; color: #0A2650; }
    .wd-stat-l { display: block; font-size: 8.5px; color: #9CA3AF; margin-top: 2px; text-transform: uppercase; letter-spacing: .03em; }

    .wd-greet { display: flex; flex-direction: column; gap: 3px; padding-right: 36px; margin-bottom: 2px; }
    .wd-greet-hi { font-size: 10.5px; color: #9CA3AF; font-weight: 600; }
    .wd-greet-title { font-size: 15px; color: #0A2650; font-weight: 800; }
    .wd-card { background: #0F4C81; border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 3px; margin-bottom: 10px; }
    .wd-card-top { display: flex; align-items: center; justify-content: space-between; }
    .wd-card-label { font-size: 10px; color: rgba(255,255,255,0.65); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
    .wd-card-pill { font-size: 8.5px; font-weight: 700; color: #fff; background: rgba(255,255,255,.18); padding: 3px 8px; border-radius: 20px; }
    .wd-card-amount { font-size: 17px; color: #fff; font-weight: 800; }
    .wd-card-sub { font-size: 9px; color: rgba(255,255,255,.65); }
    .wd-hist-row { display: flex; align-items: center; gap: 8px; background: #fff; border-radius: 11px; padding: 8px 9px; box-shadow: 0 2px 8px rgba(15,23,42,0.06); }
    .wd-hist-icon { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .wd-hist-icon svg { width: 12px; height: 12px; }
    .wd-hist-ok { background: rgba(31,122,92,0.12); color: #1F7A5C; }
    .wd-hist-warn { background: rgba(201,152,46,0.16); color: #B8861F; }
    .wd-hist-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .wd-hist-t { font-size: 11px; font-weight: 700; color: #0A2650; }
    .wd-hist-s { font-size: 9px; color: #9CA3AF; }
    .wd-hist-badge { font-size: 8.5px; font-weight: 700; padding: 3px 8px; border-radius: 20px; flex-shrink: 0; }
    .wd-hist-badge-ok { color: #1F7A5C; background: rgba(31,122,92,0.12); }
    .wd-hist-badge-warn { color: #B8861F; background: rgba(201,152,46,0.16); }

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

    /* ── TÉMOIGNAGES ── */
    .temo-section { background: #F7F8FA; padding: 88px 0 96px; }
    .temo-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
    .ts-head { text-align: center; max-width: 620px; margin: 0 auto 52px; }
    .ts-eyebrow {
      display: inline-block; font-size: 12px; font-weight: 800; letter-spacing: .12em;
      color: #C9982E; text-transform: uppercase; margin-bottom: 12px;
    }
    .ts-title2 { font-size: clamp(26px, 3vw, 34px); font-weight: 800; color: #0A2650; line-height: 1.25; margin: 0 0 10px; }
    .ts-title2-accent { color: #C9982E; }
    .ts-sub { font-size: 15px; color: #6b7280; line-height: 1.6; }

    /* Ligne unique */
    .ob-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }

    .tb-card {
      background: #fff; border: 1px solid #E5E7EB;
      border-radius: 16px; overflow: hidden;
      display: flex; flex-direction: column;
      box-shadow: 0 1px 4px rgba(15,23,42,0.04);
      transition: transform .22s ease, box-shadow .22s ease;
    }
    .tb-card:hover { transform: translateY(-4px); box-shadow: 0 16px 32px rgba(15,23,42,0.09); }

    .tb-top { position: relative; display: flex; align-items: center; gap: 14px; padding: 24px 24px 0; }
    .tb-ava-img {
      width: 56px; height: 56px; border-radius: 50%; object-fit: cover; display: block;
      border: 2px solid #EAF1F8;
    }
    .tb-oq {
      font-size: 40px; font-family: Georgia, serif; font-weight: 900;
      color: #C9982E; line-height: 1; opacity: 0.85; margin-left: auto;
    }

    .tb-body { padding: 14px 24px 26px; display: flex; flex-direction: column; gap: 8px; }
    .tb-text { font-size: 14px; line-height: 1.75; color: #374151; }
    .tb-stars { color: #C9982E; font-size: 14px; letter-spacing: 3px; margin-top: 4px; }
    .tb-name { font-size: 14.5px; font-weight: 800; color: #0A2650; }
    .tb-role { font-size: 12px; color: #6b7280; }

    /* Points de pagination */
    .ts-dots { display: flex; justify-content: center; gap: 9px; margin-top: 36px; }
    .ts-dot { width: 9px; height: 9px; border-radius: 50%; background: #D8DEE8; border: none; cursor: pointer; padding: 0; transition: background .25s, width .25s; }
    .ts-dot-on { background: #C9982E; width: 26px; border-radius: 4px; }

    @media (max-width: 900px) {
      .ob-grid { grid-template-columns: 1fr 1fr; gap: 18px; }
    }
    @media (max-width: 680px) {
      .ob-grid { grid-template-columns: 1fr; gap: 18px; }
    }

    /* ── FAQ : photo à gauche + accordéon à droite ── */
    .faq-section { background: #F7F8FA; padding: 88px 24px; }
    .faq-split {
      max-width: 1180px; margin: 0 auto;
      display: grid; grid-template-columns: 0.85fr 1.15fr;
      background: white; border-radius: 24px; overflow: hidden;
      border: 1px solid #E5E7EB; box-shadow: 0 4px 24px rgba(15,23,42,0.06);
      min-height: 620px;
    }

    /* Photo */
    .faq-photo { position: relative; overflow: hidden; }
    .faq-photo-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .faq-photo-scrim {
      position: absolute; inset: 0;
      background: linear-gradient(180deg, rgba(10,38,80,0.15) 0%, rgba(8,20,42,0.55) 65%, rgba(6,14,30,0.82) 100%);
    }
    .faq-photo-icon {
      position: absolute; top: 40px; left: 40px; z-index: 1;
      width: 52px; height: 52px; border-radius: 14px;
      background: rgba(201,152,46,0.18); border: 1px solid rgba(201,152,46,0.4);
      display: flex; align-items: center; justify-content: center; color: #E0B655;
    }
    .faq-photo-icon svg { width: 24px; height: 24px; }
    .faq-photo-content { position: absolute; left: 40px; right: 32px; bottom: 40px; z-index: 1; }
    .faq-photo-title { font-size: clamp(28px, 3.4vw, 38px); font-weight: 800; color: rgba(255,255,255,0.55); line-height: 1.15; margin-bottom: 14px; }
    .faq-photo-title span { color: white; }
    .faq-photo-sub { font-size: 15px; color: rgba(255,255,255,0.85); line-height: 1.6; max-width: 320px; }

    /* Panneau accordéon */
    .faq-panel { display: flex; flex-direction: column; padding: 44px 40px 32px; }
    .faq-panel-scroll {
      flex: 1; overflow-y: auto; padding-right: 12px; margin-right: -12px;
      display: flex; flex-direction: column; gap: 10px;
      scrollbar-width: thin; scrollbar-color: #0F4C81 #E5E7EB;
    }
    .faq-panel-scroll::-webkit-scrollbar { width: 6px; }
    .faq-panel-scroll::-webkit-scrollbar-track { background: #E5E7EB; border-radius: 3px; }
    .faq-panel-scroll::-webkit-scrollbar-thumb { background: #0F4C81; border-radius: 3px; }

    .faq-item {
      background: #fff; border: 1.5px solid #E5E7EB; border-radius: 14px;
      cursor: pointer; overflow: hidden; flex-shrink: 0;
      transition: border-color .22s, background .22s, box-shadow .22s;
    }
    .faq-item:hover { border-color: #B7CBE0; }
    .faq-item.faq-open { background: #EAF1F8; border-color: #0F4C81; box-shadow: 0 4px 16px rgba(15,76,129,0.1); }

    .faq-row { display: flex; align-items: center; gap: 16px; padding: 18px 22px; }
    .faq-q { font-size: 14.5px; font-weight: 700; color: #0A2650; flex: 1; line-height: 1.4; }
    .faq-toggle {
      width: 26px; height: 26px; flex-shrink: 0; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 17px; font-weight: 700; color: #0F4C81;
      background: #EAF1F8; border: 1px solid #D2E3F0;
      transition: background .22s, color .22s, border-color .22s;
    }
    .faq-open .faq-toggle { background: #0F4C81; color: white; border-color: #0F4C81; }

    .faq-ans { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .35s cubic-bezier(.4,0,.2,1); }
    .faq-open .faq-ans { grid-template-rows: 1fr; }
    .faq-ans-in { min-height: 0; overflow: hidden; }
    .faq-ans-in p { font-size: 13.5px; color: #4b5568; line-height: 1.75; padding: 0 22px 18px; }

    .faq-footer {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding-top: 20px; margin-top: 8px; border-top: 1px solid #E5E7EB;
    }
    .faq-footer p { font-size: 14px; color: #6b7280; }
    .faq-cta {
      background: #0F4C81; color: white; font-size: 13.5px; font-weight: 700;
      padding: 10px 20px; border-radius: 8px; text-decoration: none; white-space: nowrap;
      transition: background .2s, transform .15s;
    }
    .faq-cta:hover { background: #0A2650; transform: translateY(-1px); }

    @media (max-width: 900px) {
      .faq-split { grid-template-columns: 1fr; min-height: 0; }
      .faq-photo { min-height: 280px; }
    }
    @media (max-width: 640px) {
      .faq-panel { padding: 32px 22px 24px; }
      .faq-footer { flex-direction: column; align-items: flex-start; }
    }

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

    /* Grille tarifs statique */
    .pc-wrap { margin-top: 48px; }
    .pc-stage { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; align-items: start; }

    /* Carte générique */
    .pc-card {
      background: #F8FAFF; border: 1.5px solid #E5E7EB;
      border-radius: 20px; padding: 36px 32px;
      display: flex; flex-direction: column;
      position: relative;
      transition: transform .25s ease, box-shadow .25s ease;
    }
    .pc-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(10,38,80,0.1); }

    .price-card-pro {
      background: #0A2650; border-color: #C9982E;
      transform: scale(1.03);
      box-shadow: 0 20px 50px rgba(10,38,80,0.22);
    }
    .price-card-pro:hover { transform: scale(1.03) translateY(-4px); }

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
      .biens-grid { grid-template-columns: repeat(2, 1fr); }
      .temo-layout { grid-template-columns: 1fr; }
      .temo-left { min-height: 260px; }
      .temo-left-content { min-height: 260px; }
      .why-layout { grid-template-columns: 1fr; gap: 48px; }
      .why-devices { order: -1; height: 340px; }
      .wd-phone { width: 170px; height: 340px; }
      .why-text, .why-sub { text-align: left; }
      .wf-visual { display: none; }
      .hero-inner { grid-template-columns: 1fr; gap: 40px; text-align: center; padding: 56px 24px 40px; }
      .hero-left { max-width: 100%; margin: 0 auto; }
      .s-btns, .hero-slide-controls { justify-content: center; }
      .hero-right { order: -1; height: 380px; }
      .hero-ring, .hero-glow-dots { width: 320px; height: 320px; right: 50%; transform: translate(50%, -50%); }
      .hero-phone { width: 190px; height: 380px; margin: 0 auto; }
      .hero-toast { display: none; }
      .hsb-sep:nth-of-type(5) { display: none; }
    }
    @media (max-width: 768px) {
      .pc-stage { grid-template-columns: 1fr; }
      .price-card-pro { transform: none; }
      .price-card-pro:hover { transform: translateY(-4px); }
      .s-title { font-size: clamp(28px, 8vw, 38px); white-space: normal; }
      .s-sub { font-size: 15px; margin-left: auto; margin-right: auto; }
      .hero-stats-band { gap: 24px; padding: 22px 20px; }
      .hsb-n { font-size: 19px; }
      .hw-grid { flex-wrap: wrap; gap: 32px 16px; }
      .hw-step { min-width: calc(50% - 8px); }
      .hw-connector { display: none; }
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

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private slideTimer?: ReturnType<typeof setInterval>;
  private statsObserver?: IntersectionObserver;
  private statsAnimated = false;

  temoPage       = signal(0);
  selectedFaq    = signal(0);

  // ── Slider & carousel ──
  currentSlide = signal(0);
  slideFade    = signal(true);


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
    { titre: 'Gestion centralisée',   desc: 'Tous vos biens, locataires et baux réunis sur une seule plateforme, à jour en permanence.' },
    { titre: 'Suivi des paiements',   desc: 'Chaque loyer enregistré automatiquement, avec alerte immédiate en cas de retard.' },
    { titre: 'Quittances en un clic', desc: 'Générées et envoyées au locataire automatiquement après chaque paiement confirmé.' },
    { titre: 'Alertes intelligentes', desc: 'Notifications push et email pour les échéances, impayés et renouvellements de bail.' },
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
    {
      nom: 'Sitou Amégan', role: 'Gestionnaire immobilier', ville: 'Lomé',
      initiale: 'S', couleur: '#B5563A',
      photo: 'https://randomuser.me/api/portraits/women/68.jpg',
      texte: 'Mes clients propriétaires reçoivent un rapport clair chaque mois, sans que je lève le petit doigt. WARAH a professionnalisé toute mon activité de gestion locative.',
    },
  ];

  readonly temoPagesArr = Array.from({ length: Math.ceil(this.temoignages.length / 3) }, (_, i) => i);

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
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true, offset: 60 });

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
    this.statsObserver?.disconnect();
  }

  goToTemoPage(p: number): void {
    this.temoPage.set(p);
    // Les cartes sont recréées (@for sur un slice) : on ré-enregistre les nouveaux
    // éléments data-aos auprès d'AOS pour qu'ils s'animent aussi.
    if (this.isBrowser) setTimeout(() => AOS.refresh(), 0);
  }

  private startSlider(): void {
    this.slideTimer = setInterval(() => {
      this.goToSlide((this.currentSlide() + 1) % this.slides.length);
    }, 6000);
  }

  goToSlide(i: number): void {
    if (i === this.currentSlide()) return;
    this.slideFade.set(false);
    setTimeout(() => {
      this.currentSlide.set(i);
      this.slideFade.set(true);
    }, 200);
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


}
