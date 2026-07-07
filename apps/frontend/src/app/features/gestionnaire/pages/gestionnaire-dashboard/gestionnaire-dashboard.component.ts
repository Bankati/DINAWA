import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LokMontantFcfaComponent } from '../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component';
import { CommonModule } from '@angular/common';
import { trigger, style, animate, transition, group, query, animateChild } from '@angular/animations';

@Component({
  selector: 'app-gestionnaire-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    LokMontantFcfaComponent
  ],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(20px)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ])
    ]),
    trigger('cardHover', [
      transition('* => *', [
        style({ transform: 'translateY(0)' }),
        animate('150ms ease-out', style({ transform: 'translateY(-2px)' }))
      ])
    ])
  ],
  template: `
    <div class="dashboard-layout" @fadeIn>
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="logo">
            <img src="/assets/warah-logo.png" alt="WARAH" class="logo-img">
          </div>
        </div>

        <!-- User Avatar -->
        <div class="user-section">
          <div class="user-avatar">GK</div>
          <div class="user-info">
            <p class="user-name">Gestionnaire Kouassi</p>
            <span class="verified-badge">Vérifié ✓</span>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="sidebar-nav">
          <a routerLink="/" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span class="nav-text">Accueil</span>
          </a>
          <a routerLink="/gestionnaire/dashboard" class="nav-item active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span class="nav-text">Dashboard</span>
          </a>
          <a routerLink="/gestionnaire/portefeuille" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            </svg>
            <span class="nav-text">Portefeuille</span>
          </a>
          <a routerLink="/biens" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 21h18"></path>
              <path d="M5 21V7l8-4 8 4v14"></path>
            </svg>
            <span class="nav-text">Biens</span>
          </a>
          <a routerLink="/locataires" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span class="nav-text">Locataires</span>
          </a>
          <a routerLink="/paiements" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <span class="nav-text">Paiements</span>
          </a>
          <a routerLink="/contrats" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span class="nav-text">Contrats</span>
          </a>
          <a routerLink="/gestionnaire/alertes" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span class="nav-text">Alertes</span>
            <span class="alert-badge">3</span>
          </a>
          <a routerLink="/gestionnaire/parametres" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1. 51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span class="nav-text">Paramètres</span>
          </a>
        </nav>

        <!-- Logout -->
        <div class="sidebar-footer">
          <a routerLink="/auth/login" class="logout-btn">
            <svg class="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Déconnexion</span>
          </a>
          <span class="app-version">v2.1.0</span>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <!-- Header -->
        <header class="main-header">
          <div class="header-left">
            <h1 class="greeting">Bonjour, Kouassi 👋</h1>
            <p class="current-date">{{ currentDate }}</p>
          </div>

          <div class="header-center">
            <div class="search-bar">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input type="text" placeholder="Rechercher un bien, locataire..." class="search-input">
            </div>
          </div>

          <div class="header-right">
            <button class="header-btn notification-btn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span class="notification-badge">3</span>
            </button>
            <button class="header-btn">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
            <div class="header-avatar">GK</div>
          </div>
        </header>

        <!-- Dashboard Content -->
        <div class="dashboard-content">
          <!-- KPI Cards -->
          <div class="kpi-grid">
            <div class="kpi-card" @fadeIn>
              <div class="kpi-icon-wrapper building">
                <svg class="kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 21h18"></path>
                  <path d="M5 21V7l8-4 8 4v14"></path>
                </svg>
              </div>
              <div class="kpi-value">{{ statistiques.portefeuille }}</div>
              <div class="kpi-label">Biens gérés</div>
              <div class="kpi-trend">+2 ce mois</div>
            </div>

            <div class="kpi-card" @fadeIn>
              <div class="kpi-icon-wrapper percentage">
                <svg class="kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6l4 2"></path>
                </svg>
              </div>
              <div class="kpi-value">{{ statistiques.tauxOccupation }}%</div>
              <div class="kpi-label">Taux d'occupation</div>
              <div class="kpi-trend">+2.5% vs mois dernier</div>
            </div>

            <div class="kpi-card" @fadeIn>
              <div class="kpi-icon-wrapper revenue">
                <svg class="kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <div class="kpi-value">
                <lok-montant-fcfa [montant]="statistiques.revenusMensuels"></lok-montant-fcfa>
              </div>
              <div class="kpi-label">Revenus mensuels</div>
              <div class="kpi-trend">+8% vs mois dernier</div>
            </div>

            <div class="kpi-card" @fadeIn>
              <div class="kpi-icon-wrapper commission">
                <svg class="kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
              </div>
              <div class="kpi-value">
                <lok-montant-fcfa [montant]="statistiques.commissions"></lok-montant-fcfa>
              </div>
              <div class="kpi-label">Commissions</div>
              <div class="kpi-trend">Ce mois</div>
            </div>
          </div>

          <!-- Alerts Section -->
          <div class="section-card" @slideIn>
            <div class="section-header">
              <h2 class="section-title">Alertes actives</h2>
              <span class="alert-count-badge">3</span>
              <a routerLink="/gestionnaire/alertes" class="view-all-link">Voir tout →</a>
            </div>

            <div *ngIf="alertes.length === 0" class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span>Aucune alerte active</span>
            </div>
            <div *ngIf="alertes.length > 0" class="alerts-list">
              <div *ngFor="let alert of alertes; let i = index" class="alert-item alert-{{ alert.type }}" @slideIn [style.animation-delay]="i * 100 + 'ms'">
                <div class="alert-content">
                  <span class="alert-titre">{{ alert.titre }}</span>
                  <span class="alert-detail">{{ alert.detail }}</span>
                </div>
                <span class="alert-badge">{{ alert.badge }}</span>
                <button class="btn-traiter">Traiter →</button>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="section-card" @slideIn>
            <div class="section-header">
              <h2 class="section-title">Actions rapides</h2>
            </div>

            <div class="actions-grid">
              <button class="action-card" routerLink="/biens/nouveau">
                <div class="action-icon-wrapper green">
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  </svg>
                </div>
                <p class="action-title">Ajouter un bien</p>
                <p class="action-description">Nouveau bien au portefeuille</p>
              </button>

              <button class="action-card" routerLink="/locataires/nouveau">
                <div class="action-icon-wrapper blue">
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                  </svg>
                </div>
                <p class="action-title">Ajouter locataire</p>
                <p class="action-description">Nouveau locataire</p>
              </button>

              <button class="action-card" routerLink="/paiements/nouveau">
                <div class="action-icon-wrapper purple">
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <p class="action-title">Enregistrer paiement</p>
                <p class="action-description">Nouveau paiement</p>
              </button>

              <button class="action-card" routerLink="/contrats/nouveau">
                <div class="action-icon-wrapper orange">
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
                <p class="action-title">Créer contrat</p>
                <p class="action-description">Nouveau contrat de bail</p>
              </button>

              <button class="action-card" routerLink="/gestionnaire/rapports">
                <div class="action-icon-wrapper indigo">
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                </div>
                <p class="action-title">Voir rapports</p>
                <p class="action-description">Rapports mensuels</p>
              </button>

              <button class="action-card" routerLink="/export">
                <div class="action-icon-wrapper gray">
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </div>
                <p class="action-title">Exporter données</p>
                <p class="action-description">Export PDF/Excel</p>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-layout {
      display: flex;
      min-height: 100vh;
      background: #F4F6F4;
    }

    /* Sidebar Styles */
    .sidebar {
      width: 280px;
      background: var(--color-primary-900);
      position: fixed;
      left: 0;
      top: 0;
      height: 100vh;
      display: flex;
      flex-direction: column;
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
    }

    .sidebar-header {
      padding: 32px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo-img {
      height: 115px;
      width: auto;
      object-fit: contain;
      background: transparent !important;
      mix-blend-mode: multiply;
    }

    .logo-text {
      color: white;
      font-size: 22px;
      font-weight: bold;
      letter-spacing: 0.5px;
    }

    .user-section {
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .user-avatar {
      width: 56px;
      height: 56px;
      background: var(--color-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 16px;
    }

    .user-info {
      flex: 1;
    }

    .user-name {
      color: white;
      font-size: 15px;
      font-weight: 500;
      margin: 0 0 6px 0;
    }

    .verified-badge {
      color: #4ADE80;
      font-size: 12px;
      background: rgba(74, 222, 128, 0.1);
      padding: 4px 10px;
      border-radius: 12px;
    }

    .sidebar-nav {
      flex: 1;
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      border-radius: 12px;
      color: rgba(255, 255, 255, 0.7);
      text-decoration: none;
      transition: all 150ms ease;
      cursor: pointer;
      position: relative;
      border-left: 3px solid transparent;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.08);
      color: white;
    }

    .nav-item.active {
      background: var(--color-primary);
      color: white;
      border-left-color: #4ADE80;
    }

    .nav-icon {
      width: 24px;
      height: 24px;
    }

    .nav-item.active .nav-icon {
      color: #4ADE80;
    }

    .nav-text {
      font-size: 15px;
      font-weight: 500;
    }

    .alert-badge {
      background: #EF4444;
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
      min-width: 20px;
      text-align: center;
    }

    .sidebar-footer {
      padding: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      border-radius: 12px;
      color: rgba(255, 255, 255, 0.7);
      text-decoration: none;
      transition: all 150ms ease;
      cursor: pointer;
    }

    .logout-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: white;
    }

    .logout-icon {
      width: 24px;
      height: 24px;
    }

    .app-version {
      display: block;
      text-align: center;
      color: rgba(255, 255, 255, 0.3);
      font-size: 12px;
      margin-top: 16px;
    }

    /* Main Content */
    .main-content {
      margin-left: 280px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    /* Header */
    .main-header {
      height: 64px;
      background: white;
      border-bottom: 1px solid #E8EDE8;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      position: sticky;
      top: 0;
      z-index: 10;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .header-left {
      display: flex;
      flex-direction: column;
    }

    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 0;
    }

    .current-date {
      font-size: 12px;
      color: #666;
      margin: 2px 0 0 0;
    }

    .header-center {
      flex: 1;
      max-width: 400px;
      margin: 0 32px;
    }

    .search-bar {
      display: flex;
      align-items: center;
      background: #F4F6F4;
      border-radius: 20px;
      padding: 8px 16px;
      gap: 8px;
    }

    .search-icon {
      width: 18px;
      height: 18px;
      color: #999;
    }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 14px;
      outline: none;
    }

    .search-input::placeholder {
      color: #999;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-btn {
      width: 40px;
      height: 40px;
      border: none;
      background: transparent;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 150ms ease;
      position: relative;
    }

    .header-btn:hover {
      background: #F4F6F4;
    }

    .btn-icon {
      width: 20px;
      height: 20px;
      color: #666;
    }

    .notification-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      background: #EF4444;
      color: white;
      font-size: 10px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .header-avatar {
      width: 40px;
      height: 40px;
      background: var(--color-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
      cursor: pointer;
    }

    /* Dashboard Content */
    .dashboard-content {
      padding: 32px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .section-card {
      margin-bottom: 24px;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 16px !important;
      width: 100% !important;
      margin-bottom: 32px;
    }

    .kpi-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      border: 1px solid #E8EDE8;
      transition: all 150ms ease;
    }

    .kpi-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    .kpi-icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }

    .kpi-icon-wrapper.building {
      background: #DCFCE7;
    }

    .kpi-icon-wrapper.building .kpi-icon {
      color: #16A34A;
    }

    .kpi-icon-wrapper.percentage {
      background: #DBEAFE;
    }

    .kpi-icon-wrapper.percentage .kpi-icon {
      color: #3B82F6;
    }

    .kpi-icon-wrapper.revenue {
      background: #E9D5FF;
    }

    .kpi-icon-wrapper.revenue .kpi-icon {
      color: #9333EA;
    }

    .kpi-icon-wrapper.commission {
      background: #FED7AA;
    }

    .kpi-icon-wrapper.commission .kpi-icon {
      color: #EA580C;
    }

    .kpi-icon {
      width: 24px;
      height: 24px;
    }

    .kpi-label {
      font-size: 12px;
      color: #666;
      margin: 0;
    }

    .kpi-value {
      font-size: 36px !important;
      font-weight: 700 !important;
      color: var(--color-primary-900) !important;
      display: block !important;
      margin: 12px 0 8px !important;
      visibility: visible !important;
      opacity: 1 !important;
    }

    .kpi-trend {
      font-size: 12px;
      color: #16A34A;
      margin: 0;
    }

    /* Section Card */
    .section-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      border: 1px solid #E8EDE8;
      margin-bottom: 24px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 0;
      flex: 1;
    }

    .alert-count-badge {
      background: #EF4444;
      color: white;
      font-size: 12px;
      padding: 4px 12px;
      border-radius: 12px;
    }

    .view-all-link {
      color: var(--color-primary);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
    }

    .view-all-link:hover {
      text-decoration: underline;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #999;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .empty-state svg {
      width: 48px;
      height: 48px;
      color: #D1D5DB;
    }

    /* Alerts List */
    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .alert-item {
      padding: 16px;
      border-radius: 10px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .alert-critical {
      background: #FEF2F2;
      border-left: 3px solid #EF4444;
    }

    .alert-warning {
      background: #FFFBEB;
      border-left: 3px solid #F59E0B;
    }

    .alert-info {
      background: #EFF6FF;
      border-left: 3px solid #3B82F6;
    }

    .alert-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .alert-titre {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .alert-detail {
      font-size: 12px;
      color: #666;
    }

    .alert-badge {
      font-size: 11px;
      padding: 4px 12px;
      border-radius: 12px;
      font-weight: 500;
      background: #EF4444;
      color: white;
    }

    .alert-warning .alert-badge {
      background: #F59E0B;
    }

    .alert-info .alert-badge {
      background: #3B82F6;
    }

    .btn-traiter {
      padding: 8px 16px;
      border: 2px solid;
      border-radius: 8px;
      background: transparent;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .alert-critical .btn-traiter {
      border-color: #EF4444;
      color: #EF4444;
    }

    .alert-critical .btn-traiter:hover {
      background: #EF4444;
      color: white;
    }

    .alert-warning .btn-traiter {
      border-color: #F59E0B;
      color: #F59E0B;
    }

    .alert-warning .btn-traiter:hover {
      background: #F59E0B;
      color: white;
    }

    .alert-info .btn-traiter {
      border-color: #3B82F6;
      color: #3B82F6;
    }

    .alert-info .btn-traiter:hover {
      background: #3B82F6;
      color: white;
    }

    /* Actions Grid */
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .action-card {
      background: white;
      border: 1px solid #E8EDE8;
      border-radius: 12px;
      padding: 20px;
      text-align: left;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .action-card:hover {
      border-color: var(--color-primary);
      background: #F4F6F4;
    }

    .action-icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }

    .action-icon-wrapper.green {
      background: #DCFCE7;
    }

    .action-icon-wrapper.green .action-icon {
      color: #16A34A;
    }

    .action-icon-wrapper.blue {
      background: #DBEAFE;
    }

    .action-icon-wrapper.blue .action-icon {
      color: #3B82F6;
    }

    .action-icon-wrapper.purple {
      background: #E9D5FF;
    }

    .action-icon-wrapper.purple .action-icon {
      color: #9333EA;
    }

    .action-icon-wrapper.orange {
      background: #FED7AA;
    }

    .action-icon-wrapper.orange .action-icon {
      color: #EA580C;
    }

    .action-icon-wrapper.indigo {
      background: #E0E7FF;
    }

    .action-icon-wrapper.indigo .action-icon {
      color: #6366F1;
    }

    .action-icon-wrapper.gray {
      background: #F3F4F6;
    }

    .action-icon-wrapper.gray .action-icon {
      color: #6B7280;
    }

    .action-icon {
      width: 24px;
      height: 24px;
    }

    .action-title {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 0 0 4px 0;
    }

    .action-description {
      font-size: 12px;
      color: #666;
      margin: 0;
    }

    /* SVG Icon Sizing */
    svg {
      width: 24px;
      height: 24px;
    }

    /* Responsive */
    @media (max-width: 1280px) {
      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .sidebar {
        width: 70px;
      }

      .sidebar-header,
      .user-section,
      .sidebar-footer {
        display: none;
      }

      .nav-text {
        display: none;
      }

      .nav-item {
        justify-content: center;
        padding: 16px;
      }

      .main-content {
        margin-left: 70px;
      }
    }

    @media (max-width: 768px) {
      .kpi-grid {
        grid-template-columns: 1fr;
      }

      .actions-grid {
        grid-template-columns: 1fr;
      }

      .main-header {
        padding: 0 16px;
      }

      .header-center {
        display: none;
      }

      .dashboard-content {
        padding: 16px;
      }

      .sidebar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        height: 60px;
        flex-direction: row;
        z-index: 100;
      }

      .sidebar-nav {
        flex-direction: row;
        padding: 8px;
        justify-content: space-around;
      }

      .sidebar-footer {
        display: flex !important;
        align-items: center;
        padding: 0 12px;
        border-top: none;
      }

      .sidebar-footer .app-version {
        display: none;
      }

      .logout-btn span:last-child {
        display: none;
      }

      .main-content {
        margin-left: 0;
        margin-bottom: 60px;
      }
    }
  `]
})
export class GestionnaireDashboardComponent implements OnInit {
  statistiques = {
    portefeuille: 15,
    tauxOccupation: 85,
    revenusMensuels: 1250000,
    commissions: 125000
  };

  alertes = [
    {
      type: 'critical',
      titre: 'Loyer en retard - Appartement Lomé Centre',
      detail: 'Paul Mensah · 5 jours de retard',
      badge: 'URGENT'
    },
    {
      type: 'warning',
      titre: 'Contrat expire bientôt - Villa Sokodé',
      detail: 'Kofi Adzo · Expire dans 15 jours',
      badge: '15 JOURS'
    },
    {
      type: 'info',
      titre: 'Nouvelle demande de visite - Studio Kara',
      detail: '3 candidats intéressés',
      badge: '3 CANDIDATS'
    }
  ];

  biens = [
    {
      id: 1,
      titre: 'Appartement Lomé Centre',
      adresse: 'Rue du Commerce, Lomé',
      loyer: 250000,
      statut: 'OCCUPE'
    },
    {
      id: 2,
      titre: 'Villa Kodjoviakopé',
      adresse: 'Quartier Kodjoviakopé, Lomé',
      loyer: 450000,
      statut: 'VACANT'
    }
  ];

  currentDate: string = '';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.updateDate();
  }

  updateDate(): void {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    this.currentDate = new Date().toLocaleDateString('fr-FR', options);
  }
}
