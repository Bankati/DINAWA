import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as Sentry from '@sentry/nestjs';
import { PrismaService } from '../../prisma/prisma.service';
import { STOP_CONFIRMATION_SOURCE, WhatsappService } from '../whatsapp-channel/whatsapp.service';
import {
  WHATSAPP_INBOUND_MAX_ATTEMPTS,
  WHATSAPP_INBOUND_RECOVERY_BATCH,
  WHATSAPP_INBOUND_RETRY_AFTER_MS,
} from '../../common/constants';
import { WHATSAPP_INBOUND_RECEIVED, WhatsappInboundReceivedEvent } from './whatsapp-inbound.events';

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
      select: { userId: true, inboundAction: true, createdAt: true, processingAttempts: true },
    });
    if (!message) return;

    try {
      if (message.inboundAction === 'STOP_CONFIRMATION' && message.userId) {
        await this.confirmStop(message.userId, message.createdAt);
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

  // Une confirmation déjà créée depuis la réception du STOP (traitement
  // interrompu APRÈS l'envoi, puis repris) n'est jamais renvoyée.
  private async confirmStop(userId: string, stopReceivedAt: Date): Promise<void> {
    const alreadySent = await this.prisma.whatsappMessage.findFirst({
      where: {
        userId,
        direction: 'OUTBOUND',
        source: STOP_CONFIRMATION_SOURCE,
        createdAt: { gte: stopReceivedAt },
      },
      select: { id: true },
    });
    if (alreadySent) return;

    // Résultat REFUSED / FAILED / UNKNOWN : la confirmation est un geste de
    // courtoisie, l'arrêt est déjà enregistré quoi qu'il arrive. Jamais de
    // nouvel essai automatique (un UNKNOWN a peut-être été reçu).
    const result = await this.whatsapp.sendStopConfirmation(userId);
    if (result.outcome !== 'SENT') {
      this.logger.warn(`[whatsapp-inbound] confirmation de STOP non envoyée pour user=${userId} : ${result.outcome}`);
    }
  }
}
