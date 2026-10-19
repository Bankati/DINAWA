import { ConflictException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { LEASE_ENDED_MESSAGE, REPLY_WINDOW_CLOSED_MESSAGE, WhatsappInboxService } from './whatsapp-inbox.service';
import { BOT_TEXTS } from '../whatsapp-bot/bot-messages';

const OWNER = { id: 'owner-1', role: 'OWNER' } as never;
const MANAGER = { id: 'manager-1', role: 'MANAGER' } as never;
const FORMER_MANAGER = { id: 'manager-0', role: 'MANAGER' } as never;
const STRANGER = { id: 'owner-9', role: 'OWNER' } as never;

const recent = (): Date => new Date(Date.now() - 60_000);

function threadRow(
  overrides: Record<string, unknown> = {},
  mandates: { managerId: string }[] = [],
): Record<string, unknown> {
  return {
    id: 'thread-1',
    tenantUserId: 'tenant-1',
    humanOpenedAt: new Date(Date.now() - 3600_000),
    humanClosedAt: null,
    closedReason: null,
    lastTenantMessageAt: recent(),
    lastMessageAt: recent(),
    unreadSince: recent(),
    agencyReadById: null,
    tenant: { firstName: 'Ama', lastName: 'Mensah' },
    property: { id: 'prop-1', ownerId: 'owner-1', address: null, neighborhood: 'Bè-Kpota', city: 'Lomé', mandates },
    messages: [],
    ...overrides,
  };
}

describe('WhatsappInboxService (unité 48)', () => {
  let prisma: {
    $transaction: jest.Mock;
    whatsappThread: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    whatsappMessage: { findMany: jest.Mock; findFirst: jest.Mock; findUnique: jest.Mock; groupBy: jest.Mock };
    property: { findUnique: jest.Mock };
    mandate: { findFirst: jest.Mock };
    lease: { findFirst: jest.Mock; findMany: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let whatsapp: { reply: jest.Mock };
  let threads: { closeExchange: jest.Mock };
  let service: WhatsappInboxService;

  // Mandat actif tel que le voit canActOnProperty (null = pas de mandat).
  const withMandate = (managerId: string | null): void => {
    prisma.mandate.findFirst.mockResolvedValue(managerId ? { managerId } : null);
    prisma.whatsappThread.findUnique.mockResolvedValue(threadRow({}, managerId ? [{ managerId }] : []));
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
      whatsappThread: {
        findMany: jest.fn().mockResolvedValue([threadRow()]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue(threadRow()),
        update: jest.fn().mockResolvedValue({}),
      },
      whatsappMessage: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({ sentAt: recent(), createdAt: recent() }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'out-1',
          direction: 'OUTBOUND',
          messageType: 'TEXT',
          status: 'SENT',
          body: null,
          payload: { body: '*Agence Sika* : Bonjour' },
          deliveredAt: null,
          readAt: null,
          createdAt: new Date(),
        }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      property: { findUnique: jest.fn().mockResolvedValue({ id: 'prop-1', ownerId: 'owner-1' }) },
      mandate: { findFirst: jest.fn().mockResolvedValue(null) },
      lease: {
        findFirst: jest.fn().mockResolvedValue({ id: 'lease-1' }),
        findMany: jest.fn().mockResolvedValue([{ tenantUserId: 'tenant-1', propertyId: 'prop-1' }]),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          firstName: 'Kofi',
          lastName: 'Mensah',
          managerProfile: { companyName: 'Agence Sika' },
        }),
      },
    };
    whatsapp = { reply: jest.fn().mockResolvedValue({ outcome: 'SENT', messageId: 'out-1', wamid: 'w' }) };
    threads = { closeExchange: jest.fn().mockResolvedValue(true) };
    service = new WhatsappInboxService(prisma as never, whatsapp as never, threads as never);
  });

  describe('liste et compteur', () => {
    it('seulement les biens visibles, fils avec au moins un message, 100 au plus', async () => {
      await service.list(OWNER, { page: 1, limit: 20 });
      const [args] = prisma.whatsappThread.findMany.mock.calls[0] as [
        { where: Record<string, unknown>; take: number },
      ];
      expect(args.where['property']).toEqual({
        OR: [{ ownerId: 'owner-1' }, { mandates: { some: { managerId: 'owner-1', status: 'ACTIVE' } } }],
      });
      expect(args.where['lastMessageAt']).toEqual({ not: null });
      expect(args.take).toBe(20);
    });

    it('filtre « en cours » : ouvert, pas fermé, dernier message dans la fenêtre', async () => {
      await service.list(OWNER, { status: 'open', page: 1, limit: 20 });
      const [args] = prisma.whatsappThread.findMany.mock.calls[0] as [{ where: Record<string, unknown> }];
      expect(args.where).toMatchObject({ humanOpenedAt: { not: null }, humanClosedAt: null });
    });

    it('non lu affiché pour le responsable, jamais pour le propriétaire en lecture seule', async () => {
      prisma.whatsappThread.findMany.mockResolvedValue([threadRow({}, [{ managerId: 'manager-1' }])]);
      const asOwner = await service.list(OWNER, { page: 1, limit: 20 });
      const asManager = await service.list(MANAGER, { page: 1, limit: 20 });
      expect(asOwner.data[0]).toMatchObject({ unread: false, canReply: false });
      expect(asManager.data[0]).toMatchObject({ unread: true, canReply: true });
    });

    it('compteur : conversations dont l’utilisateur est le RESPONSABLE', async () => {
      prisma.whatsappThread.count.mockResolvedValue(2);
      await expect(service.unreadCount(MANAGER)).resolves.toEqual({ count: 2 });
      const [args] = prisma.whatsappThread.count.mock.calls[0] as [{ where: Record<string, unknown> }];
      expect(args.where['property']).toEqual({
        OR: [
          { mandates: { some: { managerId: 'manager-1', status: 'ACTIVE' } } },
          { ownerId: 'manager-1', mandates: { none: { status: 'ACTIVE' } } },
        ],
      });
    });
  });

  describe('lecture du fil', () => {
    it('messages lus SANS effet de bord (préchargement) ; code masqué et vocal signalés', async () => {
      prisma.whatsappMessage.findMany.mockResolvedValue([
        { id: 'm2', direction: 'INBOUND', messageType: 'AUDIO', status: 'SENT', body: null, payload: null, deliveredAt: null, readAt: null, createdAt: new Date() },
        { id: 'm1', direction: 'INBOUND', messageType: 'TEXT', status: 'SENT', body: null, payload: { pinMasked: true }, deliveredAt: null, readAt: null, createdAt: new Date() },
      ]);
      const result = await service.messages(OWNER, 'thread-1', { limit: 50 });
      expect(result.messages.map((message) => message.kind)).toEqual(['masked', 'audio']);
      expect(result.messages[0].text).toBeNull();
      expect(prisma.whatsappThread.update).not.toHaveBeenCalled();
    });

    it('pagination : 100 au plus, curseur sur le plus ancien message affiché', async () => {
      await service.messages(OWNER, 'thread-1', { limit: 50, before: 'm9' });
      const [args] = prisma.whatsappMessage.findMany.mock.calls[0] as [
        { take: number; cursor: unknown; skip: number },
      ];
      expect(args).toMatchObject({ take: 51, cursor: { id: 'm9' }, skip: 1 });
    });

    it('quelqu’un sans droit sur le bien : 403', async () => {
      await expect(service.messages(STRANGER, 'thread-1', {})).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('lu, réponse et fin (responsable seulement)', () => {
    it('le propriétaire en lecture seule ne marque rien comme lu', async () => {
      withMandate('manager-1');
      await expect(service.markRead(OWNER, 'thread-1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.whatsappThread.update).not.toHaveBeenCalled();
    });

    it('le gestionnaire mandaté marque lu et réarme la notification', async () => {
      withMandate('manager-1');
      await service.markRead(MANAGER, 'thread-1');
      expect(prisma.whatsappThread.update).toHaveBeenCalledWith({
        where: { id: 'thread-1' },
        data: expect.objectContaining({ unreadSince: null, agencyReadById: 'manager-1', notifiedAt: null }) as object,
      });
    });

    it('ancien gestionnaire (mandat passé à un autre) : plus de réponse possible', async () => {
      withMandate('manager-1');
      await expect(service.reply(FORMER_MANAGER, 'thread-1', { text: 'Bonjour' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(whatsapp.reply).not.toHaveBeenCalled();
    });

    it('réponse : nom ajouté par le serveur, rattachée au fil et à son auteur', async () => {
      withMandate('manager-1');
      await service.reply(MANAGER, 'thread-1', { text: 'Le plombier passe demain à 10 h.' });
      expect(whatsapp.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'tenant-1',
          source: 'agency-reply',
          text: '*Agence Sika* : Le plombier passe demain à 10 h.',
          threadId: 'thread-1',
          sentByUserId: 'manager-1',
        }),
      );
    });

    it('propriétaire qui gère seul : « (propriétaire) » après son nom', async () => {
      withMandate(null);
      prisma.user.findUnique.mockResolvedValue({ firstName: 'Kofi', lastName: 'Mensah', managerProfile: null });
      await service.reply(OWNER, 'thread-1', { text: 'Bonjour' });
      expect((whatsapp.reply.mock.calls[0] as [{ text: string }])[0].text).toBe(
        '*Kofi Mensah (propriétaire)* : Bonjour',
      );
    });

    it('fenêtre de 24 h fermée : 409 avant tout envoi', async () => {
      withMandate(null);
      const old = new Date(Date.now() - 25 * 3600_000);
      prisma.whatsappMessage.findFirst.mockResolvedValue({ sentAt: old, createdAt: old });
      await expect(service.reply(OWNER, 'thread-1', { text: 'Bonjour' })).rejects.toThrow(
        new ConflictException(REPLY_WINDOW_CLOSED_MESSAGE),
      );
      expect(whatsapp.reply).not.toHaveBeenCalled();
    });

    it('locataire désinscrit (STOP) : 409 explicite', async () => {
      withMandate(null);
      whatsapp.reply.mockResolvedValue({ outcome: 'REFUSED', reason: 'CONSENT_STOPPED' });
      await expect(service.reply(OWNER, 'thread-1', { text: 'Bonjour' })).rejects.toBeInstanceOf(ConflictException);
    });

    it('panne Meta : 503, rien n’est marqué lu', async () => {
      withMandate(null);
      whatsapp.reply.mockResolvedValue({ outcome: 'FAILED', messageId: 'out-1', retryable: true });
      await expect(service.reply(OWNER, 'thread-1', { text: 'Bonjour' })).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(prisma.whatsappThread.update).not.toHaveBeenCalled();
    });

    it('« Terminer l’échange » : robot de retour, locataire prévenu', async () => {
      withMandate(null);
      await expect(service.close(OWNER, 'thread-1')).resolves.toEqual({ closed: true });
      expect(threads.closeExchange).toHaveBeenCalledWith('thread-1', 'AGENCY', expect.any(Date));
      expect(whatsapp.reply).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'agency-close', text: BOT_TEXTS.agencyClosed }),
      );
    });

    it('locataire parti du logement : plus de réponse, même fenêtre ouverte (fil en historique)', async () => {
      withMandate(null);
      prisma.lease.findFirst.mockResolvedValue(null);
      await expect(service.reply(OWNER, 'thread-1', { text: 'Bonjour' })).rejects.toThrow(
        new ConflictException(LEASE_ENDED_MESSAGE),
      );
      expect(whatsapp.reply).not.toHaveBeenCalled();
      const thread = await service.messages(OWNER, 'thread-1', {});
      expect(thread.conversation).toMatchObject({ canReply: false, readOnlyReason: 'LEASE_ENDED' });
    });

    it('liste : un fil d’ancien locataire est affiché en lecture seule', async () => {
      prisma.lease.findMany.mockResolvedValue([]);
      const page = await service.list(OWNER, { page: 1, limit: 20 });
      expect(page.data[0]).toMatchObject({ canReply: false, readOnlyReason: 'LEASE_ENDED' });
    });

    it('« Terminer » sur un échange déjà expiré : la raison « 24 h » est gardée', async () => {
      const old = new Date(Date.now() - 25 * 3600_000);
      prisma.mandate.findFirst.mockResolvedValue(null);
      prisma.whatsappThread.findUnique.mockResolvedValue(threadRow({ lastTenantMessageAt: old }));
      await service.close(OWNER, 'thread-1');
      expect(threads.closeExchange).toHaveBeenCalledWith('thread-1', 'TIMEOUT', expect.any(Date));
      expect(whatsapp.reply).not.toHaveBeenCalled();
    });

    it('échange déjà terminé : aucun message au locataire', async () => {
      withMandate(null);
      threads.closeExchange.mockResolvedValue(false);
      await service.close(OWNER, 'thread-1');
      expect(whatsapp.reply).not.toHaveBeenCalled();
    });
  });
});
