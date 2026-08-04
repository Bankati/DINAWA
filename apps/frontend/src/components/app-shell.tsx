'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { initiales } from '@/lib/format';
import './app-shell.css';

type NavIcon =
  | 'dashboard' | 'biens' | 'locataires' | 'paiements' | 'annonces'
  | 'profil' | 'notifications' | 'export' | 'identite'
  | 'portefeuille' | 'rapports' | 'profil-public';

interface NavItem { icon: NavIcon; label: string; route: string; exact?: boolean; notif?: boolean; }
interface NavSection { label?: string; items: NavItem[]; }

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
  { label: 'Analyse', items: [{ icon: 'rapports', label: 'Rapports', route: '/gestionnaire/rapports' }] },
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

const TENANT_NAV: NavSection[] = [
  {
    label: 'Paiements',
    items: [
      { icon: 'paiements', label: 'Historique', route: '/locataire/paiements/historique' },
      { icon: 'export', label: 'Déclarer un paiement', route: '/locataire/paiements/declaration' },
    ],
  },
  {
    label: 'Compte',
    items: [
      { icon: 'profil', label: 'Mon profil', route: '/locataire/profil' },
      { icon: 'notifications', label: 'Notifications', route: '/locataire/notifications', notif: true },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = { OWNER: 'Propriétaire', MANAGER: 'Gestionnaire', TENANT: 'Locataire', ADMIN: 'Administrateur' };

const ICONS: Record<NavIcon, React.ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>,
  biens: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  locataires: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  paiements: <><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
  annonces: <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/>,
  profil: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  'profil-public': <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></>,
  identite: <><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="9" cy="12" r="2.5"/><path d="M14 10h4M14 14h3"/></>,
  notifications: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
  export: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
  portefeuille: <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>,
  rapports: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
};

interface AccountStatusResponse {
  accountStatus: 'ACTIVE' | 'SUSPENDED_INACTIVITY' | 'SUSPENDED_PAYMENT' | 'SUSPENDED_ADMIN';
  suspendedReason: string | null;
  unblockCondition: string | null;
}

function AccountBanner({ isManager, isTenant }: { isManager: boolean; isTenant: boolean }) {
  const [status, setStatus] = useState<AccountStatusResponse | null>(null);

  useEffect(() => {
    api.get<AccountStatusResponse>('/account/status').then(setStatus).catch(() => {});
  }, []);

  if (!status || status.accountStatus === 'ACTIVE') return null;

  const bannerClass =
    status.accountStatus === 'SUSPENDED_INACTIVITY' ? 'banner-inactivity' :
    status.accountStatus === 'SUSPENDED_PAYMENT' ? 'banner-payment' : 'banner-admin';

  const title =
    status.accountStatus === 'SUSPENDED_INACTIVITY' ? 'Compte suspendu — inactivité' :
    status.accountStatus === 'SUSPENDED_PAYMENT' ? 'Compte suspendu — paiement en attente' :
    "Compte suspendu par l'administration";

  const ajouterBienRoute = isTenant ? '#' : isManager ? '/gestionnaire/biens/nouveau' : '/dashboard/biens/nouveau';

  return (
    <div className={bannerClass}>
      <div className="acc-banner-row">
        <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        <div className="acc-banner-body">
          <p className="acc-banner-title">{title}</p>
          {status.suspendedReason && <p className="acc-banner-reason">{status.suspendedReason}</p>}
          {status.unblockCondition && <p className="acc-banner-condition">Pour débloquer : {status.unblockCondition}</p>}
        </div>
        {status.accountStatus === 'SUSPENDED_INACTIVITY' && (
          <Link href={ajouterBienRoute} className="acc-banner-cta">Ajouter un bien</Link>
        )}
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isManager = user?.role === 'MANAGER';
  const isTenant = user?.role === 'TENANT';
  const navSections = isManager ? MANAGER_NAV : isTenant ? TENANT_NAV : OWNER_NAV;
  const homeRoute = isManager ? '/gestionnaire/dashboard' : isTenant ? '/locataire/paiements/historique' : '/dashboard';
  const roleLabel = user ? ROLE_LABELS[user.role] : '';
  const userInitiales = user ? initiales(user.firstName, user.lastName) : '';
  const unreadCount = 0; // notifications temps réel pas encore portées

  return (
    <div className="layout">
      <button className="mobile-btn" type="button" onClick={() => setSidebarOpen((v) => !v)} aria-label="Menu">
        <span></span><span></span><span></span>
      </button>

      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <Link href={homeRoute} className="logo-link">
            <img src="/warah-icon.png" alt="" className="logo-icon" />
            <span className="logo-text">WARAH</span>
          </Link>
          <button className="close-btn" type="button" onClick={() => setSidebarOpen(false)} aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="user-card">
          <div className="user-avatar">{userInitiales}</div>
          <div className="user-info">
            <p className="user-name">{user?.firstName} {user?.lastName}</p>
            <span className="user-role">{roleLabel}</span>
          </div>
        </div>

        <nav className="sidebar-nav" onClick={() => setSidebarOpen(false)}>
          {navSections.map((section, si) => (
            <div key={section.label ?? `main-${si}`}>
              {section.label && <p className="nav-group">{section.label}</p>}
              {section.items.map((item) => {
                const active = item.exact ? pathname === item.route : pathname.startsWith(item.route);
                return (
                  <Link key={item.route} href={item.route} className={`nav-item${active ? ' active' : ''}`}>
                    <span className="notif-icon-wrap">
                      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{ICONS[item.icon]}</svg>
                      {item.notif && unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!isManager && !isTenant && (
            <Link href="/" className="footer-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span>Accueil</span>
            </Link>
          )}
          <button className="logout-btn" type="button" onClick={logout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <AccountBanner isManager={isManager} isTenant={isTenant} />
        {children}
      </main>
    </div>
  );
}
