import { api } from './api';

// Messagerie WhatsApp avec les locataires (backend unité 48). Le responsable
// du bien lit et répond ; le propriétaire dont le bien est confié à un
// gestionnaire lit seulement (canReply = false). Les droits sont toujours
// revérifiés par le serveur : l'écran ne fait que refléter.

export type InboxMessageKind = 'text' | 'masked' | 'image' | 'audio' | 'video' | 'document' | 'other';
export type InboxDelivery = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'unknown';
export type ThreadCloseReason = 'AGENCY' | 'TENANT' | 'TIMEOUT' | 'STOP' | 'SYSTEM';

export interface InboxMessage {
  id: string;
  from: 'TENANT' | 'AGENCY';
  kind: InboxMessageKind;
  text: string | null;
  createdAt: string;
  delivery: InboxDelivery | null;
}

export interface ConversationSummary {
  id: string;
  tenant: { firstName: string; lastName: string };
  property: { id: string; label: string };
  isOpen: boolean;
  closedReason: ThreadCloseReason | null;
  lastMessageAt: string | null;
  lastMessage: InboxMessage | null;
  unread: boolean;
  canReply: boolean;
  // Pourquoi la réponse est impossible : lecture seule (bien confié à un
  // gestionnaire) ou locataire parti du logement (fil gardé en historique).
  readOnlyReason: 'NOT_RESPONSIBLE' | 'LEASE_ENDED' | null;
  replyWindowEndsAt: string | null;
}

export interface ConversationPage {
  data: ConversationSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface ThreadPage {
  conversation: ConversationSummary;
  messages: InboxMessage[];
  nextCursor: string | null;
}

export type ConversationFilter = 'all' | 'open' | 'closed';

export const REPLY_MAX_LENGTH = 1000;
// Rafraîchissement par interrogation régulière (pas de temps réel).
export const THREAD_REFRESH_MS = 15_000;
export const UNREAD_REFRESH_MS = 60_000;

export function listConversations(filter: ConversationFilter, page: number): Promise<ConversationPage> {
  const status = filter === 'all' ? '' : `&status=${filter}`;
  return api.get<ConversationPage>(`/whatsapp/conversations?page=${page}&limit=20${status}`);
}

export function getThread(id: string, before?: string): Promise<ThreadPage> {
  const cursor = before ? `?before=${encodeURIComponent(before)}` : '';
  return api.get<ThreadPage>(`/whatsapp/conversations/${encodeURIComponent(id)}/messages${cursor}`);
}

export function getUnreadConversations(): Promise<{ count: number }> {
  return api.get<{ count: number }>('/whatsapp/conversations/unread-count');
}

export function markThreadRead(id: string): Promise<{ read: true }> {
  return api.post<{ read: true }>(`/whatsapp/conversations/${encodeURIComponent(id)}/read`);
}

export function replyToThread(id: string, text: string): Promise<InboxMessage> {
  return api.post<InboxMessage>(`/whatsapp/conversations/${encodeURIComponent(id)}/reply`, { text });
}

export function closeThread(id: string): Promise<{ closed: boolean }> {
  return api.post<{ closed: boolean }>(`/whatsapp/conversations/${encodeURIComponent(id)}/close`);
}

export function tenantName(conversation: Pick<ConversationSummary, 'tenant'>): string {
  return `${conversation.tenant.firstName} ${conversation.tenant.lastName}`.trim();
}

// Contenu non transmis (décision 3) : le responsable sait que quelque chose
// est arrivé, sans le voir. Un message de 6 chiffres n'est jamais gardé.
export const KIND_LABELS: Record<Exclude<InboxMessageKind, 'text'>, string> = {
  masked: '🔒 Message masqué (6 chiffres, peut-être un code)',
  image: '📷 Photo reçue (pas encore affichable)',
  audio: '🎤 Note vocale reçue (pas encore écoutable)',
  video: '🎬 Vidéo reçue (pas encore affichable)',
  document: '📄 Document reçu (pas encore affichable)',
  other: 'Autre type de message (localisation, autocollant…)',
};

export function messagePreview(message: InboxMessage | null): string {
  if (!message) return '';
  const content = message.kind === 'text' ? (message.text ?? '') : KIND_LABELS[message.kind];
  return message.from === 'AGENCY' ? `Vous : ${content}` : content;
}

export const DELIVERY_LABELS: Record<InboxDelivery, string> = {
  pending: 'Envoi…',
  sent: 'Envoyé',
  delivered: 'Distribué',
  read: 'Lu',
  failed: 'Échec de l’envoi',
  unknown: 'Envoi incertain',
};

export const CLOSED_REASON_LABELS: Record<ThreadCloseReason, string> = {
  AGENCY: 'Échange terminé par vous',
  TENANT: 'Échange terminé (le locataire est revenu au menu)',
  TIMEOUT: 'Échange terminé (24 h sans message du locataire)',
  STOP: 'Échange terminé (le locataire a arrêté les messages WhatsApp)',
  SYSTEM: 'Échange terminé (le locataire a changé de numéro)',
};

// « Vous pouvez encore répondre pendant 3 h 20 » — indicatif : le serveur
// revérifie la fenêtre au moment de l'envoi.
export function remainingReplyTime(endsAt: string | null, now: Date = new Date()): string | null {
  if (!endsAt) return null;
  const minutes = Math.floor((new Date(endsAt).getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`;
}

export function formatMessageTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
