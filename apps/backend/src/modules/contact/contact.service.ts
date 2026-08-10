import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

@Injectable()
export class ContactService {
  constructor(
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  // Réponse toujours générique — même logique anti-fuite que
  // AuthService.requestPasswordReset() : EmailService.sendEmail() avale déjà
  // ses erreurs et les logue (voir email.service.ts), donc l'échec d'envoi
  // ne doit jamais être visible du visiteur public.
  async submit(dto: CreateContactMessageDto): Promise<{ message: string }> {
    await this.emailService.sendEmail({
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
    });

    return { message: 'Votre message a bien été envoyé, notre équipe vous répond rapidement.' };
  }
}
