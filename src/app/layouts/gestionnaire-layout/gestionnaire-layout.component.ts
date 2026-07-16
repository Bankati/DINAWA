import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-gestionnaire-layout',
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
          <div class="logo-box">
            <img src="/assets/WARAH-logo.png" alt="WARAH" class="logo-img">
          </div>
          <button class="close-btn" type="button" (click)="sidebarOpen = false" aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="user-card">
          <div class="user-avatar">{{ initiales }}</div>
          <div class="user-info">
            <p class="user-name">{{ prenom }} {{ nom }}</p>
            <span class="user-role">Gestionnaire</span>
          </div>
        </div>

        <nav class="sidebar-nav" (click)="sidebarOpen = false">
          <a routerLink="/gestionnaire/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1"></rect>
              <rect x="14" y="14" width="7" height="7" rx="1"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1"></rect>
            </svg>
            <span>Tableau de bord</span>
          </a>

          <div class="nav-section-label">Gestion</div>

          <a routerLink="/gestionnaire/portefeuille" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            </svg>
            <span>Portefeuille</span>
          </a>

          <a routerLink="/gestionnaire/biens" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Biens gérés</span>
          </a>

          <a routerLink="/gestionnaire/locataires" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Locataires</span>
          </a>

          <a routerLink="/gestionnaire/paiements" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
            <span>Paiements</span>
          </a>

          <div class="nav-section-label">Analyse</div>

          <a routerLink="/gestionnaire/rapports" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            <span>Rapports</span>
          </a>

          <a routerLink="/gestionnaire/profil-public" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="10" r="3"></circle>
              <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"></path>
            </svg>
            <span>Profil public</span>
          </a>
        </nav>

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
      </aside>

      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; background: #F5F7FA; }
    .mobile-btn {
      display: none; position: fixed; top: 1rem; left: 1rem; z-index: 200;
      width: 44px; height: 44px; border-radius: 10px; border: none;
      background: var(--color-primary); box-shadow: 0 4px 12px rgba(15,76,129,0.4);
      flex-direction: column; align-items: center; justify-content: center; gap: 5px; cursor: pointer;
    }
    .mobile-btn span { display: block; width: 20px; height: 2px; background: white; border-radius: 2px; }
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 99; backdrop-filter: blur(2px); }
    .sidebar {
      width: 260px;
      background: linear-gradient(180deg, var(--color-primary-900) 0%, var(--color-primary-dark) 40%, var(--color-primary) 100%);
      display: flex; flex-direction: column; position: fixed; left: 0; top: 0; height: 100vh;
      z-index: 100; box-shadow: 4px 0 24px rgba(0,0,0,0.18);
      transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    }
    .close-btn { display: none; background: none; border: none; color: rgba(255,255,255,0.6); cursor: pointer; padding: 4px; border-radius: 6px; transition: all 0.15s; }
    .close-btn svg { width: 20px; height: 20px; }
    .close-btn:hover { color: white; background: rgba(255,255,255,0.1); }
    .sidebar-logo { padding: 20px 20px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; }
    .logo-box { background: white; border-radius: 10px; padding: 6px 12px; display: inline-flex; align-items: center; }
    .logo-img { height: 44px; width: auto; display: block; }
    .user-card { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 12px; }
    .user-avatar { width: 42px; height: 42px; border-radius: 12px; background: var(--color-accent); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; color: var(--color-primary-dark); flex-shrink: 0; letter-spacing: 0.5px; }
    .user-name { font-size: 13.5px; font-weight: 600; color: white; line-height: 1.3; }
    .user-role { display: inline-block; font-size: 10.5px; font-weight: 600; color: var(--color-accent); letter-spacing: 0.08em; text-transform: uppercase; margin-top: 3px; }
    .sidebar-nav { flex: 1; padding: 12px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
    .nav-section-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.3); padding: 12px 12px 6px; }
    .nav-item { display: flex; align-items: center; gap: 11px; padding: 10px 14px; border-radius: 10px; color: rgba(255,255,255,0.62); text-decoration: none; font-size: 13.5px; font-weight: 500; transition: all 0.15s ease; margin-bottom: 1px; border-left: 3px solid transparent; }
    .nav-item:hover { background: rgba(255,255,255,0.09); color: white; border-left-color: rgba(255,255,255,0.2); }
    .nav-item.active { background: rgba(201,152,46,0.15); color: white; border-left-color: var(--color-accent); font-weight: 600; }
    .nav-icon { width: 18px; height: 18px; flex-shrink: 0; opacity: 0.8; }
    .nav-item.active .nav-icon { opacity: 1; }
    .sidebar-footer { padding: 12px 12px 16px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; gap: 2px; }
    .footer-item, .logout-btn { display: flex; align-items: center; gap: 11px; padding: 10px 14px; border-radius: 10px; color: rgba(255,255,255,0.55); font-size: 13.5px; font-weight: 500; text-decoration: none; transition: all 0.15s; background: none; border: none; cursor: pointer; width: 100%; text-align: left; }
    .footer-item svg, .logout-btn svg { width: 18px; height: 18px; flex-shrink: 0; }
    .footer-item:hover { background: rgba(255,255,255,0.08); color: white; }
    .logout-btn:hover { background: rgba(239,68,68,0.15); color: #FCA5A5; }
    .main-content { flex: 1; margin-left: 260px; min-height: 100vh; overflow-x: hidden; }
    @media (max-width: 1024px) { .sidebar { width: 240px; } .main-content { margin-left: 240px; } }
    @media (max-width: 768px) {
      .mobile-btn { display: flex; }
      .close-btn { display: flex; }
      .sidebar { transform: translateX(-100%); width: 280px; }
      .sidebar.open { transform: translateX(0); }
      .main-content { margin-left: 0; padding-top: 3.5rem; }
    }
  `]
})
export class GestionnaireLayoutComponent implements OnInit {
  sidebarOpen = false;
  prenom = '';
  nom = '';
  initiales = 'G';

  ngOnInit(): void {
    try {
      const raw = localStorage.getItem('WARAH_user');
      if (raw) {
        const u = JSON.parse(raw);
        this.prenom = u.prenom || '';
        this.nom = u.nom || '';
        this.initiales = ((u.prenom?.[0] || '') + (u.nom?.[0] || '')).toUpperCase() || 'G';
      }
    } catch {}
  }

  deconnecter(): void {
    localStorage.removeItem('WARAH_token');
    localStorage.removeItem('WARAH_user');
    window.location.href = '/auth/login';
  }
}
