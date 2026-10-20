import { WhatsappMessageStatus } from '@prisma/client';

export type MetaDeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed';

// Ce que l'on sait déjà d'un message envoyé par WARAH.
export type DeliveryState = {
  status: WhatsappMessageStatus;
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
};

export type StatusEvent = {
  status: MetaDeliveryStatus;
  // Heure fournie par Meta, jamais l'heure de réception du webhook.
  at: Date;
  // Pour un échec seulement : code Meta et caractère réessayable (grille de
  // l'unité 42, voir meta-error.ts).
  failure?: { errorCode: string; retryable: boolean };
};

export type DeliveryPatch = Partial<{
  status: WhatsappMessageStatus;
  sentAt: Date;
  deliveredAt: Date;
  readAt: Date;
  failedAt: Date;
  errorCode: string;
  retryable: boolean;
}>;

export type TransitionResult =
  | { kind: 'update'; patch: DeliveryPatch }
  | { kind: 'unchanged' }
  // Accusé contradictoire avec un fait déjà établi : rien n'est modifié,
  // l'appelant journalise un avertissement (jamais de donnée personnelle).
  | { kind: 'incoherent'; reason: string };

const UNCONFIRMED: ReadonlySet<WhatsappMessageStatus> = new Set(['QUEUED', 'UNKNOWN']);

// Seule autorité des règles de passage d'un état à l'autre pour les accusés
// Meta (unité 44, /architect 2026-10-13, décision 2). Pure et déterministe :
// l'écriture en base est conditionnée à l'état lu (compare-and-swap), et
// recalculée si un autre accusé est passé entre-temps.
// - jamais de retour en arrière, une date remplie ne change plus ;
// - « lu » prouve « livré » : la date de livraison manquante prend l'heure
//   de lecture ;
// - un accusé positif sort un message incertain (QUEUED / UNKNOWN) vers SENT ;
// - « envoyé » ne prouve PAS l'arrivée : un échec qui suit un « envoyé »
//   est enregistré (ex. numéro qui n'existe plus sur WhatsApp, 131026) ;
// - un échec après « livré »/« lu », ou un « livré »/« lu » après un échec
//   confirmé, est incohérent : rien ne change.
export function applyStatusEvent(state: DeliveryState, event: StatusEvent): TransitionResult {
  if (state.status === 'RECEIVED') {
    return { kind: 'incoherent', reason: 'accusé de livraison pour un message reçu' };
  }

  if (event.status === 'failed') {
    if (state.deliveredAt || state.readAt) {
      return { kind: 'incoherent', reason: 'échec après une livraison confirmée' };
    }
    if (state.status === 'FAILED') return { kind: 'unchanged' };
    return {
      kind: 'update',
      patch: {
        status: 'FAILED',
        failedAt: event.at,
        errorCode: event.failure?.errorCode ?? 'UNSPECIFIED',
        retryable: event.failure?.retryable ?? false,
      },
    };
  }

  if (state.status === 'FAILED') {
    return event.status === 'sent'
      ? { kind: 'unchanged' }
      : { kind: 'incoherent', reason: `« ${event.status} » après un échec confirmé` };
  }

  const patch: DeliveryPatch = {};
  if (UNCONFIRMED.has(state.status)) patch.status = 'SENT';
  if (!state.sentAt) patch.sentAt = event.at;
  if (event.status === 'delivered' || event.status === 'read') {
    if (!state.deliveredAt) patch.deliveredAt = event.at;
  }
  if (event.status === 'read' && !state.readAt) patch.readAt = event.at;

  return Object.keys(patch).length > 0 ? { kind: 'update', patch } : { kind: 'unchanged' };
}
