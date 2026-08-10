import { ContactService } from './contact.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

describe('ContactService', () => {
  let service: ContactService;
  let emailService: { sendEmail: jest.Mock };
  let config: { getOrThrow: jest.Mock };

  const dto: CreateContactMessageDto = {
    name: 'Ama Kodjo',
    email: 'ama.kodjo@example.com',
    subject: 'Question sur un abonnement',
    message: 'Bonjour, je voudrais savoir...',
  };

  beforeEach(() => {
    emailService = { sendEmail: jest.fn().mockResolvedValue(true) };
    config = { getOrThrow: jest.fn().mockReturnValue('contact@warah.tg') };
    service = new ContactService(emailService as never, config as never);
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
});
