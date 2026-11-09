import { api, ApiError } from './api';

// Accord du locataire déjà inscrit (décision du boss du 09/11/2026, contrat
// d'API commun front/serveur du même jour). Quand la personne invitée a déjà
// un compte WARAH activé, le nouveau bail attend son « Oui » : rien ne se
// déclenche (échéancier, rappels, paiement) avant. Pour un nouveau locataire,
// rien ne change : bail actif tout de suite et lien d'activation.

export type LeaseConfirmationStatus = 'PENDING' | 'REFUSED' | 'EXPIRED' | 'CANCELLED' | 'ACCEPTED';

export interface ConfirmationProperty {
  address: string | null;
  neighborhood: string;
  city: string;
}

/** Une demande vue par le propriétaire ou le gestionnaire qui a invité. */
export interface LeaseConfirmation {
  id: string;
  status: LeaseConfirmationStatus;
  /** Toujours le nom tapé par la personne qui invite, jamais celui du compte. */
  tenantDisplayName: string;
  phone: string | null;
  email: string | null;
  lease: {
    id: string;
    monthlyRent: number;
    startDate: string;
    property: ConfirmationProperty & { id: string };
  };
  sentAt: string;
  remindersSentAt: string[];
  nextReminderAt: string | null;
  expiresAt: string;
  respondedAt: string | null;
  refusalCount: number;
  canResend: boolean;
}

/** Une demande en attente, vue par le locataire connecté. */
export interface MyLeaseConfirmation {
  id: string;
  inviterDisplayName: string;
  lease: {
    monthlyRent: number;
    startDate: string;
    property: ConfirmationProperty;
  };
  expiresAt: string;
}

/** Champs ajoutés à la réponse de l'invitation (absents ou false = parcours actuel). */
export interface InviteConfirmationFields {
  confirmationRequired?: boolean;
  confirmationId?: string;
}

export interface ResendLeaseConfirmationBody {
  phone?: string;
  email?: string;
}

/** Nombre de refus au-delà duquel le renvoi devient impossible (règle du boss). */
export const MAX_REFUSALS = 3;

export const leaseConfirmationsApi = {
  list: () => api.get<LeaseConfirmation[]>('/lease-confirmations'),
  // La réponse du renvoi n'est pas décrite par le contrat : elle est lue
  // seulement pour repérer un éventuel lien d'invitation classique.
  resend: (id: string, body: ResendLeaseConfirmationBody) =>
    api.post<unknown>(`/lease-confirmations/${encodeURIComponent(id)}/resend`, body),
  cancel: (id: string) => api.post<unknown>(`/lease-confirmations/${encodeURIComponent(id)}/cancel`, {}),
  mine: () => api.get<MyLeaseConfirmation[]>('/me/lease-confirmations'),
  accept: (id: string) =>
    api.post<{ status: 'ACCEPTED'; leaseId: string }>(`/me/lease-confirmations/${encodeURIComponent(id)}/accept`, {}),
  refuse: (id: string) =>
    api.post<{ status: 'REFUSED' }>(`/me/lease-confirmations/${encodeURIComponent(id)}/refuse`, {}),
};

export const LEASE_CONFIRMATIONS_QUERY_KEY = ['lease-confirmations'] as const;
export const MY_LEASE_CONFIRMATIONS_QUERY_KEY = ['me-lease-confirmations'] as const;

// ── Textes ────────────────────────────────────────────────────────────────

/** Prénom (premier mot) du nom tapé, pour les phrases courtes (« Kossi n'a pas confirmé »). */
export function firstNameOf(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || displayName.trim();
}

// WARAH ne connaît pas le genre des personnes : on écrit « dès qu'Awa
// accepte » plutôt que « dès qu'elle accepte ». L'élision suit la première
// lettre du prénom (voyelle, accentuée ou non, et h muet par défaut).
export function que(name: string): string {
  return /^[aeiouyhàâäéèêëîïôöûüÿæœ]/i.test(name.trim()) ? `qu'${name.trim()}` : `que ${name.trim()}`;
}

// Lomé est en UTC+0 toute l'année : on fixe le fuseau pour que la date
// affichée ne dépende pas du téléphone (ni de la machine de test).
const TIME_ZONE = 'Africa/Lome';

/** « 09/11 » */
export function formatDayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: TIME_ZONE });
}

/** « 09/11/2026 » */
export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIME_ZONE,
  });
}

/** « Villa rue 12 » (adresse, sinon quartier) */
export function propertyTitle(p: ConfirmationProperty): string {
  return p.address?.trim() || p.neighborhood;
}

/** « Villa rue 12, Adidogomé » — sans répéter le quartier quand il sert de titre. */
export function propertyShortLabel(p: ConfirmationProperty): string {
  const title = propertyTitle(p);
  return title === p.neighborhood ? `${p.neighborhood}, ${p.city}` : `${title}, ${p.neighborhood}`;
}

// ── États côté propriétaire (bloc « Demandes de confirmation ») ──────────

export type ConfirmationView = 'pending' | 'refused' | 'expired' | 'blocked';

/**
 * État affiché d'une demande. ACCEPTED et CANCELLED ne sont plus des
 * « demandes » : le bail est actif (liste des locataires) ou il n'existe
 * plus — on ne les montre pas.
 */
export function confirmationView(c: Pick<LeaseConfirmation, 'status' | 'canResend'>): ConfirmationView | null {
  switch (c.status) {
    case 'PENDING':
      return 'pending';
    case 'REFUSED':
      return c.canResend ? 'refused' : 'blocked';
    case 'EXPIRED':
      return c.canResend ? 'expired' : 'blocked';
    default:
      return null;
  }
}

export const VIEW_BADGE: Record<ConfirmationView, { label: string; tone: 'warning' | 'error' | 'neutral' }> = {
  pending: { label: 'En attente de confirmation', tone: 'warning' },
  refused: { label: 'Refusé', tone: 'error' },
  expired: { label: 'Demande expirée', tone: 'neutral' },
  blocked: { label: 'Renvoi impossible', tone: 'error' },
};

/** Libellé du badge, avec « Refusé 3 fois » quand le blocage vient des refus. */
export function badgeFor(c: LeaseConfirmation): { label: string; tone: 'warning' | 'error' | 'neutral' } {
  const view = confirmationView(c);
  if (!view) return { label: '', tone: 'neutral' };
  if (view === 'blocked' && c.refusalCount >= MAX_REFUSALS) {
    return { label: `Refusé ${c.refusalCount} fois`, tone: 'error' };
  }
  return VIEW_BADGE[view];
}

/** Demandes à montrer au propriétaire, les plus urgentes d'abord. */
export function visibleConfirmations(list: LeaseConfirmation[]): LeaseConfirmation[] {
  const order: Record<ConfirmationView, number> = { refused: 0, expired: 1, pending: 2, blocked: 3 };
  return list
    .filter((c) => confirmationView(c) !== null)
    .sort((a, b) => {
      const diff = order[confirmationView(a)!] - order[confirmationView(b)!];
      return diff !== 0 ? diff : new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
    });
}

// ── Erreurs côté locataire ───────────────────────────────────────────────

export type TenantAnswerError = 'active-lease' | 'expired' | 'already-answered' | 'network';

/**
 * Traduit l'échec d'un « Oui » ou d'un « Ce n'est pas moi » en un état
 * d'écran. Jamais d'erreur technique affichée au locataire.
 */
export function classifyAnswerError(err: unknown): TenantAnswerError {
  if (err instanceof ApiError) {
    const code = (err.body as { code?: unknown } | null | undefined)?.code;
    if (err.status === 409 && code === 'ACTIVE_LEASE_EXISTS') return 'active-lease';
    if (err.status === 410) return 'expired';
    // La demande n'est plus en attente pour ce compte (réponse déjà donnée
    // sur WhatsApp, demande annulée…) : rien à refaire.
    if (err.status === 404 || err.status === 409) return 'already-answered';
  }
  return 'network';
}

export const ACTIVE_LEASE_MESSAGE = "Votre bail actuel doit d'abord être terminé par votre propriétaire.";

/** Lien d'invitation classique éventuellement renvoyé par un renvoi vers un contact sans compte. */
export function invitationUrlFrom(response: unknown): string | null {
  const url = (response as { invitationUrl?: unknown } | null | undefined)?.invitationUrl;
  return typeof url === 'string' && url.length > 0 ? url : null;
}
