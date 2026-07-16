import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-proprietaire-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="layout">
      <button class="mobile-btn" type="button" (click)="sidebarOpen = !sidebarOpen" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>

      @if (sidebarOpen) {
        <div class="overlay" (click)="sidebarOpen = false"></div>
      }

      <aside class="sidebar" [class.open]="sidebarOpen">

        <div class="sidebar-logo">
          <div class="logo-wrap">
            <img src="/assets/WARAH-logo.png" alt="WARAH" class="logo-img">
          </div>
          <button class="close-btn" type="button" (click)="sidebarOpen = false" aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <nav class="sidebar-nav" (click)="sidebarOpen = false">
          <a routerLink="/dashboard" routerLinkActive="active"
             [routerLinkActiveOptions]="{exact:true}" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1"></rect>
              <rect x="14" y="14" width="7" height="7" rx="1"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1"></rect>
            </svg>
            <span>Tableau de bord</span>
          </a>

          <p class="nav-group">Gestion</p>

          <a routerLink="/dashboard/biens" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Mes biens</span>
          </a>

          <a routerLink="/dashboard/locataires" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Locataires</span>
          </a>

          <a routerLink="/dashboard/paiements" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
            <span>Paiements</span>
          </a>

          <a routerLink="/dashboard/annonces" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span>Annonces</span>
          </a>

          <p class="nav-group">Compte</p>

          <a routerLink="/dashboard/notifications" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span>Notifications</span>
          </a>

          <a routerLink="/dashboard/export" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Export</span>
          </a>
        </nav>

        <div class="sidebar-bottom">
          <div class="user-card">
            <div class="user-avatar">{{ initiales }}</div>
            <div class="user-info">
              <p class="user-name">{{ prenom }} {{ nom }}</p>
              <span class="user-role">Propriétaire</span>
            </div>
          </div>
          <div class="sidebar-footer">
            <a routerLink="/" class="footer-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span>Accueil</span>
            </a>
            <button class="logout-btn" type="button" (click)="deconnecter()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Déconnexion</span>
            </button>
          </div>
        </div>

      </aside>

      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      min-height: 100vh;
      background: #F2EFE9;
    }

    /* ── Bouton hamburger mobile ── */
    .mobile-btn {
      display: none;
      position: fixed;
      top: 1rem; left: 1rem; z-index: 200;
      width: 44px; height: 44px;
      border-radius: 10px; border: none;
      background: var(--color-primary);
      box-shadow: 0 4px 12px rgba(15,76,129,0.35);
      flex-direction: column; align-items: center;
      justify-content: center; gap: 5px; cursor: pointer;
    }
    .mobile-btn span {
      display: block; width: 20px; height: 2px;
      background: white; border-radius: 2px;
      transition: all 0.2s;
    }

    .overlay {
      position: fixed; inset: 0; z-index: 99;
      background: rgba(10,20,45,0.4);
      backdrop-filter: blur(3px);
    }

    /* ── Sidebar ── */
    .sidebar {
      width: 256px;
      background: #FFFFFF;
      border-right: 1px solid #E8E1D8;
      display: flex; flex-direction: column;
      position: fixed; left: 0; top: 0;
      height: 100vh; z-index: 100;
      box-shadow: 2px 0 24px rgba(15,76,129,0.05);
      transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    }

    /* ── Logo ── */
    .sidebar-logo {
      padding: 20px 18px 18px;
      border-bottom: 1px solid #EEE8DF;
      display: flex; align-items: center;
      justify-content: space-between; flex-shrink: 0;
    }
    .logo-wrap {
      padding: 4px 8px; border-radius: 8px;
      background: rgba(15,76,129,0.05);
      display: inline-flex; align-items: center;
    }
    .logo-img { height: 38px; width: auto; display: block; }

    .close-btn {
      display: none; background: none; border: none;
      color: #9CA3AF; cursor: pointer;
      padding: 4px; border-radius: 6px; transition: all 0.15s;
    }
    .close-btn svg { width: 20px; height: 20px; }
    .close-btn:hover { color: #4B5563; background: #F3F4F6; }

    /* ── Navigation ── */
    .sidebar-nav {
      flex: 1; padding: 14px 10px;
      overflow-y: auto; scrollbar-width: thin;
      scrollbar-color: #E8E1D8 transparent;
    }

    .nav-group {
      font-size: 9.5px; font-weight: 700;
      letter-spacing: 0.12em; text-transform: uppercase;
      color: #C4B99E; padding: 14px 12px 6px; margin: 0;
    }

    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border-radius: 8px;
      color: #54626E; text-decoration: none;
      font-size: 13.5px; font-weight: 500;
      transition: all 0.12s ease;
      margin-bottom: 2px;
      border-left: 3px solid transparent;
    }
    .nav-item:hover {
      background: #F4F0EA;
      color: var(--color-primary-dark);
    }
    .nav-item.active {
      background: rgba(15,76,129,0.07);
      color: var(--color-primary);
      border-left-color: var(--color-accent);
      font-weight: 600;
    }
    .nav-icon { width: 17px; height: 17px; flex-shrink: 0; opacity: 0.75; }
    .nav-item:hover .nav-icon,
    .nav-item.active .nav-icon { opacity: 1; }

    /* ── Bas de sidebar : utilisateur + déconnexion ── */
    .sidebar-bottom { border-top: 1px solid #EEE8DF; flex-shrink: 0; }

    .user-card {
      padding: 14px 18px; border-bottom: 1px solid #EEE8DF;
      display: flex; align-items: center; gap: 11px;
    }
    .user-avatar {
      width: 38px; height: 38px; border-radius: 9px; flex-shrink: 0;
      background: var(--color-primary); color: white;
      font-weight: 700; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
    }
    .user-name {
      font-size: 13px; font-weight: 600;
      color: var(--color-primary-dark); line-height: 1.3;
    }
    .user-role {
      display: inline-block; font-size: 10px; font-weight: 700;
      color: var(--color-accent); letter-spacing: 0.08em;
      text-transform: uppercase; margin-top: 2px;
    }

    .sidebar-footer {
      padding: 8px 10px 16px;
      display: flex; flex-direction: column; gap: 1px;
    }
    .footer-item, .logout-btn {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 14px; border-radius: 7px;
      color: #54626E; font-size: 13.5px; font-weight: 500;
      text-decoration: none; transition: all 0.12s;
      background: none; border: none; cursor: pointer;
      width: 100%; text-align: left;
    }
    .footer-item svg, .logout-btn svg {
      width: 16px; height: 16px; flex-shrink: 0; opacity: 0.7;
    }
    .footer-item:hover { background: #F4F0EA; color: var(--color-primary-dark); }
    .logout-btn:hover { background: rgba(220,38,38,0.07); color: #DC2626; }

    /* ── Contenu principal ── */
    .main-content {
      flex: 1; margin-left: 256px;
      min-height: 100vh; overflow-x: hidden;
    }

    @media (max-width: 1024px) {
      .sidebar { width: 240px; }
      .main-content { margin-left: 240px; }
    }

    @media (max-width: 768px) {
      .mobile-btn { display: flex; }
      .close-btn  { display: flex; }
      .sidebar { transform: translateX(-100%); width: 280px; }
      .sidebar.open { transform: translateX(0); }
      .main-content { margin-left: 0; padding-top: 3.5rem; }
    }
  `]
})
export class ProprietaireLayoutComponent implements OnInit {
  sidebarOpen = false;
  prenom = '';
  nom = '';
  initiales = 'P';

  ngOnInit(): void {
    try {
      const raw = localStorage.getItem('WARAH_user');
      if (raw) {
        const u = JSON.parse(raw);
        this.prenom = u.prenom || '';
        this.nom = u.nom || '';
        this.initiales = ((u.prenom?.[0] || '') + (u.nom?.[0] || '')).toUpperCase() || 'P';
      }
    } catch {}
  }

  deconnecter(): void {
    localStorage.removeItem('WARAH_token');
    localStorage.removeItem('WARAH_user');
    window.location.href = '/auth/login';
  }
}
