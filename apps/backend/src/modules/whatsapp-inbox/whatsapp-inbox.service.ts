import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, WhatsappMessageType, WhatsappThreadCloseReason } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import {
  PropertyAccessor,
  canActOnProperty,
  propertyResponsibleWhere,
  propertyVisibilityWhere,
  responsibleUserIdFor,
} from '../../common/permissions/property-access';
import { formatPropertyLocation } from '../../common/utils/format-property-location';
import {
  WHATSAPP_AGENCY_CLOSE_SOURCE,
  WHATSAPP_AGENCY_REPLY_SOURCE,
  WHATSAPP_REPLY_WINDOW_MS,
} from '../../common/constants';
import { WhatsappService } from '../whatsapp-channel/whatsapp.service';
import { isWithinReplyWindow } from '../whatsapp-channel/reply-window';
import { BOT_TEXTS } from '../whatsapp-bot/bot-messages';
import { WhatsappThreadService, isExchangeOpen } from './whatsapp-thread.service';
import {
  ListConversationsQueryDto,
  ListMessagesQueryDto,
  ReplyToConversationDto,
} from './dto/whatsapp-inbox.dto';

export const REPLY_WINDOW_CLOSED_MESSAGE =
  'Le locataire doit d’abord vous réécrire sur WhatsApp : vous ne pouvez répondre que dans les 24 h qui suivent son dernier message.';
export const LEASE_ENDED_MESSAGE =
  'Ce locataire n’a plus de bail en cours dans ce logement : la conversation reste consultable, mais vous ne pouvez plus lui écrire.';

export type InboxMessageKind = 'text' | 'masked' | 'image' | 'audio' | 'video' | 'document' | 'other';

export type InboxMessage = {
  id: string;
  from: 'TENANT' | 'AGENCY';
  kind: InboxMessageKind;
  text: string | null;
  createdAt: Date;
  // Réponses du responsable seulement : où en est l'envoi.
  delivery: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'unknown' | null;
};

export type ConversationSummary = {
  id: string;
  tenant: { firstName: string; lastName: string };
  property: { id: string; label: string };
  isOpen: boolean;
  closedReason: WhatsappThreadCloseReason | null;
  lastMessageAt: Date | null;
  lastMessage: InboxMessage | null;
  // Toujours false pour un lecteur qui n'est pas le responsable du bien.
  unread: boolean;
  canReply: boolean;
  // Pourquoi la réponse est impossible (null = possible, sous réserve de la
  // fenêtre de 24 h) : lecture seule, ou locataire parti du logement.
  readOnlyReason: 'NOT_RESPONSIBLE' | 'LEASE_ENDED' | null;
  replyWindowEndsAt: Date | null;
};

const MESSAGE_SELECT = {
  id: true,
  direction: true,
  messageType: true,
  status: true,
  body: true,
  payload: true,
  deliveredAt: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.WhatsappMessageSelect;

type MessageRow = Prisma.WhatsappMessageGetPayload<{ select: typeof MESSAGE_SELECT }>;

const THREAD_SELECT = {
  id: true,
  tenantUserId: true,
  humanOpenedAt: true,
  humanClosedAt: true,
  closedReason: true,
  lastTenantMessageAt: true,
  lastMessageAt: true,
  unreadSince: true,
  agencyReadById: true,
  tenant: { select: { firstName: true, lastName: true } },
  property: {
    select: {
      id: true,
      ownerId: true,
      address: true,
      neighborhood: true,
      city: true,
      mandates: { where: { status: 'ACTIVE' }, take: 1, select: { managerId: true } },
    },
  },
  messages: { orderBy: { createdAt: 'desc' }, take: 1, select: MESSAGE_SELECT },
} satisfies Prisma.WhatsappThreadSelect;

type ThreadRow = Prisma.WhatsappThreadGetPayload<{ select: typeof THREAD_SELECT }>;

const MEDIA_KINDS: Partial<Record<WhatsappMessageType, InboxMessageKind>> = {
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  DOCUMENT: 'document',
  OTHER: 'other',
};

// Messagerie avec le locataire (unité 48, /architect 2026-10-18), côté
// propriétaire et gestionnaire. Droits recalculés à CHAQUE appel sur le bien
// du fil (canActOnProperty) : le responsable lit et répond, le propriétaire
// avec mandat lit seulement, un ancien responsable n'a plus accès.
@Injectable()
export class WhatsappInboxService {
  private readonly logger = new Logger(WhatsappInboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly threads: WhatsappThreadService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: ListConversationsQueryDto,
  ): Promise<{ data: ConversationSummary[]; total: number; page: number; limit: number }> {
    const now = new Date();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const open = openExchangeWhere(now);
    const where: Prisma.WhatsappThreadWhereInput = {
      property: propertyVisibilityWhere(user),
      // Fil sans aucun message (bouton touché puis rien écrit) : pas listé.
      lastMessageAt: { not: null },
      ...(query.status === 'open' ? open : {}),
      ...(query.status === 'closed' ? { NOT: open } : {}),
    };
    const [threads, total] = await this.prisma.$transaction([
      this.prisma.whatsappThread.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: THREAD_SELECT,
      }),
      this.prisma.whatsappThread.count({ where }),
    ]);
    const lastInbound = await this.lastInboundByTenant(threads.map((thread) => thread.tenantUserId));
    const leased = await this.activeLeaseKeys(threads);
    return {
      data: threads.map((thread) =>
        toSummary(
          thread,
          user,
          lastInbound.get(thread.tenantUserId) ?? null,
          leased.has(leaseKey(thread.tenantUserId, thread.property.id)),
          now,
        ),
      ),
      total,
      page,
      limit,
    };
  }

  // Compteur du menu « Messages » : conversations du responsable avec au
  // moins un message non lu (en une requête, sans envoi : filet de sécurité
  // si une notification n'est pas arrivée).
  async unreadCount(user: AuthenticatedUser): Promise<{ count: number }> {
    const now = new Date();
    const count = await this.prisma.whatsappThread.count({
      where: {
        property: propertyResponsibleWhere(user.id),
        lastMessageAt: { not: null },
        OR: [
          { unreadSince: { not: null } },
          // Nouveau responsable (décision 5) : l'échange en cours lu par un
          // autre compte comme non lu pour lui.
          { AND: [{ agencyReadById: { not: null } }, { NOT: { agencyReadById: user.id } }, openExchangeWhere(now)] },
        ],
      },
    });
    return { count };
  }

  // Lecture SANS effet de bord (préchargement des pages) : le « lu » passe
  // par markRead(), appelé quand le fil est réellement affiché.
  async messages(
    user: AuthenticatedUser,
    threadId: string,
    query: ListMessagesQueryDto,
  ): Promise<{ conversation: ConversationSummary; messages: InboxMessage[]; nextCursor: string | null }> {
    const { thread } = await this.authorize(user, threadId, 'read');
    const limit = query.limit ?? 50;
    const rows = await this.prisma.whatsappMessage.findMany({
      where: { threadId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(query.before ? { cursor: { id: query.before }, skip: 1 } : {}),
      select: MESSAGE_SELECT,
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const now = new Date();
    return {
      conversation: toSummary(
        thread,
        user,
        await this.lastInboundAt(thread.tenantUserId),
        await this.hasActiveLease(thread),
        now,
      ),
      messages: page.reverse().map(toInboxMessage),
      nextCursor: hasMore ? page[0].id : null,
    };
  }

  async markRead(user: AuthenticatedUser, threadId: string): Promise<{ read: true }> {
    await this.authorize(user, threadId, 'respond');
    await this.markReadBy(threadId, user.id, new Date());
    return { read: true };
  }

  async reply(user: AuthenticatedUser, threadId: string, dto: ReplyToConversationDto): Promise<InboxMessage> {
    const { thread, access } = await this.authorize(user, threadId, 'respond');
    // Un ancien locataire ne reçoit plus rien de l'ancien bailleur, même si
    // la fenêtre de 24 h est ouverte par un message à son NOUVEAU logement.
    if (!(await this.hasActiveLease(thread))) throw new ConflictException(LEASE_ENDED_MESSAGE);
    const inboundAt = await this.lastInboundAt(thread.tenantUserId);
    if (!inboundAt || !isWithinReplyWindow(inboundAt)) throw new ConflictException(REPLY_WINDOW_CLOSED_MESSAGE);

    // Nom ajouté par le serveur (décision 4), jamais tapé par le responsable.
    const label = await this.authorLabel(user.id, access.isMandatedManager);
    const result = await this.whatsapp.reply({
      userId: thread.tenantUserId,
      source: WHATSAPP_AGENCY_REPLY_SOURCE,
      text: `*${label}* : ${dto.text}`,
      inboundReceivedAt: inboundAt,
      threadId,
      sentByUserId: user.id,
    });
    if (result.outcome === 'REFUSED') {
      throw new ConflictException(
        result.reason === 'REPLY_WINDOW_CLOSED'
          ? REPLY_WINDOW_CLOSED_MESSAGE
          : 'Ce locataire ne reçoit plus les messages WhatsApp (arrêt demandé ou numéro non vérifié).',
      );
    }
    if (result.outcome === 'FAILED')
      throw new ServiceUnavailableException('L’envoi a échoué. Réessayez dans quelques instants.');

    // Répondre vaut lecture ; UNKNOWN = peut-être parti, affiché « incertain ».
    const now = new Date();
    await this.prisma.whatsappThread.update({ where: { id: threadId }, data: { lastMessageAt: now } });
    await this.markReadBy(threadId, user.id, now);
    const sent = await this.prisma.whatsappMessage.findUnique({
      where: { id: result.messageId },
      select: MESSAGE_SELECT,
    });
    if (!sent) throw new NotFoundException('Message introuvable');
    return toInboxMessage(sent);
  }

  // « Terminer l'échange » : le robot reprend la main ; le locataire est
  // prévenu si la fenêtre de 24 h le permet encore.
  async close(user: AuthenticatedUser, threadId: string): Promise<{ closed: boolean }> {
    const { thread } = await this.authorize(user, threadId, 'respond');
    const now = new Date();
    const wasOpen = isExchangeOpen(thread, now);
    // Déjà expiré (24 h) : la vraie raison est gardée.
    const closed = await this.threads.closeExchange(threadId, wasOpen ? 'AGENCY' : 'TIMEOUT', now);
    if (closed && wasOpen && (await this.hasActiveLease(thread))) {
      const inboundAt = await this.lastInboundAt(thread.tenantUserId);
      if (inboundAt) {
        const result = await this.whatsapp.reply({
          userId: thread.tenantUserId,
          source: WHATSAPP_AGENCY_CLOSE_SOURCE,
          text: BOT_TEXTS.agencyClosed,
          inboundReceivedAt: inboundAt,
          threadId,
          sentByUserId: user.id,
        });
        if (result.outcome !== 'SENT')
          this.logger.warn(`[whatsapp-inbox] fil=${threadId} : avis de fin non envoyé (${result.outcome})`);
      }
    }
    return { closed };
  }

  private async authorize(
    user: AuthenticatedUser,
    threadId: string,
    need: 'read' | 'respond',
  ): Promise<{ thread: ThreadRow; access: PropertyAccessor }> {
    const thread = await this.prisma.whatsappThread.findUnique({ where: { id: threadId }, select: THREAD_SELECT });
    if (!thread) throw new NotFoundException('Conversation introuvable');
    const property = await this.prisma.property.findUnique({ where: { id: thread.property.id } });
    if (!property) throw new NotFoundException('Conversation introuvable');

    const access = await canActOnProperty(this.prisma, user, property);
    if (!access.canRead) throw new ForbiddenException('Vous n’avez pas accès à cette conversation');
    if (need === 'respond' && !access.canMutate)
      throw new ForbiddenException('Seul le responsable du bien peut répondre au locataire');
    return { thread, access };
  }

  private async hasActiveLease(thread: Pick<ThreadRow, 'tenantUserId' | 'property'>): Promise<boolean> {
    const lease = await this.prisma.lease.findFirst({
      where: { tenantUserId: thread.tenantUserId, propertyId: thread.property.id, status: 'ACTIVE' },
      select: { id: true },
    });
    return lease !== null;
  }

  // Couples locataire + bien avec un bail actif, en une requête pour la liste.
  private async activeLeaseKeys(threads: ThreadRow[]): Promise<Set<string>> {
    if (threads.length === 0) return new Set();
    const leases = await this.prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        OR: threads.map((thread) => ({ tenantUserId: thread.tenantUserId, propertyId: thread.property.id })),
      },
      select: { tenantUserId: true, propertyId: true },
      take: 100,
    });
    return new Set(leases.map((lease) => leaseKey(lease.tenantUserId, lease.propertyId)));
  }

  private async markReadBy(threadId: string, userId: string, now: Date): Promise<void> {
    await this.prisma.whatsappThread.update({
      where: { id: threadId },
      data: { unreadSince: null, agencyReadAt: now, agencyReadById: userId, notifiedAt: null, notifiedUserId: null },
    });
  }

  private async authorLabel(userId: string, isMandatedManager: boolean): Promise<string> {
    const author = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, managerProfile: { select: { companyName: true } } },
    });
    const name = `${author?.firstName ?? ''} ${author?.lastName ?? ''}`.trim();
    if (!isMandatedManager) return `${name} (propriétaire)`;
    return author?.managerProfile?.companyName?.trim() || `${name} (gestionnaire)`;
  }

  // Heure Meta du dernier message du locataire, même adressé au robot :
  // départ de la fenêtre de 24 h (vocabulaire validé).
  private async lastInboundAt(tenantUserId: string): Promise<Date | null> {
    const last = await this.prisma.whatsappMessage.findFirst({
      where: { userId: tenantUserId, direction: 'INBOUND' },
      orderBy: { createdAt: 'desc' },
      select: { sentAt: true, createdAt: true },
    });
    return last ? (last.sentAt ?? last.createdAt) : null;
  }

  private async lastInboundByTenant(tenantIds: string[]): Promise<Map<string, Date>> {
    if (tenantIds.length === 0) return new Map();
    const rows = await this.prisma.whatsappMessage.groupBy({
      by: ['userId'],
      where: { userId: { in: [...new Set(tenantIds)] }, direction: 'INBOUND' },
      _max: { sentAt: true, createdAt: true },
      orderBy: { userId: 'asc' },
    });
    const result = new Map<string, Date>();
    for (const row of rows) {
      const at = row._max.sentAt ?? row._max.createdAt;
      if (row.userId && at) result.set(row.userId, at);
    }
    return result;
  }
}

function openExchangeWhere(now: Date): Prisma.WhatsappThreadWhereInput {
  return {
    humanOpenedAt: { not: null },
    humanClosedAt: null,
    lastTenantMessageAt: { gt: new Date(now.getTime() - WHATSAPP_REPLY_WINDOW_MS) },
  };
}

function leaseKey(tenantUserId: string, propertyId: string): string {
  return `${tenantUserId}:${propertyId}`;
}

function toSummary(
  thread: ThreadRow,
  user: AuthenticatedUser,
  lastInboundAt: Date | null,
  hasActiveLease: boolean,
  now: Date,
): ConversationSummary {
  const isOpen = isExchangeOpen(thread, now);
  const isResponsible = responsibleUserIdFor(thread.property, thread.property.mandates[0]) === user.id;
  const unread =
    isResponsible &&
    (thread.unreadSince !== null ||
      (thread.agencyReadById !== null && thread.agencyReadById !== user.id && isOpen));
  return {
    id: thread.id,
    tenant: thread.tenant,
    property: { id: thread.property.id, label: formatPropertyLocation(thread.property) },
    isOpen,
    closedReason: isOpen ? null : (thread.closedReason ?? (thread.humanOpenedAt ? 'TIMEOUT' : null)),
    lastMessageAt: thread.lastMessageAt,
    lastMessage: thread.messages[0] ? toInboxMessage(thread.messages[0]) : null,
    unread,
    canReply: isResponsible && hasActiveLease,
    readOnlyReason: !isResponsible ? 'NOT_RESPONSIBLE' : hasActiveLease ? null : 'LEASE_ENDED',
    replyWindowEndsAt: lastInboundAt ? new Date(lastInboundAt.getTime() + WHATSAPP_REPLY_WINDOW_MS) : null,
  };
}

function toInboxMessage(row: MessageRow): InboxMessage {
  const payload = isRecord(row.payload) ? row.payload : {};
  if (row.direction === 'OUTBOUND') {
    return {
      id: row.id,
      from: 'AGENCY',
      kind: 'text',
      text: typeof payload['body'] === 'string' ? payload['body'] : null,
      createdAt: row.createdAt,
      delivery: deliveryOf(row),
    };
  }
  // Message de 6 chiffres : jamais gardé en clair (empreinte effacée).
  const masked = 'pinDigest' in payload || 'pinMasked' in payload;
  const kind: InboxMessageKind = masked ? 'masked' : (MEDIA_KINDS[row.messageType] ?? 'text');
  return {
    id: row.id,
    from: 'TENANT',
    kind,
    text: masked ? null : row.body,
    createdAt: row.createdAt,
    delivery: null,
  };
}

function deliveryOf(row: MessageRow): InboxMessage['delivery'] {
  if (row.readAt) return 'read';
  if (row.deliveredAt) return 'delivered';
  if (row.status === 'SENT') return 'sent';
  if (row.status === 'FAILED') return 'failed';
  if (row.status === 'UNKNOWN') return 'unknown';
  return 'pending';
}

function isRecord(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
