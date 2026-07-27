import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LokMontantFcfaComponent } from '../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';
import { CommonModule } from '@angular/common';
import { GestionnaireDashboardService, GestionnaireKPI, GestionnaireAlerte, GestionnaireBien } from '../../services/gestionnaire-dashboard.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DelegationService, DelegationReceived } from '../../../delegation/delegation.service';

@Component({
  selector: 'app-gestionnaire-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    LokMontantFcfaComponent,
    LokSkeletonComponent,
    LokEmptyStateComponent,
  ],
  template: `
    <div class="dash-page">

      <!-- ── En-tête ── -->
      <header class="dash-header">
        <div class="header-left">
          <h1 class="header-greeting">Bonjour, {{ prenomGestionnaire }}</h1>
          <p class="header-date">{{ currentDate }}</p>
        </div>
        <div class="header-right">
          <a routerLink="/gestionnaire/notifications"
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

      <!-- ── Bannière délégation ── -->
      @if (delegationRecue) {
        <div class="delegation-banner">
          <div class="delegation-icon">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <span class="delegation-text">
            <strong>Délégation active</strong> — Vous gérez le portefeuille de
            <strong>{{ delegationRecue.owner.firstName }} {{ delegationRecue.owner.lastName }}</strong>
            en leur nom.
          </span>
        </div>
      }

      <!-- ── Corps ── -->
      <div class="dash-body">

        <!-- ── KPI ── -->
        @if (loadingKPIs) {
          <div class="kpi-grid">
            @for (i of [1,2,3,4]; track i) {
              <lok-skeleton type="card"></lok-skeleton>
            }
          </div>
        } @else {
          <div class="kpi-grid">

            <div class="kpi-card">
              <div class="kpi-icon-wrap kpi-blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 21h18"></path><path d="M5 21V7l8-4 8 4v14"></path>
                </svg>
              </div>
              <span class="kpi-value">{{ statistiques.portefeuille }}</span>
              <span class="kpi-label">Biens gérés</span>
            </div>

            <div class="kpi-card">
              <div class="kpi-icon-wrap kpi-green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <span class="kpi-value">{{ statistiques.tauxOccupation }}%</span>
              <span class="kpi-label">Taux d'occupation</span>
            </div>

            <div class="kpi-card">
              <div class="kpi-icon-wrap kpi-indigo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <span class="kpi-value">
                <lok-montant-fcfa [montant]="statistiques.revenusMensuels"></lok-montant-fcfa>
              </span>
              <span class="kpi-label">Revenus gérés / mois</span>
            </div>

            <div class="kpi-card">
              <div class="kpi-icon-wrap kpi-accent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
              </div>
              <span class="kpi-value">
                <lok-montant-fcfa [montant]="statistiques.commissions"></lok-montant-fcfa>
              </span>
              <span class="kpi-label">Commissions du mois</span>
            </div>

          </div>
        }

        <!-- ── Deux colonnes : alertes + biens récents ── -->
        <div class="two-col">

          <!-- Alertes -->
          <div class="section-card">
            <div class="section-header">
              <h2 class="section-title">Alertes actives</h2>
              @if (alertes.length > 0) {
                <span class="count-badge danger">{{ alertes.length }}</span>
              }
              <a routerLink="/gestionnaire/notifications" class="see-all">Voir tout →</a>
            </div>

            @if (loadingAlertes) {
              <lok-skeleton type="list"></lok-skeleton>
            } @else if (alertes.length === 0) {
              <lok-empty-state message="Aucune alerte active"></lok-empty-state>
            } @else {
              <div class="alerts-list">
                @for (alert of alertes; track alert.id) {
                  <div class="alert-item alert-{{ alert.type }}">
                    <div class="alert-body">
                      <span class="alert-titre">{{ alert.titre }}</span>
                      <span class="alert-detail">{{ alert.detail }}</span>
                    </div>
                    <span class="alert-pill">{{ alert.badge }}</span>
                    <button class="btn-traiter" (click)="traiterAlerte(alert.id)">Traiter</button>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Biens récents -->
          <div class="section-card">
            <div class="section-header">
              <h2 class="section-title">Biens récents</h2>
              <a routerLink="/gestionnaire/biens" class="see-all">Voir tout →</a>
            </div>

            @if (biens.length === 0) {
              <lok-empty-state message="Aucun bien dans le portefeuille"></lok-empty-state>
            } @else {
              <div class="biens-list">
                @for (bien of biens; track bien.id) {
                  <a [routerLink]="['/gestionnaire/biens', bien.id]" class="bien-row">
                    <div class="bien-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 21h18"></path><path d="M5 21V7l8-4 8 4v14"></path>
                      </svg>
                    </div>
                    <div class="bien-info">
                      <span class="bien-nom">{{ bien.titre }}</span>
                      <span class="bien-adresse">{{ bien.adresse }}</span>
                    </div>
                    <span class="statut-pill" [class.occupe]="bien.statut === 'OCCUPE'" [class.vacant]="bien.statut === 'VACANT'">
                      {{ bien.statut === 'OCCUPE' ? 'Occupé' : 'Vacant' }}
                    </span>
                  </a>
                }
              </div>
            }
          </div>

        </div>

        <!-- ── Actions rapides ── -->
        <div class="section-card">
          <div class="section-header">
            <h2 class="section-title">Actions rapides</h2>
          </div>
          <div class="actions-grid">

            <a routerLink="/gestionnaire/biens/nouveau" class="action-card">
              <div class="action-icon-wrap act-blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                </svg>
              </div>
              <p class="action-title">Ajouter un bien</p>
              <p class="action-sub">Nouveau bien au portefeuille</p>
            </a>

            <a routerLink="/gestionnaire/locataires/nouveau" class="action-card">
              <div class="action-icon-wrap act-green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                </svg>
              </div>
              <p class="action-title">Ajouter locataire</p>
              <p class="action-sub">Inviter un nouveau locataire</p>
            </a>

            <a routerLink="/gestionnaire/paiements/nouveau" class="action-card">
              <div class="action-icon-wrap act-indigo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <p class="action-title">Enregistrer paiement</p>
              <p class="action-sub">Nouveau paiement reçu</p>
            </a>

            <a routerLink="/gestionnaire/portefeuille" class="action-card">
              <div class="action-icon-wrap act-accent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              </div>
              <p class="action-title">Créer contrat</p>
              <p class="action-sub">Nouveau contrat de bail</p>
            </a>

            <a routerLink="/gestionnaire/rapports" class="action-card">
              <div class="action-icon-wrap act-purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </div>
              <p class="action-title">Rapports</p>
              <p class="action-sub">Rapports mensuels</p>
            </a>

            <a routerLink="/gestionnaire/export" class="action-card">
              <div class="action-icon-wrap act-gray">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </div>
              <p class="action-title">Exporter données</p>
              <p class="action-sub">PDF / Excel / CSV</p>
            </a>

          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    /* ── Page ── */
    .dash-page { background: #F0F4FA; min-height: 100vh; display: flex; flex-direction: column; }

    /* ── Header ── */
    .dash-header {
      background: white; border-bottom: 1px solid #E5E7EB;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 32px; height: 64px; position: sticky; top: 0; z-index: 20;
    }
    .header-left { display: flex; flex-direction: column; gap: 2px; }
    .header-greeting { font-size: 17px; font-weight: 700; color: var(--color-primary-dark); margin: 0; }
    .header-date { font-size: 12px; color: #9CA3AF; margin: 0; }
    .header-right { display: flex; align-items: center; gap: 12px; }

    .notif-btn {
      width: 40px; height: 40px; border-radius: 10px;
      background: #F0F4FA; border: 1px solid #E5E7EB;
      display: flex; align-items: center; justify-content: center;
      color: #6B7280; text-decoration: none; position: relative;
      transition: background 150ms;
    }
    .notif-btn:hover { background: #E5EDF7; }
    .notif-btn svg { width: 18px; height: 18px; }
    .notif-badge {
      position: absolute; top: -4px; right: -4px;
      background: #EF4444; color: white;
      font-size: 10px; font-weight: 700;
      width: 16px; height: 16px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
    }
    .header-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: var(--color-primary); color: white;
      font-size: 14px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }

    /* ── Bannière délégation ── */
    .delegation-banner {
      display: flex; align-items: center; gap: 12px;
      background: #EFF6FF; border-bottom: 1px solid #BFDBFE;
      padding: 10px 32px; font-size: 13px; color: #1E3A5F;
    }
    .delegation-icon {
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--color-primary); color: white;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .delegation-text { line-height: 1.5; }

    /* ── Corps ── */
    .dash-body { padding: 28px 32px; display: flex; flex-direction: column; gap: 24px; }

    /* ── KPI Grid ── */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

    .kpi-card {
      background: white; border-radius: 14px; padding: 20px;
      border: 1px solid #E5E7EB; display: flex; flex-direction: column; gap: 4px;
      transition: box-shadow 150ms, transform 150ms;
    }
    .kpi-card:hover { box-shadow: 0 4px 16px rgba(15,76,129,.08); transform: translateY(-2px); }

    .kpi-icon-wrap {
      width: 44px; height: 44px; border-radius: 11px;
      display: flex; align-items: center; justify-content: center; margin-bottom: 10px;
    }
    .kpi-icon-wrap svg { width: 22px; height: 22px; }

    .kpi-blue   { background: #DBEAFE; color: #2563EB; }
    .kpi-green  { background: #D1FAE5; color: #059669; }
    .kpi-indigo { background: #E0E7FF; color: #4F46E5; }
    .kpi-accent { background: #FEF3C7; color: var(--color-accent); }

    .kpi-value {
      font-size: 26px; font-weight: 800;
      color: var(--color-primary-dark); line-height: 1;
    }
    .kpi-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }

    /* ── Deux colonnes ── */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }

    /* ── Section card ── */
    .section-card {
      background: white; border-radius: 14px; padding: 24px;
      border: 1px solid #E5E7EB;
    }
    .section-header {
      display: flex; align-items: center; gap: 10px; margin-bottom: 20px;
    }
    .section-title { font-size: 15px; font-weight: 700; color: var(--color-primary-dark); margin: 0; flex: 1; }
    .count-badge {
      font-size: 11px; font-weight: 700; padding: 2px 8px;
      border-radius: 10px; color: white;
    }
    .count-badge.danger { background: #EF4444; }
    .see-all { font-size: 13px; color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .see-all:hover { text-decoration: underline; }

    /* ── Alertes ── */
    .alerts-list { display: flex; flex-direction: column; gap: 10px; }
    .alert-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border-radius: 10px; border-left: 3px solid transparent;
    }
    .alert-critical { background: #FEF2F2; border-left-color: #EF4444; }
    .alert-warning  { background: #FFFBEB; border-left-color: #F59E0B; }
    .alert-info     { background: #EFF6FF; border-left-color: #3B82F6; }

    .alert-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .alert-titre  { font-size: 13px; font-weight: 600; color: #111827; }
    .alert-detail { font-size: 12px; color: #6B7280; }

    .alert-pill {
      font-size: 11px; font-weight: 600; padding: 2px 8px;
      border-radius: 10px; color: white; white-space: nowrap;
    }
    .alert-critical .alert-pill { background: #EF4444; }
    .alert-warning  .alert-pill { background: #F59E0B; }
    .alert-info     .alert-pill { background: #3B82F6; }

    .btn-traiter {
      padding: 6px 12px; border-radius: 8px; border: 1.5px solid;
      font-size: 12px; font-weight: 500; background: transparent; cursor: pointer;
      white-space: nowrap; transition: all 150ms;
    }
    .alert-critical .btn-traiter { border-color: #EF4444; color: #EF4444; }
    .alert-critical .btn-traiter:hover { background: #EF4444; color: white; }
    .alert-warning  .btn-traiter { border-color: #F59E0B; color: #F59E0B; }
    .alert-warning  .btn-traiter:hover { background: #F59E0B; color: white; }
    .alert-info     .btn-traiter { border-color: #3B82F6; color: #3B82F6; }
    .alert-info     .btn-traiter:hover { background: #3B82F6; color: white; }

    /* ── Biens récents ── */
    .biens-list { display: flex; flex-direction: column; gap: 8px; }
    .bien-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; border-radius: 10px; text-decoration: none;
      border: 1px solid #E5E7EB; transition: background 150ms;
    }
    .bien-row:hover { background: #F0F4FA; }
    .bien-icon {
      width: 36px; height: 36px; border-radius: 9px;
      background: #EEF2FF; color: #4F46E5;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .bien-icon svg { width: 18px; height: 18px; }
    .bien-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .bien-nom    { font-size: 13px; font-weight: 600; color: #111827; }
    .bien-adresse { font-size: 12px; color: #9CA3AF; }
    .statut-pill { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px; white-space: nowrap; }
    .statut-pill.occupe { background: #D1FAE5; color: #065F46; }
    .statut-pill.vacant { background: #FEF3C7; color: #92400E; }

    /* ── Actions rapides ── */
    .actions-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .action-card {
      display: flex; flex-direction: column; align-items: flex-start;
      background: white; border: 1px solid #E5E7EB; border-radius: 12px;
      padding: 18px; text-decoration: none; cursor: pointer;
      transition: border-color 150ms, box-shadow 150ms;
    }
    .action-card:hover { border-color: var(--color-primary); box-shadow: 0 2px 10px rgba(15,76,129,.1); }

    .action-icon-wrap {
      width: 42px; height: 42px; border-radius: 11px;
      display: flex; align-items: center; justify-content: center; margin-bottom: 12px;
    }
    .action-icon-wrap svg { width: 20px; height: 20px; }

    .act-blue   { background: #DBEAFE; color: #2563EB; }
    .act-green  { background: #D1FAE5; color: #059669; }
    .act-indigo { background: #E0E7FF; color: #4F46E5; }
    .act-accent { background: #FEF3C7; color: var(--color-accent); }
    .act-purple { background: #F3E8FF; color: #9333EA; }
    .act-gray   { background: #F3F4F6; color: #6B7280; }

    .action-title { font-size: 13px; font-weight: 700; color: #111827; margin: 0 0 3px; }
    .action-sub   { font-size: 12px; color: #9CA3AF; margin: 0; }

    /* ── Responsive ── */
    @media (max-width: 1100px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 900px) {
      .two-col { grid-template-columns: 1fr; }
      .actions-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .dash-body { padding: 16px; }
      .dash-header { padding: 0 16px; }
      .kpi-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
      .actions-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class GestionnaireDashboardComponent implements OnInit {
  statistiques: GestionnaireKPI = { portefeuille: 0, tauxOccupation: 0, revenusMensuels: 0, commissions: 0 };
  alertes: GestionnaireAlerte[] = [];
  biens: GestionnaireBien[] = [];
  currentDate = '';
  prenomGestionnaire = '';
  loadingKPIs = false;
  loadingAlertes = false;
  delegationRecue: DelegationReceived | null = null;

  get initiales(): string {
    return this.prenomGestionnaire ? this.prenomGestionnaire.charAt(0).toUpperCase() : 'G';
  }

  constructor(
    private cdr: ChangeDetectorRef,
    private gestionnaireService: GestionnaireDashboardService,
    private auth: AuthService,
    private delegationService: DelegationService,
  ) {}

  ngOnInit(): void {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    this.currentDate = new Date().toLocaleDateString('fr-FR', options);

    const user = this.auth.getCurrentUser();
    this.prenomGestionnaire = user?.firstName ?? 'Gestionnaire';

    this.chargerDonnees();

    this.delegationService.getReceived().subscribe({
      next: (d) => { this.delegationRecue = d; this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  private chargerDonnees(): void {
    this.loadingKPIs = true;
    this.gestionnaireService.getKPIs().subscribe({
      next: (data) => { this.statistiques = data; this.loadingKPIs = false; this.cdr.markForCheck(); },
      error: () => { this.loadingKPIs = false; this.cdr.markForCheck(); },
    });

    this.loadingAlertes = true;
    this.gestionnaireService.getAlertes().subscribe({
      next: (data) => { this.alertes = data; this.loadingAlertes = false; this.cdr.markForCheck(); },
      error: () => { this.loadingAlertes = false; this.cdr.markForCheck(); },
    });

    this.gestionnaireService.getBiensRecents().subscribe({
      next: (data) => { this.biens = data; this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  traiterAlerte(alerteId: string): void {
    this.gestionnaireService.traiterAlerte(alerteId).subscribe({
      next: () => { this.alertes = this.alertes.filter(a => a.id !== alerteId); this.cdr.markForCheck(); },
    });
  }
}
