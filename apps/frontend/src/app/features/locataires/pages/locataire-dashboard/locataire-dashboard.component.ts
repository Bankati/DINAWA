import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-locataire-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dashboard-layout">
      <!-- Bouton menu mobile -->
      <button class="mobile-menu-btn" type="button" (click)="toggleSidebar()" aria-label="Ouvrir le menu">
        <span></span><span></span><span></span>
      </button>

      <!-- Overlay mobile -->
      @if (sidebarOpen) {
        <div class="sidebar-overlay" (click)="closeSidebar()"></div>
      }

      <!-- Sidebar -->
      <aside class="sidebar" [class.open]="sidebarOpen">
        <div class="sidebar-header">
          <div class="logo">
            <img src="/assets/warah-logo.png" alt="WARAH" class="logo-img">
          </div>
          <button class="sidebar-close-btn" type="button" (click)="closeSidebar()" aria-label="Fermer le menu">×</button>
        </div>

        <nav class="sidebar-nav" (click)="closeSidebar()">
          <a routerLink="/" class="nav-item">
            <span class="nav-icon">🏠</span>
            <span class="nav-text">Accueil</span>
          </a>
          <a routerLink="/locataires/dashboard" class="nav-item active">
            <span class="nav-icon">📊</span>
            <span class="nav-text">Dashboard</span>
          </a>
          <a routerLink="/annonces" class="nav-item">
            <span class="nav-icon">🔍</span>
            <span class="nav-text">Rechercher</span>
          </a>
          <a routerLink="/locataires" class="nav-item">
            <span class="nav-icon">⭐</span>
            <span class="nav-text">Favoris</span>
          </a>
          <a routerLink="/paiements" class="nav-item">
            <span class="nav-icon">💰</span>
            <span class="nav-text">Paiements</span>
          </a>
          <a routerLink="/biens" class="nav-item">
            <span class="nav-icon">📋</span>
            <span class="nav-text">Mes Contrats</span>
          </a>
          <a routerLink="/proprietaires" class="nav-item">
            <span class="nav-icon">👤</span>
            <span class="nav-text">Mon Profil</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <a routerLink="/auth/login" class="logout-btn">
            <span class="logout-icon">🚪</span>
            <span>Déconnexion</span>
          </a>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <div class="dashboard-container">
          <div class="dashboard-header">
            <h1 class="dashboard-title">Espace Locataire</h1>
            <p class="dashboard-subtitle">Trouvez votre logement idéal au Togo</p>
          </div>

          <div class="dashboard-stats">
            <div class="stat-card">
              <div class="stat-icon">🔍</div>
              <div class="stat-content">
                <div class="stat-value">0</div>
                <div class="stat-label">Recherches</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">⭐</div>
              <div class="stat-content">
                <div class="stat-value">0</div>
                <div class="stat-label">Favoris</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">📝</div>
              <div class="stat-content">
                <div class="stat-value">0</div>
                <div class="stat-label">Demandes</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🏠</div>
              <div class="stat-content">
                <div class="stat-value">0</div>
                <div class="stat-label">Logements</div>
              </div>
            </div>
          </div>

          <div class="dashboard-actions">
            <button routerLink="/annonces" class="action-btn primary">
              <span>🔍</span> Rechercher un logement
            </button>
            <button routerLink="/locataires" class="action-btn secondary">
              <span>⭐</span> Voir mes favoris
            </button>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: `
    .dashboard-layout {
      display: flex;
      min-height: 100vh;
    }

    /* Bouton menu mobile */
    .mobile-menu-btn {
      display: none;
      position: fixed;
      top: 1rem;
      left: 1rem;
      z-index: 200;
      width: 44px;
      height: 44px;
      border-radius: 10px;
      border: none;
      background: var(--color-primary);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      cursor: pointer;
    }

    .mobile-menu-btn span {
      display: block;
      width: 20px;
      height: 2px;
      background: white;
      border-radius: 2px;
    }

    .sidebar-overlay {
      display: none;
    }

    .sidebar-close-btn {
      display: none;
    }

    /* Sidebar Styles */
    .sidebar {
      width: 260px;
      background: linear-gradient(180deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
      display: flex;
      flex-direction: column;
      position: fixed;
      left: 0;
      top: 0;
      height: 100vh;
      box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
      z-index: 100;
    }

    .sidebar-header {
      padding: 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .logo-img {
      height: 86px;
      width: auto;
      object-fit: contain;
      border-radius: 8px;
      padding: 4px 8px;
      background: white;
    }

    .sidebar-nav {
      flex: 1;
      padding: 1rem 0;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1.5rem;
      color: rgba(255, 255, 255, 0.7);
      text-decoration: none;
      transition: all 0.2s;
      border-left: 3px solid transparent;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .nav-item.active {
      background: rgba(255, 255, 255, 0.15);
      color: white;
      border-left-color: var(--color-accent);
    }

    .nav-icon {
      font-size: 1.25rem;
    }

    .nav-text {
      font-size: 0.9375rem;
      font-weight: 500;
    }

    .sidebar-footer {
      padding: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1.5rem;
      color: rgba(255, 255, 255, 0.7);
      text-decoration: none;
      transition: all 0.2s;
      border-radius: 8px;
    }

    .logout-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .logout-icon {
      font-size: 1.25rem;
    }

    /* Main Content Styles */
    .main-content {
      flex: 1;
      margin-left: 260px;
    }

    .dashboard-container {
      padding: 2rem;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
    }

    .dashboard-header {
      margin-bottom: 2rem;
    }

    .dashboard-title {
      font-size: 2rem;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 0.5rem;
    }

    .dashboard-subtitle {
      font-size: 1rem;
      color: #666;
    }

    .dashboard-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .stat-icon {
      font-size: 2rem;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1a1a1a;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #666;
    }

    .dashboard-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .action-btn {
      padding: 1rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }

    .action-btn.primary {
      background: white;
      color: #667eea;
    }

    .action-btn.primary:hover {
      background: #f5f5f5;
    }

    .action-btn.secondary {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .action-btn.secondary:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    @media (max-width: 1024px) {
      .sidebar {
        width: 220px;
      }

      .main-content {
        margin-left: 220px;
      }
    }

    @media (max-width: 768px) {
      .mobile-menu-btn {
        display: flex;
      }

      .sidebar-overlay {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 99;
      }

      .sidebar-close-btn {
        display: block;
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        line-height: 1;
        cursor: pointer;
        padding: 0.25rem 0.5rem;
      }

      .sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s;
        width: 280px;
      }

      .sidebar.open {
        transform: translateX(0);
      }

      .main-content {
        margin-left: 0;
        padding-top: 3.5rem;
      }

      .dashboard-container {
        padding: 1rem;
      }

      .dashboard-title {
        font-size: 1.5rem;
      }

      .dashboard-stats {
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .dashboard-actions {
        flex-direction: column;
      }

      .action-btn {
        width: 100%;
      }
    }

    @media (max-width: 480px) {
      .dashboard-stats {
        grid-template-columns: 1fr;
      }
    }
  `
})
export class LocataireDashboardComponent {
  sidebarOpen = false;

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }
}
