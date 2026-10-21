import { Injectable, Logger } from '@nestjs/common';
import { WhatsappMessageType, WhatsappThreadCloseReason } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotifyService } from '../notify/notify.service';
import { responsibleUserIdFor } from '../../common/permissions/property-access';
import { formatPropertyLocation } from '../../common/utils/format-property-location';
import { WHATSAPP_REPLY_WINDOW_MS } from '../../common/constants';

// Types de message dont le contenu n'est pas encore transmis au responsable
// (décision 3 : affichage des photos avec l'unité 39).
const MEDIA_TYPES: ReadonlySet<WhatsappMessageType> = new Set<WhatsappMessageType>([
  'IMAGE',
  'AUDIO',
  'VIDEO',
  'DOCUMENT',
]);

export type ExchangeState = {
  humanOpenedAt: Date | null;
  humanClosedAt: Date | null;
  lastTenantMessageAt: Date | null;
};

// Échange humain « en cours » : ouvert, pas fermé, et dernier message du
// locataire encore dans la fenêtre de réponse (décision 1 : retour au robot
// après 24 h, toujours CALCULÉ — aucune tâche planifiée).
export function isExchangeOpen(thread: ExchangeState, now: Date): boolean {
  return (
    thread.humanOpenedAt !== null &&
    thread.humanClosedAt === null &&
    thread.lastTenantMessageAt !== null &&
    now.getTime() - thread.lastTenantMessageAt.getTime() < WHATSAPP_REPLY_WINDOW_MS
  );
}

export type RelayInput = {
  threadId: string;
  messageId: string;
  messageType: WhatsappMessageType;
  receivedAt: Date;
};

// Fils de la messagerie avec le responsable du bien (unité 48) : ouverture
// par le robot, relais des messages du locataire, fermeture (locataire,
// responsable, 24 h). Partagé par WhatsappBotService et WhatsappInboxService.
@Injectable()
export class WhatsappThreadService {
  private readonly logger = new Logger(WhatsappThreadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
  ) {}

  // Nouvel échange sur le fil du couple locataire + bien (créé au besoin,
  // historique conservé). La notification et l'avis « photos » sont
  // réarmés : le premier vrai message du nouvel échange préviendra.
  async openExchange(tenantUserId: string, propertyId: string, receivedAt: Date, now: Date): Promise<string> {
    const exchange = {
      humanOpenedAt: now,
      humanClosedAt: null,
      closedReason: null,
      lastTenantMessageAt: receivedAt,
      notifiedAt: null,
      notifiedUserId: null,
      mediaNoticeSentAt: null,
    };
    const thread = await this.prisma.whatsappThread.upsert({
      where: { tenantUserId_propertyId: { tenantUserId, propertyId } },
      create: { tenantUserId, propertyId, ...exchange },
      update: exchange,
      select: { id: true },
    });
    return thread.id;
  }

  // Fin de l'échange : le fil reste lisible, le robot reprend la main. Sans
  // effet si l'échange est déjà terminé (renvoie false).
  async closeExchange(threadId: string, reason: WhatsappThreadCloseReason, now: Date): Promise<boolean> {
    const [closed] = await this.prisma.$transaction([
      this.prisma.whatsappThread.updateMany({
        where: { id: threadId, humanOpenedAt: { not: null }, humanClosedAt: null },
        data: { humanClosedAt: now, closedReason: reason },
      }),
      this.prisma.whatsappConversation.updateMany({
        where: { humanThreadId: threadId, state: 'HUMAN' },
        data: { state: 'MENU', pendingAction: null, humanThreadId: null },
      }),
    ]);
    return closed.count > 0;
  }

  // Message du locataire transmis au responsable. Renvoie true s'il faut
  // envoyer l'avis « photos et vocaux pas encore transmis » (un par échange,
  // réservé ici par écriture conditionnelle).
  async relay(input: RelayInput, now: Date): Promise<{ mediaNotice: boolean }> {
    await this.prisma.whatsappMessage.updateMany({
      where: { id: input.messageId },
      data: { threadId: input.threadId },
    });
    await this.prisma.whatsappThread.update({
      where: { id: input.threadId },
      data: { lastTenantMessageAt: input.receivedAt, lastMessageAt: input.receivedAt },
    });
    // Début de la vague de non lus (déjà commencée : rien à changer).
    await this.prisma.whatsappThread.updateMany({
      where: { id: input.threadId, unreadSince: null },
      data: { unreadSince: input.receivedAt },
    });
    await this.notifyResponsible(input.threadId, now);

    if (!MEDIA_TYPES.has(input.messageType)) return { mediaNotice: false };
    const { count } = await this.prisma.whatsappThread.updateMany({
      where: { id: input.threadId, mediaNoticeSentAt: null },
      data: { mediaNoticeSentAt: now },
    });
    return { mediaNotice: count === 1 };
  }

  // Une notification par vague de non lus (décision 2). Réservée par UNE
  // écriture conditionnelle : seulement si personne n'a encore été prévenu
  // pour cette vague, ou si le responsable a changé depuis (décision 5).
  // Toujours envoyée au responsable DU MOMENT, jamais à un ancien. Si
  // l'envoi lève, la réservation est rendue (le message suivant renotifie) ;
  // un email parti mais « échoué » garde la réservation : pas de boucle, le
  // compteur de non lus du site reste le filet de sécurité.
  private async notifyResponsible(threadId: string, now: Date): Promise<void> {
    const thread = await this.prisma.whatsappThread.findUnique({
      where: { id: threadId },
      select: {
        tenant: { select: { firstName: true, lastName: true } },
        property: {
          select: {
            ownerId: true,
            address: true,
            neighborhood: true,
            city: true,
            mandates: { where: { status: 'ACTIVE' }, take: 1, select: { managerId: true } },
          },
        },
      },
    });
    if (!thread) return;
    const responsibleId = responsibleUserIdFor(thread.property, thread.property.mandates[0]);

    const { count } = await this.prisma.whatsappThread.updateMany({
      where: {
        id: threadId,
        OR: [{ notifiedAt: null }, { notifiedUserId: { not: responsibleId } }],
      },
      data: { notifiedAt: now, notifiedUserId: responsibleId },
    });
    if (count === 0) return;

    try {
      await this.notify.notifyUser({
        userId: responsibleId,
        event: 'whatsapp-message',
        variables: {
          tenantName: `${thread.tenant.firstName} ${thread.tenant.lastName}`.trim(),
          propertyAddress: formatPropertyLocation(thread.property),
        },
      });
    } catch (error) {
      await this.prisma.whatsappThread.updateMany({
        where: { id: threadId, notifiedAt: now, notifiedUserId: responsibleId },
        data: { notifiedAt: null, notifiedUserId: null },
      });
      this.logger.error(
        `[whatsapp-inbox] fil=${threadId} : notification du responsable impossible, réservation rendue`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
