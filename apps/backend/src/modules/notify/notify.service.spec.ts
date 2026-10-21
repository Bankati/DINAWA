import { NotifyService, NotifyUserParams } from './notify.service';

jest.mock('@sentry/nestjs', () => ({ captureMessage: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Sentry = require('@sentry/nestjs') as { captureMessage: jest.Mock };

describe('NotifyService', () => {
  let service: NotifyService;
  let prisma: {
    user: { findUnique: jest.Mock };
    notification: { create: jest.Mock };
  };
  let push: { sendToUser: jest.Mock };
  let email: { sendEmail: jest.Mock };
  let whatsapp: { send: jest.Mock; sendDocument: jest.Mock };

  const params: NotifyUserParams = {
    userId: 'user-1',
    event: 'lease-created',
    variables: { propertyAddress: '12 rue de Lomé' },
  };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      notification: { create: jest.fn().mockResolvedValue({}) },
    };
    push = { sendToUser: jest.fn().mockResolvedValue(undefined) };
    email = { sendEmail: jest.fn().mockResolvedValue(true) };

    whatsapp = {
      send: jest.fn().mockResolvedValue({ outcome: 'SENT', messageId: 'wa-1', wamid: 'w' }),
      sendDocument: jest.fn().mockResolvedValue({ outcome: 'SENT', messageId: 'wa-2', wamid: 'w2' }),
    };
    jest.clearAllMocks();
    service = new NotifyService(prisma as never, push as never, email as never, whatsapp as never);
  });

  it("n'envoie rien et ne persiste rien si l'utilisateur est introuvable", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await service.notifyUser(params);

    expect(push.sendToUser).not.toHaveBeenCalled();
    expect(email.sendEmail).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('envoie en push et persiste channel=PUSH, status=SENT quand le consentement push est actif', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      notificationConsent: 'ACCEPTED',
      _count: { pushSubscriptions: 1 },
    });

    await service.notifyUser(params);

    expect(push.sendToUser).toHaveBeenCalledTimes(1);
    expect(email.sendEmail).not.toHaveBeenCalled();
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        event: 'lease-created',
        channel: 'PUSH',
        status: 'SENT',
        payload: params.variables,
      },
    });
  });

  it('bascule sur email quand aucun push actif, et persiste channel=EMAIL, status=SENT en cas de succès', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      notificationConsent: 'NOT_ASKED',
      _count: { pushSubscriptions: 0 },
    });

    await service.notifyUser(params);

    expect(email.sendEmail).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        event: 'lease-created',
        channel: 'EMAIL',
        status: 'SENT',
        payload: params.variables,
      },
    });
  });

  it("persiste status=FAILED quand l'envoi email échoue", async () => {
    email.sendEmail.mockResolvedValue(false);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      notificationConsent: 'NOT_ASKED',
      _count: { pushSubscriptions: 0 },
    });

    await service.notifyUser(params);

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        event: 'lease-created',
        channel: 'EMAIL',
        status: 'FAILED',
        payload: params.variables,
      },
    });
  });

  it("ne persiste rien et ne plante pas si l'utilisateur n'a ni email ni push actif", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: null,
      notificationConsent: 'NOT_ASKED',
      _count: { pushSubscriptions: 0 },
    });

    await expect(service.notifyUser(params)).resolves.toBeUndefined();

    expect(email.sendEmail).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it("un échec d'écriture de l'historique ne fait jamais échouer notifyUser()", async () => {
    prisma.notification.create.mockRejectedValue(new Error('DB down'));
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      notificationConsent: 'NOT_ASKED',
      _count: { pushSubscriptions: 0 },
    });

    await expect(service.notifyUser(params)).resolves.toBeUndefined();
  });

  it('force le canal email même avec push actif quand une pièce jointe est fournie', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      notificationConsent: 'ACCEPTED',
      _count: { pushSubscriptions: 1 },
    });

    await service.notifyUser({
      ...params,
      event: 'receipt',
      emailAttachments: [{ filename: 'quittance.pdf', content: Buffer.from('x') }],
    });

    expect(push.sendToUser).not.toHaveBeenCalled();
    expect(email.sendEmail).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        event: 'receipt',
        channel: 'EMAIL',
        status: 'SENT',
        payload: params.variables,
      },
    });
  });

  it("n'écrit jamais invitationUrl (secret d'activation de compte) dans l'historique persisté", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      notificationConsent: 'NOT_ASKED',
      _count: { pushSubscriptions: 0 },
    });

    await service.notifyUser({
      userId: 'user-1',
      event: 'tenant-invitation',
      variables: {
        inviterName: 'Jean Dupont',
        propertyAddress: '12 rue de Lomé',
        invitationUrl: 'https://warah.tg/activate-account?token=super-secret-token',
      },
    });

    type SendEmailArgs = { variables: { invitationUrl: string } };
    const [sendEmailArgs] = email.sendEmail.mock.calls[0] as [SendEmailArgs];
    expect(sendEmailArgs.variables.invitationUrl).toContain('token=');
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        event: 'tenant-invitation',
        channel: 'EMAIL',
        status: 'SENT',
        payload: { inviterName: 'Jean Dupont', propertyAddress: '12 rue de Lomé' },
      },
    });
  });

  describe('canal WhatsApp (unité 46)', () => {
    const tenant = {
      id: 'tenant-1',
      email: 'ama@example.com',
      role: 'TENANT',
      notificationConsent: 'DECLINED',
      _count: { pushSubscriptions: 0 },
    };
    const reminder: NotifyUserParams = {
      userId: 'tenant-1',
      event: 'payment-reminder',
      relatedTo: { scheduleEntryId: 'entry-1' },
      variables: {
        tenantFirstName: 'Ama',
        amount: 75000,
        propertyAddress: 'Bè, Lomé',
        dueDate: '2026-10-31',
        period: '2026-10-01 — 2026-10-31',
        payToken: 'jeton-secret',
        payLinkUrl: 'https://warahcontact.com/payer/jeton-secret',
      },
    };

    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(tenant);
    });

    it('s’ajoute à l’email : modèle rappel_loyer, trous dans l’ordre, jeton dans le bouton, échéance rattachée', async () => {
      await service.notifyUser(reminder);

      expect(email.sendEmail).toHaveBeenCalledTimes(1);
      expect(whatsapp.send).toHaveBeenCalledWith({
        userId: 'tenant-1',
        source: 'payment-reminder',
        scheduleEntryId: 'entry-1',
        paymentId: undefined,
        kind: 'template',
        template: {
          name: 'rappel_loyer',
          bodyParams: ['Ama', (75000).toLocaleString('fr-FR'), 'Bè, Lomé', '31/10/2026'],
          buttonParam: 'jeton-secret',
        },
      });
    });

    it('ne garde jamais le lien de paiement dans l’historique des notifications', async () => {
      await service.notifyUser(reminder);
      const [args] = prisma.notification.create.mock.calls[0] as [{ data: { payload: Record<string, unknown> } }];
      expect(args.data.payload).not.toHaveProperty('payToken');
      expect(args.data.payload).not.toHaveProperty('payLinkUrl');
      expect(args.data.payload).toHaveProperty('tenantFirstName', 'Ama');
    });

    it('quittance : le PDF déjà généré part en en-tête du modèle paiement_recu', async () => {
      const pdf = Buffer.from('%PDF-quittance');
      await service.notifyUser({
        userId: 'tenant-1',
        event: 'receipt',
        variables: { tenantFirstName: 'Ama', amount: 75000, period: '01/10/2026 — 31/10/2026' },
        emailAttachments: [{ filename: 'quittance-warah.pdf', content: pdf }],
        relatedTo: { paymentId: 'pay-1', scheduleEntryId: 'entry-1' },
      });
      expect(whatsapp.sendDocument).toHaveBeenCalledWith({
        userId: 'tenant-1',
        source: 'receipt',
        scheduleEntryId: 'entry-1',
        paymentId: 'pay-1',
        document: { content: pdf, filename: 'quittance-warah.pdf', mimeType: 'application/pdf' },
        template: { name: 'paiement_recu', bodyParams: ['Ama', (75000).toLocaleString('fr-FR'), '01/10/2026 — 31/10/2026'] },
      });
      expect(whatsapp.send).not.toHaveBeenCalled();
    });

    it('seulement pour un locataire : propriétaire et gestionnaire gardent push / email', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...tenant, role: 'OWNER' });
      await service.notifyUser({ ...reminder, event: 'receipt', emailAttachments: [{ filename: 'q.pdf', content: Buffer.from('x') }] });
      expect(email.sendEmail).toHaveBeenCalled();
      expect(whatsapp.send).not.toHaveBeenCalled();
      expect(whatsapp.sendDocument).not.toHaveBeenCalled();
    });

    it('événement sans modèle (null dans la table) : aucun WhatsApp', async () => {
      await service.notifyUser({ userId: 'tenant-1', event: 'lease-created', variables: { propertyAddress: 'Bè' } });
      expect(whatsapp.send).not.toHaveBeenCalled();
    });

    it('variable manquante : pas de WhatsApp, alerte sans les valeurs, l’email est parti', async () => {
      const sansPrenom = { ...reminder.variables };
      delete sansPrenom['tenantFirstName'];
      await service.notifyUser({ ...reminder, variables: sansPrenom });
      expect(email.sendEmail).toHaveBeenCalled();
      expect(whatsapp.send).not.toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalledWith(expect.stringContaining('tenantFirstName'), 'warning');
      expect(Sentry.captureMessage).not.toHaveBeenCalledWith(expect.stringContaining('jeton-secret'), expect.anything());
    });

    it('WhatsApp en erreur (base indisponible) : ne lève jamais, l’email reste envoyé', async () => {
      whatsapp.send.mockRejectedValue(new Error('base indisponible'));
      await expect(service.notifyUser(reminder)).resolves.toBeUndefined();
      expect(email.sendEmail).toHaveBeenCalled();
    });

    it('WhatsApp refusé (pas d’accord) : cas normal, l’email part, rien d’autre', async () => {
      whatsapp.send.mockResolvedValue({ outcome: 'REFUSED', reason: 'NO_CONSENT' });
      await expect(service.notifyUser(reminder)).resolves.toBeUndefined();
      expect(email.sendEmail).toHaveBeenCalledTimes(1);
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });

    it('locataire sans email ni push : le WhatsApp part quand même', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...tenant, email: null });
      await service.notifyUser(reminder);
      expect(email.sendEmail).not.toHaveBeenCalled();
      expect(whatsapp.send).toHaveBeenCalled();
    });

    it('un email raté ne bloque pas le WhatsApp (canaux indépendants)', async () => {
      email.sendEmail.mockResolvedValue(false);
      await service.notifyUser(reminder);
      expect(whatsapp.send).toHaveBeenCalled();
    });
  });
});
