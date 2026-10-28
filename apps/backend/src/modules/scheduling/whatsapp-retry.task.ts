import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nestjs';
import { PrismaService } from '../../prisma/prisma.service';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';
import {
  CRON_WHATSAPP_RETRY,
  WHATSAPP_MAX_ATTEMPTS,
  WHATSAPP_RETRY_BATCH,
  WHATSAPP_RETRY_WINDOW_MS,
} from '../../common/constants';
import { WhatsappService, WhatsappTemplateName } from '../whatsapp-channel/whatsapp.service';
import { RETRYABLE_TEMPLATE_NAMES } from '../notify/whatsapp-templates';
import { isTenantNotificationHour } from '../../common/utils/tenant-notification-hours';

const ADVISORY_LOCK_KEY = 'whatsapp-retry-task';

type TemplatePayload = { bodyParams: string[]; buttonParam?: string };

// Nouveaux essais des notifications WhatsApp refusées temporairement par
// Meta (unité 46, décision 2). Étapes, pour chaque envoi candidat :
//   1. candidat = FAILED + réessayable, modèle `retry: true`, tentative < 3,
//      premier envoi il y a moins d'une heure ; jamais UNKNOWN (on ne sait
//      pas s'il est parti : le renvoyer risquerait un doublon) ;
//   2. RÉSERVATION par écriture conditionnelle (retryable → false) : si deux
//      exécutions le voient, une seule le renvoie ;
//   3. nouvel envoi via WhatsappService.send() — qui revérifie accord,
//      numéro vérifié et forfait — tracé comme tentative n+1 de la série.
// Ce n'est pas une nouvelle notification mais la répétition d'un envoi déjà
// décidé par NotifyService (invariant #6), d'où l'appel direct.
@Injectable()
export class WhatsappRetryTask {
  private readonly logger = new Logger(WhatsappRetryTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
  ) {}

  @Cron(CRON_WHATSAPP_RETRY)
  async run(): Promise<void> {
    const retried = await withAdvisoryLock(this.prisma, ADVISORY_LOCK_KEY, async () => {
      const count = await this.retryFailed();
      await this.alertExpired();
      return count;
    });
    if (retried === null) {
      this.logger.warn('[whatsapp-retry] exécution ignorée — une instance détient déjà le verrou');
    } else if (retried > 0) {
      this.logger.log(`[whatsapp-retry] ${retried} envoi(s) réessayé(s)`);
    }
  }

  async retryFailed(now: Date = new Date()): Promise<number> {
    // Notifications aux locataires : 7 h – 21 h seulement (heure de Lomé),
    // vérifié à chaque passage (lot de quelques secondes). Hors plage, rien
    // n'est réservé ; un envoi dont l'heure limite passe la nuit est signalé
    // par alertExpired().
    if (!isTenantNotificationHour(now)) return 0;
    const windowStart = new Date(now.getTime() - WHATSAPP_RETRY_WINDOW_MS);
    const candidates = await this.prisma.whatsappMessage.findMany({
      where: {
        direction: 'OUTBOUND',
        status: 'FAILED',
        retryable: true,
        userId: { not: null },
        templateName: { in: [...RETRYABLE_TEMPLATE_NAMES] },
        attempt: { lt: WHATSAPP_MAX_ATTEMPTS },
        OR: [{ firstAttemptAt: null, createdAt: { gte: windowStart } }, { firstAttemptAt: { gte: windowStart } }],
      },
      orderBy: { createdAt: 'asc' },
      take: WHATSAPP_RETRY_BATCH,
      select: {
        id: true,
        userId: true,
        source: true,
        templateName: true,
        payload: true,
        scheduleEntryId: true,
        paymentId: true,
        attempt: true,
        firstAttemptAt: true,
        createdAt: true,
      },
    });
    if (candidates.length === 0) return 0;

    // Échéances payées depuis le premier envoi : un rappel « à régler » ne
    // doit plus partir. Une seule requête pour tout le lot (pas de N+1).
    const entryIds = [...new Set(candidates.map((c) => c.scheduleEntryId).filter((id): id is string => id !== null))];
    const paidEntries = entryIds.length
      ? await this.prisma.paymentScheduleEntry.findMany({
          where: { id: { in: entryIds }, status: 'PAID' },
          select: { id: true },
          take: WHATSAPP_RETRY_BATCH,
        })
      : [];
    const paid = new Set(paidEntries.map((e) => e.id));

    let retried = 0;
    for (const candidate of candidates) {
      try {
        if (await this.retryOne(candidate, paid)) retried += 1;
      } catch (error) {
        // Erreur de base (réservation ou création de la tentative) : la
        // suite du lot continue ; rien n'est parti pour ce message.
        this.logger.error(
          `[whatsapp-retry] message=${candidate.id} : nouvel essai impossible`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
    return retried;
  }

  // Envois réessayables dont l'heure limite est passée AVANT la 3e tentative
  // (refus tard dans l'heure, nuit…) : marqués « plus réessayables » en une
  // écriture conditionnelle, puis UNE alerte pour le lot (/review unité 46).
  // Ceux arrivés à la 3e tentative ont déjà leur alerte (retryOne) et sont
  // exclus (attempt < 3) : jamais deux alertes pour un même envoi.
  async alertExpired(now: Date = new Date()): Promise<number> {
    const windowStart = new Date(now.getTime() - WHATSAPP_RETRY_WINDOW_MS);
    const where: Prisma.WhatsappMessageWhereInput = {
      direction: 'OUTBOUND',
      status: 'FAILED',
      retryable: true,
      templateName: { in: [...RETRYABLE_TEMPLATE_NAMES] },
      attempt: { lt: WHATSAPP_MAX_ATTEMPTS },
      OR: [{ firstAttemptAt: null, createdAt: { lt: windowStart } }, { firstAttemptAt: { lt: windowStart } }],
    };
    const expired = await this.prisma.whatsappMessage.findMany({
      where,
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: WHATSAPP_RETRY_BATCH,
    });
    if (expired.length === 0) return 0;

    const { count } = await this.prisma.whatsappMessage.updateMany({
      where: { ...where, id: { in: expired.map((m) => m.id) } },
      data: { retryable: false },
    });
    if (count > 0) {
      const summary = `[whatsapp-retry] ${count} envoi(s) abandonné(s) : heure limite dépassée avant la 3e tentative`;
      this.logger.warn(`${summary} (${expired.map((m) => m.id).join(', ')})`);
      Sentry.captureMessage(`WhatsApp : ${summary}`, 'warning');
    }
    return count;
  }

  private async retryOne(
    candidate: {
      id: string;
      userId: string | null;
      source: string;
      templateName: string | null;
      payload: Prisma.JsonValue;
      scheduleEntryId: string | null;
      paymentId: string | null;
      attempt: number;
      firstAttemptAt: Date | null;
      createdAt: Date;
    },
    paidEntryIds: Set<string>,
  ): Promise<boolean> {
    // Réservation : une seule exécution peut prendre ce message.
    const { count } = await this.prisma.whatsappMessage.updateMany({
      where: { id: candidate.id, status: 'FAILED', retryable: true },
      data: { retryable: false },
    });
    if (count === 0) return false;

    const template = toTemplatePayload(candidate.payload);
    const name = candidate.templateName as WhatsappTemplateName;
    if (!candidate.userId || !template || !RETRYABLE_TEMPLATE_NAMES.includes(name)) {
      this.logger.error(`[whatsapp-retry] message=${candidate.id} : contenu illisible, abandonné`);
      return false;
    }
    if (candidate.scheduleEntryId && paidEntryIds.has(candidate.scheduleEntryId)) {
      this.logger.log(`[whatsapp-retry] message=${candidate.id} : échéance payée entre-temps, abandonné`);
      return false;
    }

    const attempt = candidate.attempt + 1;
    const result = await this.whatsapp.send({
      userId: candidate.userId,
      source: candidate.source,
      scheduleEntryId: candidate.scheduleEntryId ?? undefined,
      paymentId: candidate.paymentId ?? undefined,
      kind: 'template',
      template: { name, bodyParams: template.bodyParams, buttonParam: template.buttonParam },
      retryOf: { attempt, firstAttemptAt: candidate.firstAttemptAt ?? candidate.createdAt },
    });

    if (result.outcome === 'FAILED' && attempt >= WHATSAPP_MAX_ATTEMPTS) {
      const summary = `[whatsapp-retry] message=${result.messageId} (${candidate.source}) abandonné après ${attempt} tentatives`;
      this.logger.warn(summary);
      Sentry.captureMessage(`WhatsApp : ${summary}`, 'warning');
    }
    return true;
  }
}

// payload d'un envoi de modèle (voir templatePayload, WhatsappService) :
// { bodyParams: string[], buttonParam?: string }. Toute autre forme =
// illisible, jamais renvoyée.
function toTemplatePayload(payload: Prisma.JsonValue): TemplatePayload | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const { bodyParams, buttonParam } = payload as Record<string, unknown>;
  if (!Array.isArray(bodyParams) || !bodyParams.every((p) => typeof p === 'string')) return null;
  if (buttonParam !== undefined && typeof buttonParam !== 'string') return null;
  return buttonParam === undefined ? { bodyParams: bodyParams } : { bodyParams: bodyParams, buttonParam };
}
