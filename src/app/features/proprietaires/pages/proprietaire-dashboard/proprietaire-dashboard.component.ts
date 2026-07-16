import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-proprietaire-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dash-page">

      <!-- En-tête -->
      <header class="dash-header">
        <div class="header-left">
          <h1 class="header-greeting">Bonjour, {{ prenomUtilisateur }}</h1>
          <p class="header-date">{{ dateCourante }}</p>
        </div>
        <div class="header-right">
          <a routerLink="/proprietaires/new" class="btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Ajouter un bien
          </a>
          <div class="header-avatar">{{ initiales }}</div>
        </div>
      </header>

      <div class="page-body">

        <!-- KPI -->
        <div class="kpi-grid">
          <div class="kpi-card kpi-hero">
            <p class="kpi-eyebrow">Revenus totaux</p>
            <p class="kpi-hero-val">0 FCFA</p>
            <p class="kpi-hero-sub">Aucun paiement enregistré</p>
          </div>
          <div class="kpi-card">
            <p class="kpi-label">Biens</p>
            <p class="kpi-val">0</p>
            <p class="kpi-sub-label">logements enregistrés</p>
          </div>
          <div class="kpi-card">
            <p class="kpi-label">Locataires</p>
            <p class="kpi-val">0</p>
            <p class="kpi-sub-label">actifs</p>
          </div>
          <div class="kpi-card">
            <p class="kpi-label">Baux actifs</p>
            <p class="kpi-val">0</p>
            <p class="kpi-sub-label">contrats en cours</p>
          </div>
        </div>

        <!-- Actions rapides -->
        <div class="actions-strip">
          <p class="strip-label">Actions rapides</p>
          <div class="strip-btns">
            <a routerLink="/proprietaires/new" class="qa-btn qa-primary">
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
              Paiements
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
            <a routerLink="/dashboard/annonces/list" class="qa-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
              Annonces
            </a>
          </div>
        </div>

        <!-- État vide -->
        <div class="empty-section">
          <div class="empty-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <h3>Aucun bien enregistré</h3>
            <p>Ajoutez votre premier bien pour commencer à gérer votre parc immobilier.</p>
            <a routerLink="/proprietaires/new" class="btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Ajouter mon premier bien
            </a>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .dash-page { min-height: 100vh; background: #F2EFE9; }

    /* ── En-tête ── */
    .dash-header {
      position: sticky; top: 0; z-index: 10;
      background: #FFFFFF; border-bottom: 1px solid #EDE8DF;
      padding: 0 28px; height: 68px;
      display: flex; align-items: center; justify-content: space-between;
      box-shadow: 0 1px 8px rgba(15,76,129,0.06);
    }
    .header-left { display: flex; flex-direction: column; justify-content: center; }
    .header-right { display: flex; align-items: center; gap: 12px; }
    .header-greeting {
      font-size: 17px; font-weight: 700;
      color: var(--color-primary-dark); margin: 0; line-height: 1.2;
    }
    .header-date { font-size: 12px; color: #9CA3AF; margin: 2px 0 0; text-transform: capitalize; }
    .header-avatar {
      width: 38px; height: 38px; border-radius: 10px;
      background: var(--color-primary); color: white;
      font-weight: 700; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
    }

    .btn-primary {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 9px 18px; border-radius: 8px;
      background: var(--color-primary); color: white;
      font-size: 13.5px; font-weight: 600;
      text-decoration: none; white-space: nowrap;
      transition: background 0.12s;
    }
    .btn-primary svg { width: 15px; height: 15px; }
    .btn-primary:hover { background: var(--color-primary-dark); }

    /* ── Corps ── */
    .page-body { padding: 24px 28px; display: flex; flex-direction: column; gap: 20px; }

    /* ── KPI ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: 1.6fr 1fr 1fr 1fr;
      gap: 16px;
    }
    .kpi-card {
      background: white; border-radius: 16px; padding: 22px;
      border: 1px solid #EDE8DF;
      box-shadow: 0 2px 10px rgba(15,76,129,0.05);
    }
    .kpi-hero {
      background: var(--color-primary-dark);
      border-color: var(--color-primary-dark);
    }
    .kpi-eyebrow {
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.13em;
      color: var(--color-accent); margin: 0 0 14px;
    }
    .kpi-hero-val {
      font-size: 28px; font-weight: 800;
      color: var(--color-accent); letter-spacing: -0.02em;
      line-height: 1.1; margin: 0;
    }
    .kpi-hero-sub { font-size: 12px; color: rgba(255,255,255,0.5); margin: 8px 0 0; }
    .kpi-label {
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.12em;
      color: #A89E8E; margin: 0 0 10px;
    }
    .kpi-val {
      font-size: 34px; font-weight: 800;
      color: var(--color-primary-dark); letter-spacing: -0.03em;
      line-height: 1; margin: 0;
    }
    .kpi-sub-label { font-size: 12px; color: #9CA3AF; margin: 6px 0 0; }

    /* ── Actions rapides ── */
    .actions-strip { display: flex; flex-direction: column; gap: 12px; }
    .strip-label {
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.12em;
      color: #A89E8E; margin: 0;
    }
    .strip-btns { display: flex; gap: 10px; flex-wrap: wrap; }
    .qa-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 9px 18px; border-radius: 8px;
      background: white; border: 1px solid #E8E1D8;
      color: #374151; font-size: 13.5px; font-weight: 500;
      text-decoration: none; white-space: nowrap; transition: all 0.12s;
    }
    .qa-btn svg { width: 15px; height: 15px; flex-shrink: 0; opacity: 0.8; }
    .qa-btn:hover { border-color: var(--color-primary); color: var(--color-primary); background: rgba(15,76,129,0.04); }
    .qa-btn.qa-primary { background: var(--color-primary); border-color: var(--color-primary); color: white; }
    .qa-btn.qa-primary svg { opacity: 1; }
    .qa-btn.qa-primary:hover { background: var(--color-primary-dark); border-color: var(--color-primary-dark); }

    /* ── État vide ── */
    .empty-section { display: flex; justify-content: center; }
    .empty-card {
      background: white; border-radius: 20px;
      border: 1px solid #EDE8DF;
      box-shadow: 0 2px 12px rgba(15,76,129,0.05);
      padding: 48px 40px;
      display: flex; flex-direction: column;
      align-items: center; text-align: center;
      gap: 12px; max-width: 440px; width: 100%;
    }
    .empty-card svg { width: 56px; height: 56px; stroke: #D4C9B8; margin-bottom: 4px; }
    .empty-card h3 { font-size: 17px; font-weight: 700; color: var(--color-primary-dark); margin: 0; }
    .empty-card p  { font-size: 13.5px; color: #7A8899; margin: 0; line-height: 1.6; }
    .empty-card .btn-primary { margin-top: 8px; }

    /* ── Responsive ── */
    @media (max-width: 1100px) {
      .kpi-grid { grid-template-columns: 1fr 1fr 1fr; }
      .kpi-hero { grid-column: 1 / 3; }
    }
    @media (max-width: 768px) {
      .dash-header { padding: 0 16px 0 64px; }
      .kpi-grid { grid-template-columns: 1fr 1fr; }
      .kpi-hero { grid-column: 1 / 3; }
    }
    @media (max-width: 640px) {
      .page-body { padding: 12px; gap: 12px; }
      .header-right { gap: 8px; }
      .kpi-hero-val { font-size: 22px; }
      .kpi-val { font-size: 28px; }
      .strip-btns { overflow-x: auto; flex-wrap: nowrap; }
      .empty-card { padding: 32px 20px; }
    }
    @media (max-width: 440px) {
      .kpi-grid { grid-template-columns: 1fr; }
      .kpi-hero { grid-column: 1; }
      .header-avatar { display: none; }
    }
  `]
})
export class ProprietaireDashboardComponent implements OnInit {
  prenomUtilisateur = 'Propriétaire';
  initiales         = 'P';
  dateCourante      = '';

  ngOnInit(): void {
    this.dateCourante = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    try {
      const raw = localStorage.getItem('WARAH_user');
      if (raw) {
        const u = JSON.parse(raw);
        this.prenomUtilisateur = u.prenom || 'Propriétaire';
        this.initiales = ((u.prenom?.[0] || '') + (u.nom?.[0] || '')).toUpperCase() || 'P';
      }
    } catch {}
  }
}
