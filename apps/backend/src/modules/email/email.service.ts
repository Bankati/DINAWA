import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailTemplate, renderTemplate, subjectFor } from './templates/template-registry';
import { TemplateVariables } from './templates/types';

export type EmailAttachment = { filename: string; content: Buffer };

export type SendEmailParams = {
  to: string;
  template: EmailTemplate;
  variables: TemplateVariables;
  attachments?: EmailAttachment[];
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(config: ConfigService) {
    this.fromEmail = config.getOrThrow<string>('GMAIL_USER');
    this.fromName = config.get<string>('RESEND_FROM_NAME') ?? 'WARAH';

    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: this.fromEmail,
        pass: config.getOrThrow<string>('GMAIL_APP_PASSWORD'),
      },
    });
  }

  async sendEmail(params: SendEmailParams): Promise<boolean> {
    try {
      await this.sendWithRetry(params);
      return true;
    } catch (error) {
      this.logger.error(`[email/${params.template}] to=${this.maskEmail(params.to)}`, error);
      return false;
    }
  }

  private async sendWithRetry(params: SendEmailParams): Promise<void> {
    const { default: pRetry } = await import('p-retry');

    await pRetry(
      () =>
        this.transporter.sendMail({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: params.to,
          subject: subjectFor(params.template, params.variables),
          html: renderTemplate(params.template, params.variables),
          attachments: params.attachments?.map((a) => ({
            filename: a.filename,
            content: a.content,
          })),
        }),
      { retries: 3, minTimeout: 1000, maxTimeout: 16000 },
    );
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local?.[0] ?? '?'}***@${domain ?? '?'}`;
  }
}
