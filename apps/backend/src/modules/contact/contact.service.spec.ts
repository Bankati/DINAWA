import { ContactService } from './contact.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

describe('ContactService', () => {
  let service: ContactService;
  let emailService: { sendEmail: jest.Mock };
  let config: { getOrThrow: jest.Mock };
  let prisma: { contactMessage: { create: jest.Mock } };

  const dto: CreateContactMessageDto = {
    name: 'Ama Kodjo',
    email: 'ama.kodjo@example.com',
    subject: 'Question sur un abonnement',
    message: 'Bonjour, je voudrais savoir...',
  };

  beforeEach(() => {
    emailService = { sendEmail: jest.fn().mockResolvedValue(true) };
    config = { getOrThrow: jest.fn().mockReturnValue('contact@warah.tg') };
    prisma = { contactMessage: { create: jest.fn().mockResolvedValue({ id: 'msg-1' }) } };
    service = new ContactService(emailService as never, config as never, prisma as never);
  });

  it('enregistre le message en base avant toute tentative d’envoi', async () => {
    await service.submit(dto);

    expect(prisma.contactMessage.create).toHaveBeenCalledWith({
      data: {
        name: 'Ama Kodjo',
        role: undefined,
        email: 'ama.kodjo@example.com',
        phone: undefined,
        city: undefined,
        subject: 'Question sur un abonnement',
        message: 'Bonjour, je voudrais savoir...',
      },
    });
  });

  it('envoie un email via le template contact-message à CONTACT_RECIPIENT_EMAIL', async () => {
    await service.submit(dto);

    expect(config.getOrThrow).toHaveBeenCalledWith('CONTACT_RECIPIENT_EMAIL');
    const [args] = emailService.sendEmail.mock.calls[0] as [
      { to: string; template: string; variables: Record<string, unknown> },
    ];
    expect(args.to).toBe('contact@warah.tg');
    expect(args.template).toBe('contact-message');
    expect(args.variables).toEqual({
      name: 'Ama Kodjo',
      role: '',
      email: 'ama.kodjo@example.com',
      phone: '',
      city: '',
      subject: 'Question sur un abonnement',
      message: 'Bonjour, je voudrais savoir...',
    });
  });

  it('retourne toujours un message générique, même si des champs optionnels sont fournis', async () => {
    const result = await service.submit({
      ...dto,
      role: 'Propriétaire',
      phone: '90330557',
      city: 'Lomé',
    });

    expect(result).toEqual({
      message: 'Votre message a bien été envoyé, notre équipe vous répond rapidement.',
    });
  });

  it("retourne quand même le message générique si l'envoi d'email échoue (le message reste enregistré)", async () => {
    emailService.sendEmail.mockRejectedValue(new Error('resend down'));

    const result = await service.submit(dto);

    expect(prisma.contactMessage.create).toHaveBeenCalled();
    expect(result).toEqual({
      message: 'Votre message a bien été envoyé, notre équipe vous répond rapidement.',
    });
  });
});
