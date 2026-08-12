'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { initiales } from '@/lib/format';
import {
  Search, LayoutDashboard, Home, Users, CreditCard, Megaphone, User, UserCircle2,
  IdCard, Bell, Download, Handshake, Briefcase, BarChart3, Scale, LogOut, X, Menu,
  AlertTriangle, UserSearch, type LucideIcon,
} from 'lucide-react';
import { NotificationBell } from '@/components/ui';
import { CommandPalette, ThemeToggle, type CommandPaletteItem } from '@/components/ds';
import './app-shell.css';

type NavIcon =
  | 'dashboard' | 'biens' | 'locataires' | 'paiements' | 'annonces'
  | 'profil' | 'notifications' | 'export' | 'identite' | 'delegation'
  | 'portefeuille' | 'rapports' | 'profil-public' | 'litiges' | 'gestionnaires';

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
      { icon: 'notifications', label: 'Notifications', route: '/dashboard/notifications', notif: true },
      { icon: 'delegation', label: 'Délégation', route: '/dashboard/delegation' },
      { icon: 'gestionnaires', label: 'Annuaire gestionnaires', route: '/gestionnaires' },
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
    label: 'Compte',
    items: [
      { icon: 'profil-public', label: 'Profil public', route: '/gestionnaire/profil-public' },
      { icon: 'notifications', label: 'Notifications', route: '/gestionnaire/notifications', notif: true },
      { icon: 'gestionnaires', label: 'Annuaire gestionnaires', route: '/gestionnaires' },
    ],
  },
];

const ADMIN_NAV: NavSection[] = [
  { items: [{ icon: 'dashboard', label: 'Statistiques', route: '/admin', exact: true }] },
  {
    label: 'Supervision',
    items: [
      { icon: 'locataires', label: 'Comptes', route: '/admin/comptes' },
      { icon: 'paiements', label: 'Transactions', route: '/admin/transactions' },
      { icon: 'litiges', label: 'Litiges', route: '/admin/litiges' },
    ],
  },
];

const TENANT_NAV: NavSection[] = [
  {
    label: 'Aperçu',
    items: [
      { icon: 'dashboard', label: 'Tableau de bord', route: '/locataire', exact: true },
    ],
  },
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

// Icônes de la bibliothèque lucide-react (déjà utilisée partout ailleurs
// dans le design system ds/) — remplace les anciens tracés SVG dessinés à la
// main, jugés peu professionnels visuellement.
const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  biens: Home,
  locataires: Users,
  paiements: CreditCard,
  annonces: Megaphone,
  profil: User,
  'profil-public': UserCircle2,
  identite: IdCard,
  notifications: Bell,
  export: Download,
  portefeuille: Briefcase,
  rapports: BarChart3,
  litiges: Scale,
  delegation: Handshake,
  gestionnaires: UserSearch,
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
        <AlertTriangle className="w-5 h-5 shrink-0" />
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
  const { user, logout, profileVersion } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const isManager = user?.role === 'MANAGER';
  const isTenant = user?.role === 'TENANT';
  const isAdmin = user?.role === 'ADMIN';
  const navSections = isAdmin ? ADMIN_NAV : isManager ? MANAGER_NAV : isTenant ? TENANT_NAV : OWNER_NAV;
  const homeRoute = isAdmin ? '/admin' : isManager ? '/gestionnaire/dashboard' : isTenant ? '/locataire' : '/dashboard';
  const notifRoute = isManager ? '/gestionnaire/notifications' : isTenant ? '/locataire/notifications' : '/dashboard/notifications';
  const roleLabel = user ? ROLE_LABELS[user.role] : '';
  const userInitiales = user ? initiales(user.firstName, user.lastName) : '';
  const isOwner = !isManager && !isTenant && !isAdmin;

  // Le thème est une préférence de navigateur (localStorage), pas de compte
  // — sur un poste partagé, un Gestionnaire/Admin/Locataire pourrait hériter
  // du mode sombre choisi par un Propriétaire alors que leurs pages n'ont
  // aucun style sombre. On force donc le clair hors du pilote.
  const { setTheme } = useTheme();
  useEffect(() => {
    if (!isOwner) setTheme('light');
  }, [isOwner, setTheme]);

  // Ctrl+K / Cmd+K — items à plat depuis la nav déjà filtrée par rôle,
  // aucune duplication de la logique de navigation (voir /architect refonte
  // UI, phase 1 : le palette est agnostique du rôle par construction).
  const commandItems: CommandPaletteItem[] = navSections.flatMap((section) =>
    section.items.map((item) => ({ label: item.label, route: item.route, group: section.label ?? 'Navigation' })),
  );

  useEffect(() => {
    api.get<{ count: number }>('/notifications/unread-count').then((d) => setUnreadCount(d.count)).catch(() => {});
  }, [pathname]);

  // Récupérée à chaque montage (jamais mise en cache dans localStorage) — les
  // URLs signées Supabase expirent après 15 min, une valeur persistée irait
  // vite casser l'avatar entre deux sessions.
  useEffect(() => {
    if (!user?.id) { setPhotoUrl(null); return; }
    api.get<{ profilePhotoUrl: string | null }>('/profile').then((d) => setPhotoUrl(d.profilePhotoUrl)).catch(() => {});
  }, [user?.id, profileVersion]);

  const dateCourante = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="shell-page">
      <CommandPalette items={commandItems} open={paletteOpen} onOpenChange={setPaletteOpen} />
      <button className="mobile-btn" type="button" onClick={() => setSidebarOpen((v) => !v)} aria-label="Menu">
        <Menu className="w-5 h-5" strokeWidth={2.5} />
      </button>

      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      <div className="app-frame">
        <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="sidebar-logo">
            <Link href={homeRoute} className="logo-link">
              <img src="/warah-icon.png" alt="" className="logo-icon" />
              <span className="logo-text">WARAH</span>
            </Link>
            <button className="close-btn" type="button" onClick={() => setSidebarOpen(false)} aria-label="Fermer">
              <X className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>

          <nav className="sidebar-nav" onClick={() => setSidebarOpen(false)}>
            {navSections.map((section, si) => (
              <div key={section.label ?? `main-${si}`}>
                {section.label && <p className="nav-group">{section.label}</p>}
                {section.items.map((item) => {
                  const active = item.exact ? pathname === item.route : pathname.startsWith(item.route);
                  const Icon = ICONS[item.icon];
                  return (
                    <Link key={item.route} href={item.route} className={`nav-item${active ? ' active' : ''}`}>
                      <span className="nav-icon-wrap">
                        <Icon className="nav-icon" strokeWidth={2} />
                        {item.notif && unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                      </span>
                      <span className="nav-label">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <button className="logout-btn" type="button" onClick={logout}>
              <span className="nav-icon-wrap">
                <LogOut className="nav-icon" strokeWidth={2} />
              </span>
              <span className="nav-label">Déconnexion</span>
            </button>
          </div>
        </aside>

        <div className="main-col">
          <header className="topbar">
            <div className="topbar-greeting">
              <h1>Bonjour, {user?.firstName || roleLabel} !</h1>
              <p className="topbar-date">{dateCourante}</p>
            </div>
            <div className="topbar-actions">
              {isOwner && (
                <button type="button" className="topbar-search" onClick={() => setPaletteOpen(true)}>
                  <Search className="w-[15px] h-[15px]" />
                  <span>Rechercher…</span>
                  <kbd>Ctrl K</kbd>
                </button>
              )}
              {isOwner && <ThemeToggle />}
              {!isAdmin && <NotificationBell seeAllRoute={notifRoute} />}
              <div className="topbar-user">
                <div className="topbar-avatar">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL signée Supabase temporaire, next/image ajouterait peu ici
                    <img src={photoUrl} alt="" className="topbar-avatar-img" />
                  ) : userInitiales}
                </div>
                <div className="topbar-user-info">
                  <p className="topbar-user-name">{user?.firstName} {user?.lastName}</p>
                  <span className="topbar-user-role">{roleLabel}</span>
                </div>
              </div>
            </div>
          </header>

          <main className="main-content">
            <AccountBanner isManager={isManager} isTenant={isTenant} />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
