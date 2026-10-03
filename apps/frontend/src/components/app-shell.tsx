'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { initiales } from '@/lib/format';
import {
  Search, LayoutDashboard, Home, Users, CreditCard, Megaphone, User, UserCircle2,
  IdCard, Bell, Download, Handshake, Briefcase, BarChart3, LogOut, X, Menu,
  AlertTriangle, UserSearch, History, BookOpen, Send, Wallet, Settings, type LucideIcon,
} from 'lucide-react';
import { NotificationBell } from '@/components/ui';
import { CommandPalette, ThemeToggle, type CommandPaletteItem } from '@/components/ds';
import { NotificationPermissionPrompt } from '@/components/notification-permission-prompt';
import './app-shell.css';

type NavIcon =
  | 'dashboard' | 'biens' | 'locataires' | 'paiements' | 'annonces'
  | 'profil' | 'notifications' | 'export' | 'identite' | 'delegation'
  | 'portefeuille' | 'rapports' | 'profil-public' | 'gestionnaires' | 'audit-logs' | 'guide' | 'reversements' | 'parametres';

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
      { icon: 'guide', label: "Guide d'utilisation", route: '/dashboard/guide' },
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
      { icon: 'profil', label: 'Mon profil', route: '/gestionnaire/profil' },
      { icon: 'profil-public', label: 'Profil public', route: '/gestionnaire/profil-public' },
      { icon: 'notifications', label: 'Notifications', route: '/gestionnaire/notifications', notif: true },
      { icon: 'gestionnaires', label: 'Annuaire gestionnaires', route: '/gestionnaires' },
      { icon: 'guide', label: "Guide d'utilisation", route: '/gestionnaire/guide' },
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
      { icon: 'reversements', label: 'Reversements', route: '/admin/reversements' },
      { icon: 'audit-logs', label: "Journal d'audit", route: '/admin/audit-logs' },
      { icon: 'parametres', label: 'Paramètres', route: '/admin/parametres' },
      { icon: 'guide', label: "Guide d'utilisation", route: '/admin/guide' },
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
      { icon: 'guide', label: "Guide d'utilisation", route: '/locataire/guide' },
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
  delegation: Handshake,
  gestionnaires: UserSearch,
  'audit-logs': History,
  guide: BookOpen,
  reversements: Send,
  parametres: Settings,
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

const PROMO_DISMISS_KEY = 'warah_promo_dismissed_session';

function formatPromoCountdown(remainingMs: number): string {
  const days = Math.floor(remainingMs / 86_400_000);
  if (days >= 2) return `${days} jours restants`;
  const hours = Math.floor(remainingMs / 3_600_000);
  const minutes = Math.floor((remainingMs % 3_600_000) / 60_000);
  return `${hours}h ${String(minutes).padStart(2, '0')}min restantes`;
}

// Bandeau promotionnel "offre de lancement" — visible uniquement tant que
// PlatformSettings.freePromotionEndsAt est renseigné (calculé automatiquement
// côté backend quand le super-admin active la suspension des quotas, voir
// /architect bandeau promotionnel, 2026-10-02). Volontairement au-dessus de
// toute l'interface (avant la sidebar/topbar), pas dans `.main-content` comme
// AccountBanner — c'est la demande explicite du développeur ("avant tout sur
// la plateforme"). Fermeture : masqué pour la session en cours seulement
// (sessionStorage) — une offre à durée limitée ne doit jamais disparaître
// définitivement après un simple clic.
function FreePromoBanner({ enabled }: { enabled: boolean }) {
  const [endsAt, setEndsAt] = useState<Date | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // L'heure courante vient d'un effet, jamais d'un Date.now() lu pendant le
  // rendu (impur — risque de désync avec l'hydratation SSR, voir CI).
  const [now, setNow] = useState<number | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    try {
      if (sessionStorage.getItem(PROMO_DISMISS_KEY)) setDismissed(true);
    } catch {
      // Stockage indisponible — le bandeau reste affichable, jamais bloquant.
    }
    api
      .get<{ freePromotionEndsAt: string | null }>('/subscription/quota')
      .then((d) => setEndsAt(d.freePromotionEndsAt ? new Date(d.freePromotionEndsAt) : null))
      .catch(() => {});
  }, [enabled]);

  // Recalcule le compte à rebours toutes les minutes — précision suffisante
  // pour un bandeau, jamais un minuteur à la seconde qui distrairait inutilement.
  useEffect(() => {
    if (!endsAt) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, [endsAt]);

  const remainingMs = endsAt && now ? endsAt.getTime() - now : 0;
  const visible = enabled && !dismissed && !!endsAt && !!now && remainingMs > 0;

  // Hauteur réelle posée en variable CSS (--promo-banner-height), lue par
  // .app-frame/.mobile-btn (app-shell.css) — sans ça, un bandeau en flux
  // normal au-dessus d'un bloc à 100vh fixe ajoute un scroll de page inutile
  // et le bouton hamburger (position: fixed) se superpose au bandeau.
  // ResizeObserver plutôt qu'une mesure unique : le texte change de nombre
  // de lignes selon la largeur d'écran et selon le format du compte à rebours.
  useEffect(() => {
    const root = document.documentElement;
    if (!visible || !bannerRef.current) {
      root.style.setProperty('--promo-banner-height', '0px');
      return;
    }
    const el = bannerRef.current;
    const observer = new ResizeObserver(([entry]) => {
      root.style.setProperty('--promo-banner-height', `${Math.ceil(entry.contentRect.height)}px`);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.setProperty('--promo-banner-height', '0px');
    };
  }, [visible]);

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(PROMO_DISMISS_KEY, '1');
    } catch {
      // Rien à faire — la fermeture reste effective pour le reste du rendu en cours.
    }
  }

  if (!visible) return null;

  return (
    <div
      ref={bannerRef}
      aria-label="WARAH est gratuite pour tous les propriétaires et gestionnaires pendant 6 mois"
      className="relative w-full px-12 py-2.5 text-center text-sm text-white"
      style={{ background: 'linear-gradient(135deg, rgba(10,38,80,1) 0%, rgba(15,76,129,1) 60%, rgba(8,30,65,1) 100%)' }}
    >
      {/* Pas de role="status" : le compte à rebours change toutes les minutes
          (forceTick) et une région live réannoncerait le bandeau en continu
          aux lecteurs d'écran — voir /review, 2026-10-03. */}
      <p className="m-0 leading-snug">
        🎉 WARAH est <strong>gratuite</strong> pour tous les propriétaires et gestionnaires — gérez tous vos biens sans limite.{' '}
        <strong style={{ color: 'var(--color-accent)' }}>Fin dans {formatPromoCountdown(remainingMs)}</strong>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer ce message"
        className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/10"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Rappel tant que le numéro de réception des loyers n'est pas complet — sans
// lui les locataires ne peuvent pas payer en ligne (voir /architect
// reversement, révisé le 2026-09-28 : c'est le téléphone + opérateur du
// profil, plus de numéro séparé). `ready` vaut `null` tant que /profile n'a
// pas répondu — jamais affiché avant de savoir, pour ne pas alarmer à tort.
function PayoutBanner({ ready, profileRoute }: { ready: boolean | null; profileRoute: string }) {
  if (ready !== false) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-5 text-sm text-amber-900"
    >
      <Wallet className="w-5 h-5 shrink-0 text-amber-600" aria-hidden="true" />
      <p className="flex-1 min-w-[220px]">
        <strong>Complétez votre numéro de réception.</strong>{' '}
        Vos locataires ne peuvent pas payer en ligne tant que votre téléphone et votre opérateur mobile money ne sont pas renseignés.
      </p>
      <Link
        href={profileRoute}
        className="inline-flex items-center justify-center min-h-11 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700"
      >
        Compléter mon profil
      </Link>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, profileVersion, refreshProfile } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [notificationConsent, setNotificationConsent] = useState<'NOT_ASKED' | 'ACCEPTED' | 'DECLINED'>();
  // null = pas encore connu (masque le bandeau), sinon true/false.
  const [payoutReady, setPayoutReady] = useState<boolean | null>(null);
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
    if (!user?.id) { setPhotoUrl(null); setNotificationConsent(undefined); setPayoutReady(null); return; }
    api
      .get<{
        profilePhotoUrl: string | null;
        notificationConsent: 'NOT_ASKED' | 'ACCEPTED' | 'DECLINED';
        phone: string | null;
        payoutOperator: string | null;
      }>('/profile')
      .then((d) => {
        setPhotoUrl(d.profilePhotoUrl);
        setNotificationConsent(d.notificationConsent);
        setPayoutReady(Boolean(d.phone && d.payoutOperator));
      })
      .catch(() => {});
  }, [user?.id, profileVersion]);

  const dateCourante = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="shell-page">
      <FreePromoBanner enabled={!!user && (isOwner || isManager)} />
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
            {user && (isManager || isOwner) && (
              <PayoutBanner ready={payoutReady} profileRoute={isManager ? '/gestionnaire/profil' : '/dashboard/profil'} />
            )}
            {children}
          </main>
        </div>
      </div>

      <NotificationPermissionPrompt consent={notificationConsent} onResolved={refreshProfile} />
    </div>
  );
}
