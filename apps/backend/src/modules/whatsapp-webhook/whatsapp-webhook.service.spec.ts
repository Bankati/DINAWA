import { ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHmac } from 'node:crypto';
import { applyConsentCommand } from '../whatsapp-consent/consent-writer';
import { WhatsappWebhookService } from './whatsapp-webhook.service';
import { WHATSAPP_INBOUND_RECEIVED } from './whatsapp-inbound.events';
import {
  PHONE_NUMBER_ID,
  REAL_FAILED_STATUS,
  SENDER_LOCAL,
  messageNotification,
  otherNumberNotification,
  statusNotification,
  textNotification,
} from './__fixtures__/meta-notifications';

// Le rédacteur du consentement a ses propres tests (consent-writer.spec.ts) :
// ici on vérifie seulement ce que le webhook lui demande.
jest.mock('../whatsapp-consent/consent-writer', () => ({ applyConsentCommand: jest.fn() }));
const applyConsent = applyConsentCommand as jest.Mock;

const APP_SECRET = 'secret-app-test';
const VERIFY_TOKEN = 'jeton-equipe';

type Mocked = {
  whatsappMessage: { findFirst: jest.Mock; updateMany: jest.Mock; create: jest.Mock };
  // findUnique / findFirst servent de sources simulées : le compte trouvé par
  // numéro WhatsApp dédié / par numéro principal ; findMany les interroge.
  user: { findUnique: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock; updateMany: jest.Mock };
  whatsappConsentEvent: { create: jest.Mock };
  $transaction: jest.Mock;
};

function sign(raw: Buffer, secret = APP_SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
}

function duplicateError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('WhatsappWebhookService', () => {
  let prisma: Mocked;
  let configValues: Record<string, string | undefined>;
  let events: { emit: jest.Mock };
  let consent: { refreshAgencyLists: jest.Mock };
  let tokens: { pinDigest: jest.Mock };
  let service: WhatsappWebhookService;

  beforeEach(() => {
    applyConsent.mockReset();
    prisma = {
      whatsappMessage: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'in-1' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      whatsappConsentEvent: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((fn: (tx: Mocked) => Promise<unknown>) => fn(prisma));
    prisma.user.findMany.mockImplementation(async (args: { where: { whatsappPhone?: unknown } }) => {
      const byWhatsapp = typeof args.where.whatsappPhone === 'object' && args.where.whatsappPhone !== null;
      const found = (await (byWhatsapp ? prisma.user.findUnique() : prisma.user.findFirst())) as unknown;
      return found ? [found] : [];
    });
    configValues = {
      WHATSAPP_APP_SECRET: APP_SECRET,
      WHATSAPP_VERIFY_TOKEN: VERIFY_TOKEN,
      WHATSAPP_PHONE_NUMBER_ID: PHONE_NUMBER_ID,
    };
    events = { emit: jest.fn() };
    consent = { refreshAgencyLists: jest.fn().mockResolvedValue(undefined) };
    tokens = { pinDigest: jest.fn((pin: string) => `empreinte-${pin}`) };
    service = new WhatsappWebhookService(
      prisma as never,
      { get: (key: string) => configValues[key] } as never,
      events as never,
      consent as never,
      tokens as never,
    );
  });

  // Simule la requête réelle : signature calculée sur les octets envoyés.
  function receive(body: unknown, signature?: string): Promise<void> {
    const raw = Buffer.from(JSON.stringify(body));
    return service.handleNotification(raw, signature ?? sign(raw), body);
  }

  describe('poignée de main (GET)', () => {
    it('renvoie le challenge quand le jeton est le bon', () => {
      expect(service.verifyHandshake('subscribe', VERIFY_TOKEN, '1158201444')).toBe('1158201444');
    });

    it.each([
      ['un mauvais jeton', 'subscribe', 'autre', '1'],
      ['un autre mode', 'unsubscribe', VERIFY_TOKEN, '1'],
      ['un challenge absent', 'subscribe', VERIFY_TOKEN, undefined],
      ['un jeton absent', 'subscribe', undefined, '1'],
    ])('refuse %s (403)', (_label, mode, token, challenge) => {
      expect(() => service.verifyHandshake(mode, token, challenge)).toThrow(ForbiddenException);
    });

    it('répond « indisponible » si le jeton n’est pas configuré', () => {
      configValues['WHATSAPP_VERIFY_TOKEN'] = undefined;
      expect(() => service.verifyHandshake('subscribe', VERIFY_TOKEN, '1')).toThrow(ServiceUnavailableException);
    });
  });

  describe('signature (POST)', () => {
    it('refuse une signature fausse et n’enregistre rien (401)', async () => {
      await expect(receive(textNotification('bjr'), 'sha256=' + '0'.repeat(64))).rejects.toThrow(UnauthorizedException);
      expect(prisma.whatsappMessage.create).not.toHaveBeenCalled();
    });

    it('refuse une signature absente', async () => {
      const raw = Buffer.from('{}');
      await expect(service.handleNotification(raw, undefined, {})).rejects.toThrow(UnauthorizedException);
    });

    it('refuse un corps modifié après signature', async () => {
      const body = textNotification('bjr');
      const signature = sign(Buffer.from(JSON.stringify(body)));
      const tampered = Buffer.from(JSON.stringify(textNotification('STOP')));
      await expect(service.handleNotification(tampered, signature, body)).rejects.toThrow(UnauthorizedException);
    });

    it('répond « indisponible » sans clé secrète, même interrupteur éteint (Meta réessaiera)', async () => {
      configValues['WHATSAPP_APP_SECRET'] = undefined;
      await expect(receive(textNotification('bjr'))).rejects.toThrow(ServiceUnavailableException);
    });

    it('accepte une notification bien signée', async () => {
      await expect(receive(textNotification('bjr'))).resolves.toBeUndefined();
      expect(prisma.whatsappMessage.create).toHaveBeenCalled();
    });

    it('ignore une notification d’un autre numéro du compte', async () => {
      await receive(otherNumberNotification());
      expect(prisma.whatsappMessage.create).not.toHaveBeenCalled();
    });

    it('accepte un contenu inconnu sans erreur (Meta ne doit pas réessayer pour rien)', async () => {
      await expect(receive({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'calls' }] }] })).resolves.toBeUndefined();
    });
  });

  describe('accusés de livraison', () => {
    const outbound = {
      id: 'msg-1',
      wamid: 'wamid.OUT-1',
      status: 'SENT',
      sentAt: new Date('2026-10-13T09:00:00Z'),
      deliveredAt: null,
      readAt: null,
    };

    it('applique « livré » par une écriture conditionnée à l’état lu', async () => {
      prisma.whatsappMessage.findFirst.mockResolvedValue(outbound);
      await receive(statusNotification('delivered', { callbackData: 'msg-1', timestamp: '1791800000' }));

      expect(prisma.whatsappMessage.updateMany).toHaveBeenCalledWith({
        where: { id: 'msg-1', status: 'SENT', sentAt: outbound.sentAt, deliveredAt: null, readAt: null },
        data: { deliveredAt: new Date(1791800000 * 1000) },
      });
    });

    it('retrouve le message par biz_opaque_callback_data et rattache le wamid manquant', async () => {
      prisma.whatsappMessage.findFirst.mockResolvedValue({ ...outbound, wamid: null, status: 'QUEUED', sentAt: null });
      await receive(statusNotification('sent', { callbackData: 'msg-1', wamid: 'wamid.NEW', timestamp: '1791800000' }));

      expect(prisma.whatsappMessage.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'msg-1', direction: 'OUTBOUND' } }),
      );
      expect(prisma.whatsappMessage.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'SENT', sentAt: new Date(1791800000 * 1000), wamid: 'wamid.NEW' },
        }),
      );
    });

    it('recalcule si un autre accusé est passé entre-temps (écriture perdue)', async () => {
      prisma.whatsappMessage.findFirst
        .mockResolvedValueOnce(outbound)
        .mockResolvedValueOnce({ ...outbound, deliveredAt: new Date('2026-10-13T09:01:00Z'), readAt: new Date('2026-10-13T09:01:00Z') });
      prisma.whatsappMessage.updateMany.mockResolvedValueOnce({ count: 0 });

      await receive(statusNotification('delivered', { wamid: 'wamid.OUT-1' }));

      // Deuxième passage : « lu » déjà là, le « livré » tardif ne change rien.
      expect(prisma.whatsappMessage.updateMany).toHaveBeenCalledTimes(1);
      expect(prisma.whatsappMessage.findFirst).toHaveBeenCalledTimes(2);
    });

    it('ignore un accusé contradictoire (échec après livraison) sans rien écrire', async () => {
      prisma.whatsappMessage.findFirst.mockResolvedValue({ ...outbound, deliveredAt: new Date() });
      await receive(statusNotification('failed', { errorCode: 131026 }));
      expect(prisma.whatsappMessage.updateMany).not.toHaveBeenCalled();
    });

    it('enregistre la vraie notification d’échec 131031 sur un message envoyé', async () => {
      prisma.whatsappMessage.findFirst.mockResolvedValue({ ...outbound, wamid: 'wamid.FAILED-131031' });
      await receive(REAL_FAILED_STATUS);

      expect(prisma.whatsappMessage.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED', errorCode: '131031', failedAt: new Date(1791760832 * 1000) }) as unknown,
        }),
      );
    });

    it('ignore un accusé pour un message inconnu (essai depuis la console Meta)', async () => {
      await receive(statusNotification('delivered', { wamid: 'wamid.CONSOLE' }));
      expect(prisma.whatsappMessage.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('robot (unité 47)', () => {
    const tenant = { id: 'tenant-1', role: 'TENANT', whatsappPhone: SENDER_LOCAL, phone: null };

    it('un message ordinaire d’un locataire va au robot', async () => {
      prisma.user.findFirst.mockResolvedValue(tenant);
      prisma.user.updateMany.mockResolvedValue({ count: 0 });
      prisma.whatsappMessage.create.mockResolvedValue({ id: 'in-bot' });
      await receive(textNotification('payer'));
      expect(prisma.whatsappMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ inboundAction: 'BOT', body: 'payer' }) as unknown }),
      );
      expect(events.emit).toHaveBeenCalledWith(WHATSAPP_INBOUND_RECEIVED, { messageId: 'in-bot' });
    });

    it('un propriétaire qui écrit : pas de robot', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...tenant, role: 'OWNER' });
      prisma.user.updateMany.mockResolvedValue({ count: 0 });
      await receive(textNotification('payer'));
      expect(prisma.whatsappMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ inboundAction: null }) as unknown }),
      );
    });

    it('STOP ne va jamais au robot (même déjà arrêté)', async () => {
      prisma.user.findFirst.mockResolvedValue(tenant);
      prisma.user.updateMany.mockResolvedValue({ count: 0 });
      applyConsent.mockResolvedValue({ decision: { kind: 'unchanged', reason: 'ALREADY_IN_STATE' }, previous: 'STOPPED', eventId: null });
      await receive(textNotification('STOP'));
      expect(prisma.whatsappMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ inboundAction: null }) as unknown }),
      );
    });

    it('un code à 6 chiffres n’est JAMAIS gardé en clair : seulement son empreinte', async () => {
      prisma.user.findFirst.mockResolvedValue(tenant);
      prisma.user.updateMany.mockResolvedValue({ count: 0 });
      // Une vraie empreinte HMAC ne laisse rien deviner du code.
      tokens.pinDigest.mockReturnValueOnce('9f2c4e7a');
      await receive(textNotification(' 583920 '));
      expect(tokens.pinDigest).toHaveBeenCalledWith('583920');
      const [args] = prisma.whatsappMessage.create.mock.calls[0] as [{ data: Record<string, unknown> }];
      expect(args.data['body']).toBeNull();
      expect(args.data['payload']).toEqual({ pinDigest: '9f2c4e7a' });
      expect(JSON.stringify(args.data)).not.toContain('583920');
    });

    it('clé du code absente : le code n’est pas gardé non plus', async () => {
      prisma.user.findFirst.mockResolvedValue(tenant);
      prisma.user.updateMany.mockResolvedValue({ count: 0 });
      tokens.pinDigest.mockImplementation(() => {
        throw new Error('clé absente');
      });
      await receive(textNotification('583920'));
      const [args] = prisma.whatsappMessage.create.mock.calls[0] as [{ data: Record<string, unknown> }];
      expect(args.data['body']).toBeNull();
      expect(args.data['payload']).toEqual({ pinDigest: null });
    });

    it('numéro inconnu qui envoie 6 chiffres : rien n’est gardé, pas d’empreinte', async () => {
      await receive(textNotification('583920'));
      expect(tokens.pinDigest).not.toHaveBeenCalled();
      const [args] = prisma.whatsappMessage.create.mock.calls[0] as [{ data: Record<string, unknown> }];
      expect(args.data['body']).toBeNull();
    });
  });

  describe('messages reçus', () => {
    const tenant = { id: 'tenant-1', whatsappPhone: SENDER_LOCAL, phone: null };

    it('tout message d’un locataire connu vérifie son numéro, sans donner d’accord (unité 45)', async () => {
      prisma.user.findFirst.mockResolvedValue(tenant);
      await receive(textNotification('bjr'));
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'tenant-1', OR: [{ whatsappVerifiedPhone: null }, { whatsappVerifiedPhone: { not: SENDER_LOCAL } }] },
        data: { whatsappVerifiedPhone: SENDER_LOCAL, whatsappPhoneVerifiedAt: new Date(1791800100 * 1000) },
      });
      expect(applyConsent).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('accord déjà donné dans l’espace : le message qui vérifie le numéro déclenche la bienvenue (/review unité 45)', async () => {
      prisma.user.findFirst.mockResolvedValue(tenant);
      // findUnique sert aussi de source simulée pour la recherche par
      // numéro dédié : ici, l'expéditeur est trouvé par le numéro principal.
      prisma.user.findUnique.mockImplementation((args?: { select?: { whatsappConsent?: boolean } }) =>
        Promise.resolve(args?.select?.whatsappConsent ? { whatsappConsent: 'ACCEPTED' } : null),
      );
      prisma.whatsappMessage.create.mockResolvedValue({ id: 'in-welcome' });
      await receive(textNotification('bjr'));
      expect(prisma.whatsappMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ inboundAction: 'CONSENT_WELCOME' }) as unknown }),
      );
      expect(events.emit).toHaveBeenCalledWith(WHATSAPP_INBOUND_RECEIVED, { messageId: 'in-welcome' });
      // Badge « numéro vérifié » de la liste de l'agence.
      expect(consent.refreshAgencyLists).toHaveBeenCalledWith('tenant-1');
    });

    it('numéro déjà vérifié : ni bienvenue répétée, ni cache vidé', async () => {
      prisma.user.findFirst.mockResolvedValue(tenant);
      prisma.user.updateMany.mockResolvedValue({ count: 0 });
      await receive(textNotification('bjr'));
      expect(prisma.whatsappMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ inboundAction: null }) as unknown }),
      );
      expect(consent.refreshAgencyLists).not.toHaveBeenCalled();
    });

    it('numéro vérifié mais aucun accord : pas de bienvenue', async () => {
      prisma.user.findFirst.mockResolvedValue(tenant);
      prisma.user.findUnique.mockImplementation((args?: { select?: { whatsappConsent?: boolean } }) =>
        Promise.resolve(args?.select?.whatsappConsent ? { whatsappConsent: 'NOT_ASKED' } : null),
      );
      await receive(textNotification('bjr'));
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('un échec du vidage de cache ne fait jamais renvoyer la notification par Meta', async () => {
      prisma.user.findFirst.mockResolvedValue(tenant);
      consent.refreshAgencyLists.mockRejectedValue(new Error('cache'));
      await expect(receive(textNotification('bjr'))).resolves.toBeUndefined();
    });

    it('un numéro inconnu ne vérifie rien', async () => {
      await receive(textNotification('bjr'));
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('enregistre le texte d’un locataire connu, sans traitement en attente', async () => {
      prisma.user.findFirst.mockResolvedValue(tenant);
      await receive(textNotification('Bonjour, ma fenêtre est cassée'));

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { whatsappPhone: { in: expect.arrayContaining([SENDER_LOCAL]) as unknown } } }),
      );
      expect(prisma.whatsappMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'tenant-1',
          recipientPhone: SENDER_LOCAL,
          direction: 'INBOUND',
          status: 'RECEIVED',
          messageType: 'TEXT',
          wamid: 'wamid.IN-1',
          body: 'Bonjour, ma fenêtre est cassée',
        }) as unknown,
        select: { id: true },
      });
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('reconnaît un numéro enregistré avec l’indicatif (228… ou +228…) — /review unité 44', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...tenant, whatsappPhone: null, phone: `+228${SENDER_LOCAL}` });
      await receive(textNotification('bjr'));
      expect(prisma.user.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: {
            whatsappPhone: null,
            phone: { in: [SENDER_LOCAL, `228${SENDER_LOCAL}`, `+228${SENDER_LOCAL}`, `00228${SENDER_LOCAL}`] },
          },
        }),
      );
      expect(prisma.whatsappMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'tenant-1' }) as unknown }),
      );
    });

    it('deux comptes pour un même numéro : garde la forme à 8 chiffres', async () => {
      prisma.user.findMany.mockReset();
      prisma.user.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: 'ancien', whatsappPhone: null, phone: `+228${SENDER_LOCAL}` },
          { id: 'exact', whatsappPhone: null, phone: SENDER_LOCAL },
        ]);
      await receive(textNotification('bjr'));
      expect(prisma.whatsappMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'exact' }) as unknown }),
      );
    });

    it('priorise le numéro WhatsApp dédié sur le numéro principal', async () => {
      prisma.user.findUnique.mockResolvedValue(tenant);
      await receive(textNotification('bjr'));
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('numéro inconnu : ni texte ni contenu gardé, seulement le type', async () => {
      await receive(textNotification('Vous avez des appartements à louer ?'));
      expect(prisma.whatsappMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: null, body: null, payload: Prisma.DbNull, messageType: 'TEXT' }) as unknown,
        select: { id: true },
      });
    });

    it('numéro inconnu hors Togo : gardé en format international, jamais rapproché d’un compte', async () => {
      await receive(textNotification('hello', { from: '33612345678' }));
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.whatsappMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ recipientPhone: '33612345678', userId: null }) as unknown }),
      );
    });

    it('message renvoyé par Meta (même wamid) : ignoré sans erreur', async () => {
      prisma.whatsappMessage.create.mockRejectedValue(duplicateError());
      await expect(receive(textNotification('bjr'))).resolves.toBeUndefined();
    });

    it('erreur de base : remonte pour que Meta réessaie (500)', async () => {
      prisma.whatsappMessage.create.mockRejectedValue(new Error('connexion perdue'));
      await expect(receive(textNotification('bjr'))).rejects.toThrow('connexion perdue');
    });

    it('garde la référence d’une photo d’un locataire connu', async () => {
      prisma.user.findFirst.mockResolvedValue(tenant);
      await receive(messageNotification({ type: 'image', image: { id: 'media-1', mime_type: 'image/jpeg', caption: 'la fenêtre' } }));
      expect(prisma.whatsappMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            messageType: 'IMAGE',
            body: 'la fenêtre',
            payload: { mediaId: 'media-1', mimeType: 'image/jpeg' },
          }) as unknown,
        }),
      );
    });
  });

  describe('mots-clés du consentement (unités 44-45)', () => {
    const tenant = { id: 'tenant-1', whatsappPhone: SENDER_LOCAL, phone: null };
    const RECEIVED_AT = new Date(1791800100 * 1000);
    const changed = { decision: { kind: 'changed' }, previous: 'ACCEPTED', eventId: 'evt-1' };

    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue(tenant);
      prisma.whatsappMessage.create.mockResolvedValue({ id: 'in-kw' });
      applyConsent.mockResolvedValue(changed);
    });

    const commandSent = (): Record<string, unknown> => {
      const [, input] = applyConsent.mock.calls[0] as [unknown, Record<string, unknown>];
      return input;
    };

    it('STOP : arrêt par le rédacteur unique, dans la transaction du message, puis confirmation', async () => {
      await receive(textNotification('Stop.'));

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(commandSent()).toEqual({
        userId: 'tenant-1',
        command: { type: 'BOT_STOP', sourceAt: RECEIVED_AT },
        actorUserId: 'tenant-1',
        noticeVersion: undefined,
      });
      expect(prisma.whatsappMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ inboundAction: 'STOP_CONFIRMATION' }) as unknown }),
      );
      // Traitement lancé APRÈS l'enregistrement, hors de la requête.
      expect(events.emit).toHaveBeenCalledWith(WHATSAPP_INBOUND_RECEIVED, { messageId: 'in-kw' });
    });

    it('le numéro est vérifié AVANT le changement de consentement, dans la même transaction', async () => {
      const order: string[] = [];
      prisma.user.updateMany.mockImplementation(() => {
        order.push('vérification');
        return Promise.resolve({ count: 1 });
      });
      applyConsent.mockImplementation(() => {
        order.push('consentement');
        return Promise.resolve(changed);
      });
      await receive(textNotification('OUI'));
      expect(order).toEqual(['vérification', 'consentement']);
    });

    it('STOP d’un locataire enregistré avec +228… : bien arrêté (/review unité 44)', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'tenant-1', whatsappPhone: null, phone: `+228${SENDER_LOCAL}` });
      await receive(textNotification('STOP'));
      expect(commandSent()).toMatchObject({ userId: 'tenant-1', command: { type: 'BOT_STOP' } });
    });

    it('un second STOP (déjà arrêté) : pas de nouvelle confirmation', async () => {
      applyConsent.mockResolvedValue({ decision: { kind: 'unchanged', reason: 'ALREADY_IN_STATE' }, previous: 'STOPPED', eventId: null });
      await receive(textNotification('STOP'));
      expect(prisma.whatsappMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ inboundAction: null }) as unknown }),
      );
      expect(events.emit).not.toHaveBeenCalled();
    });

    it.each(['OUI', "OUI, j'accepte de recevoir les messages de service WARAH sur WhatsApp"])(
      '« %s » à une demande en cours : accord avec la version du texte, puis bienvenue',
      async (text) => {
        await receive(textNotification(text));
        expect(commandSent()).toEqual({
          userId: 'tenant-1',
          command: { type: 'BOT_CONFIRM', sourceAt: RECEIVED_AT },
          actorUserId: 'tenant-1',
          noticeVersion: 'consentement-v1',
        });
        expect(prisma.whatsappMessage.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ inboundAction: 'CONSENT_WELCOME' }) as unknown }),
        );
        expect(events.emit).toHaveBeenCalledWith(WHATSAPP_INBOUND_RECEIVED, { messageId: 'in-kw' });
      },
    );

    it.each(['NO_PENDING_REQUEST', 'REQUEST_EXPIRED', 'STALE'])(
      '« OUI » sans effet (%s) : le numéro est vérifié, mais ni accord ni réponse',
      async (reason) => {
        applyConsent.mockResolvedValue({ decision: { kind: 'unchanged', reason }, previous: 'NOT_ASKED', eventId: null });
        await receive(textNotification('oui'));
        expect(prisma.user.updateMany).toHaveBeenCalled();
        expect(prisma.whatsappMessage.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ inboundAction: null }) as unknown }),
        );
        expect(events.emit).not.toHaveBeenCalled();
      },
    );

    it('REPRENDRE après un arrêt : nouvel accord, puis confirmation de reprise', async () => {
      await receive(textNotification('Reprendre'));
      expect(commandSent()).toMatchObject({
        command: { type: 'BOT_RESUME', sourceAt: RECEIVED_AT },
        noticeVersion: 'consentement-v1',
      });
      expect(prisma.whatsappMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ inboundAction: 'RESUME_CONFIRMATION' }) as unknown }),
      );
    });

    it('message renvoyé par Meta : la transaction est annulée, rien n’est relancé', async () => {
      prisma.whatsappMessage.create.mockRejectedValue(duplicateError());
      await expect(receive(textNotification('STOP'))).resolves.toBeUndefined();
      expect(events.emit).not.toHaveBeenCalled();
    });

    it.each(['je paie demain, stop aux pénalités', 'oui je passe demain', 'je veux reprendre le paiement'])(
      'une phrase qui contient le mot (« %s ») ne change rien au consentement',
      async (text) => {
        await receive(textNotification(text));
        expect(applyConsent).not.toHaveBeenCalled();
        expect(events.emit).not.toHaveBeenCalled();
      },
    );

    it('un numéro inconnu qui écrit STOP ou OUI : rien à vérifier ni à changer', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await receive(textNotification('STOP'));
      await receive(textNotification('OUI', { wamid: 'wamid.IN-2' }));
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
      expect(applyConsent).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
    });
  });
});
