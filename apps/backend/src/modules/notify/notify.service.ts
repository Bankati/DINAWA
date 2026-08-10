import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService, EmailAttachment } from '../email/email.service';
import { TemplateVariables } from '../email/templates/types';
import { WebPushService } from '../push/web-push.service';
import { NotificationEvent, renderPushContent } from './notification-events';

export type NotifyUserParams = {
  userId: string;
  event: NotificationEvent;
  variables: TemplateVariables;
  emailAttachments?: EmailAttachment[];
};

// Clés jamais persistées dans l'historique (Notification.payload) même si
// elles sont nécessaires à l'envoi push/email — invitationUrl embarque un
// token d'activation de compte valide 7 jours (voir invitation-token.ts),
// un secret d'authentification qui n'a rien à faire dans un historique
// consultable via GET /api/notifications.
const SENSITIVE_PAYLOAD_KEYS = new Set(['invitationUrl']);

function sanitizePayloadForStorage(variables: TemplateVariables): TemplateVariables {
  const safe: TemplateVariables = {};
  for (const [key, value] of Object.entries(variables)) {
    if (!SENSITIVE_PAYLOAD_KEYS.has(key)) safe[key] = value;
  }
  return safe;
}

// Point d'entrée unique pour toute notification métier — jamais d'appel
// direct à EmailService ou WebPushService depuis un service métier ou un
// cron (voir architecture.md, invariant #6). Une pièce jointe force le
// canal email, car un push ne peut pas porter de PDF.
@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: WebPushService,
    private readonly email: EmailService,
  ) {}

  async notifyUser(params: NotifyUserParams): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        email: true,
        notificationConsent: true,
        _count: { select: { pushSubscriptions: true } },
      },
    });
    if (!user) {
      this.logger.warn(`[notify/${params.event}] utilisateur introuvable: ${params.userId}`);
      return;
    }

    const canPush = user.notificationConsent === 'ACCEPTED' && user._count.pushSubscriptions > 0;

    if (canPush && !params.emailAttachments) {
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
