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
      return;
    }

    if (!user.email) {
      this.logger.warn(
        `[notify/${params.event}] user=${user.id} sans email et sans push actif — notification perdue`,
      );
      return;
    }

    await this.email.sendEmail({
      to: user.email,
      template: params.event,
      variables: params.variables,
      attachments: params.emailAttachments,
    });
  }
}
