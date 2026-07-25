import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailTemplate, renderTemplate, subjectFor } from './templates/template-registry';
import { TemplateVariables } from './templates/types';

export type EmailAttachment = { filename: string; content: Buffer };

export type SendEmailParams = {
  to: string;
  template: EmailTemplate;
  variables: TemplateVariables;
  attachments?: EmailAttachment[];
};

// Point d'entrée unique pour tout envoi d'email transactionnel — jamais
// d'appel direct au SDK Resend depuis un autre module. Un échec d'envoi ne
// doit jamais faire échouer l'action métier appelante : toute erreur est
// loggée puis avalée ici.
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(config: ConfigService) {
    this.resend = new Resend(config.getOrThrow<string>('RESEND_API_KEY'));
    this.fromEmail = config.getOrThrow<string>('RESEND_FROM_EMAIL');
    this.fromName = config.get<string>('RESEND_FROM_NAME') ?? 'WARAH';
  }

  async sendEmail(params: SendEmailParams): Promise<void> {
    try {
      await this.sendWithRetry(params);
    } catch (error) {
      this.logger.error(`[email/${params.template}] to=${this.maskEmail(params.to)}`, error);
    }
  }

  private async sendWithRetry(params: SendEmailParams): Promise<void> {
    const { default: pRetry } = await import('p-retry');

    await pRetry(
      async () => {
        const { error } = await this.resend.emails.send({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: params.to,
          subject: subjectFor(params.template, params.variables),
          html: renderTemplate(params.template, params.variables),
          attachments: params.attachments?.map((attachment) => ({
            filename: attachment.filename,
            content: attachment.content,
          })),
        });
        if (error) throw new Error(`Resend: ${error.message}`);
      },
      { retries: 3, minTimeout: 1000, maxTimeout: 16000 },
    );
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local?.[0] ?? '?'}***@${domain ?? '?'}`;
  }
}
