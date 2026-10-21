import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService, EmailAttachment } from '../email/email.service';
import { TemplateVariables } from '../email/templates/types';
import { WebPushService } from '../push/web-push.service';
import { WhatsappSendResult, WhatsappService } from '../whatsapp-channel/whatsapp.service';
import { NotificationEvent, renderPushContent } from './notification-events';
import { WHATSAPP_TEMPLATES, buildTemplate } from './whatsapp-templates';

export type NotifyUserParams = {
  userId: string;
  event: NotificationEvent;
  variables: TemplateVariables;
  emailAttachments?: EmailAttachment[];
  // Force le canal email même si l'utilisateur a des notifications push
  // actives — pour les alertes de sécurité (ex. changement du numéro de
  // réception des loyers), qui doivent laisser une trace hors de l'appareil
  // éventuellement compromis.
  forceEmail?: boolean;
  // Échéance / paiement concernés : rattachés au message WhatsApp pour le
  // suivi et les nouveaux essais (unité 46). Sans effet sur push/email.
  relatedTo?: { scheduleEntryId?: string; paymentId?: string };
};

// Clés jamais persistées dans l'historique (Notification.payload) même si
// elles sont nécessaires à l'envoi push/email — invitationUrl embarque un
// token d'activation de compte valide 7 jours (voir invitation-token.ts),
// un secret d'authentification qui n'a rien à faire dans un historique
// consultable via GET /api/notifications. payToken / payLinkUrl (unité 46) :
// le lien de paiement sans connexion, valable jusqu'à 30 jours après
// l'échéance.
const SENSITIVE_PAYLOAD_KEYS = new Set(['invitationUrl', 'payToken', 'payLinkUrl']);

function sanitizePayloadForStorage(variables: TemplateVariables): TemplateVariables {
  const safe: TemplateVariables = {};
  for (const [key, value] of Object.entries(variables)) {
    if (!SENSITIVE_PAYLOAD_KEYS.has(key)) safe[key] = value;
  }
  return safe;
}

// Point d'entrée unique pour toute notification métier — jamais d'appel
// direct à EmailService, WebPushService ou WhatsappService depuis un service
// métier ou un cron (voir architecture.md, invariant #6). Une pièce jointe
// force le canal email, car un push ne peut pas porter de PDF.
//
// WhatsApp (unité 46) S'AJOUTE au push / à l'email, ne le remplace jamais :
// seulement pour un locataire, seulement si l'événement a un modèle Meta
// (WHATSAPP_TEMPLATES), et WhatsappService revérifie l'accord, le numéro
// vérifié et le forfait au moment de l'envoi. Un échec WhatsApp ne lève
// jamais d'erreur et ne touche pas au push / à l'email déjà partis.
@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: WebPushService,
    private readonly email: EmailService,
    private readonly whatsapp: WhatsappService,
  ) {}

  async notifyUser(params: NotifyUserParams): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        email: true,
        role: true,
        notificationConsent: true,
        _count: { select: { pushSubscriptions: true } },
      },
    });
    if (!user) {
      this.logger.warn(`[notify/${params.event}] utilisateur introuvable: ${params.userId}`);
      return;
    }

    await this.sendPushOrEmail(user, params);
    if (user.role === 'TENANT') await this.sendWhatsapp(params);
  }

  private async sendPushOrEmail(
    user: { id: string; email: string | null; notificationConsent: string; _count: { pushSubscriptions: number } },
    params: NotifyUserParams,
  ): Promise<void> {
    const canPush = user.notificationConsent === 'ACCEPTED' && user._count.pushSubscriptions > 0;

    if (canPush && !params.emailAttachments && !params.forceEmail) {
      await this.push.sendToUser(user.id, renderPushContent(params.event, params.variables));
      await this.recordDispatch(params, 'PUSH', 'SENT');
      return;
    }

    if (!user.email) {
      this.logger.warn(
        `[notify/${params.event}] user=${user.id} sans email et sans push actif — notification perdue`,
      );
      return;
    }

    const delivered = await this.email.sendEmail({
      to: user.email,
      template: params.event,
      variables: params.variables,
      attachments: params.emailAttachments,
    });
    await this.recordDispatch(params, 'EMAIL', delivered ? 'SENT' : 'FAILED');
  }

  // Chaque tentative est tracée par WhatsappService (WhatsappMessage), d'où
  // l'absence de ligne Notification pour ce canal. Ne lève jamais.
  private async sendWhatsapp(params: NotifyUserParams): Promise<void> {
    const spec = WHATSAPP_TEMPLATES[params.event];
    if (!spec) return;

    const built = buildTemplate(spec, params.variables);
    if (!built.ok) {
      // Données manquantes = bug de l'appelant, pas un refus normal : on le
      // signale (sans les valeurs), l'email/push est déjà parti.
      const summary = `[notify/${params.event}] WhatsApp non envoyé pour user=${params.userId} : variable(s) manquante(s) ${built.missing.join(', ')}`;
      this.logger.error(summary);
      Sentry.captureMessage(summary, 'warning');
      return;
    }

    const context = {
      userId: params.userId,
      source: params.event,
      scheduleEntryId: params.relatedTo?.scheduleEntryId,
      paymentId: params.relatedTo?.paymentId,
    };
    try {
      let result: WhatsappSendResult;
      if (spec.document) {
        const pdf = params.emailAttachments?.[0];
        if (!pdf) {
          this.logger.error(`[notify/${params.event}] WhatsApp non envoyé pour user=${params.userId} : PDF absent`);
          return;
        }
        result = await this.whatsapp.sendDocument({
          ...context,
          document: { content: pdf.content, filename: spec.document.filename, mimeType: 'application/pdf' },
          template: { name: spec.name, bodyParams: built.bodyParams },
        });
      } else {
        result = await this.whatsapp.send({
          ...context,
          kind: 'template',
          template: { name: spec.name, bodyParams: built.bodyParams, buttonParam: built.buttonParam },
        });
      }
      if (result.outcome !== 'SENT' && result.outcome !== 'REFUSED') {
        this.logger.warn(`[notify/${params.event}] WhatsApp ${result.outcome} pour user=${params.userId}`);
      }
    } catch (error) {
      // Erreur de base AVANT l'appel à Meta (WhatsappService ne lève que
      // dans ce cas) : rien n'est parti, l'email/push reste valable.
      this.logger.error(
        `[notify/${params.event}] WhatsApp impossible pour user=${params.userId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  // Historique consulté par NotifyController (GET /notifications,
  // /notifications/unread-count) — un échec d'écriture ne doit jamais faire
  // échouer l'envoi qui vient de réussir, donc jamais dans le même try que
  // l'envoi lui-même.
  private async recordDispatch(
    params: NotifyUserParams,
    channel: 'PUSH' | 'EMAIL',
    status: 'SENT' | 'FAILED',
  ): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId: params.userId,
          event: params.event,
          channel,
          status,
          payload: sanitizePayloadForStorage(params.variables),
        },
      });
    } catch (error) {
      this.logger.error(`[notify/${params.event}] échec d'écriture de l'historique`, error);
    }
  }
}
