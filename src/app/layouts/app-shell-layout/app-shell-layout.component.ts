import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, UserRole } from '../../core/services/auth.service';
import { LokAccountBannerComponent } from '../../shared/components/lok-account-banner/lok-account-banner.component';
import { LokToastComponent } from '../../shared/components/lok-toast/lok-toast.component';
import { RealtimeNotificationsService } from '../../core/services/realtime-notifications.service';

type NavIcon =
  | 'dashboard' | 'biens' | 'locataires' | 'paiements' | 'annonces'
  | 'profil' | 'notifications' | 'export' | 'identite'
  | 'portefeuille' | 'rapports' | 'profil-public';

interface NavItem {
  icon: NavIcon;
  label: string;
  route: string;
  exact?: boolean;
  notif?: boolean;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

// Config de navigation par rôle — un seul layout piloté par le rôle courant
// plutôt que deux fichiers dupliqués (voir /architect redesign propriétaire/
// gestionnaire, vague 1, 2026-07-28). La vérification CNI est désormais
// présente pour les deux rôles (assertIdentityVerified() bloque la création
// de bien pour OWNER et MANAGER — l'ancien layout propriétaire n'y donnait
// aucun accès par la nav, contrairement au gestionnaire).
const OWNER_NAV: NavSection[] = [
  { items: [{ icon: 'dashboard', label: 'Tableau de bord', route: '/dashboard', exact: true }] },
  {
    label: 'Gestion',
    items: [
      { icon: 'biens', label: 'Mes biens', route: '/dashboard/biens' },
      { icon: 'locataires', label: 'Locataires', route: '/dashboard/locataires' },
      { icon: 'paiements', label: 'Paiements', route: '/dashboard/paiements' },
      { icon: 'annonces', label: 'Annonces', route: '/dashboard/annonces' },
    ],
  },
  {
    label: 'Compte',
    items: [
      { icon: 'profil', label: 'Mon profil', route: '/dashboard/profil' },
      { icon: 'identite', label: 'Vérification CNI', route: '/dashboard/identite' },
      { icon: 'notifications', label: 'Notifications', route: '/dashboard/notifications', notif: true },
      { icon: 'export', label: 'Export', route: '/dashboard/export' },
    ],
  },
];

const MANAGER_NAV: NavSection[] = [
  { items: [{ icon: 'dashboard', label: 'Tableau de bord', route: '/gestionnaire/dashboard', exact: true }] },
  {
    label: 'Gestion',
    items: [
      { icon: 'portefeuille', label: 'Portefeuille', route: '/gestionnaire/portefeuille' },
      { icon: 'biens', label: 'Biens gérés', route: '/gestionnaire/biens' },
      { icon: 'locataires', label: 'Locataires', route: '/gestionnaire/locataires' },
      { icon: 'paiements', label: 'Paiements', route: '/gestionnaire/paiements' },
      { icon: 'annonces', label: 'Annonces', route: '/gestionnaire/annonces' },
    ],
  },
  {
    label: 'Analyse',
    items: [{ icon: 'rapports', label: 'Rapports', route: '/gestionnaire/rapports' }],
  },
  {
    label: 'Compte',
    items: [
      { icon: 'profil-public', label: 'Profil public', route: '/gestionnaire/profil-public' },
      { icon: 'identite', label: 'Vérification CNI', route: '/gestionnaire/identite' },
      { icon: 'notifications', label: 'Notifications', route: '/gestionnaire/notifications', notif: true },
      { icon: 'export', label: 'Export', route: '/gestionnaire/export' },
    ],
  },
];

const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: 'Propriétaire',
  MANAGER: 'Gestionnaire',
  TENANT: 'Locataire',
  ADMIN: 'Administrateur',
};

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, LokAccountBannerComponent, LokToastComponent],
  template: `
    <div class="layout">
      <button class="mobile-btn" type="button" (click)="sidebarOpen = !sidebarOpen" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>

      @if (sidebarOpen) {
        <div class="overlay" (click)="sidebarOpen = false"></div>
      }

      <aside class="sidebar" [class.sidebar-manager]="isManager" [class.open]="sidebarOpen">
        <div class="sidebar-logo">
          <a [routerLink]="homeRoute" class="logo-link">
            <img src="/assets/warah-icon.png" alt="" class="logo-icon">
            <span class="logo-text">WARAH</span>
          </a>
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
            <span class="user-role">{{ roleLabel }}</span>
          </div>
        </div>

        <nav class="sidebar-nav" (click)="sidebarOpen = false">
          @for (section of navSections; track section.label ?? 'main') {
            @if (section.label) {
              <p class="nav-group">{{ section.label }}</p>
            }
            @for (item of section.items; track item.route) {
              <a [routerLink]="item.route" routerLinkActive="active"
                 [routerLinkActiveOptions]="{exact: !!item.exact}" class="nav-item">
                <span class="notif-icon-wrap">
                  <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    @switch (item.icon) {
                      @case ('dashboard') {
                        <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                        <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                        <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                        <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                      }
                      @case ('biens') {
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                      }
                      @case ('locataires') {
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      }
                      @case ('paiements') {
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                        <line x1="1" y1="10" x2="23" y2="10"></line>
                      }
                      @case ('annonces') {
                        <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"></path>
                      }
                      @case ('profil') {
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      }
                      @case ('profil-public') {
                        <circle cx="12" cy="12" r="10"></circle>
                        <circle cx="12" cy="10" r="3"></circle>
                        <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"></path>
                      }
                      @case ('identite') {
                        <rect x="2" y="5" width="20" height="14" rx="2"/>
                        <circle cx="9" cy="12" r="2.5"/>
                        <path d="M14 10h4M14 14h3"/>
                      }
                      @case ('notifications') {
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                      }
                      @case ('export') {
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      }
                      @case ('portefeuille') {
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                      }
                      @case ('rapports') {
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                      }
                    }
                  </svg>
                  @if (item.notif && unreadCount > 0) {
                    <span class="notif-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
                  }
                </span>
                <span>{{ item.label }}</span>
              </a>
            }
          }
        </nav>

        <div class="sidebar-footer">
          @if (!isManager) {
            <a routerLink="/" class="footer-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span>Accueil</span>
            </a>
          }
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
        <lok-account-banner></lok-account-banner>
        <router-outlet></router-outlet>
      </main>
    </div>
    <lok-toast></lok-toast>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; background: #F5F7FA; }

    /* ── Bouton hamburger mobile ── */
    .mobile-btn {
      display: none; position: fixed; top: 1rem; left: 1rem; z-index: 200;
      width: 44px; height: 44px; border-radius: 10px; border: none;
      background: var(--color-primary); box-shadow: 0 4px 12px rgba(15,76,129,0.35);
      flex-direction: column; align-items: center; justify-content: center; gap: 5px; cursor: pointer;
    }
    .mobile-btn span { display: block; width: 20px; height: 2px; background: white; border-radius: 2px; }
    .overlay { position: fixed; inset: 0; z-index: 99; background: rgba(10,20,45,0.4); backdrop-filter: blur(3px); }

    /* ── Sidebar — thème propriétaire (clair) par défaut ── */
    .sidebar {
      width: 264px;
      background: #FFFFFF;
      border-right: 1px solid var(--color-border);
      display: flex; flex-direction: column;
      position: fixed; left: 0; top: 0; height: 100vh; z-index: 100;
      box-shadow: 2px 0 24px rgba(15,76,129,0.06);
      transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    }
    /* ── Thème gestionnaire (gradient bleu marine) ── */
    .sidebar.sidebar-manager {
      background: linear-gradient(180deg, var(--color-primary-900) 0%, var(--color-primary-dark) 45%, var(--color-primary) 100%);
      border-right: none;
      box-shadow: 4px 0 24px rgba(0,0,0,0.18);
    }

    /* ── Logo ── */
    .sidebar-logo {
      padding: 20px 18px 16px; border-bottom: 1px solid var(--color-border);
      display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
    }
    .sidebar-manager .sidebar-logo { border-bottom-color: rgba(255,255,255,0.1); }
    .logo-link { display: inline-flex; align-items: center; gap: 9px; text-decoration: none; }
    .logo-icon { height: 30px; width: auto; display: block; }
    .logo-text { font-size: 17px; font-weight: 800; letter-spacing: 0.01em; color: var(--color-primary-dark); }
    .sidebar-manager .logo-text { color: white; }

    .close-btn {
      display: none; background: none; border: none; color: #9CA3AF; cursor: pointer;
      padding: 4px; border-radius: 6px; transition: all 0.15s;
    }
    .close-btn svg { width: 20px; height: 20px; }
    .close-btn:hover { color: #4B5563; background: #F3F4F6; }
    .sidebar-manager .close-btn { color: rgba(255,255,255,0.6); }
    .sidebar-manager .close-btn:hover { color: white; background: rgba(255,255,255,0.1); }

    /* ── Carte utilisateur ── */
    .user-card {
      padding: 16px 20px; border-bottom: 1px solid var(--color-border);
      display: flex; align-items: center; gap: 12px; flex-shrink: 0;
    }
    .sidebar-manager .user-card { border-bottom-color: rgba(255,255,255,0.1); }
    .user-avatar {
      width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
      background: var(--color-primary); color: white; font-weight: 700; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
    }
    .sidebar-manager .user-avatar { background: var(--color-accent); color: var(--color-primary-dark); }
    .user-name { font-size: 13.5px; font-weight: 600; color: var(--color-primary-dark); line-height: 1.3; }
    .sidebar-manager .user-name { color: white; }
    .user-role {
      display: inline-block; font-size: 10.5px; font-weight: 700; color: var(--color-accent);
      letter-spacing: 0.08em; text-transform: uppercase; margin-top: 2px;
    }

    /* ── Navigation ── */
    .sidebar-nav { flex: 1; padding: 12px 10px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.1) transparent; }
    .nav-group {
      font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      color: #9CA3AF; padding: 14px 12px 6px; margin: 0;
    }
    .sidebar-manager .nav-group { color: rgba(255,255,255,0.35); }

    .nav-item {
      display: flex; align-items: center; gap: 11px; padding: 10px 14px; border-radius: 9px;
      color: #54626E; text-decoration: none; font-size: 13.5px; font-weight: 500;
      transition: all 0.12s ease; margin-bottom: 2px; border-left: 3px solid transparent;
    }
    .nav-item:hover { background: var(--color-primary-50); color: var(--color-primary-dark); }
    .nav-item.active {
      background: var(--color-primary-50); color: var(--color-primary);
      border-left-color: var(--color-accent); font-weight: 600;
    }
    .sidebar-manager .nav-item { color: rgba(255,255,255,0.62); }
    .sidebar-manager .nav-item:hover { background: rgba(255,255,255,0.09); color: white; border-left-color: rgba(255,255,255,0.2); }
    .sidebar-manager .nav-item.active { background: rgba(201,152,46,0.15); color: white; border-left-color: var(--color-accent); }

    .nav-icon { width: 17px; height: 17px; flex-shrink: 0; opacity: 0.75; }
    .nav-item:hover .nav-icon, .nav-item.active .nav-icon { opacity: 1; }
    .notif-icon-wrap { position: relative; display: flex; align-items: center; }
    .notif-badge {
      position: absolute; top: -5px; right: -7px; background: #EF4444; color: white;
      font-size: 9px; font-weight: 700; border-radius: 10px; min-width: 16px; height: 16px; padding: 0 3px;
      display: flex; align-items: center; justify-content: center; border: 1.5px solid white;
    }
    .sidebar-manager .notif-badge { border-color: var(--color-primary); }

    /* ── Pied de sidebar ── */
    .sidebar-footer {
      padding: 10px 10px 16px; border-top: 1px solid var(--color-border);
      display: flex; flex-direction: column; gap: 2px; flex-shrink: 0;
    }
    .sidebar-manager .sidebar-footer { border-top-color: rgba(255,255,255,0.1); }
    .footer-item, .logout-btn {
      display: flex; align-items: center; gap: 11px; padding: 9px 14px; border-radius: 8px;
      color: #54626E; font-size: 13.5px; font-weight: 500; text-decoration: none; transition: all 0.12s;
      background: none; border: none; cursor: pointer; width: 100%; text-align: left;
    }
    .footer-item svg, .logout-btn svg { width: 16px; height: 16px; flex-shrink: 0; opacity: 0.7; }
    .footer-item:hover { background: var(--color-primary-50); color: var(--color-primary-dark); }
    .logout-btn:hover { background: rgba(220,38,38,0.07); color: #DC2626; }
    .sidebar-manager .footer-item, .sidebar-manager .logout-btn { color: rgba(255,255,255,0.55); }
    .sidebar-manager .footer-item:hover { background: rgba(255,255,255,0.08); color: white; }
    .sidebar-manager .logout-btn:hover { background: rgba(239,68,68,0.15); color: #FCA5A5; }

    /* ── Contenu principal ── */
    .main-content { flex: 1; margin-left: 264px; min-height: 100vh; overflow-x: hidden; }

    @media (max-width: 1024px) {
      .sidebar { width: 240px; }
      .main-content { margin-left: 240px; }
    }
    @media (max-width: 768px) {
      .mobile-btn { display: flex; }
      .close-btn { display: flex; }
      .sidebar { transform: translateX(-100%); width: 280px; }
      .sidebar.open { transform: translateX(0); }
      .main-content { margin-left: 0; padding-top: 3.5rem; }
    }
  `],
})
export class AppShellLayoutComponent implements OnInit, OnDestroy {
  sidebarOpen = false;
  prenom = '';
  nom = '';
  initiales = '';
  isManager = false;
  roleLabel = '';
  homeRoute = '/dashboard';
  navSections: NavSection[] = OWNER_NAV;

  constructor(
    private readonly auth: AuthService,
    private readonly realtimeService: RealtimeNotificationsService,
  ) {}

  get unreadCount(): number {
    return this.realtimeService.unreadCount;
  }

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    if (user) {
      this.prenom = user.firstName;
      this.nom = user.lastName;
      this.initiales = ((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase() || '?';
      this.isManager = user.role === 'MANAGER';
      this.roleLabel = ROLE_LABELS[user.role];
      this.navSections = this.isManager ? MANAGER_NAV : OWNER_NAV;
      this.homeRoute = this.isManager ? '/gestionnaire/dashboard' : '/dashboard';
    }
    this.realtimeService.init();
  }

  ngOnDestroy(): void {}

  deconnecter(): void {
    this.auth.logout();
  }
}
