import { WhatsappThreadService, isExchangeOpen } from './whatsapp-thread.service';
import { WHATSAPP_REPLY_WINDOW_MS } from '../../common/constants';

const NOW = new Date('2026-10-18T10:00:00Z');
const RECEIVED = new Date('2026-10-18T09:59:30Z');

describe('isExchangeOpen (unité 48, décision 1)', () => {
  const base = { humanOpenedAt: NOW, humanClosedAt: null, lastTenantMessageAt: NOW };

  it('ouvert, pas fermé, dernier message récent : en cours', () => {
    expect(isExchangeOpen(base, NOW)).toBe(true);
  });

  it('fermé (responsable, locataire, STOP) : terminé', () => {
    expect(isExchangeOpen({ ...base, humanClosedAt: NOW }, NOW)).toBe(false);
  });

  it('dernier message du locataire au-delà de la fenêtre : terminé, sans tâche planifiée', () => {
    const old = new Date(NOW.getTime() - WHATSAPP_REPLY_WINDOW_MS);
    expect(isExchangeOpen({ ...base, lastTenantMessageAt: old }, NOW)).toBe(false);
  });

  it('jamais ouvert : pas en cours', () => {
    expect(isExchangeOpen({ ...base, humanOpenedAt: null }, NOW)).toBe(false);
  });
});

describe('WhatsappThreadService (unité 48)', () => {
  let prisma: {
    $transaction: jest.Mock;
    whatsappThread: { upsert: jest.Mock; update: jest.Mock; updateMany: jest.Mock; findUnique: jest.Mock };
    whatsappConversation: { updateMany: jest.Mock };
    whatsappMessage: { updateMany: jest.Mock };
  };
  let notify: { notifyUser: jest.Mock };
  let service: WhatsappThreadService;

  const threadWithManager = {
    tenant: { firstName: 'Ama', lastName: 'Mensah' },
    property: {
      ownerId: 'owner-1',
      address: null,
      neighborhood: 'Bè-Kpota',
      city: 'Lomé',
      mandates: [{ managerId: 'manager-1' }],
    },
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
      whatsappThread: {
        upsert: jest.fn().mockResolvedValue({ id: 'thread-1' }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue(threadWithManager),
      },
      whatsappConversation: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      whatsappMessage: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };
    service = new WhatsappThreadService(prisma as never, notify as never);
  });

  const relay = (messageType = 'TEXT'): Promise<{ mediaNotice: boolean }> =>
    service.relay(
      { threadId: 'thread-1', messageId: 'in-1', messageType: messageType as never, receivedAt: RECEIVED },
      NOW,
    );
  const notificationReservation = (): [{ where: Record<string, unknown> }] | undefined =>
    (prisma.whatsappThread.updateMany.mock.calls as [{ where: Record<string, unknown> }][]).find(
      ([call]) => 'OR' in call.where,
    );

  it('ouverture : un fil par couple locataire + bien, notification et avis « photos » réarmés', async () => {
    await expect(service.openExchange('tenant-1', 'prop-1', RECEIVED, NOW)).resolves.toBe('thread-1');
    const [args] = prisma.whatsappThread.upsert.mock.calls[0] as [
      { where: unknown; update: Record<string, unknown> },
    ];
    expect(args.where).toEqual({ tenantUserId_propertyId: { tenantUserId: 'tenant-1', propertyId: 'prop-1' } });
    expect(args.update).toMatchObject({
      humanOpenedAt: NOW,
      humanClosedAt: null,
      lastTenantMessageAt: RECEIVED,
      notifiedAt: null,
      mediaNoticeSentAt: null,
    });
  });

  it('fermeture : le fil garde son historique, la conversation du robot revient au menu', async () => {
    await expect(service.closeExchange('thread-1', 'AGENCY', NOW)).resolves.toBe(true);
    expect(prisma.whatsappThread.updateMany).toHaveBeenCalledWith({
      where: { id: 'thread-1', humanOpenedAt: { not: null }, humanClosedAt: null },
      data: { humanClosedAt: NOW, closedReason: 'AGENCY' },
    });
    expect(prisma.whatsappConversation.updateMany).toHaveBeenCalledWith({
      where: { humanThreadId: 'thread-1', state: 'HUMAN' },
      data: { state: 'MENU', pendingAction: null, humanThreadId: null },
    });
  });

  it('relais : message rattaché au fil, notification au gestionnaire mandaté, sans contenu', async () => {
    await relay();
    expect(prisma.whatsappMessage.updateMany).toHaveBeenCalledWith({
      where: { id: 'in-1' },
      data: { threadId: 'thread-1' },
    });
    expect(notify.notifyUser).toHaveBeenCalledWith({
      userId: 'manager-1',
      event: 'whatsapp-message',
      variables: { tenantName: 'Ama Mensah', propertyAddress: 'Bè-Kpota, Lomé' },
    });
  });

  it('sans mandat actif : le propriétaire est le responsable notifié', async () => {
    prisma.whatsappThread.findUnique.mockResolvedValue({
      ...threadWithManager,
      property: { ...threadWithManager.property, mandates: [] },
    });
    await relay();
    expect((notify.notifyUser.mock.calls[0] as [{ userId: string }])[0].userId).toBe('owner-1');
  });

  it('une seule notification par vague : réservation conditionnelle, déjà prise → rien', async () => {
    prisma.whatsappThread.updateMany.mockImplementation(({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve({ count: 'OR' in where ? 0 : 1 }),
    );
    await relay();
    expect(notify.notifyUser).not.toHaveBeenCalled();
  });

  it('réservation réarmée pour un nouveau responsable (décision 5)', async () => {
    await relay();
    const [call] = notificationReservation() as [{ where: Record<string, unknown>; data: unknown }];
    expect(call.where).toEqual({
      id: 'thread-1',
      OR: [{ notifiedAt: null }, { notifiedUserId: { not: 'manager-1' } }],
    });
    expect(call.data).toEqual({ notifiedAt: NOW, notifiedUserId: 'manager-1' });
  });

  it('envoi de la notification en échec : réservation rendue, le relais ne casse pas', async () => {
    notify.notifyUser.mockRejectedValue(new Error('Resend injoignable'));
    await expect(relay()).resolves.toEqual({ mediaNotice: false });
    expect(prisma.whatsappThread.updateMany).toHaveBeenCalledWith({
      where: { id: 'thread-1', notifiedAt: NOW, notifiedUserId: 'manager-1' },
      data: { notifiedAt: null, notifiedUserId: null },
    });
  });

  it('début de la vague de non lus : seulement si tout était lu', async () => {
    await relay();
    expect(prisma.whatsappThread.updateMany).toHaveBeenCalledWith({
      where: { id: 'thread-1', unreadSince: null },
      data: { unreadSince: RECEIVED },
    });
  });

  it('photo ou vocal : avis au locataire une seule fois par échange', async () => {
    await expect(relay('AUDIO')).resolves.toEqual({ mediaNotice: true });
    prisma.whatsappThread.updateMany.mockImplementation(({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve({ count: 'mediaNoticeSentAt' in where ? 0 : 1 }),
    );
    await expect(relay('IMAGE')).resolves.toEqual({ mediaNotice: false });
  });

  it('texte : pas d’avis « photos »', async () => {
    await expect(relay('TEXT')).resolves.toEqual({ mediaNotice: false });
  });
});
