import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, WhatsappBotAction, WhatsappBotState, WhatsappMessageType } from '@prisma/client';
import * as Sentry from '@sentry/nestjs';
import { addDays } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { NotifyService } from '../notify/notify.service';
import { responsibleUserIdFor } from '../../common/permissions/property-access';
import { formatPropertyLocation } from '../../common/utils/format-property-location';
import { WhatsappSendResult, WhatsappService } from '../whatsapp-channel/whatsapp.service';
import { PayLinksService } from '../pay-links/pay-links.service';
import { ReceiptPdfService } from '../receipts/receipt-pdf.service';
import { WhatsappThreadService, isExchangeOpen } from '../whatsapp-inbox/whatsapp-thread.service';
import {
  BOT_CONVERSATION_TIMEOUT_MS,
  BOT_MAX_REPLIES_PER_HOUR,
  BOT_REPLY_WINDOW_MS,
  BOT_STATEMENT_MONTHS,
  PAY_LINK_VALID_DAYS_AFTER_DUE,
  WHATSAPP_INVITATION_TTL_MS,
  WHATSAPP_RELAY_MAX_PER_HOUR,
  WHATSAPP_RELAY_WINDOW_MS,
} from '../../common/constants';
import { BotIdentityService, RentCheck } from './bot-identity.service';
import { PIN_FLOW_CTA, PIN_FLOW_SCREENS, PinFlowKind, signPinFlowToken } from './pin-flow';
import {
  BOT_TEXTS,
  BotChoice,
  MENU_BUTTON,
  MENU_ROWS,
  formatDay,
  formatFcfa,
  formatMonth,
  parseBotChoice,
  parseHumanExit,
} from './bot-messages';

// Message reçu à traiter (lu par WhatsappInboundProcessor).
export type BotInbound = {
  messageId: string;
  userId: string;
  // Heure Meta du message : départ de la fenêtre de 24 h.
  receivedAt: Date;
  messageType: WhatsappMessageType;
  text: string | null;
  payload: Prisma.JsonValue;
};

// États de la création du code depuis WhatsApp (unité 50).
const CREATION_STATES: ReadonlySet<WhatsappBotState> = new Set<WhatsappBotState>([
  'AWAITING_RENT_CHECK',
  'AWAITING_NEW_PIN',
  'AWAITING_NEW_PIN_CONFIRM',
]);

const PROTECTED: Record<'RECEIPT' | 'STATEMENT', WhatsappBotAction> = {
  RECEIPT: 'RECEIPT',
  STATEMENT: 'STATEMENT',
};

// La quittance est fabriquée AVANT l'envoi : une panne du PDF devient une
// réponse « erreur technique » au lieu d'un silence.
type Reply =
  | { kind: 'menu'; body: string }
  | { kind: 'text'; text: string; source: string }
  | { kind: 'document'; paymentId: string; content: Buffer; caption: string }
  // Formulaire WhatsApp du code (unité 50) ; fallback : même demande en
  // simple message si Meta refuse le formulaire.
  | { kind: 'flow'; flow: PinFlowKind; body: string; fallback: string };

// openPropertyId : « Contacter mon gestionnaire » — l'échange humain n'est
// ouvert qu'une fois la réponse partie (unité 48). pendingPinHash : premier
// code tapé en message, en attente de confirmation (unité 50).
type Step = {
  reply: Reply;
  state: WhatsappBotState;
  pendingAction: WhatsappBotAction | null;
  openPropertyId?: string;
  pendingPinHash?: string;
};

type BotUser = {
  firstName: string;
  lastName: string;
  // Bien du bail actif (le premier, comme pour « Payer »).
  activePropertyId: string;
  // Loyer du bail actif, avec et sans charges : question de contrôle avant
  // de créer un code dans WhatsApp (unité 50).
  rentAmounts: number[];
  whatsappVerifiedPhone: string | null;
  tenantProfile: {
    whatsappPinHash: string | null;
    pinVerifiedAt: Date | null;
    pinVerifiedPhone: string | null;
    pinLockedUntil: Date | null;
  } | null;
};

// Robot à menu WhatsApp (unité 47, /architect 2026-10-17). Une réponse par
// message reçu, toujours une RÉPONSE dans la fenêtre de 24 h (WhatsappService
// revérifie accord, numéro et fenêtre au moment de l'envoi : un STOP arrivé
// entre-temps l'emporte).
//   - locataire avec accord : menu, « Payer », « Quittance », « Relevé » ;
//   - locataire sans accord : UNE invitation « répondez OUI » par 24 h ;
//   - arrêté (STOP), non-locataire, sans bail actif : silence ;
//   - échange avec le gestionnaire en cours (unité 48) : relais, sauf
//     commande du menu, 24 h sans message ou STOP.
// L'état de la conversation n'autorise jamais rien à lui seul : quittance
// et relevé revérifient le code à chaque fois (BotIdentityService).
@Injectable()
export class WhatsappBotService {
  private readonly logger = new Logger(WhatsappBotService.name);
  // Un locataire à la fois : deux messages rapprochés (ex. « quittance »
  // puis le code) sont traités dans l'ordre de réception.
  private readonly queues = new Map<string, Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly payLinks: PayLinksService,
    private readonly receiptPdf: ReceiptPdfService,
    private readonly identity: BotIdentityService,
    private readonly threads: WhatsappThreadService,
    private readonly config: ConfigService,
    private readonly notify: NotifyService,
  ) {}

  handle(inbound: BotInbound): Promise<void> {
    const previous = this.queues.get(inbound.userId) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(() => this.process(inbound));
    this.queues.set(inbound.userId, current);
    void current
      .catch(() => undefined)
      .then(() => {
        if (this.queues.get(inbound.userId) === current) this.queues.delete(inbound.userId);
      });
    return current;
  }

  private async process(inbound: BotInbound): Promise<void> {
    try {
      await this.respond(inbound, new Date());
    } finally {
      // L'empreinte d'un code tapé ne survit jamais au traitement.
      await this.forgetPinDigest(inbound);
    }
  }

  private async respond(inbound: BotInbound, now: Date): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: inbound.userId },
      select: {
        role: true,
        firstName: true,
        lastName: true,
        anonymizedAt: true,
        whatsappConsent: true,
        whatsappVerifiedPhone: true,
        tenantProfile: {
          select: {
            whatsappPinHash: true,
            pinVerifiedAt: true,
            pinVerifiedPhone: true,
            pinLockedUntil: true,
          },
        },
        leasesAsTenant: {
          where: { status: 'ACTIVE' },
          select: { id: true, propertyId: true, monthlyRent: true, monthlyCharges: true },
          take: 1,
        },
      },
    });
    // Robot réservé aux locataires avec un bail actif ; silence après un STOP.
    if (!user || user.role !== 'TENANT' || user.anonymizedAt || user.leasesAsTenant.length === 0)
      return;
    if (user.whatsappConsent === 'STOPPED') return;
    if (user.whatsappConsent !== 'ACCEPTED') {
      await this.invite(inbound, now);
      return;
    }

    const conversation = await this.prisma.whatsappConversation.upsert({
      where: { userId: inbound.userId },
      create: { userId: inbound.userId, lastActivityAt: now, replyWindowStart: now, replyCount: 0 },
      update: {},
      select: {
        state: true,
        pendingAction: true,
        lastActivityAt: true,
        humanThreadId: true,
        pendingPinHash: true,
      },
    });
    const lease = user.leasesAsTenant[0];
    const botUser: BotUser = {
      ...user,
      activePropertyId: lease.propertyId,
      rentAmounts: [...new Set([lease.monthlyRent, lease.monthlyRent + lease.monthlyCharges])],
    };

    let currentState = conversation.state;
    if (currentState === 'HUMAN') {
      if (conversation.humanThreadId && (await this.onHuman(inbound, conversation.humanThreadId, now)))
        return;
      // Échange terminé (commande du menu ou 24 h) : le robot répond.
      currentState = 'MENU';
    }

    if (!(await this.reserveReply(inbound.userId, now))) {
      this.logger.warn(
        `[whatsapp-bot] user=${inbound.userId} : plafond de réponses de l'heure atteint, silence`,
      );
      return;
    }

    const idle =
      now.getTime() - conversation.lastActivityAt.getTime() >= BOT_CONVERSATION_TIMEOUT_MS;
    const state = idle ? 'MENU' : currentState;
    const pending = idle ? null : conversation.pendingAction;
    const pendingPinHash = idle ? null : conversation.pendingPinHash;
    // Formulaire « Créer mon code » rempli après 30 min (jeton valable 1 h) :
    // la quittance ou le relevé demandé part quand même (relecture Esther).
    const creationPending = CREATION_STATES.has(conversation.state) ? conversation.pendingAction : null;

    let step: Step;
    try {
      step = await this.decide(
        inbound,
        botUser,
        { state, pending, pendingPinHash, creationPending },
        now,
      );
    } catch (error) {
      this.logger.error(
        `[whatsapp-bot] user=${inbound.userId} : réponse impossible`,
        error instanceof Error ? error.stack : undefined,
      );
      step = {
        reply: { kind: 'text', text: BOT_TEXTS.technicalError, source: 'bot-info' },
        state: 'MENU',
        pendingAction: null,
      };
    }

    // Jamais deux réponses au même message : ce message précis est marqué
    // traité juste avant l'envoi (écriture conditionnelle). Un traitement
    // repris après une coupure, ou lancé en double, s'arrête ici. Risque
    // résiduel assumé : arrêt entre le marquage et l'envoi → pas de réponse
    // (le locataire réécrit), préféré à un doublon.
    const claimed = await this.prisma.whatsappMessage.updateMany({
      where: { id: inbound.messageId, processedAt: null },
      data: { processedAt: now },
    });
    if (claimed.count === 0) return;

    // « Contacter mon gestionnaire » : échange ouvert AVANT l'accusé (correctif
    // /review) — une panne entre les deux laisse au pire un échange ouvert
    // sans accusé (les messages vont au gestionnaire, comme voulu), jamais
    // un accusé « il vous répondra » suivi de messages partis au robot.
    const humanThreadId = step.openPropertyId
      ? await this.threads.openExchange(inbound.userId, step.openPropertyId, inbound.receivedAt, now)
      : null;
    if (humanThreadId) {
      await this.prisma.whatsappConversation.update({
        where: { userId: inbound.userId },
        data: { state: 'HUMAN', pendingAction: null, lastActivityAt: now, humanThreadId, pendingPinHash: null },
      });
    }

    const result = await this.send(inbound, step.reply);
    if (result.outcome !== 'SENT') {
      // Étape non enregistrée : le robot n'attend pas un code qu'il n'a pas
      // réussi à demander, et aucun échange ne reste ouvert sans accusé.
      const detail = result.outcome === 'REFUSED' ? `REFUSED (${result.reason})` : result.outcome;
      this.logger.warn(
        `[whatsapp-bot] réponse non envoyée pour user=${inbound.userId} : ${detail}`,
      );
      if (humanThreadId) await this.threads.closeExchange(humanThreadId, 'SYSTEM', now);
      return;
    }
    if (humanThreadId) return;
    await this.prisma.whatsappConversation.update({
      where: { userId: inbound.userId },
      data: {
        state: step.state,
        pendingAction: step.pendingAction,
        lastActivityAt: now,
        humanThreadId: null,
        // Premier code non confirmé : jamais au-delà de la réponse suivante.
        pendingPinHash: step.pendingPinHash ?? null,
      },
    });
  }

  // Message reçu pendant un échange avec le gestionnaire (unité 48,
  // décision 1). Renvoie true s'il est traité ici (relais ou rappel), false
  // si l'échange vient de se terminer : le robot répond alors normalement.
  private async onHuman(inbound: BotInbound, threadId: string, now: Date): Promise<boolean> {
    const thread = await this.prisma.whatsappThread.findUnique({
      where: { id: threadId },
      select: { humanOpenedAt: true, humanClosedAt: true, lastTenantMessageAt: true },
    });
    if (!thread || !isExchangeOpen(thread, now)) {
      await this.threads.closeExchange(threadId, 'TIMEOUT', now);
      return false;
    }

    // Réponse d'un formulaire du code (unité 50) : jamais relayée au
    // gestionnaire, elle termine l'échange comme une commande du menu.
    const exit = readString(inbound.payload, 'pinFlow')
      ? 'MENU'
      : parseHumanExit(inbound.text, readString(inbound.payload, 'replyId'));
    if (exit === 'AGENT') {
      if (await this.reserveReply(inbound.userId, now))
        await this.sendOnce(inbound, BOT_TEXTS.agentAlreadyOpen, 'bot-agent');
      return true;
    }
    if (exit) {
      await this.threads.closeExchange(threadId, 'TENANT', now);
      return false;
    }

    // Plafond des messages transmis (correctif /review) : au-delà, plus rien
    // n'est rangé dans le fil pendant l'heure, avec UN seul avertissement
    // (au premier message de trop). Le message reste enregistré comme reçu.
    const sentLastHour = await this.prisma.whatsappMessage.count({
      where: {
        userId: inbound.userId,
        direction: 'INBOUND',
        createdAt: { gt: new Date(now.getTime() - WHATSAPP_RELAY_WINDOW_MS) },
      },
    });
    if (sentLastHour > WHATSAPP_RELAY_MAX_PER_HOUR) {
      this.logger.warn(`[whatsapp-bot] user=${inbound.userId} : plafond des messages transmis atteint`);
      if (sentLastHour === WHATSAPP_RELAY_MAX_PER_HOUR + 1)
        await this.sendOnce(inbound, BOT_TEXTS.relayLimit, 'bot-relay-limit');
      return true;
    }

    const { mediaNotice } = await this.threads.relay(
      { threadId, messageId: inbound.messageId, messageType: inbound.messageType, receivedAt: inbound.receivedAt },
      now,
    );
    if (mediaNotice) await this.sendOnce(inbound, BOT_TEXTS.mediaNotForwarded, 'bot-media-notice');
    return true;
  }

  // Réponse courte hors du parcours du menu, avec la même garantie « jamais
  // deux réponses au même message » que respond().
  private async sendOnce(inbound: BotInbound, text: string, source: string): Promise<void> {
    const claimed = await this.prisma.whatsappMessage.updateMany({
      where: { id: inbound.messageId, processedAt: null },
      data: { processedAt: new Date() },
    });
    if (claimed.count === 0) return;
    const result = await this.whatsapp.reply({
      userId: inbound.userId,
      inboundReceivedAt: inbound.receivedAt,
      source,
      text,
    });
    if (result.outcome !== 'SENT')
      this.logger.warn(`[whatsapp-bot] ${source} non envoyé pour user=${inbound.userId} : ${result.outcome}`);
  }

  private async decide(
    inbound: BotInbound,
    user: BotUser,
    conversation: {
      state: WhatsappBotState;
      pending: WhatsappBotAction | null;
      pendingPinHash: string | null;
      creationPending: WhatsappBotAction | null;
    },
    now: Date,
  ): Promise<Step> {
    const { state, pending } = conversation;
    // Réponse d'un formulaire du code (unité 50) : avant les mots du menu.
    const flow = readString(inbound.payload, 'pinFlow');
    if (flow === 'CREATE') return this.onFlowCreate(inbound, user, conversation.creationPending, now);
    if (flow === 'ENTER') {
      if (state !== 'AWAITING_PIN' || !pending) return menuStep(BOT_TEXTS.pinFlowLate);
      if (!readBoolean(inbound.payload, 'pinFlowValid'))
        return this.askPinStep(pending, BOT_TEXTS.pinFlowExpired);
      return this.onPin(inbound, user, pending, now);
    }

    const replyId = readString(inbound.payload, 'replyId');
    const choice = parseBotChoice(inbound.text, replyId);
    if (choice) return this.onChoice(inbound, user, choice, now);

    // Code tapé en réponse à la demande du robot.
    if (state === 'AWAITING_PIN' && pending && hasPinDigest(inbound.payload)) {
      return this.onPin(inbound, user, pending, now);
    }
    if (state === 'AWAITING_PIN' && pending) {
      return {
        reply: { kind: 'text', text: BOT_TEXTS.askPinAgain, source: 'bot-pin' },
        state,
        pendingAction: pending,
      };
    }
    // Création du code par simple message (unité 50, secours) : le loyer
    // d'abord, puis le code et sa confirmation.
    if (state === 'AWAITING_RENT_CHECK') return this.onRentTyped(inbound, user, pending, now);
    if (state === 'AWAITING_NEW_PIN' && hasPinDigest(inbound.payload))
      return this.onNewPinTyped(inbound, pending);
    if (state === 'AWAITING_NEW_PIN_CONFIRM' && hasPinDigest(inbound.payload))
      return this.onNewPinConfirm(inbound, user, pending, conversation.pendingPinHash, now);
    if (state === 'AWAITING_NEW_PIN' || state === 'AWAITING_NEW_PIN_CONFIRM') {
      return {
        reply: { kind: 'text', text: BOT_TEXTS.askNewPinAgain, source: 'bot-pin' },
        state,
        pendingAction: pending,
        pendingPinHash: conversation.pendingPinHash ?? undefined,
      };
    }
    return {
      reply: { kind: 'menu', body: BOT_TEXTS.notUnderstood },
      state: 'MENU',
      pendingAction: null,
    };
  }

  private async onChoice(
    inbound: BotInbound,
    user: BotUser,
    choice: BotChoice,
    now: Date,
  ): Promise<Step> {
    if (choice === 'MENU') return menuStep(BOT_TEXTS.menu(user.firstName));
    if (choice === 'PAY') return textStep(await this.payText(inbound.userId, now), 'bot-pay');
    if (choice === 'AGENT') {
      return {
        reply: { kind: 'text', text: BOT_TEXTS.agentOpened, source: 'bot-agent' },
        state: 'HUMAN',
        pendingAction: null,
        openPropertyId: user.activePropertyId,
      };
    }

    const action = PROTECTED[choice];
    const pin = user.tenantProfile;
    if (!pin) return textStep(BOT_TEXTS.pinUnavailable, 'bot-pin');
    // Pas encore de code : le locataire le crée ici (unité 50).
    if (!pin.whatsappPinHash) return this.askNewPinStep(action);
    if (this.identity.isVerified(pin, user.whatsappVerifiedPhone, now))
      return this.perform(inbound, action, now);
    if (pin.pinLockedUntil && pin.pinLockedUntil > now)
      return textStep(BOT_TEXTS.locked(minutesUntil(pin.pinLockedUntil, now)), 'bot-pin');
    return this.askPinStep(action);
  }

  private async onPin(
    inbound: BotInbound,
    user: BotUser,
    pending: WhatsappBotAction,
    now: Date,
  ): Promise<Step> {
    const digest = readString(inbound.payload, 'pinDigest');
    if (!user.whatsappVerifiedPhone) return textStep(BOT_TEXTS.pinUnavailable, 'bot-pin');
    const check = await this.identity.check(
      inbound.userId,
      digest,
      user.whatsappVerifiedPhone,
      now,
    );
    switch (check.result) {
      case 'OK':
        return this.perform(inbound, pending, now);
      case 'WRONG':
        return this.askPinStep(pending, BOT_TEXTS.wrongPin(check.remaining));
      case 'LOCKED':
        return textStep(BOT_TEXTS.locked(minutesUntil(check.until, now)), 'bot-pin');
      case 'NO_PIN':
        // Code réinitialisé par l'agence entre la demande et la réponse.
        return this.askNewPinStep(pending);
      default:
        return textStep(BOT_TEXTS.pinUnavailable, 'bot-pin');
    }
  }

  // Formulaire « Créer mon code » renvoyé (unité 50). Les contrôles qui
  // demandent le code en clair ont été faits par le webhook : seuls leurs
  // résultats arrivent ici.
  private async onFlowCreate(
    inbound: BotInbound,
    user: BotUser,
    pending: WhatsappBotAction | null,
    now: Date,
  ): Promise<Step> {
    const payload = inbound.payload;
    if (!readBoolean(payload, 'pinFlowValid'))
      return this.askNewPinStep(pending, BOT_TEXTS.pinFlowExpired);
    const rentTyped = parseRent(readString(payload, 'pinRent'));
    const rent = await this.identity.checkRent(
      inbound.userId,
      rentTyped !== null && user.rentAmounts.includes(rentTyped),
      now,
    );
    if (rent.result !== 'OK') return this.rentRefused(rent, pending, now);
    if (readBoolean(payload, 'pinMismatch'))
      return this.askNewPinStep(pending, BOT_TEXTS.pinMismatch);
    if (readBoolean(payload, 'pinTrivial'))
      return this.askNewPinStep(pending, BOT_TEXTS.pinTooSimple);
    const digest = readString(payload, 'pinDigest');
    if (!digest || !user.whatsappVerifiedPhone) return textStep(BOT_TEXTS.pinUnavailable, 'bot-pin');
    const hash = await this.identity.hashNewPin(digest);
    return this.createPin(inbound, user, hash, pending, BOT_TEXTS.pinCreated, now);
  }

  // Secours sans formulaire : le montant du loyer (question de contrôle).
  // Un loyer de 6 chiffres (ex. 100000) est arrivé sous forme d'empreinte,
  // comme un code : on compare alors les empreintes.
  private async onRentTyped(
    inbound: BotInbound,
    user: BotUser,
    pending: WhatsappBotAction | null,
    now: Date,
  ): Promise<Step> {
    let matches: boolean;
    if (hasPinDigest(inbound.payload)) {
      const digest = readString(inbound.payload, 'pinDigest');
      matches = digest !== null && this.identity.rentDigestMatches(digest, user.rentAmounts);
    } else {
      const typed = parseRent(inbound.text);
      if (typed === null) {
        return {
          reply: { kind: 'text', text: BOT_TEXTS.rentAskAgain, source: 'bot-pin' },
          state: 'AWAITING_RENT_CHECK',
          pendingAction: pending,
        };
      }
      matches = user.rentAmounts.includes(typed);
    }
    const check = await this.identity.checkRent(inbound.userId, matches, now);
    if (check.result === 'WRONG') {
      return {
        reply: { kind: 'text', text: withLead(BOT_TEXTS.rentWrong(check.remaining), BOT_TEXTS.rentAskAgain), source: 'bot-pin' },
        state: 'AWAITING_RENT_CHECK',
        pendingAction: pending,
      };
    }
    if (check.result !== 'OK') return this.rentRefused(check, pending, now);
    return {
      reply: { kind: 'text', text: withLead(BOT_TEXTS.rentOk, BOT_TEXTS.createPinAsk), source: 'bot-pin' },
      state: 'AWAITING_NEW_PIN',
      pendingAction: pending,
    };
  }

  private rentRefused(check: Exclude<RentCheck, { result: 'OK' }>, pending: WhatsappBotAction | null, now: Date): Step {
    if (check.result === 'WRONG') return this.askNewPinStep(pending, BOT_TEXTS.rentWrong(check.remaining));
    if (check.result === 'LOCKED')
      return textStep(BOT_TEXTS.locked(minutesUntil(check.until, now)), 'bot-pin');
    return textStep(BOT_TEXTS.pinAlreadySet, 'bot-pin');
  }

  // Secours sans formulaire, 1er message : le code, gardé haché jusqu'à la
  // confirmation (jamais l'empreinte brute).
  private async onNewPinTyped(inbound: BotInbound, pending: WhatsappBotAction | null): Promise<Step> {
    const digest = readString(inbound.payload, 'pinDigest');
    if (!digest) return textStep(BOT_TEXTS.pinUnavailable, 'bot-pin');
    if (readBoolean(inbound.payload, 'pinTrivial')) {
      return {
        reply: { kind: 'text', text: withLead(BOT_TEXTS.pinTooSimple, BOT_TEXTS.createPinAsk), source: 'bot-pin' },
        state: 'AWAITING_NEW_PIN',
        pendingAction: pending,
      };
    }
    return {
      reply: { kind: 'text', text: BOT_TEXTS.confirmPinAsk, source: 'bot-pin' },
      state: 'AWAITING_NEW_PIN_CONFIRM',
      pendingAction: pending,
      pendingPinHash: await this.identity.hashNewPin(digest),
    };
  }

  // Secours sans formulaire, 2e message : la confirmation.
  private async onNewPinConfirm(
    inbound: BotInbound,
    user: BotUser,
    pending: WhatsappBotAction | null,
    pendingPinHash: string | null,
    now: Date,
  ): Promise<Step> {
    const digest = readString(inbound.payload, 'pinDigest');
    if (!digest || !user.whatsappVerifiedPhone) return textStep(BOT_TEXTS.pinUnavailable, 'bot-pin');
    if (!pendingPinHash || !(await this.identity.matchesPendingPin(digest, pendingPinHash))) {
      return {
        reply: { kind: 'text', text: withLead(BOT_TEXTS.pinMismatch, BOT_TEXTS.createPinAsk), source: 'bot-pin' },
        state: 'AWAITING_NEW_PIN',
        pendingAction: pending,
      };
    }
    return this.createPin(inbound, user, pendingPinHash, pending, BOT_TEXTS.pinCreatedDeleteTip, now);
  }

  // Code créé seulement s'il n'en existe aucun ; l'agence est prévenue, puis
  // la demande en attente (quittance, relevé) part aussitôt.
  private async createPin(
    inbound: BotInbound,
    user: BotUser,
    hash: string,
    pending: WhatsappBotAction | null,
    notice: string,
    now: Date,
  ): Promise<Step> {
    if (!user.whatsappVerifiedPhone) return textStep(BOT_TEXTS.pinUnavailable, 'bot-pin');
    const created = await this.identity.createPin(inbound.userId, hash, user.whatsappVerifiedPhone, now);
    if (created === 'ALREADY_SET') return textStep(BOT_TEXTS.pinAlreadySet, 'bot-pin');
    await this.notifyPinCreated(inbound.userId, user);
    if (!pending) return menuStep(`${notice}\n\n${BOT_TEXTS.menu(user.firstName)}`);
    const step = await this.perform(inbound, pending, now);
    return { ...step, reply: withNotice(step.reply, notice) };
  }

  // L'agence est prévenue (téléphone perdu ou prêté : elle change le numéro
  // WhatsApp, ce qui efface le code). Jamais le code dans le message ; un
  // échec n'annule rien.
  private async notifyPinCreated(userId: string, user: BotUser): Promise<void> {
    try {
      const property = await this.prisma.property.findUnique({
        where: { id: user.activePropertyId },
        select: {
          ownerId: true,
          address: true,
          neighborhood: true,
          city: true,
          mandates: { where: { status: 'ACTIVE' }, take: 1, select: { managerId: true } },
        },
      });
      if (!property) return;
      await this.notify.notifyUser({
        userId: responsibleUserIdFor(property, property.mandates[0]),
        event: 'whatsapp-pin-created',
        variables: {
          tenantName: `${user.firstName} ${user.lastName}`.trim(),
          propertyAddress: formatPropertyLocation(property),
        },
      });
    } catch (error) {
      this.logger.error(
        `[whatsapp-bot] user=${userId} : agence non prévenue de la création du code`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  // Formulaire si le Flow est configuré, sinon simple message (unité 50).
  private pinRequest(kind: PinFlowKind, body: string, fallback: string): Reply {
    if (this.config.get<string>('WHATSAPP_PIN_FLOW_ID'))
      return { kind: 'flow', flow: kind, body, fallback };
    return { kind: 'text', text: fallback, source: 'bot-pin' };
  }

  // notice : ce qui précède la demande (code faux, formulaire expiré...).
  private askPinStep(action: WhatsappBotAction, notice?: string): Step {
    return {
      reply: this.pinRequest('ENTER', withLead(notice, BOT_TEXTS.askPinFlowBody), notice ?? BOT_TEXTS.askPin),
      state: 'AWAITING_PIN',
      pendingAction: action,
    };
  }

  // Création : formulaire (loyer + code + confirmation) ou, en secours, le
  // loyer demandé en message. L'état attend le loyer dans les deux cas : un
  // vieux téléphone sans formulaire peut répondre en simple message.
  private askNewPinStep(action: WhatsappBotAction | null, notice?: string): Step {
    return {
      reply: this.pinRequest(
        'CREATE',
        withLead(notice, BOT_TEXTS.createPinFlowBody),
        withLead(notice, BOT_TEXTS.rentAsk),
      ),
      state: 'AWAITING_RENT_CHECK',
      pendingAction: action,
    };
  }

  private async perform(inbound: BotInbound, action: WhatsappBotAction, now: Date): Promise<Step> {
    if (action === 'RECEIPT') {
      const reply = await this.receiptReply(inbound.userId);
      return { reply, state: 'MENU', pendingAction: null };
    }
    return textStep(await this.statementText(inbound.userId, now), 'bot-statement');
  }

  // Plus ancienne échéance non soldée du bail actif → lien de paiement
  // (sans requête supplémentaire, unité 46).
  private async payText(userId: string, now: Date): Promise<string> {
    const entry = await this.prisma.paymentScheduleEntry.findFirst({
      where: {
        lease: { tenantUserId: userId, status: 'ACTIVE' },
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      },
      orderBy: { dueDate: 'asc' },
      select: { id: true, dueDate: true, expectedAmount: true, paidAmount: true },
    });
    if (!entry) return BOT_TEXTS.upToDate;
    // Même durée de vie que le jeton du lien (unité 43).
    if (now > addDays(entry.dueDate, PAY_LINK_VALID_DAYS_AFTER_DUE)) return BOT_TEXTS.payLinkExpired;
    const amount = formatFcfa(entry.expectedAmount - entry.paidAmount);
    const { url } = this.payLinks.payLinkFor(entry);
    return entry.dueDate < now
      ? BOT_TEXTS.payOverdue(amount, formatDay(entry.dueDate), url)
      : BOT_TEXTS.pay(amount, formatDay(entry.dueDate), url);
  }

  private async statementText(userId: string, now: Date): Promise<string> {
    const since = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (BOT_STATEMENT_MONTHS - 1), 1),
    );
    const until = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const entries = await this.prisma.paymentScheduleEntry.findMany({
      where: {
        lease: { tenantUserId: userId, status: 'ACTIVE' },
        dueDate: { gte: since, lt: until },
      },
      orderBy: { dueDate: 'asc' },
      take: 24,
      select: {
        periodStart: true,
        dueDate: true,
        expectedAmount: true,
        paidAmount: true,
        status: true,
      },
    });
    if (entries.length === 0) return BOT_TEXTS.noStatement;

    let remaining = 0;
    const lines = entries.map((entry) => {
      const due = entry.expectedAmount - entry.paidAmount;
      if (entry.dueDate <= now && entry.status !== 'PAID') remaining += Math.max(due, 0);
      return `• ${formatMonth(entry.periodStart)} : ${formatFcfa(entry.expectedAmount)} — ${statusLabel(entry, now)}`;
    });
    return BOT_TEXTS.statement(lines, formatFcfa(remaining));
  }

  private async send(inbound: BotInbound, reply: Reply): Promise<WhatsappSendResult> {
    const base = { userId: inbound.userId, inboundReceivedAt: inbound.receivedAt };
    if (reply.kind === 'menu') {
      return this.whatsapp.replyList({
        ...base,
        source: 'bot-menu',
        body: reply.body,
        buttonLabel: MENU_BUTTON,
        rows: MENU_ROWS,
      });
    }
    if (reply.kind === 'text')
      return this.whatsapp.reply({ ...base, source: reply.source, text: reply.text });
    if (reply.kind === 'flow') return this.sendPinFlow(inbound, reply);
    return this.whatsapp.replyDocument({
      ...base,
      source: 'bot-receipt',
      paymentId: reply.paymentId,
      document: { content: reply.content, filename: 'quittance-warah.pdf', mimeType: 'application/pdf' },
      caption: reply.caption,
    });
  }

  // Formulaire du code (unité 50). Refusé par Meta (Flow supprimé, pas encore
  // publié...) : la même demande part aussitôt en simple message, et l'équipe
  // est alertée. Résultat incertain (UNKNOWN) : rien de plus, pour ne pas
  // risquer un doublon.
  private async sendPinFlow(
    inbound: BotInbound,
    reply: Extract<Reply, { kind: 'flow' }>,
  ): Promise<WhatsappSendResult> {
    const base = { userId: inbound.userId, inboundReceivedAt: inbound.receivedAt };
    const flowId = this.config.get<string>('WHATSAPP_PIN_FLOW_ID');
    const result = flowId
      ? await this.whatsapp.replyFlow({
          ...base,
          source: 'bot-pin-flow',
          body: reply.body,
          flow: {
            id: flowId,
            token: signPinFlowToken(
              inbound.userId,
              reply.flow,
              new Date(),
              this.config.getOrThrow<string>('PAY_LINK_SECRET'),
            ),
            cta: PIN_FLOW_CTA[reply.flow],
            screen: PIN_FLOW_SCREENS[reply.flow],
            draft: this.config.get<boolean>('WHATSAPP_PIN_FLOW_DRAFT') === true,
          },
        })
      : null;
    if (result && result.outcome !== 'FAILED') return result;
    if (result) {
      const summary = `[whatsapp-bot] formulaire du code refusé par Meta (message=${result.messageId}), envoi en simple message`;
      this.logger.warn(summary);
      Sentry.captureMessage(`WhatsApp : ${summary}`, 'warning');
    }
    return this.whatsapp.reply({ ...base, source: 'bot-pin', text: reply.fallback });
  }

  // Quittance du dernier paiement confirmé, refabriquée à chaque demande et
  // envoyée en pièce jointe (jamais stockée, jamais de lien — invariant #5).
  private async receiptReply(userId: string): Promise<Reply> {
    const payment = await this.prisma.payment.findFirst({
      where: { status: 'PAID', lease: { tenantUserId: userId } },
      orderBy: { createdAt: 'desc' },
      include: {
        scheduleEntry: true,
        lease: {
          include: {
            property: {
              include: {
                mandates: { where: { status: 'ACTIVE' }, take: 1, include: { manager: true } },
              },
            },
            owner: true,
            tenant: true,
          },
        },
      },
    });
    if (!payment) return { kind: 'text', text: BOT_TEXTS.noReceipt, source: 'bot-receipt' };

    const content = await this.receiptPdf.generate(payment);
    const period = `${formatDay(payment.scheduleEntry.periodStart)} — ${formatDay(payment.scheduleEntry.periodEnd)}`;
    return {
      kind: 'document',
      paymentId: payment.id,
      content,
      caption: BOT_TEXTS.receiptCaption(period),
    };
  }

  // Invitation « répondez OUI » (décision 1) : UNE par 24 h, réservée par
  // écriture conditionnelle (deux messages simultanés → une seule). Si
  // l'envoi est refusé (forfait, interrupteur…), la réservation est rendue :
  // un « OUI » ne doit pas répondre à une invitation jamais partie.
  private async invite(inbound: BotInbound, now: Date): Promise<void> {
    const { count } = await this.prisma.user.updateMany({
      where: {
        id: inbound.userId,
        whatsappConsent: { in: ['NOT_ASKED', 'PENDING'] },
        OR: [
          { whatsappInvitedAt: null },
          { whatsappInvitedAt: { lte: new Date(now.getTime() - WHATSAPP_INVITATION_TTL_MS) } },
        ],
      },
      data: { whatsappInvitedAt: now },
    });
    if (count === 0) return;

    const result = await this.whatsapp.sendInvitation(
      inbound.userId,
      BOT_TEXTS.invitation,
      inbound.receivedAt,
    );
    if (result.outcome === 'REFUSED') {
      await this.prisma.user.updateMany({
        where: { id: inbound.userId, whatsappInvitedAt: now },
        data: { whatsappInvitedAt: null },
      });
    }
  }

  // Anti-abus (20 réponses par heure) en une écriture conditionnelle : soit
  // la fenêtre est écoulée et repart à 1, soit +1 tant qu'on est sous 20.
  private async reserveReply(userId: string, now: Date): Promise<boolean> {
    const windowStart = new Date(now.getTime() - BOT_REPLY_WINDOW_MS);
    const reset = await this.prisma.whatsappConversation.updateMany({
      where: { userId, replyWindowStart: { lte: windowStart } },
      data: { replyWindowStart: now, replyCount: 1 },
    });
    if (reset.count === 1) return true;
    const incremented = await this.prisma.whatsappConversation.updateMany({
      where: { userId, replyCount: { lt: BOT_MAX_REPLIES_PER_HOUR } },
      data: { replyCount: { increment: 1 } },
    });
    return incremented.count === 1;
  }

  private async forgetPinDigest(inbound: BotInbound): Promise<void> {
    if (!hasPinDigest(inbound.payload)) return;
    await this.prisma.whatsappMessage
      .updateMany({ where: { id: inbound.messageId }, data: { payload: { pinMasked: true } } })
      .catch((error: unknown) =>
        this.logger.error(
          `[whatsapp-bot] empreinte du code non effacée (message=${inbound.messageId})`,
          error,
        ),
      );
  }
}

function menuStep(body: string): Step {
  return { reply: { kind: 'menu', body }, state: 'MENU', pendingAction: null };
}

function textStep(text: string, source: string): Step {
  return { reply: { kind: 'text', text, source }, state: 'MENU', pendingAction: null };
}

function minutesUntil(until: Date, now: Date): number {
  return Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 60_000));
}

function readString(payload: Prisma.JsonValue, key: string): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

// « 50 000 », « 50.000 F », « 50000 FCFA » → 50000 ; autre chose → null.
function parseRent(text: string | null): number | null {
  if (!text) return null;
  const cleaned = text.trim().replace(/\s*(f\s*cfa|fcfa|cfa|francs?|f)\.?$/i, '');
  if (!/^\d[\d\s.,]*$/.test(cleaned)) return null;
  const digits = cleaned.replace(/\D/g, '');
  return digits.length > 0 && digits.length <= 9 ? Number(digits) : null;
}

function readBoolean(payload: Prisma.JsonValue, key: string): boolean {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  return (payload as Record<string, unknown>)[key] === true;
}

// « Code créé ✅ » devant la quittance ou le relevé qui suit la création.
function withNotice(reply: Reply, notice: string): Reply {
  if (reply.kind === 'document') return { ...reply, caption: `${notice}\n${reply.caption}` };
  if (reply.kind === 'text') return { ...reply, text: `${notice}\n\n${reply.text}` };
  return reply;
}

function withLead(lead: string | undefined, text: string): string {
  return lead ? `${lead} ${text}` : text;
}

function hasPinDigest(payload: Prisma.JsonValue): boolean {
  return (
    !!payload && typeof payload === 'object' && !Array.isArray(payload) && 'pinDigest' in payload
  );
}

function statusLabel(
  entry: { status: string; dueDate: Date; expectedAmount: number; paidAmount: number },
  now: Date,
): string {
  if (entry.status === 'PAID') return 'payé ✅';
  if (entry.status === 'PARTIAL')
    return `payé ${formatFcfa(entry.paidAmount)} sur ${formatFcfa(entry.expectedAmount)}`;
  if (entry.status === 'OVERDUE') return 'en retard ⚠️';
  return entry.dueDate > now ? 'à venir' : 'à payer';
}
