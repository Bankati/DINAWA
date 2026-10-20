import { Prisma } from '@prisma/client';
import { createHmac } from 'node:crypto';
import { WhatsappConsentService } from '../whatsapp-consent/whatsapp-consent.service';
import { WhatsappWebhookService } from './whatsapp-webhook.service';
import { WHATSAPP_INBOUND_RECEIVED } from './whatsapp-inbound.events';
import { PHONE_NUMBER_ID, SENDER_LOCAL, messageNotification } from './__fixtures__/meta-notifications';

// Parcours complets de bout en bout (/review unité 45) : vrai webhook, vrai
// service de consentement, vrai rédacteur (applyConsentCommand), sur une
// petite base en mémoire. Les autres tests vérifient chaque pièce seule ;
// ici, un vrai « OUI » part de la requête Meta et on regarde l'état final.

const APP_SECRET = 'secret-app-test';

type Row = Record<string, unknown> & { id: string };

function matches(row: Row, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (key === 'OR') return (expected as Record<string, unknown>[]).some((cond) => matches(row, cond));
    const actual = row[key];
    if (expected instanceof Date) return actual instanceof Date && actual.getTime() === expected.getTime();
    if (expected !== null && typeof expected === 'object') {
      const op = expected as { in?: unknown[]; not?: unknown };
      if (op.in) return op.in.includes(actual);
      if ('not' in op) {
        if (op.not !== null && typeof op.not === 'object') return !matches(row, { [key]: op.not });
        return actual !== null && actual !== undefined && actual !== op.not;
      }
    }
    return actual === expected;
  });
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- type déduit du faux client
function fakeDb() {
  const users: Row[] = [];
  const messages: Row[] = [];
  const events: Row[] = [];
  let seq = 0;
  const findUser = (id: string): Row | null => users.find((u) => u.id === id) ?? null;
  const prisma = {
    users,
    messages,
    events,
    user: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) => Promise.resolve(findUser(where.id))),
      findUniqueOrThrow: jest.fn(({ where }: { where: { id: string } }) => Promise.resolve(findUser(where.id))),
      findFirst: jest.fn(({ where }: { where: Record<string, unknown> }) => {
        const { id, ...rest } = where as { id: { not: string } };
        return Promise.resolve(users.find((u) => u.id !== id.not && matches(u, rest)) ?? null);
      }),
      findMany: jest.fn(({ where }: { where: Record<string, unknown> }) => Promise.resolve(users.filter((u) => matches(u, where)))),
      update: jest.fn(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const user = findUser(where.id);
        if (!user) return Promise.reject(new Error('introuvable'));
        Object.assign(user, data);
        return Promise.resolve(user);
      }),
      updateMany: jest.fn(({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const found = users.filter((u) => matches(u, where));
        found.forEach((u) => Object.assign(u, data));
        return Promise.resolve({ count: found.length });
      }),
    },
    whatsappMessage: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `msg-${++seq}`, ...data };
        messages.push(row);
        return Promise.resolve({ id: row.id });
      }),
    },
    whatsappConsentEvent: {
      create: jest.fn(({ data }: { data: Row }) => {
        events.push(data);
        return Promise.resolve(data);
      }),
    },
    tenantProfile: {
      findUnique: jest.fn().mockResolvedValue({ invitedByUserId: 'owner-1' }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    lease: { findFirst: jest.fn().mockResolvedValue({ id: 'lease-1', property: { id: 'prop-1', ownerId: 'owner-1', mandates: [] } }) },
    mandate: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  return Object.assign(prisma, {
    $transaction: jest.fn((work: (tx: unknown) => Promise<unknown>) => work(prisma)),
  });
}

// Message texte reçu « offsetSeconds » après maintenant (heure Meta).
function metaText(text: string, wamid: string, offsetSeconds: number): Record<string, unknown> {
  return messageNotification({
    id: wamid,
    timestamp: String(Math.floor(Date.now() / 1000) + offsetSeconds),
    type: 'text',
    text: { body: text },
  });
}

describe('Parcours consentement WhatsApp de bout en bout (unité 45)', () => {
  let db: ReturnType<typeof fakeDb>;
  let events: { emit: jest.Mock };
  let consent: WhatsappConsentService;
  let webhook: WhatsappWebhookService;
  let tenant: Row;
  const owner = { id: 'owner-1', role: 'OWNER' } as never;
  const tenantUser = { id: 'tenant-1', role: 'TENANT' } as never;

  beforeEach(() => {
    db = fakeDb();
    tenant = {
      id: 'tenant-1',
      phone: `+228${SENDER_LOCAL}`,
      whatsappPhone: null,
      whatsappConsent: 'NOT_ASKED',
      whatsappConsentAt: null,
      whatsappConsentById: null,
      whatsappStoppedAt: null,
      whatsappConsentChangedAt: null,
      whatsappConsentRequestId: null,
      whatsappConsentRequestExpiresAt: null,
      whatsappVerifiedPhone: null,
      whatsappPhoneVerifiedAt: null,
      tenantProfile: { whatsappPinHash: null },
    };
    db.users.push(tenant);
    events = { emit: jest.fn() };
    const config = {
      get: (key: string): string | undefined =>
        ({ WHATSAPP_APP_SECRET: APP_SECRET, WHATSAPP_PHONE_NUMBER_ID: PHONE_NUMBER_ID, WHATSAPP_BUSINESS_NUMBER: '22890000000' })[key],
    };
    consent = new WhatsappConsentService(
      db as never,
      { generatePin: jest.fn(), hashPin: jest.fn() } as never,
      config as never,
      { invalidateUser: jest.fn() } as never,
    );
    webhook = new WhatsappWebhookService(db as never, config as never, events as never, consent);
  });

  function receive(body: Record<string, unknown>): Promise<void> {
    const raw = Buffer.from(JSON.stringify(body));
    const signature = `sha256=${createHmac('sha256', APP_SECRET).update(raw).digest('hex')}`;
    return webhook.handleNotification(raw, signature, body);
  }

  const lastAction = (): unknown => db.messages[db.messages.length - 1]['inboundAction'];

  it('agence → QR code → « OUI » pré-rempli : actif, numéro vérifié, preuve reliée à la demande, bienvenue', async () => {
    await consent.requestByAgency(owner, 'tenant-1', { whatsappPhone: SENDER_LOCAL, collectionMethod: 'IN_PERSON', attestation: true });
    expect(tenant['whatsappConsent']).toBe('PENDING');
    const requestId = tenant['whatsappConsentRequestId'];

    await receive(metaText("OUI, j'accepte de recevoir les messages de service WARAH sur WhatsApp", 'wamid.F-1', 60));

    expect(tenant).toMatchObject({ whatsappConsent: 'ACCEPTED', whatsappVerifiedPhone: SENDER_LOCAL, whatsappConsentRequestId: null });
    expect(db.events[db.events.length - 1]).toMatchObject({ source: 'BOT', newConsent: 'ACCEPTED', requestId, actorUserId: 'tenant-1' });
    expect(lastAction()).toBe('CONSENT_WELCOME');
    expect(events.emit).toHaveBeenCalledWith(WHATSAPP_INBOUND_RECEIVED, { messageId: db.messages[0].id });
    await expect(consent.getForAgency(owner, 'tenant-1')).resolves.toMatchObject({ consent: 'ACCEPTED', phoneVerified: true });
  });

  it('« OUI » après l’expiration de la demande : numéro vérifié, mais toujours en attente', async () => {
    await consent.requestByAgency(owner, 'tenant-1', { whatsappPhone: SENDER_LOCAL, collectionMethod: 'PHONE', attestation: true });
    await receive(metaText('oui', 'wamid.F-2', 8 * 24 * 3600));
    expect(tenant).toMatchObject({ whatsappConsent: 'PENDING', whatsappVerifiedPhone: SENDER_LOCAL });
    expect(lastAction()).toBeNull();
  });

  it('activé dans l’espace puis premier message : bienvenue au moment de la vérification', async () => {
    await consent.setConsentByTenant(tenantUser, { action: 'ACCEPT' });
    expect(tenant).toMatchObject({ whatsappConsent: 'ACCEPTED', whatsappVerifiedPhone: null });

    await receive(metaText('OUI', 'wamid.F-3', 60));
    expect(tenant['whatsappVerifiedPhone']).toBe(SENDER_LOCAL);
    expect(lastAction()).toBe('CONSENT_WELCOME');

    // Message suivant : déjà vérifié, pas de seconde bienvenue.
    await receive(metaText('merci', 'wamid.F-4', 120));
    expect(lastAction()).toBeNull();
  });

  it('STOP, puis un vieux REPRENDRE livré en retard : reste arrêté ; un nouveau REPRENDRE réactive', async () => {
    await consent.setConsentByTenant(tenantUser, { action: 'ACCEPT' });
    await receive(metaText('STOP', 'wamid.F-5', 120));
    expect(tenant['whatsappConsent']).toBe('STOPPED');
    expect(lastAction()).toBe('STOP_CONFIRMATION');

    await receive(metaText('REPRENDRE', 'wamid.F-6', 60)); // envoyé AVANT le STOP
    expect(tenant['whatsappConsent']).toBe('STOPPED');
    expect(lastAction()).toBeNull();

    await receive(metaText('REPRENDRE', 'wamid.F-7', 180));
    expect(tenant['whatsappConsent']).toBe('ACCEPTED');
    expect(lastAction()).toBe('RESUME_CONFIRMATION');
  });

  it('l’agence ne peut pas lever un arrêt, même après un « OUI » du locataire', async () => {
    await consent.refusalByAgency(owner, 'tenant-1', { collectionMethod: 'IN_PERSON' });
    await expect(
      consent.requestByAgency(owner, 'tenant-1', { whatsappPhone: SENDER_LOCAL, collectionMethod: 'IN_PERSON', attestation: true }),
    ).rejects.toThrow('lui seul peut les réactiver');
    await receive(metaText('OUI', 'wamid.F-8', 60));
    expect(tenant['whatsappConsent']).toBe('STOPPED');
  });

  it('même notification renvoyée par Meta : un seul message, un seul changement', async () => {
    await consent.setConsentByTenant(tenantUser, { action: 'ACCEPT' });
    const stop = metaText('STOP', 'wamid.F-9', 60);
    await receive(stop);
    const eventsAfterFirst = db.events.length;
    // Le wamid unique fait échouer le second enregistrement (P2002).
    db.whatsappMessage.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' }),
    );
    await expect(receive(stop)).resolves.toBeUndefined();
    expect(db.messages).toHaveLength(1);
    expect(db.events.length).toBe(eventsAfterFirst);
    expect(events.emit).toHaveBeenCalledTimes(1);
  });
});
