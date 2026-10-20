import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as Sentry from '@sentry/nestjs';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappBotService } from '../whatsapp-bot/whatsapp-bot.service';
import {
  CONSENT_WELCOME_SOURCE,
  CONSENT_WELCOME_TEXT,
  RESUME_CONFIRMATION_SOURCE,
  RESUME_CONFIRMATION_TEXT,
  STOP_CONFIRMATION_SOURCE,
  WhatsappSendResult,
  WhatsappService,
} from '../whatsapp-channel/whatsapp.service';
import {
  WHATSAPP_INBOUND_MAX_ATTEMPTS,
  WHATSAPP_INBOUND_RECOVERY_BATCH,
  WHATSAPP_INBOUND_RETRY_AFTER_MS,
} from '../../common/constants';
import { InboundAction, WHATSAPP_INBOUND_RECEIVED, WhatsappInboundReceivedEvent } from './whatsapp-inbound.events';

// Réponses libres (unité 45) : texte et source de chaque action.
const REPLIES: Record<Exclude<InboundAction, 'STOP_CONFIRMATION' | 'BOT'>, { source: string; text: string }> = {
  CONSENT_WELCOME: { source: CONSENT_WELCOME_SOURCE, text: CONSENT_WELCOME_TEXT },
  RESUME_CONFIRMATION: { source: RESUME_CONFIRMATION_SOURCE, text: RESUME_CONFIRMATION_TEXT },
};

// Traitement des messages reçus, hors de la requête du webhook (unité 44,
// /architect 2026-10-13, décision 5). Même schéma que les reversements :
// un signal déclenche le traitement immédiat, la tâche de rattrapage
// (WhatsappInboundRecoveryTask) reprend ce qu'un redémarrage a interrompu.
// Chaque message est d'abord « réservé » par une écriture conditionnelle :
// deux traitements simultanés (signal + rattrapage) ne peuvent pas le
// traiter tous les deux.
@Injectable()
export class WhatsappInboundProcessor {
  private readonly logger = new Logger(WhatsappInboundProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly bot: WhatsappBotService,
  ) {}

  @OnEvent(WHATSAPP_INBOUND_RECEIVED, { async: true, promisify: true })
  async handle(event: WhatsappInboundReceivedEvent): Promise<void> {
    await this.processSafely(event.messageId);
  }

  // Messages restés non traités (redémarrage, erreur passagère) : les plus
  // anciens d'abord, par lots, chacun isolé dans son propre try/catch.
  async recoverPending(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - WHATSAPP_INBOUND_RETRY_AFTER_MS);
    const pending = await this.prisma.whatsappMessage.findMany({
      where: {
        direction: 'INBOUND',
        processedAt: null,
        inboundAction: { not: null },
        processingAttempts: { lt: WHATSAPP_INBOUND_MAX_ATTEMPTS },
        createdAt: { lt: cutoff },
        OR: [{ processingStartedAt: null }, { processingStartedAt: { lt: cutoff } }],
      },
      orderBy: { createdAt: 'asc' },
      take: WHATSAPP_INBOUND_RECOVERY_BATCH,
      select: { id: true },
    });
    for (const { id } of pending) await this.processSafely(id, now);
    return pending.length;
  }

  // Ne lève jamais (base indisponible au moment de la réservation, etc.) :
  // le message reste dans la liste de travail et sera repris.
  private async processSafely(messageId: string, now = new Date()): Promise<void> {
    try {
      await this.process(messageId, now);
    } catch (error) {
      this.logger.error(
        `[whatsapp-inbound] message=${messageId} : traitement impossible pour l'instant`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  // Une erreur pendant le traitement laisse le message dans la liste de
  // travail (repris après WHATSAPP_INBOUND_RETRY_AFTER_MS), mis de côté et
  // signalé après WHATSAPP_INBOUND_MAX_ATTEMPTS échecs.
  async process(messageId: string, now = new Date()): Promise<void> {
    const cutoff = new Date(now.getTime() - WHATSAPP_INBOUND_RETRY_AFTER_MS);
    const { count } = await this.prisma.whatsappMessage.updateMany({
      where: {
        id: messageId,
        direction: 'INBOUND',
        processedAt: null,
        inboundAction: { not: null },
        processingAttempts: { lt: WHATSAPP_INBOUND_MAX_ATTEMPTS },
        OR: [{ processingStartedAt: null }, { processingStartedAt: { lt: cutoff } }],
      },
      data: { processingStartedAt: now, processingAttempts: { increment: 1 } },
    });
    if (count === 0) return; // déjà traité, ou en cours ailleurs

    const message = await this.prisma.whatsappMessage.findUnique({
      where: { id: messageId },
      select: {
        userId: true,
        inboundAction: true,
        createdAt: true,
        sentAt: true,
        processingAttempts: true,
        body: true,
        payload: true,
      },
    });
    if (!message) return;

    try {
      const action = message.inboundAction as InboundAction | null;
      if (action && message.userId) {
        // Heure Meta du message du locataire : départ de la fenêtre de 24 h.
        const receivedAt = message.sentAt ?? message.createdAt;
        if (action === 'BOT') {
          // Robot (unité 47) : il décide seul de la réponse (menu,
          // invitation ou silence) et ne répond jamais deux fois (il marque
          // lui-même ce message traité juste avant d'envoyer).
          await this.bot.handle({
            messageId,
            userId: message.userId,
            receivedAt,
            text: message.body,
            payload: message.payload,
          });
        } else {
          await this.replyOnce(message.userId, action, message.createdAt, receivedAt);
        }
      }
      await this.prisma.whatsappMessage.update({ where: { id: messageId }, data: { processedAt: new Date() } });
    } catch (error) {
      const setAside = message.processingAttempts >= WHATSAPP_INBOUND_MAX_ATTEMPTS;
      const summary = `[whatsapp-inbound] message=${messageId} échec du traitement (essai ${message.processingAttempts})`;
      this.logger.error(summary, error instanceof Error ? error.stack : undefined);
      if (setAside) {
        Sentry.captureMessage(`WhatsApp : message reçu mis de côté après ${message.processingAttempts} échecs — ${summary}`, 'error');
      }
    }
  }

  // Une réponse déjà créée depuis l'enregistrement du message (traitement
  // interrompu APRÈS l'envoi, puis repris) n'est jamais renvoyée.
  private async replyOnce(
    userId: string,
    action: Exclude<InboundAction, 'BOT'>,
    recordedAt: Date,
    receivedAt: Date,
  ): Promise<void> {
    const source = action === 'STOP_CONFIRMATION' ? STOP_CONFIRMATION_SOURCE : REPLIES[action].source;
    const alreadySent = await this.prisma.whatsappMessage.findFirst({
      where: { userId, direction: 'OUTBOUND', source, createdAt: { gte: recordedAt } },
      select: { id: true },
    });
    if (alreadySent) return;

    // Tous les contrôles sont refaits ICI, au moment de l'envoi : un STOP,
    // un changement de numéro ou la fin de la fenêtre de 24 h survenus depuis
    // la réception l'emportent (REFUSED, la tâche est simplement abandonnée).
    // REFUSED / FAILED / UNKNOWN : la réponse est un geste de courtoisie, le
    // changement d'état est déjà enregistré quoi qu'il arrive, et un échec
    // d'envoi n'y touche jamais. Pas de nouvel essai automatique (un UNKNOWN
    // a peut-être été reçu).
    const result: WhatsappSendResult =
      action === 'STOP_CONFIRMATION'
        ? await this.whatsapp.sendStopConfirmation(userId, receivedAt)
        : await this.whatsapp.reply({ userId, ...REPLIES[action], inboundReceivedAt: receivedAt });
    if (result.outcome !== 'SENT') {
      const detail = result.outcome === 'REFUSED' ? `REFUSED (${result.reason})` : result.outcome;
      this.logger.warn(`[whatsapp-inbound] réponse ${source} non envoyée pour user=${userId} : ${detail}`);
    }
  }
}
