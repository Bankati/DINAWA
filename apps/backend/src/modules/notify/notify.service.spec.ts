import { NotifyService, NotifyUserParams } from './notify.service';

describe('NotifyService', () => {
  let service: NotifyService;
  let prisma: {
    user: { findUnique: jest.Mock };
    notification: { create: jest.Mock };
  };
  let push: { sendToUser: jest.Mock };
  let email: { sendEmail: jest.Mock };

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

    service = new NotifyService(prisma as never, push as never, email as never);
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
});
