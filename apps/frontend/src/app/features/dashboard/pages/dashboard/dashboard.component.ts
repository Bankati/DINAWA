import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardService, DashboardKPI, RevenuMensuel, Alerte, DernierPaiement, DernierBien } from '../../services/dashboard.service';
import { LokMontantFcfaComponent } from '../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component';
import { LokBadgePaiementComponent } from '../../../../shared/components/lok-badge-paiement/lok-badge-paiement.component';
import { LokBadgeStatutComponent } from '../../../../shared/components/lok-badge-statut/lok-badge-statut.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LokMontantFcfaComponent,
    LokBadgePaiementComponent,
    LokBadgeStatutComponent,
    LokSkeletonComponent
  ],
  template: `
    <div class="dash-page">

      <!-- Topbar -->
      <header class="topbar">
        <div class="topbar-left">
          <div class="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1"></rect>
              <rect x="14" y="14" width="7" height="7" rx="1"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1"></rect>
            </svg>
          </div>
          <div>
            <h1 class="page-title">Tableau de bord</h1>
            <p class="page-sub">{{ dateCourante }}</p>
          </div>
        </div>
        <div class="topbar-right">
          <div class="notif-btn" [class.has-alertes]="alertes.length > 0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            @if (alertes.length > 0) {
              <span class="notif-badge">{{ alertes.length }}</span>
            }
          </div>
          <div class="topbar-avatar">{{ initiales }}</div>
          <div class="topbar-user-info">
            <p class="topbar-name">{{ utilisateurPrenom }}</p>
            <p class="topbar-role">Propriétaire</p>
          </div>
        </div>
      </header>

      <!-- Corps -->
      <div class="dash-body">

        <!-- Bannière de bienvenue -->
        <div class="greeting-banner">
          <div>
            <h2 class="greeting-title">Bonjour, {{ utilisateurPrenom }}</h2>
            <p class="greeting-sub">Voici un résumé de votre activité immobilière.</p>
          </div>
          <a routerLink="/dashboard/biens" class="btn-accent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Ajouter un bien
          </a>
        </div>

        <!-- Cartes KPI -->
        <div class="kpi-grid">
          @if (loadingKPIs) {
            @for (i of [1,2,3,4]; track i) {
              <lok-skeleton type="card"></lok-skeleton>
            }
          } @else {

            <div class="kpi-card kpi-blue">
              <div class="kpi-icon kpi-icon-blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <div class="kpi-body">
                <p class="kpi-label">Total biens</p>
                <p class="kpi-value">{{ kpis.totalBiens }}</p>
                <div class="kpi-pills">
                  <span class="pill pill-green">{{ kpis.biensOccupes }} occupés</span>
                  <span class="pill pill-gray">{{ kpis.biensVacants }} vacants</span>
                </div>
              </div>
            </div>

            <div class="kpi-card kpi-green">
              <div class="kpi-icon kpi-icon-green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <div class="kpi-body">
                <p class="kpi-label">Revenus mensuels</p>
                <lok-montant-fcfa [montant]="kpis.revenusMensuels" size="lg" color="primary"></lok-montant-fcfa>
                <p class="kpi-trend-up">&#8593; +5% vs mois dernier</p>
              </div>
            </div>

            <div class="kpi-card kpi-gold">
              <div class="kpi-icon kpi-icon-gold">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div class="kpi-body">
                <p class="kpi-label">Taux d'occupation</p>
                <p class="kpi-value">{{ kpis.tauxOccupation }}%</p>
                <div class="occ-bar"><div class="occ-fill" [style.width.%]="kpis.tauxOccupation"></div></div>
                <p class="kpi-sub">{{ kpis.totalLocataires }} locataires actifs</p>
              </div>
            </div>

            <div class="kpi-card kpi-red">
              <div class="kpi-icon kpi-icon-red">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div class="kpi-body">
                <p class="kpi-label">Impayés</p>
                <p class="kpi-value kpi-red-val">{{ kpis.impayes }}</p>
                <div class="kpi-pills">
                  <span class="pill pill-red">Traitement urgent</span>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Actions rapides -->
        <div class="section-card">
          <h2 class="section-title">Actions rapides</h2>
          <div class="actions-grid">
            <a routerLink="/dashboard/biens" class="action-card">
              <div class="action-icon a-blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </div>
              <p class="action-label">Ajouter un bien</p>
              <p class="action-sub">Nouveau logement</p>
            </a>
            <a routerLink="/dashboard/paiements" class="action-card">
              <div class="action-icon a-green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="4" width="22" height="16" rx="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
              </div>
              <p class="action-label">Paiement</p>
              <p class="action-sub">Enregistrer un loyer</p>
            </a>
            <a routerLink="/dashboard/locataires" class="action-card">
              <div class="action-icon a-gold">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <line x1="19" y1="8" x2="19" y2="14"></line>
                  <line x1="22" y1="11" x2="16" y2="11"></line>
                </svg>
              </div>
              <p class="action-label">Nouveau locataire</p>
              <p class="action-sub">Ajouter un profil</p>
            </a>
            <a routerLink="/dashboard/annonces" class="action-card">
              <div class="action-icon a-purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              </div>
              <p class="action-label">Publier une annonce</p>
              <p class="action-sub">Mettre en location</p>
            </a>
          </div>
        </div>

        <!-- Graphique + Alertes -->
        <div class="chart-alerts-grid">

          <div class="section-card chart-card">
            <div class="section-header">
              <h2 class="section-title">Revenus mensuels</h2>
              <div class="chart-controls">
                <div class="chart-tabs">
                  <button class="chart-tab active">Mensuel</button>
                  <button class="chart-tab">Annuel</button>
                </div>
                <span class="section-tag">{{ anneeEnCours }}</span>
              </div>
            </div>
            @if (loadingRevenus) {
              <lok-skeleton type="card"></lok-skeleton>
            } @else {
              <div class="chart-container">
                <!-- Axe Y -->
                <div class="y-axis-labels">
                  @for (lbl of yGridLabels; track lbl) {
                    <span class="y-label">{{ lbl }}</span>
                  }
                </div>
                <!-- Zone SVG -->
                <div class="svg-wrapper" (mouseleave)="onPointHover(null)">
                  <svg [attr.viewBox]="'0 0 ' + CHART_W + ' ' + CHART_H"
                       class="area-chart" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="dashAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#0F4C81" stop-opacity="0.22"/>
                        <stop offset="70%" stop-color="#1e5fa0" stop-opacity="0.07"/>
                        <stop offset="100%" stop-color="#C9982E" stop-opacity="0.03"/>
                      </linearGradient>
                      <linearGradient id="dashLineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stop-color="#0F4C81"/>
                        <stop offset="60%" stop-color="#1a6dc0"/>
                        <stop offset="100%" stop-color="#C9982E"/>
                      </linearGradient>
                    </defs>
                    <!-- Lignes de grille horizontales -->
                    @for (gy of yGridLines; track gy) {
                      <line x1="0" [attr.y1]="gy" [attr.x2]="CHART_W" [attr.y2]="gy" class="grid-line"/>
                    }
                    <!-- Zone remplie sous la courbe -->
                    <path [attr.d]="svgAreaPath" class="chart-area-fill"/>
                    <!-- Courbe principale animée -->
                    <path [attr.d]="svgLinePath" class="chart-line" stroke="url(#dashLineGrad)"/>
                    <!-- Points de données interactifs -->
                    @for (pt of chartPoints; track pt.x; let i = $index) {
                      <g class="data-point" [class.active]="activePointIndex === i"
                         (mouseenter)="onPointHover(i)">
                        <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="14" class="point-hit"/>
                        <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="9"  class="point-glow"/>
                        <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="5.5" class="point-ring"/>
                        <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="3"  class="point-dot"/>
                      </g>
                    }
                  </svg>
                  <!-- Tooltip flottant -->
                  @if (activePoint) {
                    <div class="chart-tooltip"
                         [style.left.%]="activePoint.xPct"
                         [style.top.%]="activePoint.yPct">
                      <span class="tt-month">{{ activePoint.r.mois }}</span>
                      <span class="tt-amount">{{ (activePoint.r.montant / 1000) | number:'1.0-0' }} k FCFA</span>
                    </div>
                  }
                </div>
              </div>
              <!-- Axe X -->
              <div class="x-axis-row">
                @for (r of revenus; track r.mois) {
                  <span class="x-label">{{ r.mois }}</span>
                }
              </div>
              <!-- Stats synthèse -->
              <div class="chart-stats-row">
                <div class="chart-stat">
                  <span class="cs-label">Total</span>
                  <span class="cs-value primary">{{ (totalRevenus / 1000) | number:'1.0-0' }} k FCFA</span>
                </div>
                <div class="cs-sep"></div>
                <div class="chart-stat">
                  <span class="cs-label">Moyenne / mois</span>
                  <span class="cs-value">{{ (moyenneRevenu / 1000) | number:'1.0-0' }} k FCFA</span>
                </div>
                <div class="cs-sep"></div>
                <div class="chart-stat">
                  <span class="cs-label">Meilleur mois</span>
                  <span class="cs-value accent">{{ meilleurMois }}</span>
                </div>
              </div>
            }
          </div>

          <div class="section-card alerts-card">
            <div class="section-header">
              <h2 class="section-title">Alertes</h2>
              @if (alertes.length > 0) {
                <span class="alertes-badge">{{ alertes.length }}</span>
              }
            </div>
            @if (loadingAlertes) {
              <lok-skeleton type="list" [count]="3"></lok-skeleton>
            } @else if (alertes.length === 0) {
              <div class="no-alertes">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <p>Aucune alerte active</p>
              </div>
            } @else {
              <div class="alertes-list">
                @for (a of alertes; track a.id) {
                  <div [class]="'alerte-row alerte-' + a.priorite">
                    <div class="alerte-icon-box">
                      @if (a.type === 'retard' || a.type === 'impaye') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                          <line x1="12" y1="9" x2="12" y2="13"></line>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                      }
                      @if (a.type === 'maintenance') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                      }
                      @if (a.type === 'bientot_expire') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                      }
                    </div>
                    <div class="alerte-body">
                      <p class="alerte-titre">{{ a.titre }}</p>
                      <p class="alerte-desc">{{ a.description }}</p>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Paiements + Biens récents -->
        <div class="tables-grid">

          <div class="section-card">
            <div class="section-header">
              <h2 class="section-title">Derniers paiements</h2>
              <a routerLink="/dashboard/paiements" class="voir-tout">Voir tout</a>
            </div>
            @if (loadingPaiements) {
              <lok-skeleton type="list" [count]="5"></lok-skeleton>
            } @else {
              <div class="table-rows">
                @for (p of derniersPaiements; track p.id) {
                  <div class="table-row">
                    <div class="row-avatar">{{ initiales2(p.locataire) }}</div>
                    <div class="row-info">
                      <p class="row-name">{{ p.locataire }}</p>
                      <p class="row-sub">{{ p.bien }}</p>
                    </div>
                    <div class="row-right">
                      <lok-montant-fcfa [montant]="p.montant" size="sm"></lok-montant-fcfa>
                      <lok-badge-paiement [statut]="p.statut"></lok-badge-paiement>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <div class="section-card">
            <div class="section-header">
              <h2 class="section-title">Mes biens récents</h2>
              <a routerLink="/dashboard/biens" class="voir-tout">Voir tout</a>
            </div>
            @if (loadingBiens) {
              <lok-skeleton type="list" [count]="5"></lok-skeleton>
            } @else {
              <div class="table-rows">
                @for (b of derniersBiens; track b.id) {
                  <div class="table-row">
                    <div [class]="'row-bien-icon bi-' + b.type.toLowerCase()">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                      </svg>
                    </div>
                    <div class="row-info">
                      <p class="row-name">{{ b.titre }}</p>
                      <p class="row-sub">{{ b.ville }} · {{ b.type }}</p>
                    </div>
                    <div class="row-right">
                      <lok-montant-fcfa [montant]="b.loyer" size="sm"></lok-montant-fcfa>
                      <lok-badge-statut [statut]="b.statut"></lok-badge-statut>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Page ── */
    .dash-page { min-height: 100vh; background: #F1F4F9; font-family: inherit; }

    /* ── Topbar ── */
    .topbar {
      position: sticky; top: 0; z-index: 10;
      background: white; border-bottom: 1px solid #E5EAF2;
      padding: 0 28px; height: 68px;
      display: flex; align-items: center; justify-content: space-between;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .topbar-left { display: flex; align-items: center; gap: 14px; }
    .page-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: var(--color-primary);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .page-icon svg { width: 20px; height: 20px; stroke: white; }
    .page-title { font-size: 17px; font-weight: 700; color: #111827; line-height: 1.2; }
    .page-sub { font-size: 12px; color: #6B7280; margin-top: 1px; text-transform: capitalize; }
    .topbar-right { display: flex; align-items: center; gap: 12px; }
    .notif-btn {
      position: relative; width: 40px; height: 40px; border-radius: 10px;
      background: #F3F4F6; border: 1px solid #E5E7EB;
      display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s;
    }
    .notif-btn:hover { background: #E8EDF5; }
    .notif-btn.has-alertes { background: rgba(239,68,68,0.07); border-color: rgba(239,68,68,0.3); }
    .notif-btn svg { width: 18px; height: 18px; stroke: #374151; }
    .notif-badge {
      position: absolute; top: -4px; right: -4px;
      background: #EF4444; color: white; font-size: 10px; font-weight: 700;
      width: 18px; height: 18px; border-radius: 50%; border: 2px solid white;
      display: flex; align-items: center; justify-content: center;
    }
    .topbar-avatar {
      width: 38px; height: 38px; border-radius: 10px;
      background: var(--color-accent); color: var(--color-primary-dark);
      font-weight: 700; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
    }
    .topbar-name { font-size: 13px; font-weight: 600; color: #111827; line-height: 1.3; }
    .topbar-role { font-size: 11px; color: #6B7280; }

    /* ── Corps ── */
    .dash-body { padding: 24px 28px; display: flex; flex-direction: column; gap: 24px; }

    /* ── Bannière ── */
    .greeting-banner {
      background: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%);
      border-radius: 16px; padding: 24px 28px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .greeting-title { font-size: 20px; font-weight: 700; color: white; }
    .greeting-sub { font-size: 13px; color: rgba(255,255,255,0.7); margin-top: 4px; }
    .btn-accent {
      display: inline-flex; align-items: center; gap: 8px;
      background: var(--color-accent); color: var(--color-primary-dark);
      font-size: 13px; font-weight: 700; padding: 11px 20px;
      border-radius: 10px; text-decoration: none; white-space: nowrap; flex-shrink: 0;
      transition: opacity 0.15s;
    }
    .btn-accent:hover { opacity: 0.88; }
    .btn-accent svg { width: 16px; height: 16px; }

    /* ── KPI ── */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .kpi-card {
      background: white; border-radius: 14px; padding: 20px;
      display: flex; align-items: flex-start; gap: 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #E5EAF2;
      border-top: 3px solid transparent;
      transition: box-shadow 0.15s, transform 0.15s;
    }
    .kpi-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.09); transform: translateY(-2px); }
    .kpi-blue { border-top-color: var(--color-primary); }
    .kpi-green { border-top-color: #10B981; }
    .kpi-gold { border-top-color: var(--color-accent); }
    .kpi-red { border-top-color: #EF4444; }
    .kpi-icon {
      width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .kpi-icon svg { width: 22px; height: 22px; }
    .kpi-icon-blue { background: rgba(15,76,129,0.1); }
    .kpi-icon-blue svg { stroke: var(--color-primary); }
    .kpi-icon-green { background: rgba(16,185,129,0.1); }
    .kpi-icon-green svg { stroke: #10B981; }
    .kpi-icon-gold { background: rgba(201,152,46,0.12); }
    .kpi-icon-gold svg { stroke: var(--color-accent); }
    .kpi-icon-red { background: rgba(239,68,68,0.1); }
    .kpi-icon-red svg { stroke: #EF4444; }
    .kpi-body { flex: 1; min-width: 0; }
    .kpi-label { font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px; }
    .kpi-value { font-size: 28px; font-weight: 800; color: #111827; line-height: 1.1; }
    .kpi-red-val { color: #EF4444; }
    .kpi-sub { font-size: 11.5px; color: #9CA3AF; margin-top: 4px; }
    .kpi-trend-up { font-size: 11.5px; color: #10B981; font-weight: 600; margin-top: 6px; }
    .kpi-pills { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
    .pill { font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 20px; }
    .pill-green { background: rgba(16,185,129,0.1); color: #059669; }
    .pill-gray { background: #F3F4F6; color: #6B7280; }
    .pill-red { background: rgba(239,68,68,0.1); color: #DC2626; }
    .occ-bar { width: 100%; height: 6px; background: #E5E7EB; border-radius: 99px; margin: 8px 0 4px; overflow: hidden; }
    .occ-fill { height: 100%; background: var(--color-accent); border-radius: 99px; transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }

    /* ── Cards génériques ── */
    .section-card {
      background: white; border-radius: 14px; padding: 20px 24px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #E5EAF2;
    }
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
    .section-title { font-size: 15px; font-weight: 700; color: #111827; }
    .section-tag {
      font-size: 12px; font-weight: 600; color: var(--color-primary);
      background: rgba(15,76,129,0.08); padding: 3px 10px; border-radius: 20px;
    }
    .voir-tout { font-size: 12.5px; color: var(--color-primary); font-weight: 600; text-decoration: none; }
    .voir-tout:hover { text-decoration: underline; }

    /* ── Actions rapides ── */
    .actions-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .action-card {
      display: flex; flex-direction: column; gap: 10px;
      padding: 16px; border-radius: 12px;
      background: #F8FAFC; border: 1px solid #E5EAF2;
      text-decoration: none; transition: all 0.15s; cursor: pointer;
    }
    .action-card:hover {
      background: white; border-color: var(--color-primary);
      box-shadow: 0 4px 14px rgba(15,76,129,0.12); transform: translateY(-2px);
    }
    .action-icon {
      width: 42px; height: 42px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
    }
    .action-icon svg { width: 20px; height: 20px; }
    .a-blue { background: rgba(15,76,129,0.1); }
    .a-blue svg { stroke: var(--color-primary); }
    .a-green { background: rgba(16,185,129,0.1); }
    .a-green svg { stroke: #10B981; }
    .a-gold { background: rgba(201,152,46,0.12); }
    .a-gold svg { stroke: var(--color-accent); }
    .a-purple { background: rgba(139,92,246,0.1); }
    .a-purple svg { stroke: #7C3AED; }
    .action-label { font-size: 13px; font-weight: 700; color: #111827; }
    .action-sub { font-size: 11.5px; color: #9CA3AF; }

    /* ── Graphique area chart ── */
    .chart-alerts-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
    .chart-card { display: flex; flex-direction: column; }

    .chart-controls { display: flex; align-items: center; gap: 10px; }
    .chart-tabs {
      display: flex; background: #F3F4F6; border-radius: 8px; padding: 2px; gap: 1px;
    }
    .chart-tab {
      padding: 5px 12px; font-size: 11px; font-weight: 500; border: none;
      background: transparent; color: #6B7280; border-radius: 6px;
      cursor: pointer; transition: all 0.15s;
    }
    .chart-tab.active {
      background: white; color: var(--color-primary);
      box-shadow: 0 1px 3px rgba(0,0,0,0.10);
    }

    .chart-container {
      display: flex; gap: 8px; margin-top: 14px;
    }
    .y-axis-labels {
      display: flex; flex-direction: column; justify-content: space-between;
      height: 180px; align-items: flex-end; flex-shrink: 0; width: 32px;
    }
    .y-label { font-size: 10px; color: #9CA3AF; line-height: 1; }

    .svg-wrapper {
      flex: 1; position: relative; height: 180px;
    }
    .area-chart { width: 100%; height: 100%; overflow: visible; }

    .grid-line {
      stroke: #E5E7EB; stroke-width: 1; stroke-dasharray: 4 3;
    }
    .chart-area-fill { fill: url(#dashAreaGrad); }
    .chart-line {
      fill: none; stroke-width: 2.5;
      stroke-linecap: round; stroke-linejoin: round;
      stroke-dasharray: 3000; stroke-dashoffset: 3000;
      animation: draw-line 1.4s cubic-bezier(0.4,0,0.2,1) forwards;
    }
    @keyframes draw-line { to { stroke-dashoffset: 0; } }

    .data-point { cursor: pointer; }
    .point-hit  { fill: transparent; }
    .point-glow { fill: var(--color-primary); opacity: 0; transition: opacity 0.2s; }
    .point-ring {
      fill: white; stroke: var(--color-primary); stroke-width: 2;
      opacity: 0; transition: opacity 0.2s, r 0.15s;
    }
    .point-dot { fill: var(--color-primary); transition: r 0.15s; }
    .data-point.active .point-glow { opacity: 0.14; }
    .data-point.active .point-ring { opacity: 1; }

    .chart-tooltip {
      position: absolute;
      transform: translate(-50%, calc(-100% - 12px));
      background: #111827; color: white;
      border-radius: 8px; padding: 6px 11px;
      pointer-events: none; white-space: nowrap;
      box-shadow: 0 6px 16px rgba(0,0,0,0.18);
      display: flex; flex-direction: column; gap: 1px;
      z-index: 10;
    }
    .chart-tooltip::after {
      content: ''; position: absolute; top: 100%; left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent; border-top-color: #111827;
    }
    .tt-month  { font-size: 10px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; }
    .tt-amount { font-size: 13px; font-weight: 700; }

    .x-axis-row {
      display: flex; margin-top: 6px; padding-left: 40px;
      border-top: 1px solid #F3F4F6; padding-top: 6px;
    }
    .x-label { flex: 1; text-align: center; font-size: 11px; color: #9CA3AF; }

    .chart-stats-row {
      display: flex; align-items: center; margin-top: 14px;
      padding-top: 14px; border-top: 1px solid #F3F4F6;
    }
    .chart-stat { flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 0 12px; }
    .chart-stat:first-child { padding-left: 0; }
    .cs-sep { width: 1px; height: 30px; background: #E5E7EB; flex-shrink: 0; }
    .cs-label { font-size: 10.5px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 500; }
    .cs-value { font-size: 13px; font-weight: 700; color: #111827; }
    .cs-value.primary { color: var(--color-primary); }
    .cs-value.accent  { color: var(--color-accent); }

    /* ── Alertes ── */
    .alertes-badge {
      background: #FEE2E2; color: #DC2626;
      font-size: 12px; font-weight: 700;
      width: 24px; height: 24px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
    }
    .alertes-list { display: flex; flex-direction: column; gap: 8px; }
    .alerte-row {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 10px 12px; border-radius: 10px;
      border-left: 3px solid transparent;
    }
    .alerte-haute { background: rgba(239,68,68,0.06); border-left-color: #EF4444; }
    .alerte-moyenne { background: rgba(245,158,11,0.06); border-left-color: #F59E0B; }
    .alerte-basse { background: rgba(59,130,246,0.06); border-left-color: #3B82F6; }
    .alerte-icon-box {
      width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .alerte-icon-box svg { width: 14px; height: 14px; }
    .alerte-haute .alerte-icon-box { background: rgba(239,68,68,0.12); }
    .alerte-haute .alerte-icon-box svg { stroke: #EF4444; }
    .alerte-moyenne .alerte-icon-box { background: rgba(245,158,11,0.12); }
    .alerte-moyenne .alerte-icon-box svg { stroke: #F59E0B; }
    .alerte-basse .alerte-icon-box { background: rgba(59,130,246,0.12); }
    .alerte-basse .alerte-icon-box svg { stroke: #3B82F6; }
    .alerte-body { flex: 1; min-width: 0; }
    .alerte-titre { font-size: 12.5px; font-weight: 600; color: #111827; }
    .alerte-desc { font-size: 11.5px; color: #6B7280; margin-top: 2px; }
    .no-alertes {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 24px 0; color: #9CA3AF;
    }
    .no-alertes svg { width: 28px; height: 28px; stroke: #10B981; }
    .no-alertes p { font-size: 13px; }

    /* ── Tables ── */
    .tables-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .table-rows { display: flex; flex-direction: column; gap: 2px; }
    .table-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 8px; border-radius: 10px; transition: background 0.1s;
    }
    .table-row:hover { background: #F8FAFC; }
    .row-avatar {
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
      background: var(--color-primary); color: white;
      font-size: 12px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .row-bien-icon {
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
      background: rgba(15,76,129,0.1);
      display: flex; align-items: center; justify-content: center;
    }
    .row-bien-icon svg { width: 16px; height: 16px; stroke: var(--color-primary); }
    .bi-appartement { background: rgba(201,152,46,0.12) !important; }
    .bi-appartement svg { stroke: var(--color-accent) !important; }
    .bi-villa { background: rgba(16,185,129,0.1) !important; }
    .bi-villa svg { stroke: #10B981 !important; }
    .bi-commercial, .bi-bureau { background: rgba(139,92,246,0.1) !important; }
    .bi-commercial svg, .bi-bureau svg { stroke: #7C3AED !important; }
    .row-info { flex: 1; min-width: 0; }
    .row-name { font-size: 13px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .row-sub { font-size: 11.5px; color: #9CA3AF; margin-top: 1px; }
    .row-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }

    /* ── Responsive ── */
    @media (max-width: 1200px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .actions-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 900px) {
      .chart-alerts-grid { grid-template-columns: 1fr; }
      .tables-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .dash-body { padding: 16px; }
      .topbar { padding: 0 16px; }
      .topbar-user-info { display: none; }
      .greeting-banner { flex-direction: column; align-items: flex-start; gap: 16px; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  kpis: DashboardKPI = {
    totalBiens: 0, biensOccupes: 0, biensVacants: 0,
    totalLocataires: 0, revenusMensuels: 0, revenusAnnuels: 0,
    impayes: 0, tauxOccupation: 0
  };
  revenus: RevenuMensuel[] = [];
  alertes: Alerte[] = [];
  derniersPaiements: DernierPaiement[] = [];
  derniersBiens: DernierBien[] = [];

  loadingKPIs = true;
  loadingRevenus = true;
  loadingAlertes = true;
  loadingPaiements = true;
  loadingBiens = true;

  utilisateurPrenom = 'Propriétaire';
  initiales = 'P';
  dateCourante = '';
  anneeEnCours = new Date().getFullYear();

  readonly CHART_W = 540;
  readonly CHART_H = 160;
  readonly PAD_T = 12;
  readonly PAD_B = 8;
  activePointIndex: number | null = null;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.setDateCourante();
    this.loadUtilisateur();
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.dashboardService.getKPIs().subscribe({ next: d => { this.kpis = d; this.loadingKPIs = false; } });
    this.dashboardService.getRevenusMensuels().subscribe({ next: d => { this.revenus = d; this.loadingRevenus = false; } });
    this.dashboardService.getAlertes().subscribe({ next: d => { this.alertes = d; this.loadingAlertes = false; } });
    this.dashboardService.getDerniersPaiements().subscribe({ next: d => { this.derniersPaiements = d; this.loadingPaiements = false; } });
    this.dashboardService.getDerniersBiens().subscribe({ next: d => { this.derniersBiens = d; this.loadingBiens = false; } });
  }

  setDateCourante(): void {
    this.dateCourante = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  loadUtilisateur(): void {
    try {
      const raw = localStorage.getItem('warah_user');
      if (raw) {
        const u = JSON.parse(raw);
        this.utilisateurPrenom = u.prenom || 'Propriétaire';
        this.initiales = ((u.prenom?.[0] || '') + (u.nom?.[0] || '')).toUpperCase() || 'P';
      }
    } catch {}
  }

  get maxRevenu(): number {
    if (!this.revenus.length) return 1000000;
    return Math.max(...this.revenus.map(r => r.montant));
  }

  get totalRevenus(): number {
    return this.revenus.reduce((s, r) => s + r.montant, 0);
  }

  get moyenneRevenu(): number {
    return this.revenus.length ? this.totalRevenus / this.revenus.length : 0;
  }

  get meilleurMois(): string {
    if (!this.revenus.length) return '—';
    return this.revenus.reduce((best, r) => r.montant > best.montant ? r : best).mois;
  }

  get chartPoints(): { x: number; y: number; xPct: number; yPct: number; r: RevenuMensuel }[] {
    const n = this.revenus.length;
    if (!n) return [];
    const innerH = this.CHART_H - this.PAD_T - this.PAD_B;
    const max = this.maxRevenu;
    return this.revenus.map((r, i) => {
      const x = n > 1 ? (i * this.CHART_W / (n - 1)) : this.CHART_W / 2;
      const y = this.PAD_T + innerH * (1 - r.montant / max);
      return { x, y, xPct: (x / this.CHART_W) * 100, yPct: (y / this.CHART_H) * 100, r };
    });
  }

  get activePoint() {
    if (this.activePointIndex === null) return null;
    return this.chartPoints[this.activePointIndex] ?? null;
  }

  get svgLinePath(): string {
    const pts = this.chartPoints;
    if (!pts.length) return '';
    if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];
      const cp1x = +(p1.x + (p2.x - p0.x) / 6).toFixed(2);
      const cp1y = +(p1.y + (p2.y - p0.y) / 6).toFixed(2);
      const cp2x = +(p2.x - (p3.x - p1.x) / 6).toFixed(2);
      const cp2y = +(p2.y - (p3.y - p1.y) / 6).toFixed(2);
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  }

  get svgAreaPath(): string {
    const pts = this.chartPoints;
    if (!pts.length) return '';
    const bottomY = this.CHART_H - this.PAD_B;
    return `${this.svgLinePath} L ${pts[pts.length - 1].x},${bottomY} L ${pts[0].x},${bottomY} Z`;
  }

  get yGridLines(): number[] {
    const innerH = this.CHART_H - this.PAD_T - this.PAD_B;
    return [1, 0.75, 0.5, 0.25, 0].map(p => this.PAD_T + innerH * (1 - p));
  }

  get yGridLabels(): string[] {
    const max = this.maxRevenu;
    return [1, 0.75, 0.5, 0.25, 0].map(p =>
      p === 0 ? '0' : `${Math.round(max * p / 1000)}k`
    );
  }

  onPointHover(index: number | null): void {
    this.activePointIndex = index;
  }

  initiales2(nom: string): string {
    return nom.split(' ').map(p => p[0] || '').join('').substring(0, 2).toUpperCase();
  }
}
