import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // Réponse toujours générique — même logique anti-fuite que
  // AuthService.requestPasswordReset(). Enregistré en base AVANT la
  // tentative d'email : une boîte mail non surveillée ou un envoi raté ne
  // doit jamais faire perdre le message (voir incident 2026-10-03) — c'est
  // désormais la ligne en base, consultable par le super-admin, qui fait foi,
  // l'email n'étant plus qu'une notification best-effort en complément.
  async submit(dto: CreateContactMessageDto): Promise<{ message: string }> {
    await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        role: dto.role,
        email: dto.email,
        phone: dto.phone,
        city: dto.city,
        subject: dto.subject,
        message: dto.message,
      },
    });

    // EmailService.sendEmail() avale déjà ses erreurs et les logue (voir
    // email.service.ts) — jamais bloquant pour la réponse au visiteur.
    this.emailService
      .sendEmail({
        to: this.config.getOrThrow<string>('CONTACT_RECIPIENT_EMAIL'),
        template: 'contact-message',
        variables: {
          name: dto.name,
          role: dto.role ?? '',
          email: dto.email,
          phone: dto.phone ?? '',
          city: dto.city ?? '',
          subject: dto.subject,
          message: dto.message,
        },
      })
      .catch((error: unknown) => {
        this.logger.error(`[contact] échec d'envoi email pour ${dto.email}`, error);
      });

    return { message: 'Votre message a bien été envoyé, notre équipe vous répond rapidement.' };
  }
}
