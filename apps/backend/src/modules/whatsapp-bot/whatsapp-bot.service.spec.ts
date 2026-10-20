import { WhatsappBotService, BotInbound } from './whatsapp-bot.service';
import { BOT_TEXTS, MENU_ROWS } from './bot-messages';
import { BOT_CONVERSATION_TIMEOUT_MS } from '../../common/constants';

const RECEIVED = new Date(Date.now() - 5_000);

type FakeUser = {
  role: string;
  firstName: string;
  anonymizedAt: Date | null;
  whatsappConsent: string;
  whatsappVerifiedPhone: string | null;
  tenantProfile: {
    whatsappPinHash: string | null;
    pinVerifiedAt: Date | null;
    pinVerifiedPhone: string | null;
    pinLockedUntil: Date | null;
  };
  leasesAsTenant: { id: string }[];
};

function inbound(overrides: Partial<BotInbound> = {}): BotInbound {
  return {
    messageId: 'in-1',
    userId: 'tenant-1',
    receivedAt: RECEIVED,
    text: 'menu',
    payload: null,
    ...overrides,
  };
}

describe('WhatsappBotService (unité 47)', () => {
  let prisma: {
    whatsappMessage: { updateMany: jest.Mock };
    user: { findUnique: jest.Mock; updateMany: jest.Mock };
    whatsappConversation: { upsert: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    paymentScheduleEntry: { findFirst: jest.Mock; findMany: jest.Mock };
    payment: { findFirst: jest.Mock };
  };
  let whatsapp: {
    reply: jest.Mock;
    replyList: jest.Mock;
    replyDocument: jest.Mock;
    sendInvitation: jest.Mock;
  };
  let payLinks: { payLinkFor: jest.Mock };
  let receiptPdf: { generate: jest.Mock };
  let identity: { isVerified: jest.Mock; check: jest.Mock };
  let service: WhatsappBotService;
  let user: FakeUser;

  const sent = { outcome: 'SENT', messageId: 'out-1', wamid: 'w' };

  beforeEach(() => {
    user = {
      role: 'TENANT',
      firstName: 'Ama',
      anonymizedAt: null,
      whatsappConsent: 'ACCEPTED',
      whatsappVerifiedPhone: '98646779',
      tenantProfile: {
        whatsappPinHash: '$2b$hash',
        pinVerifiedAt: null,
        pinVerifiedPhone: null,
        pinLockedUntil: null,
      },
      leasesAsTenant: [{ id: 'lease-1' }],
    };
    prisma = {
      whatsappMessage: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        findUnique: jest.fn(() => Promise.resolve(user)),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      whatsappConversation: {
        upsert: jest
          .fn()
          .mockResolvedValue({ state: 'MENU', pendingAction: null, lastActivityAt: new Date() }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      paymentScheduleEntry: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      payment: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    whatsapp = {
      reply: jest.fn().mockResolvedValue(sent),
      replyList: jest.fn().mockResolvedValue(sent),
      replyDocument: jest.fn().mockResolvedValue(sent),
      sendInvitation: jest.fn().mockResolvedValue(sent),
    };
    payLinks = {
      payLinkFor: jest
        .fn()
        .mockReturnValue({ token: 'jeton', url: 'https://warah.test/payer/jeton' }),
    };
    receiptPdf = { generate: jest.fn().mockResolvedValue(Buffer.from('%PDF')) };
    identity = {
      isVerified: jest.fn().mockReturnValue(false),
      check: jest.fn().mockResolvedValue({ result: 'OK' }),
    };
    service = new WhatsappBotService(
      prisma as never,
      whatsapp as never,
      payLinks as never,
      receiptPdf as never,
      identity as never,
    );
  });

  const lastText = (): string => (whatsapp.reply.mock.calls.at(-1) as [{ text: string }])[0].text;
  const conversationUpdate = (): Record<string, unknown> =>
    (prisma.whatsappConversation.update.mock.calls.at(-1) as [{ data: Record<string, unknown> }])[0]
      .data;

  describe('à qui le robot répond (décision 1)', () => {
    it('locataire avec accord : le menu cliquable, avec son prénom', async () => {
      await service.handle(inbound({ text: 'bonjour' }));
      expect(whatsapp.replyList).toHaveBeenCalledWith({
        userId: 'tenant-1',
        inboundReceivedAt: RECEIVED,
        source: 'bot-menu',
        body: BOT_TEXTS.menu('Ama'),
        buttonLabel: 'Voir les options',
        rows: MENU_ROWS,
      });
    });

    it('arrêté (STOP) : silence total', async () => {
      user.whatsappConsent = 'STOPPED';
      await service.handle(inbound());
      expect(whatsapp.replyList).not.toHaveBeenCalled();
      expect(whatsapp.reply).not.toHaveBeenCalled();
      expect(whatsapp.sendInvitation).not.toHaveBeenCalled();
    });

    it.each([
      ['propriétaire', { role: 'OWNER' }],
      ['sans bail actif', { leasesAsTenant: [] }],
      ['compte anonymisé', { anonymizedAt: new Date() }],
    ])('%s : silence', async (_label, change) => {
      Object.assign(user, change);
      await service.handle(inbound());
      expect(whatsapp.replyList).not.toHaveBeenCalled();
      expect(whatsapp.sendInvitation).not.toHaveBeenCalled();
    });

    it.each(['NOT_ASKED', 'PENDING'])(
      'sans accord (%s) : UNE invitation, réservée en base',
      async (consent) => {
        user.whatsappConsent = consent;
        await service.handle(inbound({ text: 'bonjour' }));
        const [reservation] = prisma.user.updateMany.mock.calls[0] as [
          { where: Record<string, unknown>; data: { whatsappInvitedAt: Date } },
        ];
        expect(reservation.where).toMatchObject({
          id: 'tenant-1',
          whatsappConsent: { in: ['NOT_ASKED', 'PENDING'] },
        });
        expect(whatsapp.sendInvitation).toHaveBeenCalledWith(
          'tenant-1',
          BOT_TEXTS.invitation,
          RECEIVED,
        );
        expect(whatsapp.replyList).not.toHaveBeenCalled();
      },
    );

    it('invitation déjà envoyée dans les 24 h (ou message simultané) : pas de seconde invitation', async () => {
      user.whatsappConsent = 'NOT_ASKED';
      prisma.user.updateMany.mockResolvedValue({ count: 0 });
      await service.handle(inbound());
      expect(whatsapp.sendInvitation).not.toHaveBeenCalled();
    });

    it('invitation refusée à l’envoi : la réservation est rendue (un OUI ne répondra pas à une invitation jamais partie)', async () => {
      user.whatsappConsent = 'NOT_ASKED';
      whatsapp.sendInvitation.mockResolvedValue({
        outcome: 'REFUSED',
        reason: 'TIER_NOT_INCLUDED',
      });
      await service.handle(inbound());
      const [release] = prisma.user.updateMany.mock.calls[1] as [
        { where: Record<string, unknown>; data: unknown },
      ];
      expect(release.data).toEqual({ whatsappInvitedAt: null });
    });
  });

  describe('Payer mon loyer (sans code)', () => {
    it('plus ancienne échéance non soldée → lien de paiement, sans demander le code', async () => {
      const due = new Date(Date.now() + 3 * 24 * 3600_000);
      prisma.paymentScheduleEntry.findFirst.mockResolvedValue({
        id: 'entry-1',
        dueDate: due,
        expectedAmount: 20000,
        paidAmount: 0,
      });
      await service.handle(inbound({ text: 'payer' }));
      expect(identity.check).not.toHaveBeenCalled();
      expect(payLinks.payLinkFor).toHaveBeenCalledWith({
        id: 'entry-1',
        dueDate: due,
        expectedAmount: 20000,
        paidAmount: 0,
      });
      expect(lastText()).toContain('https://warah.test/payer/jeton');
      expect(lastText()).toContain((20000).toLocaleString('fr-FR'));
      const [query] = prisma.paymentScheduleEntry.findFirst.mock.calls[0] as [
        { where: Record<string, unknown>; orderBy: unknown },
      ];
      expect(query.where).toEqual({
        lease: { tenantUserId: 'tenant-1', status: 'ACTIVE' },
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      });
      expect(query.orderBy).toEqual({ dueDate: 'asc' });
    });

    it('rien à payer : « vous êtes à jour »', async () => {
      await service.handle(inbound({ payload: { replyId: 'PAY' }, text: null }));
      expect(lastText()).toBe(BOT_TEXTS.upToDate);
    });

    it('retard de plus de 30 jours : lien expiré, on oriente vers l’agence', async () => {
      prisma.paymentScheduleEntry.findFirst.mockResolvedValue({
        id: 'entry-1',
        dueDate: new Date(Date.now() - 40 * 24 * 3600_000),
        expectedAmount: 20000,
        paidAmount: 0,
      });
      await service.handle(inbound({ text: 'payer' }));
      expect(lastText()).toBe(BOT_TEXTS.payLinkExpired);
      expect(payLinks.payLinkFor).not.toHaveBeenCalled();
    });
  });

  describe('actions protégées par le code (décision 2)', () => {
    it('pas de code créé : explique comment le créer', async () => {
      user.tenantProfile.whatsappPinHash = null;
      await service.handle(inbound({ text: 'quittance' }));
      expect(lastText()).toBe(BOT_TEXTS.noPin);
      expect(receiptPdf.generate).not.toHaveBeenCalled();
    });

    it('code non vérifié : demande le code et retient l’action en attente', async () => {
      await service.handle(inbound({ text: 'quittance' }));
      expect(lastText()).toBe(BOT_TEXTS.askPin);
      expect(conversationUpdate()).toMatchObject({
        state: 'AWAITING_PIN',
        pendingAction: 'RECEIPT',
      });
      expect(receiptPdf.generate).not.toHaveBeenCalled();
    });

    it('bon code : la quittance du dernier paiement part en pièce jointe, puis l’empreinte est effacée', async () => {
      prisma.whatsappConversation.upsert.mockResolvedValue({
        state: 'AWAITING_PIN',
        pendingAction: 'RECEIPT',
        lastActivityAt: new Date(),
      });
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        scheduleEntry: {
          periodStart: new Date('2026-10-01T00:00:00Z'),
          periodEnd: new Date('2026-10-31T00:00:00Z'),
        },
      });
      await service.handle(inbound({ text: null, payload: { pinDigest: 'empreinte' } }));

      expect(identity.check).toHaveBeenCalledWith(
        'tenant-1',
        'empreinte',
        '98646779',
        expect.any(Date),
      );
      expect(whatsapp.replyDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'bot-receipt',
          paymentId: 'pay-1',
          document: {
            content: Buffer.from('%PDF'),
            filename: 'quittance-warah.pdf',
            mimeType: 'application/pdf',
          },
        }),
      );
      // Uniquement les paiements confirmés DE CE locataire.
      const [query] = prisma.payment.findFirst.mock.calls[0] as [{ where: unknown }];
      expect(query.where).toEqual({ status: 'PAID', lease: { tenantUserId: 'tenant-1' } });
      expect(prisma.whatsappMessage.updateMany).toHaveBeenCalledWith({
        where: { id: 'in-1' },
        data: { payload: { pinMasked: true } },
      });
      expect(conversationUpdate()).toMatchObject({ state: 'MENU', pendingAction: null });
    });

    it('vérification encore valable (moins de 30 jours) : pas de code redemandé', async () => {
      identity.isVerified.mockReturnValue(true);
      prisma.paymentScheduleEntry.findMany.mockResolvedValue([]);
      await service.handle(inbound({ text: 'relevé' }));
      expect(identity.check).not.toHaveBeenCalled();
      expect(lastText()).toBe(BOT_TEXTS.noStatement);
    });

    it('code faux : essais restants, on attend toujours le code', async () => {
      prisma.whatsappConversation.upsert.mockResolvedValue({
        state: 'AWAITING_PIN',
        pendingAction: 'STATEMENT',
        lastActivityAt: new Date(),
      });
      identity.check.mockResolvedValue({ result: 'WRONG', remaining: 3 });
      await service.handle(inbound({ text: null, payload: { pinDigest: 'empreinte' } }));
      expect(lastText()).toBe(BOT_TEXTS.wrongPin(3));
      expect(conversationUpdate()).toMatchObject({
        state: 'AWAITING_PIN',
        pendingAction: 'STATEMENT',
      });
    });

    it('code bloqué : prévient sans redemander', async () => {
      user.tenantProfile.pinLockedUntil = new Date(Date.now() + 30 * 60_000);
      await service.handle(inbound({ text: 'quittance' }));
      expect(lastText()).toContain('bloqué');
      expect(identity.check).not.toHaveBeenCalled();
    });

    it('aucune quittance disponible : réponse propre', async () => {
      identity.isVerified.mockReturnValue(true);
      await service.handle(inbound({ text: 'quittance' }));
      expect(lastText()).toBe(BOT_TEXTS.noReceipt);
      expect(receiptPdf.generate).not.toHaveBeenCalled();
    });

    it('relevé : 6 derniers mois, statut de chaque échéance et reste à payer', async () => {
      identity.isVerified.mockReturnValue(true);
      const past = new Date(Date.now() - 20 * 24 * 3600_000);
      const future = new Date(Date.now() + 10 * 24 * 3600_000);
      prisma.paymentScheduleEntry.findMany.mockResolvedValue([
        {
          periodStart: new Date('2026-09-01T00:00:00Z'),
          dueDate: past,
          expectedAmount: 20000,
          paidAmount: 20000,
          status: 'PAID',
        },
        {
          periodStart: new Date('2026-10-01T00:00:00Z'),
          dueDate: past,
          expectedAmount: 20000,
          paidAmount: 5000,
          status: 'PARTIAL',
        },
        {
          periodStart: new Date('2026-11-01T00:00:00Z'),
          dueDate: future,
          expectedAmount: 20000,
          paidAmount: 0,
          status: 'PENDING',
        },
      ]);
      await service.handle(inbound({ text: 'relevé' }));
      const text = lastText();
      expect(text).toContain('Septembre 2026');
      expect(text).toContain('payé ✅');
      expect(text).toContain('à venir');
      expect(text).toContain(`Reste à payer : ${(15000).toLocaleString('fr-FR')} FCFA`);
    });

    it('message libre pendant l’attente du code : on redemande le code', async () => {
      prisma.whatsappConversation.upsert.mockResolvedValue({
        state: 'AWAITING_PIN',
        pendingAction: 'RECEIPT',
        lastActivityAt: new Date(),
      });
      await service.handle(inbound({ text: 'je ne sais plus' }));
      expect(lastText()).toBe(BOT_TEXTS.askPinAgain);
    });

    it('l’état de conversation seul n’autorise rien : sans empreinte de code, aucune quittance', async () => {
      prisma.whatsappConversation.upsert.mockResolvedValue({
        state: 'AWAITING_PIN',
        pendingAction: 'RECEIPT',
        lastActivityAt: new Date(),
      });
      await service.handle(inbound({ text: 'ok' }));
      expect(receiptPdf.generate).not.toHaveBeenCalled();
      expect(identity.check).not.toHaveBeenCalled();
    });
  });

  describe('conversation', () => {
    it('après 30 min sans message, on repart du menu (l’attente du code est oubliée)', async () => {
      prisma.whatsappConversation.upsert.mockResolvedValue({
        state: 'AWAITING_PIN',
        pendingAction: 'RECEIPT',
        lastActivityAt: new Date(Date.now() - BOT_CONVERSATION_TIMEOUT_MS - 1000),
      });
      await service.handle(inbound({ text: null, payload: { pinDigest: 'empreinte' } }));
      expect(identity.check).not.toHaveBeenCalled();
      expect(whatsapp.replyList).toHaveBeenCalledWith(
        expect.objectContaining({ body: BOT_TEXTS.notUnderstood }),
      );
    });

    it('phrase non reconnue : « je n’ai pas compris » + menu', async () => {
      await service.handle(inbound({ text: 'ma fenêtre est cassée' }));
      expect(whatsapp.replyList).toHaveBeenCalledWith(
        expect.objectContaining({ body: BOT_TEXTS.notUnderstood }),
      );
    });

    it('déjà répondu à ce message (traitement repris ou lancé en double) : rien ne repart', async () => {
      prisma.whatsappMessage.updateMany.mockResolvedValueOnce({ count: 0 });
      await service.handle(inbound());
      const [claim] = prisma.whatsappMessage.updateMany.mock.calls[0] as [
        { where: unknown; data: { processedAt: unknown } },
      ];
      expect(claim.where).toEqual({ id: 'in-1', processedAt: null });
      expect(claim.data.processedAt).toBeInstanceOf(Date);
      expect(whatsapp.replyList).not.toHaveBeenCalled();
      expect(prisma.whatsappConversation.update).not.toHaveBeenCalled();
    });

    it('fabrication de la quittance en panne : « erreur technique » au lieu du silence', async () => {
      identity.isVerified.mockReturnValue(true);
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        scheduleEntry: { periodStart: new Date(), periodEnd: new Date() },
      });
      receiptPdf.generate.mockRejectedValue(new Error('police introuvable'));
      await service.handle(inbound({ text: 'quittance' }));
      expect(whatsapp.replyDocument).not.toHaveBeenCalled();
      expect(lastText()).toBe(BOT_TEXTS.technicalError);
    });

    it('réponse non partie (Meta en panne) : l’étape n’est pas enregistrée', async () => {
      whatsapp.reply.mockResolvedValue({ outcome: 'FAILED', messageId: 'out-1', retryable: true });
      await service.handle(inbound({ text: 'quittance' }));
      expect(lastText()).toBe(BOT_TEXTS.askPin);
      // Le robot n'attend pas un code qu'il n'a pas réussi à demander.
      expect(prisma.whatsappConversation.update).not.toHaveBeenCalled();
    });

    it('anti-abus : 20 réponses dans l’heure atteintes → silence', async () => {
      prisma.whatsappConversation.updateMany.mockResolvedValue({ count: 0 });
      await service.handle(inbound());
      expect(whatsapp.replyList).not.toHaveBeenCalled();
      // Deux écritures conditionnelles : remise à zéro de l'heure, puis +1 sous 20.
      const [reset, increment] = prisma.whatsappConversation.updateMany.mock.calls as [
        [{ where: Record<string, unknown> }],
        [{ where: Record<string, unknown> }],
      ];
      expect(reset[0].where).toHaveProperty('replyWindowStart');
      expect(increment[0].where).toEqual({ userId: 'tenant-1', replyCount: { lt: 20 } });
    });

    it('un message de code est toujours effacé, même quand le robot se tait', async () => {
      user.whatsappConsent = 'STOPPED';
      await service.handle(inbound({ text: null, payload: { pinDigest: 'empreinte' } }));
      expect(prisma.whatsappMessage.updateMany).toHaveBeenCalledWith({
        where: { id: 'in-1' },
        data: { payload: { pinMasked: true } },
      });
    });

    it('deux messages rapprochés du même locataire : traités dans l’ordre, chacun reçoit SA réponse', async () => {
      const order: string[] = [];
      whatsapp.replyList.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        order.push('menu');
        return sent;
      });
      whatsapp.reply.mockImplementation(() => {
        order.push('payer');
        return Promise.resolve(sent);
      });
      await Promise.all([
        service.handle(inbound({ text: 'menu' })),
        service.handle(inbound({ messageId: 'in-2', text: 'payer' })),
      ]);
      expect(order).toEqual(['menu', 'payer']);
      // La réponse au 1er message ne fait pas taire le 2e (constat /review).
      const claimedIds = (
        prisma.whatsappMessage.updateMany.mock.calls as [{ where: { id: string } }][]
      ).map(([call]) => call.where.id);
      expect(claimedIds).toEqual(['in-1', 'in-2']);
    });
  });
});
