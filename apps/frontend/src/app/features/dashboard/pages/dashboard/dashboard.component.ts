import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardService, DashboardKPI, RevenuMensuel, Alerte, DernierPaiement, DernierBien } from '../../services/dashboard.service';
import { LokMontantFcfaComponent } from '../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component';
import { LokBadgePaiementComponent } from '../../../../shared/components/lok-badge-paiement/lok-badge-paiement.component';
import { LokBadgeStatutComponent } from '../../../../shared/components/lok-badge-statut/lok-badge-statut.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { FcfaPipe } from '../../../../shared/pipes/fcfa.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LokMontantFcfaComponent,
    LokBadgePaiementComponent,
    LokBadgeStatutComponent,
    LokSkeletonComponent,
    FcfaPipe
  ],
  template: `
    <div class="dash-page">

      <!-- ── En-tête ── -->
      <header class="dash-header">
        <div class="header-left">
          <h1 class="header-greeting">Bonjour, {{ utilisateurPrenom }}</h1>
          <p class="header-date">{{ dateCourante }}</p>
        </div>
        <div class="header-right">
          <a routerLink="/dashboard/notifications"
             class="notif-btn" [class.has-alertes]="alertes.length > 0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            @if (alertes.length > 0) {
              <span class="notif-badge">{{ alertes.length }}</span>
            }
          </a>
          <div class="header-avatar">{{ initiales }}</div>
        </div>
      </header>

      <!-- ── Corps ── -->
      <div class="dash-body">

        <!-- ── KPI asymétrique ── -->
        <div class="kpi-layout">
          @if (loadingKPIs) {
            <div class="kpi-hero-card"><lok-skeleton type="card" style="height:100%;min-height:220px"></lok-skeleton></div>
            <div class="kpi-biens-card"><lok-skeleton type="card"></lok-skeleton></div>
            <div class="kpi-taux-card"><lok-skeleton type="card"></lok-skeleton></div>
            <div class="kpi-impayes-card"><lok-skeleton type="card"></lok-skeleton></div>
          } @else {

            <!-- Hero : Revenus -->
            <div class="kpi-hero-card">
              <p class="kpi-h-eyebrow">Revenus ce mois</p>
              <p class="kpi-h-amount">{{ kpis.revenusMensuels | fcfa }}</p>
              <p class="kpi-h-trend">&#8593;&nbsp;+5&nbsp;% vs mois dernier</p>
              <div class="kpi-h-sep"></div>
              <div class="kpi-h-footer">
                <span class="kpi-h-ann-label">Total annuel</span>
                <span class="kpi-h-ann-val">{{ kpis.revenusAnnuels | fcfa }}</span>
              </div>
            </div>

            <!-- Biens (large) -->
            <div class="kpi-biens-card">
              <p class="kpi-label">Parc immobilier</p>
              <div class="kpi-biens-row">
                <p class="kpi-big">{{ kpis.totalBiens }}</p>
                <div class="biens-pills">
                  <span class="biens-pill occ">{{ kpis.biensOccupes }} occupés</span>
                  <span class="biens-pill vac">{{ kpis.biensVacants }} vacants</span>
                </div>
              </div>
              <div class="biens-bar-track">
                <div class="biens-bar-fill"
                  [style.width.%]="kpis.totalBiens > 0 ? (kpis.biensOccupes / kpis.totalBiens * 100) : 0">
                </div>
              </div>
            </div>

            <!-- Taux d'occupation -->
            <div class="kpi-taux-card">
              <p class="kpi-label">Occupation</p>
              <div class="taux-body">
                <div>
                  <p class="kpi-big accent">{{ kpis.tauxOccupation }}%</p>
                  <p class="kpi-sub">{{ kpis.totalLocataires }} locataires</p>
                </div>
                <svg viewBox="0 0 44 44" class="ring-svg" aria-hidden="true">
                  <circle cx="22" cy="22" r="17" class="ring-bg"/>
                  <circle cx="22" cy="22" r="17" class="ring-fill"
                    [attr.stroke-dasharray]="(kpis.tauxOccupation / 100 * 106.81).toFixed(2) + ' 106.81'"/>
                </svg>
              </div>
            </div>

            <!-- Impayés -->
            <div class="kpi-impayes-card">
              <p class="kpi-label">Impayés</p>
              <p class="kpi-big danger">{{ kpis.impayes }}</p>
              <p class="kpi-sub">loyer{{ kpis.impayes !== 1 ? 's' : '' }} en retard</p>
              @if (kpis.impayes > 0) {
                <span class="urgent-pill">Urgent</span>
              } @else {
                <span class="ok-pill">À jour</span>
              }
            </div>

          }
        </div>

        <!-- ── Actions rapides ── -->
        <div class="quickactions-strip">
          <a routerLink="/dashboard/biens" class="qa-btn qa-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Ajouter un bien
          </a>
          <a routerLink="/dashboard/paiements" class="qa-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="4" width="22" height="16" rx="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
            Paiement
          </a>
          <a routerLink="/dashboard/locataires" class="qa-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <line x1="19" y1="8" x2="19" y2="14"></line>
              <line x1="22" y1="11" x2="16" y2="11"></line>
            </svg>
            Nouveau locataire
          </a>
          <a routerLink="/dashboard/annonces" class="qa-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            Publier une annonce
          </a>
        </div>

        <!-- ── Graphique + Alertes ── -->
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
                <div class="y-axis-labels">
                  @for (lbl of yGridLabels; track lbl) {
                    <span class="y-label">{{ lbl }}</span>
                  }
                </div>
                <div class="svg-wrapper" (mouseleave)="onPointHover(null)">
                  <svg [attr.viewBox]="'0 0 ' + CHART_W + ' ' + CHART_H"
                       class="area-chart" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="dashAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stop-color="#0F4C81" stop-opacity="0.18"/>
                        <stop offset="65%"  stop-color="#1e5fa0" stop-opacity="0.05"/>
                        <stop offset="100%" stop-color="#C9982E" stop-opacity="0.02"/>
                      </linearGradient>
                      <linearGradient id="dashLineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%"   stop-color="#0F4C81"/>
                        <stop offset="60%"  stop-color="#1a6dc0"/>
                        <stop offset="100%" stop-color="#C9982E"/>
                      </linearGradient>
                    </defs>
                    @for (gy of yGridLines; track gy) {
                      <line x1="0" [attr.y1]="gy" [attr.x2]="CHART_W" [attr.y2]="gy" class="grid-line"/>
                    }
                    <path [attr.d]="svgAreaPath" class="chart-area-fill"/>
                    <path [attr.d]="svgLinePath" class="chart-line" stroke="url(#dashLineGrad)"/>
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
              <div class="x-axis-row">
                @for (r of revenus; track r.mois) {
                  <span class="x-label">{{ r.mois }}</span>
                }
              </div>
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

        <!-- ── Paiements + Biens récents ── -->
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
    .dash-page { min-height: 100vh; background: #F2EFE9; font-family: inherit; }

    /* ── En-tête ── */
    .dash-header {
      position: sticky; top: 0; z-index: 10;
      background: #FFFFFF; border-bottom: 1px solid #EDE8DF;
      padding: 0 28px; height: 68px;
      display: flex; align-items: center; justify-content: space-between;
      box-shadow: 0 1px 8px rgba(15,76,129,0.06);
    }
    .header-left { display: flex; flex-direction: column; justify-content: center; }
    .header-greeting {
      font-size: 17px; font-weight: 700;
      color: var(--color-primary-dark); line-height: 1.2; margin: 0;
    }
    .header-date {
      font-size: 12px; color: #9CA3AF;
      margin: 2px 0 0; text-transform: capitalize;
    }
    .header-right { display: flex; align-items: center; gap: 12px; }

    .notif-btn {
      position: relative; width: 40px; height: 40px;
      border-radius: 10px; background: #F5F2ED;
      border: 1px solid #EDE8DF;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; text-decoration: none; transition: background 0.15s;
    }
    .notif-btn:hover { background: #EEE9E1; }
    .notif-btn.has-alertes { background: rgba(220,38,38,0.06); border-color: rgba(220,38,38,0.25); }
    .notif-btn svg { width: 18px; height: 18px; stroke: #4B5563; }
    .notif-badge {
      position: absolute; top: -4px; right: -4px;
      background: #DC2626; color: white; font-size: 10px; font-weight: 700;
      width: 18px; height: 18px; border-radius: 50%; border: 2px solid white;
      display: flex; align-items: center; justify-content: center;
    }
    .header-avatar {
      width: 38px; height: 38px; border-radius: 10px;
      background: var(--color-primary); color: white;
      font-weight: 700; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
    }

    /* ── Corps ── */
    .dash-body { padding: 24px 28px; display: flex; flex-direction: column; gap: 20px; }

    /* ═══════════════════════════════════
       KPI — grille asymétrique
       Colonnes : 1.5fr | 1fr | 1fr
       Hero (col 1) = 2 lignes
       Biens (cols 2-3) = ligne 1
       Taux (col 2) + Impayés (col 3) = ligne 2
    ═══════════════════════════════════ */
    .kpi-layout {
      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr;
      grid-template-rows: auto auto;
      gap: 16px;
    }

    /* Positionnement des cellules */
    .kpi-hero-card    { grid-column: 1;   grid-row: 1 / 3; }
    .kpi-biens-card   { grid-column: 2 / 4; grid-row: 1; }
    .kpi-taux-card    { grid-column: 2;   grid-row: 2; }
    .kpi-impayes-card { grid-column: 3;   grid-row: 2; }

    /* ── Hero card (revenus) ── */
    .kpi-hero-card {
      background: var(--color-primary-dark);
      border-radius: 16px; padding: 26px;
      display: flex; flex-direction: column;
      min-height: 200px;
    }
    .kpi-h-eyebrow {
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.13em;
      color: var(--color-accent); margin: 0 0 16px;
    }
    .kpi-h-amount {
      font-size: 30px; font-weight: 800;
      color: var(--color-accent); letter-spacing: -0.02em;
      line-height: 1.15; flex: 1;
    }
    .kpi-h-trend {
      font-size: 12px; color: rgba(255,255,255,0.6);
      margin: 10px 0 0;
    }
    .kpi-h-sep {
      height: 1px; background: rgba(255,255,255,0.1);
      margin: 18px 0;
    }
    .kpi-h-footer {
      display: flex; align-items: center; justify-content: space-between;
    }
    .kpi-h-ann-label {
      font-size: 10.5px; color: rgba(255,255,255,0.45);
      text-transform: uppercase; letter-spacing: 0.06em;
    }
    .kpi-h-ann-val {
      font-size: 12.5px; font-weight: 600;
      color: rgba(255,255,255,0.7);
    }

    /* ── Cards secondaires (fond blanc) ── */
    .kpi-biens-card, .kpi-taux-card, .kpi-impayes-card {
      background: white; border-radius: 16px; padding: 20px 22px;
      border: 1px solid #EDE8DF;
      box-shadow: 0 2px 10px rgba(15,76,129,0.05);
    }

    /* Labels communs */
    .kpi-label {
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.12em;
      color: #A89E8E; margin: 0 0 10px;
    }
    .kpi-big {
      font-size: 32px; font-weight: 800;
      color: var(--color-primary-dark); letter-spacing: -0.03em;
      line-height: 1; margin: 0;
    }
    .kpi-big.accent  { color: var(--color-accent); }
    .kpi-big.danger  { color: #DC2626; }
    .kpi-sub { font-size: 12px; color: #9CA3AF; margin: 5px 0 0; }

    /* Biens card */
    .kpi-biens-row {
      display: flex; align-items: center;
      justify-content: space-between; gap: 16px;
    }
    .biens-pills { display: flex; flex-direction: column; gap: 5px; align-items: flex-end; }
    .biens-pill {
      font-size: 11.5px; font-weight: 600;
      padding: 3px 10px; border-radius: 20px;
      white-space: nowrap;
    }
    .biens-pill.occ { background: rgba(201,152,46,0.12); color: #996C10; }
    .biens-pill.vac { background: #F3F4F6; color: #6B7280; }
    .biens-bar-track {
      width: 100%; height: 5px; border-radius: 99px;
      background: #EEE8DF; overflow: hidden; margin-top: 14px;
    }
    .biens-bar-fill {
      height: 100%; background: var(--color-accent);
      border-radius: 99px;
      transition: width 0.9s cubic-bezier(0.4,0,0.2,1);
    }

    /* Taux card */
    .taux-body {
      display: flex; align-items: center; justify-content: space-between;
    }
    .ring-svg {
      width: 54px; height: 54px;
      transform: rotate(-90deg); flex-shrink: 0;
    }
    .ring-bg  { fill: none; stroke: #EDE8DF; stroke-width: 4.5; }
    .ring-fill {
      fill: none; stroke: var(--color-accent); stroke-width: 4.5;
      stroke-linecap: round;
      transition: stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1);
    }

    /* Impayés card */
    .kpi-impayes-card {
      display: flex; flex-direction: column;
    }
    .urgent-pill {
      display: inline-flex; align-items: center;
      font-size: 10.5px; font-weight: 700;
      padding: 3px 10px; border-radius: 20px;
      background: rgba(220,38,38,0.1); color: #DC2626;
      margin-top: 10px; align-self: flex-start;
    }
    .ok-pill {
      display: inline-flex; align-items: center;
      font-size: 10.5px; font-weight: 700;
      padding: 3px 10px; border-radius: 20px;
      background: rgba(16,185,129,0.1); color: #059669;
      margin-top: 10px; align-self: flex-start;
    }

    /* ── Actions rapides (strip horizontal) ── */
    .quickactions-strip {
      display: flex; gap: 10px; flex-wrap: wrap;
    }
    .qa-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 9px 18px; border-radius: 8px;
      background: white; border: 1px solid #E8E1D8;
      color: #374151; font-size: 13.5px; font-weight: 500;
      text-decoration: none; white-space: nowrap;
      transition: all 0.12s;
    }
    .qa-btn svg { width: 15px; height: 15px; flex-shrink: 0; opacity: 0.8; }
    .qa-btn:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: rgba(15,76,129,0.04);
    }
    .qa-btn.qa-primary {
      background: var(--color-primary);
      border-color: var(--color-primary); color: white;
    }
    .qa-btn.qa-primary svg { opacity: 1; }
    .qa-btn.qa-primary:hover { background: var(--color-primary-dark); border-color: var(--color-primary-dark); }

    /* ── Cards génériques ── */
    .section-card {
      background: white; border-radius: 16px; padding: 20px 24px;
      box-shadow: 0 2px 12px rgba(15,76,129,0.05);
      border: 1px solid #EDE8DF;
    }
    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 18px;
    }
    .section-title {
      font-size: 14px; font-weight: 700;
      color: var(--color-primary-dark); margin: 0;
    }
    .section-tag {
      font-size: 11.5px; font-weight: 600; color: var(--color-primary);
      background: rgba(15,76,129,0.07); padding: 3px 10px; border-radius: 20px;
    }
    .voir-tout {
      font-size: 12.5px; color: var(--color-accent);
      font-weight: 600; text-decoration: none;
    }
    .voir-tout:hover { text-decoration: underline; }

    /* ── Graphique ── */
    .chart-alerts-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
    .chart-card { display: flex; flex-direction: column; }

    .chart-controls { display: flex; align-items: center; gap: 10px; }
    .chart-tabs {
      display: flex; background: #F5F2ED; border-radius: 8px;
      padding: 2px; gap: 1px;
    }
    .chart-tab {
      padding: 5px 12px; font-size: 11px; font-weight: 500; border: none;
      background: transparent; color: #7A8899; border-radius: 6px;
      cursor: pointer; transition: all 0.15s;
    }
    .chart-tab.active {
      background: white; color: var(--color-primary);
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .chart-container { display: flex; gap: 8px; margin-top: 14px; }
    .y-axis-labels {
      display: flex; flex-direction: column; justify-content: space-between;
      height: 180px; align-items: flex-end; flex-shrink: 0; width: 32px;
    }
    .y-label { font-size: 10px; color: #B0AAA0; line-height: 1; }

    .svg-wrapper { flex: 1; position: relative; height: 180px; }
    .area-chart   { width: 100%; height: 100%; overflow: visible; }

    .grid-line { stroke: #EDE8DF; stroke-width: 1; stroke-dasharray: 4 3; }
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
      opacity: 0; transition: opacity 0.2s;
    }
    .point-dot { fill: var(--color-primary); }
    .data-point.active .point-glow { opacity: 0.12; }
    .data-point.active .point-ring { opacity: 1; }

    .chart-tooltip {
      position: absolute;
      transform: translate(-50%, calc(-100% - 12px));
      background: var(--color-primary-dark); color: white;
      border-radius: 8px; padding: 6px 12px;
      pointer-events: none; white-space: nowrap;
      box-shadow: 0 6px 16px rgba(10,38,80,0.22);
      display: flex; flex-direction: column; gap: 1px; z-index: 10;
    }
    .chart-tooltip::after {
      content: ''; position: absolute; top: 100%; left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-top-color: var(--color-primary-dark);
    }
    .tt-month  { font-size: 10px; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.05em; }
    .tt-amount { font-size: 13px; font-weight: 700; }

    .x-axis-row {
      display: flex; margin-top: 6px; padding-left: 40px;
      border-top: 1px solid #F0EBE2; padding-top: 6px;
    }
    .x-label { flex: 1; text-align: center; font-size: 11px; color: #B0AAA0; }

    .chart-stats-row {
      display: flex; align-items: center; margin-top: 14px;
      padding-top: 14px; border-top: 1px solid #F0EBE2;
    }
    .chart-stat { flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 0 12px; }
    .chart-stat:first-child { padding-left: 0; }
    .cs-sep { width: 1px; height: 28px; background: #EDE8DF; flex-shrink: 0; }
    .cs-label { font-size: 10px; color: #B0AAA0; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500; }
    .cs-value { font-size: 13px; font-weight: 700; color: var(--color-primary-dark); }
    .cs-value.primary { color: var(--color-primary); }
    .cs-value.accent  { color: var(--color-accent); }

    /* ── Alertes ── */
    .alertes-badge {
      background: rgba(220,38,38,0.1); color: #DC2626;
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
    .alerte-haute   { background: rgba(220,38,38,0.05); border-left-color: #EF4444; }
    .alerte-moyenne { background: rgba(245,158,11,0.05); border-left-color: #F59E0B; }
    .alerte-basse   { background: rgba(59,130,246,0.05); border-left-color: #3B82F6; }
    .alerte-icon-box {
      width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .alerte-icon-box svg { width: 14px; height: 14px; }
    .alerte-haute   .alerte-icon-box { background: rgba(239,68,68,0.1); }
    .alerte-haute   .alerte-icon-box svg { stroke: #EF4444; }
    .alerte-moyenne .alerte-icon-box { background: rgba(245,158,11,0.1); }
    .alerte-moyenne .alerte-icon-box svg { stroke: #F59E0B; }
    .alerte-basse   .alerte-icon-box { background: rgba(59,130,246,0.1); }
    .alerte-basse   .alerte-icon-box svg { stroke: #3B82F6; }
    .alerte-body { flex: 1; min-width: 0; }
    .alerte-titre { font-size: 12.5px; font-weight: 600; color: var(--color-primary-dark); }
    .alerte-desc  { font-size: 11.5px; color: #7A8899; margin-top: 2px; }
    .no-alertes {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 24px 0; color: #B0AAA0;
    }
    .no-alertes svg { width: 28px; height: 28px; stroke: #10B981; }
    .no-alertes p   { font-size: 13px; }

    /* ── Tables ── */
    .tables-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .table-rows  { display: flex; flex-direction: column; gap: 2px; }
    .table-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 8px; border-radius: 10px; transition: background 0.1s;
    }
    .table-row:hover { background: #F5F2ED; }
    .row-avatar {
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
      background: var(--color-primary); color: white;
      font-size: 12px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .row-bien-icon {
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
      background: rgba(15,76,129,0.08);
      display: flex; align-items: center; justify-content: center;
    }
    .row-bien-icon svg { width: 16px; height: 16px; stroke: var(--color-primary); }
    .bi-appartement                { background: rgba(201,152,46,0.1) !important; }
    .bi-appartement svg            { stroke: var(--color-accent) !important; }
    .bi-villa                      { background: rgba(16,185,129,0.08) !important; }
    .bi-villa svg                  { stroke: #059669 !important; }
    .bi-commercial, .bi-bureau     { background: rgba(139,92,246,0.08) !important; }
    .bi-commercial svg, .bi-bureau svg { stroke: #7C3AED !important; }
    .row-info { flex: 1; min-width: 0; }
    .row-name { font-size: 13px; font-weight: 600; color: var(--color-primary-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .row-sub  { font-size: 11.5px; color: #9CA3AF; margin-top: 1px; }
    .row-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }

    /* ── Responsive ── */
    @media (max-width: 1280px) {
      .kpi-layout { grid-template-columns: 1.3fr 1fr 1fr; }
    }
    @media (max-width: 1100px) {
      .kpi-layout {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto auto auto;
      }
      .kpi-hero-card    { grid-column: 1 / 3; grid-row: 1; min-height: unset; }
      .kpi-biens-card   { grid-column: 1;     grid-row: 2; }
      .kpi-taux-card    { grid-column: 2;     grid-row: 2; }
      .kpi-impayes-card { grid-column: 1 / 3; grid-row: 3; }
    }
    @media (max-width: 900px) {
      .chart-alerts-grid { grid-template-columns: 1fr; }
      .tables-grid       { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .dash-header { padding: 0 16px 0 64px; }
    }
    @media (max-width: 640px) {
      .dash-body { padding: 12px; gap: 12px; }
      .header-greeting { font-size: 15px; }

      .kpi-layout { grid-template-columns: 1fr 1fr; }
      .kpi-hero-card    { grid-column: 1 / 3; grid-row: 1; min-height: unset; }
      .kpi-biens-card   { grid-column: 1 / 3; grid-row: 2; }
      .kpi-taux-card    { grid-column: 1;     grid-row: 3; }
      .kpi-impayes-card { grid-column: 2;     grid-row: 3; }

      .kpi-hero-card { padding: 20px; }
      .kpi-h-amount  { font-size: 24px; }
      .kpi-big       { font-size: 26px; }
      .kpi-biens-card, .kpi-taux-card, .kpi-impayes-card { padding: 16px; }

      .quickactions-strip { overflow-x: auto; flex-wrap: nowrap; }

      .chart-stats-row { flex-direction: column; gap: 10px; padding-top: 12px; margin-top: 12px; }
      .cs-sep { display: none; }
      .chart-stat { padding: 0; flex-direction: row; justify-content: space-between; }

      .section-card { padding: 14px; }
    }
    @media (max-width: 440px) {
      .kpi-layout { grid-template-columns: 1fr; }
      .kpi-hero-card, .kpi-biens-card,
      .kpi-taux-card, .kpi-impayes-card {
        grid-column: 1; grid-row: auto;
      }
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

  loadingKPIs     = true;
  loadingRevenus  = true;
  loadingAlertes  = true;
  loadingPaiements = true;
  loadingBiens    = true;

  utilisateurPrenom = 'Propriétaire';
  initiales   = 'P';
  dateCourante = '';
  anneeEnCours = new Date().getFullYear();

  readonly CHART_W = 540;
  readonly CHART_H = 160;
  readonly PAD_T   = 12;
  readonly PAD_B   = 8;
  activePointIndex: number | null = null;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.setDateCourante();
    this.loadUtilisateur();
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    const done = (flag: keyof this) => () => { (this as any)[flag] = false; };
    this.dashboardService.getKPIs().subscribe({ next: d => { this.kpis = d; this.loadingKPIs = false; }, error: done('loadingKPIs') });
    this.dashboardService.getRevenusMensuels().subscribe({ next: d => { this.revenus = d; this.loadingRevenus = false; }, error: done('loadingRevenus') });
    this.dashboardService.getAlertes().subscribe({ next: d => { this.alertes = d; this.loadingAlertes = false; }, error: done('loadingAlertes') });
    this.dashboardService.getDerniersPaiements().subscribe({ next: d => { this.derniersPaiements = d; this.loadingPaiements = false; }, error: done('loadingPaiements') });
    this.dashboardService.getDerniersBiens().subscribe({ next: d => { this.derniersBiens = d; this.loadingBiens = false; }, error: done('loadingBiens') });
  }

  setDateCourante(): void {
    this.dateCourante = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  loadUtilisateur(): void {
    try {
      const raw = localStorage.getItem('WARAH_user');
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
    const max    = this.maxRevenu;
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
    const pts    = this.chartPoints;
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
