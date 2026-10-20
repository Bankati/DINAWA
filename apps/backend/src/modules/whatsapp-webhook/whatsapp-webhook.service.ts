import {
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nestjs';
import { createHash, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { verifyMetaSignature } from '../../common/utils/meta-signature';
import { fromWhatsappNumber, storedPhoneVariants } from '../../common/utils/phone';
import { classifyMetaError } from '../whatsapp-channel/meta-error';
import { InboundMessage, InboundStatus, parseMetaNotification } from './meta-webhook-payload';
import { DeliveryState, StatusEvent, applyStatusEvent } from './status-transition';
import { CONSENT_TRANSACTION_OPTIONS, WHATSAPP_CONSENT_NOTICE_VERSION } from '../../common/constants';
import { applyConsentCommand } from '../whatsapp-consent/consent-writer';
import { WhatsappConsentService } from '../whatsapp-consent/whatsapp-consent.service';
import { ConsentKeyword, parseConsentKeyword } from './consent-keyword';
import { InboundAction, WHATSAPP_INBOUND_RECEIVED, WhatsappInboundReceivedEvent } from './whatsapp-inbound.events';

const INBOUND_SOURCE = 'inbound';
// Un accusé peut croiser un autre accusé du même message : l'écriture est
// conditionnée à l'état lu, et recalculée si elle a perdu la course.
const STATUS_WRITE_ATTEMPTS = 3;

type KnownSender = { id: string };

// statusChangedFor : locataire dont l'état affiché à l'agence a changé
// (numéro vérifié ou consentement), pour vider le cache de ses listes.
type RecordedInbound = { id: string; action: InboundAction | null; statusChangedFor: string | null };

// Mot-clé reçu → commande du consentement, et réponse à envoyer si l'état a
// réellement changé (unités 44-45).
const KEYWORD_COMMAND = { STOP: 'BOT_STOP', CONFIRM: 'BOT_CONFIRM', RESUME: 'BOT_RESUME' } as const;
const KEYWORD_ACTION: Record<ConsentKeyword, InboundAction> = {
  STOP: 'STOP_CONFIRMATION',
  CONFIRM: 'CONSENT_WELCOME',
  RESUME: 'RESUME_CONFIRMATION',
};

type Summary = { messages: number; duplicates: number; statuses: number; unknownStatuses: number; skipped: number };

// Webhook Meta (unité 44, /architect 2026-10-13). Ordre imposé par la
// décision 5 : vérifier la signature, ENREGISTRER, laisser le contrôleur
// répondre 200, traiter ensuite en arrière-plan. Une erreur de base remonte
// (→ 500) : Meta renverra la notification, sans doublon grâce au wamid
// unique. Jamais de texte ni de numéro dans les journaux.
@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger(WhatsappWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
    private readonly consent: WhatsappConsentService,
  ) {}

  // Poignée de main de l'abonnement (GET) : Meta renvoie le jeton choisi par
  // l'équipe et attend le challenge en retour.
  verifyHandshake(mode: string | undefined, token: string | undefined, challenge: string | undefined): string {
    const expected = this.config.get<string>('WHATSAPP_VERIFY_TOKEN');
    if (!expected) throw new ServiceUnavailableException('Webhook WhatsApp non configuré');
    if (mode !== 'subscribe' || !token || !challenge || !sameSecret(token, expected)) {
      throw new ForbiddenException('Vérification du webhook refusée');
    }
    return challenge;
  }

  async handleNotification(rawBody: Buffer | undefined, signature: string | undefined, body: unknown): Promise<void> {
    // Interrupteur général éteint ou non : le webhook reste ouvert (décision
    // 6), un STOP reçu pendant une coupure doit être enregistré. Sans clé
    // secrète, impossible d'authentifier Meta : 503, Meta réessaiera.
    const appSecret = this.config.get<string>('WHATSAPP_APP_SECRET');
    if (!appSecret) throw new ServiceUnavailableException('Webhook WhatsApp non configuré');
    if (!verifyMetaSignature(rawBody, signature, appSecret)) {
      throw new UnauthorizedException('Signature du webhook invalide');
    }

    const phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    const summary: Summary = { messages: 0, duplicates: 0, statuses: 0, unknownStatuses: 0, skipped: 0 };
    const toProcess: string[] = [];
    // Locataires dont l'état WhatsApp affiché à l'agence a changé.
    const changedTenants = new Set<string>();

    for (const notification of parseMetaNotification(body)) {
      // Une notification d'un autre numéro du compte n'est pas pour WARAH.
      if (phoneNumberId && notification.phoneNumberId && notification.phoneNumberId !== phoneNumberId) {
        summary.skipped += notification.messages.length + notification.statuses.length;
        continue;
      }
      summary.skipped += notification.skipped;

      for (const status of notification.statuses) {
        if (await this.applyStatus(status)) summary.statuses += 1;
        else summary.unknownStatuses += 1;
      }
      for (const message of notification.messages) {
        const recorded = await this.recordInbound(message);
        if (recorded === 'duplicate') {
          summary.duplicates += 1;
          continue;
        }
        summary.messages += 1;
        if (recorded.action) toProcess.push(recorded.id);
        if (recorded.statusChangedFor) changedTenants.add(recorded.statusChangedFor);
      }
    }

    this.logger.log(
      `[whatsapp-webhook] ${summary.messages} message(s), ${summary.duplicates} doublon(s), ` +
        `${summary.statuses} accusé(s), ${summary.unknownStatuses} accusé(s) sans message, ` +
        `${summary.skipped} élément(s) ignoré(s)`,
    );

    // Après l'enregistrement seulement : le traitement part en arrière-plan,
    // la réponse à Meta n'attend pas (invariant #15).
    for (const messageId of toProcess) {
      const event: WhatsappInboundReceivedEvent = { messageId };
      this.events.emit(WHATSAPP_INBOUND_RECEIVED, event);
    }

    // Badge de la liste « Locataires » de l'agence (cache par utilisateur,
    // /review unité 45). Après l'enregistrement : un échec ici ne doit pas
    // faire renvoyer la notification par Meta, l'état est déjà enregistré.
    for (const tenantUserId of changedTenants) {
      await this.consent.refreshAgencyLists(tenantUserId).catch((error: unknown) => {
        this.logger.warn(
          `[whatsapp-webhook] cache des listes non vidé pour user=${tenantUserId}`,
          error instanceof Error ? error.stack : undefined,
        );
      });
    }
  }

  // Renvoie false si l'accusé ne correspond à aucun message envoyé par WARAH
  // (ex. essai depuis la console Meta) — ignoré, seulement compté.
  private async applyStatus(status: InboundStatus): Promise<boolean> {
    const event = toStatusEvent(status);

    for (let attempt = 0; attempt < STATUS_WRITE_ATTEMPTS; attempt += 1) {
      const message = await this.findOutbound(status);
      if (!message) return false;

      const result = applyStatusEvent(message, event);
      if (result.kind === 'unchanged') return true;
      if (result.kind === 'incoherent') {
        this.logger.warn(`[whatsapp-webhook] accusé « ${status.status} » ignoré pour message=${message.id} : ${result.reason}`);
        return true;
      }

      // Écriture conditionnée à l'état lu (compare-and-swap) : deux accusés
      // simultanés ne peuvent pas passer tous les deux, ni effacer une date.
      const { count } = await this.prisma.whatsappMessage.updateMany({
        where: {
          id: message.id,
          status: message.status,
          sentAt: message.sentAt,
          deliveredAt: message.deliveredAt,
          readAt: message.readAt,
        },
        // Ligne restée sans wamid (écriture perdue après l'envoi, unité 42) :
        // rattachée grâce à biz_opaque_callback_data.
        data: { ...result.patch, ...(message.wamid ? {} : { wamid: status.wamid }) },
      });
      if (count === 1) {
        if (status.status === 'failed') this.alertIfConfigurationIssue(status, message.id);
        return true;
      }
    }

    this.logger.warn(`[whatsapp-webhook] accusé « ${status.status} » non appliqué après ${STATUS_WRITE_ATTEMPTS} essais`);
    return true;
  }

  private async findOutbound(
    status: InboundStatus,
  ): Promise<(DeliveryState & { id: string; wamid: string | null }) | null> {
    const select = { id: true, wamid: true, status: true, sentAt: true, deliveredAt: true, readAt: true } as const;
    if (status.callbackData) {
      const byId = await this.prisma.whatsappMessage.findFirst({
        where: { id: status.callbackData, direction: 'OUTBOUND' },
        select,
      });
      if (byId) return byId;
    }
    return this.prisma.whatsappMessage.findFirst({ where: { wamid: status.wamid, direction: 'OUTBOUND' }, select });
  }

  // Un échec signalé par accusé dont la cause est chez WARAH (compte bloqué,
  // jeton, paiement...) : tous les envois échoueront, un humain doit agir.
  private alertIfConfigurationIssue(status: InboundStatus, messageId: string): void {
    if (status.errorCode === null) return;
    const { alert } = classifyMetaError({ httpStatus: 400, errorCode: status.errorCode, errorSubcode: null });
    if (!alert) return;
    const summary = `[whatsapp-webhook] message=${messageId} échec signalé par accusé (code ${status.errorCode})`;
    this.logger.error(summary);
    Sentry.captureMessage(`WhatsApp : intervention requise — ${summary}`, 'error');
  }

  private async recordInbound(message: InboundMessage): Promise<RecordedInbound | 'duplicate'> {
    const { local, digits } = fromWhatsappNumber(message.from);
    const sender = local ? await this.findSender(local) : null;
    const keyword = sender !== null && message.type === 'TEXT' ? parseConsentKeyword(message.text) : null;

    const data = {
      userId: sender?.id ?? null,
      recipientPhone: local ?? digits,
      direction: 'INBOUND' as const,
      messageType: message.type,
      source: INBOUND_SOURCE,
      status: 'RECEIVED' as const,
      wamid: message.wamid,
      sentAt: message.receivedAt,
      // Numéro inconnu : rien de son contenu n'est gardé (décision 3), seul
      // le type Meta reste pour un message OTHER.
      body: sender ? message.text : null,
      payload: sender
        ? (message.payload as Prisma.InputJsonObject)
        : message.type === 'OTHER'
          ? (message.payload as Prisma.InputJsonObject)
          : Prisma.DbNull,
    };

    try {
      if (!sender || !local) {
        const created = await this.prisma.whatsappMessage.create({ data, select: { id: true } });
        return { id: created.id, action: null, statusChangedFor: null };
      }

      // Tout dans la même transaction que le message — immédiat et durable :
      // vérification du numéro, puis changement de consentement éventuel
      // (STOP, OUI, REPRENDRE) par le rédacteur unique. Une réponse n'est
      // demandée que si l'état a réellement changé : un second STOP, un OUI
      // sans demande en cours ou un message en retard n'en déclenchent pas.
      return await this.prisma.$transaction(async (tx) => {
        const newlyVerified = await this.markPhoneVerified(tx, sender.id, local, message.receivedAt);
        const keywordResult = keyword ? await this.applyKeyword(tx, sender.id, keyword, message.receivedAt) : null;
        let action = keywordResult?.action ?? null;
        // Accord déjà donné depuis l'espace locataire, numéro vérifié par CE
        // message (souvent le « OUI » pré-rempli que l'espace demande
        // d'envoyer) : WhatsApp devient actif à l'instant, on souhaite la
        // bienvenue — sinon le locataire n'a aucun retour (/review unité 45).
        if (!action && newlyVerified && (await this.isAccepted(tx, sender.id))) action = 'CONSENT_WELCOME';
        const created = await tx.whatsappMessage.create({
          data: { ...data, inboundAction: action },
          select: { id: true },
        });
        const statusChanged = newlyVerified || keywordResult?.changed === true;
        return { id: created.id, action, statusChangedFor: statusChanged ? sender.id : null };
      }, CONSENT_TRANSACTION_OPTIONS);
    } catch (error) {
      // Notification renvoyée par Meta : déjà enregistrée et traitée. La
      // transaction annulée ne laisse ni second événement ni seconde réponse.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return 'duplicate';
      throw error;
    }
  }

  // Numéro vérifié (unité 45, décision 3) : Meta authentifie l'expéditeur,
  // et findSender ne retient que le numéro auquel WhatsApp écrirait. Aucun
  // accord n'en découle. N'écrit que si ce numéro n'était pas déjà vérifié ;
  // renvoie true si CE message vient de le vérifier.
  private async markPhoneVerified(tx: Prisma.TransactionClient, userId: string, local: string, receivedAt: Date): Promise<boolean> {
    const { count } = await tx.user.updateMany({
      where: { id: userId, OR: [{ whatsappVerifiedPhone: null }, { whatsappVerifiedPhone: { not: local } }] },
      data: { whatsappVerifiedPhone: local, whatsappPhoneVerifiedAt: receivedAt },
    });
    return count === 1;
  }

  private async isAccepted(tx: Prisma.TransactionClient, userId: string): Promise<boolean> {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { whatsappConsent: true } });
    return user?.whatsappConsent === 'ACCEPTED';
  }

  // L'heure Meta du message sert à l'ordre : un OUI ou un REPRENDRE plus
  // ancien que le dernier changement est ignoré, un STOP s'applique toujours.
  private async applyKeyword(
    tx: Prisma.TransactionClient,
    userId: string,
    keyword: ConsentKeyword,
    sourceAt: Date,
  ): Promise<{ action: InboundAction | null; changed: boolean }> {
    const { decision } = await applyConsentCommand(tx, {
      userId,
      command: { type: KEYWORD_COMMAND[keyword], sourceAt },
      actorUserId: userId,
      noticeVersion: keyword === 'STOP' ? undefined : WHATSAPP_CONSENT_NOTICE_VERSION,
    });
    if (decision.kind === 'changed') return { action: KEYWORD_ACTION[keyword], changed: true };
    // Sans effet (ex. « OUI » d'un locataire arrêté, qui devait écrire
    // REPRENDRE) : aucune réponse, car après un STOP seule la confirmation
    // d'arrêt est permise. Le robot (unité 47) guidera ces cas.
    this.logger.log(`[whatsapp-webhook] mot-clé ${keyword} sans effet pour user=${userId} : ${decision.reason}`);
    return { action: null, changed: false };
  }

  // Numéro WhatsApp dédié d'abord, sinon numéro principal (même priorité
  // que WhatsappAccessService), sous toutes ses formes enregistrables
  // (storedPhoneVariants). Un compte anonymisé n'a plus de numéro. Deux
  // comptes pour un même numéro (formes différentes) : on garde la forme à
  // 8 chiffres si elle existe, sinon le plus ancien, et on le signale.
  private async findSender(local: string): Promise<KnownSender | null> {
    const variants = storedPhoneVariants(local);
    const select = { id: true, whatsappPhone: true, phone: true } as const;
    const byWhatsapp = await this.prisma.user.findMany({
      where: { whatsappPhone: { in: variants } },
      select,
      orderBy: { createdAt: 'asc' },
      take: 2,
    });
    const candidates = byWhatsapp.length
      ? byWhatsapp
      : await this.prisma.user.findMany({
          where: { whatsappPhone: null, phone: { in: variants } },
          select,
          orderBy: { createdAt: 'asc' },
          take: 2,
        });
    if (candidates.length > 1) {
      this.logger.warn(`[whatsapp-webhook] numéro rattaché à plusieurs comptes (${candidates.map((c) => c.id).join(', ')})`);
    }
    const chosen = candidates.find((c) => c.whatsappPhone === local || c.phone === local) ?? candidates[0];
    return chosen ? { id: chosen.id } : null;
  }
}

function toStatusEvent(status: InboundStatus): StatusEvent {
  if (status.status !== 'failed') return { status: status.status, at: status.at };
  const retryable =
    status.errorCode === null
      ? false
      : classifyMetaError({ httpStatus: 400, errorCode: status.errorCode, errorSubcode: null }).retryable;
  return {
    status: 'failed',
    at: status.at,
    failure: { errorCode: status.errorCode === null ? 'UNSPECIFIED' : `${status.errorCode}`, retryable },
  };
}

// Comparaison en temps constant de deux secrets de longueur quelconque
// (empreintes de même taille) : la durée ne révèle rien du jeton attendu.
function sameSecret(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}
