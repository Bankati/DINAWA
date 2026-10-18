import { Injectable, Logger } from '@nestjs/common';
import { Prisma, WhatsappBotAction, WhatsappBotState } from '@prisma/client';
import { addDays } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappSendResult, WhatsappService } from '../whatsapp-channel/whatsapp.service';
import { PayLinksService } from '../pay-links/pay-links.service';
import { ReceiptPdfService } from '../receipts/receipt-pdf.service';
import {
  BOT_CONVERSATION_TIMEOUT_MS,
  BOT_MAX_REPLIES_PER_HOUR,
  BOT_REPLY_WINDOW_MS,
  BOT_STATEMENT_MONTHS,
  PAY_LINK_VALID_DAYS_AFTER_DUE,
  WHATSAPP_INVITATION_TTL_MS,
} from '../../common/constants';
import { BotIdentityService } from './bot-identity.service';
import {
  BOT_TEXTS,
  BotChoice,
  MENU_BUTTON,
  MENU_ROWS,
  formatDay,
  formatFcfa,
  formatMonth,
  parseBotChoice,
} from './bot-messages';

// Message reçu à traiter (lu par WhatsappInboundProcessor).
export type BotInbound = {
  messageId: string;
  userId: string;
  // Heure Meta du message : départ de la fenêtre de 24 h.
  receivedAt: Date;
  text: string | null;
  payload: Prisma.JsonValue;
};

const PROTECTED: Record<'RECEIPT' | 'STATEMENT', WhatsappBotAction> = {
  RECEIPT: 'RECEIPT',
  STATEMENT: 'STATEMENT',
};

// La quittance est fabriquée AVANT l'envoi : une panne du PDF devient une
// réponse « erreur technique » au lieu d'un silence.
type Reply =
  | { kind: 'menu'; body: string }
  | { kind: 'text'; text: string; source: string }
  | { kind: 'document'; paymentId: string; content: Buffer; caption: string };

type Step = { reply: Reply; state: WhatsappBotState; pendingAction: WhatsappBotAction | null };

type BotUser = {
  firstName: string;
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
//   - arrêté (STOP), non-locataire, sans bail actif : silence.
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
        leasesAsTenant: { where: { status: 'ACTIVE' }, select: { id: true }, take: 1 },
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
      select: { state: true, pendingAction: true, lastActivityAt: true },
    });
    if (!(await this.reserveReply(inbound.userId, now))) {
      this.logger.warn(
        `[whatsapp-bot] user=${inbound.userId} : plafond de réponses de l'heure atteint, silence`,
      );
      return;
    }

    const idle =
      now.getTime() - conversation.lastActivityAt.getTime() >= BOT_CONVERSATION_TIMEOUT_MS;
    const state = idle ? 'MENU' : conversation.state;
    const pending = idle ? null : conversation.pendingAction;

    let step: Step;
    try {
      step = await this.decide(inbound, user, state, pending, now);
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

    const result = await this.send(inbound, step.reply);
    if (result.outcome !== 'SENT') {
      // Étape non enregistrée : le robot n'attend pas un code qu'il n'a pas
      // réussi à demander.
      const detail = result.outcome === 'REFUSED' ? `REFUSED (${result.reason})` : result.outcome;
      this.logger.warn(
        `[whatsapp-bot] réponse non envoyée pour user=${inbound.userId} : ${detail}`,
      );
      return;
    }
    await this.prisma.whatsappConversation.update({
      where: { userId: inbound.userId },
      data: { state: step.state, pendingAction: step.pendingAction, lastActivityAt: now },
    });
  }

  private async decide(
    inbound: BotInbound,
    user: BotUser,
    state: WhatsappBotState,
    pending: WhatsappBotAction | null,
    now: Date,
  ): Promise<Step> {
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

    const action = PROTECTED[choice];
    const pin = user.tenantProfile;
    if (!pin?.whatsappPinHash) return textStep(BOT_TEXTS.noPin, 'bot-pin');
    if (this.identity.isVerified(pin, user.whatsappVerifiedPhone, now))
      return this.perform(inbound, action, now);
    if (pin.pinLockedUntil && pin.pinLockedUntil > now)
      return textStep(BOT_TEXTS.locked(minutesUntil(pin.pinLockedUntil, now)), 'bot-pin');
    return {
      reply: { kind: 'text', text: BOT_TEXTS.askPin, source: 'bot-pin' },
      state: 'AWAITING_PIN',
      pendingAction: action,
    };
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
        return {
          reply: { kind: 'text', text: BOT_TEXTS.wrongPin(check.remaining), source: 'bot-pin' },
          state: 'AWAITING_PIN',
          pendingAction: pending,
        };
      case 'LOCKED':
        return textStep(BOT_TEXTS.locked(minutesUntil(check.until, now)), 'bot-pin');
      case 'NO_PIN':
        return textStep(BOT_TEXTS.noPin, 'bot-pin');
      default:
        return textStep(BOT_TEXTS.pinUnavailable, 'bot-pin');
    }
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
    return this.whatsapp.replyDocument({
      ...base,
      source: 'bot-receipt',
      paymentId: reply.paymentId,
      document: { content: reply.content, filename: 'quittance-warah.pdf', mimeType: 'application/pdf' },
      caption: reply.caption,
    });
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
