import { WhatsappMessageType } from '@prisma/client';
import { MetaDeliveryStatus } from './status-transition';

// Limites de WhatsApp lui-même : un message normal n'est jamais tronqué, la
// coupe ne protège que contre un contenu anormal (unité 44, décision 1).
const TEXT_MAX_LENGTH = 4096;
const CAPTION_MAX_LENGTH = 1024;
const LABEL_MAX_LENGTH = 100;

export type InboundMessage = {
  wamid: string;
  // Format Meta (international, sans +).
  from: string;
  receivedAt: Date;
  type: WhatsappMessageType;
  // Texte du message, ou légende d'un média.
  text: string | null;
  // Uniquement des champs choisis un par un selon le type (jamais l'objet
  // Meta tel quel) — voir buildPayload.
  payload: Record<string, string>;
};

export type InboundStatus = {
  wamid: string;
  status: MetaDeliveryStatus;
  at: Date;
  // biz_opaque_callback_data = id de la ligne WhatsappMessage (unité 42).
  callbackData: string | null;
  errorCode: number | null;
};

export type ParsedNotification = {
  // null si Meta n'a pas précisé le numéro concerné.
  phoneNumberId: string | null;
  messages: InboundMessage[];
  statuses: InboundStatus[];
  // Éléments illisibles ou d'un type inconnu, ignorés (comptés pour les journaux).
  skipped: number;
};

const DELIVERY_STATUSES: ReadonlySet<string> = new Set(['sent', 'delivered', 'read', 'failed']);
const MEDIA_TYPES: Partial<Record<string, WhatsappMessageType>> = {
  image: 'IMAGE',
  audio: 'AUDIO',
  video: 'VIDEO',
  document: 'DOCUMENT',
};

// Lit une notification du webhook Meta (Graph API v25.0). Tolérante : un
// champ absent ou d'une forme inattendue fait ignorer CET élément, jamais
// toute la notification — Meta ajoute régulièrement de nouveaux types, et
// une notification refusée serait renvoyée pendant des jours pour rien.
export function parseMetaNotification(body: unknown): ParsedNotification[] {
  if (!isRecord(body) || body['object'] !== 'whatsapp_business_account') return [];

  const result: ParsedNotification[] = [];
  for (const entry of asArray(body['entry'])) {
    for (const change of asArray(isRecord(entry) ? entry['changes'] : undefined)) {
      if (!isRecord(change) || change['field'] !== 'messages' || !isRecord(change['value'])) continue;
      result.push(parseValue(change['value']));
    }
  }
  return result;
}

function parseValue(value: Record<string, unknown>): ParsedNotification {
  const metadata = isRecord(value['metadata']) ? value['metadata'] : {};
  const parsed: ParsedNotification = {
    phoneNumberId: asString(metadata['phone_number_id']),
    messages: [],
    statuses: [],
    skipped: 0,
  };

  for (const raw of asArray(value['messages'])) {
    const message = parseMessage(raw);
    if (message) parsed.messages.push(message);
    else parsed.skipped += 1;
  }
  for (const raw of asArray(value['statuses'])) {
    const status = parseStatus(raw);
    if (status) parsed.statuses.push(status);
    else parsed.skipped += 1;
  }
  return parsed;
}

function parseMessage(raw: unknown): InboundMessage | null {
  if (!isRecord(raw)) return null;
  const wamid = asString(raw['id']);
  const from = asString(raw['from']);
  const receivedAt = parseTimestamp(raw['timestamp']);
  const metaType = asString(raw['type']);
  if (!wamid || !from || !receivedAt || !metaType) return null;
  return { wamid, from, receivedAt, ...buildContent(metaType, raw) };
}

function buildContent(
  metaType: string,
  raw: Record<string, unknown>,
): Pick<InboundMessage, 'type' | 'text' | 'payload'> {
  if (metaType === 'text') {
    const text = isRecord(raw['text']) ? asString(raw['text']['body']) : null;
    return { type: 'TEXT', text: truncate(text, TEXT_MAX_LENGTH), payload: {} };
  }

  if (metaType === 'interactive' && isRecord(raw['interactive'])) {
    const interactive = raw['interactive'];
    const reply = isRecord(interactive['button_reply'])
      ? interactive['button_reply']
      : isRecord(interactive['list_reply'])
        ? interactive['list_reply']
        : null;
    if (reply) return interactivePayload(asString(reply['id']), asString(reply['title']));
  }

  // Bouton de réponse rapide d'un modèle (ex. « Payer mon loyer »).
  if (metaType === 'button' && isRecord(raw['button'])) {
    return interactivePayload(asString(raw['button']['payload']), asString(raw['button']['text']));
  }

  const mediaType = MEDIA_TYPES[metaType];
  if (mediaType && isRecord(raw[metaType])) {
    const media = raw[metaType];
    const mediaId = asString(media['id']);
    const mimeType = asString(media['mime_type']);
    if (mediaId) {
      // Nom de fichier volontairement non gardé (souvent personnel :
      // « CNI_Ama.pdf ») ; le média lui-même est récupéré par l'unité 39.
      const payload: Record<string, string> = { mediaId };
      if (mimeType) payload['mimeType'] = mimeType;
      return { type: mediaType, text: truncate(asString(media['caption']), CAPTION_MAX_LENGTH), payload };
    }
  }

  // Localisation, contact, réaction, autocollant, type non pris en charge :
  // seul le type est gardé, jamais le contenu.
  return { type: 'OTHER', text: null, payload: { metaType: metaType.slice(0, LABEL_MAX_LENGTH) } };
}

function interactivePayload(
  replyId: string | null,
  title: string | null,
): Pick<InboundMessage, 'type' | 'text' | 'payload'> {
  const payload: Record<string, string> = {};
  if (replyId) payload['replyId'] = replyId.slice(0, LABEL_MAX_LENGTH);
  if (title) payload['title'] = title.slice(0, LABEL_MAX_LENGTH);
  return { type: 'INTERACTIVE', text: null, payload };
}

function parseStatus(raw: unknown): InboundStatus | null {
  if (!isRecord(raw)) return null;
  const wamid = asString(raw['id']);
  const status = asString(raw['status']);
  const at = parseTimestamp(raw['timestamp']);
  if (!wamid || !status || !DELIVERY_STATUSES.has(status) || !at) return null;

  const firstError = asArray(raw['errors']).find(isRecord);
  const code = firstError ? firstError['code'] : undefined;
  return {
    wamid,
    status: status as MetaDeliveryStatus,
    at,
    callbackData: asString(raw['biz_opaque_callback_data']),
    errorCode: typeof code === 'number' && Number.isInteger(code) ? code : null,
  };
}

// Meta envoie l'heure en secondes Unix, sous forme de chaîne.
function parseTimestamp(value: unknown): Date | null {
  const seconds = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000);
}

function truncate(text: string | null, max: number): string | null {
  return text === null ? null : text.slice(0, max);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}
