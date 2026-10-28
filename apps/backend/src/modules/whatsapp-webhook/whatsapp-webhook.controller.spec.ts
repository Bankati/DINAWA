import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as bodyParser from 'body-parser';
import { createHmac } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { SKIP_AUDIT_LOG_KEY } from '../../common/decorators/skip-audit-log.decorator';
import { keepRawBodyForSignedWebhooks } from '../../common/middleware/raw-body';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';
import { WhatsappWebhookService } from './whatsapp-webhook.service';
import { WhatsappConsentService } from '../whatsapp-consent/whatsapp-consent.service';
import { TokenService } from '../auth/token.service';
import { PHONE_NUMBER_ID } from './__fixtures__/meta-notifications';

const APP_SECRET = 'secret-app-test';

// Le webhook monté comme en production (préfixe /api, bodyParser avec le
// corps brut) : la signature doit porter sur les octets EXACTS reçus.
// Vraies requêtes HTTP sur une application Nest démarrée : pendant la suite
// complète, la machine chargée dépasse les 5 s par défaut de Jest (échecs
// constatés le 2026-10-16, 7/7 en isolé). Délai explicite plutôt qu'un test
// qui échoue au hasard.
jest.setTimeout(30_000);

describe('WhatsappWebhookController', () => {
  describe('protections déclarées', () => {
    const handler = (name: 'handshake' | 'receive'): object =>
      Object.getOwnPropertyDescriptor(WhatsappWebhookController.prototype, name)?.value as object;

    it.each([['handshake' as const], ['receive' as const]])('%s est public et hors limite de débit', (name) => {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler(name))).toBe(true);
      // @SkipThrottle() pose une clé par limiteur : `THROTTLER:SKIP` + nom.
      // Les limiteurs du lien de paiement (unité 43) s'excluent d'eux-mêmes
      // hors des routes @PayLinkThrottled (skipIf).
      expect(Reflect.getMetadata('THROTTLER:SKIPdefault', WhatsappWebhookController)).toBe(true);
    });

    it('la réception est exclue de la table d’audit', () => {
      expect(Reflect.getMetadata(SKIP_AUDIT_LOG_KEY, handler('receive'))).toBe(true);
    });
  });

  describe('requêtes HTTP réelles', () => {
    let app: INestApplication;
    let server: Server;
    const prisma = {
      whatsappMessage: { create: jest.fn().mockResolvedValue({ id: 'in-1' }), findFirst: jest.fn().mockResolvedValue(null) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [WhatsappWebhookController],
        providers: [
          WhatsappWebhookService,
          { provide: PrismaService, useValue: prisma },
          { provide: EventEmitter2, useValue: { emit: jest.fn() } },
          { provide: WhatsappConsentService, useValue: { refreshAgencyLists: jest.fn().mockResolvedValue(undefined) } },
          { provide: TokenService, useValue: { pinDigest: jest.fn((pin: string) => `empreinte-${pin}`) } },
          {
            provide: ConfigService,
            useValue: {
              get: (key: string): string | undefined =>
                ({ WHATSAPP_APP_SECRET: APP_SECRET, WHATSAPP_VERIFY_TOKEN: 'jeton', WHATSAPP_PHONE_NUMBER_ID: PHONE_NUMBER_ID })[key],
            },
          },
        ],
      }).compile();
      const expressApp = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
      expressApp.use(bodyParser.json({ limit: '1mb', verify: keepRawBodyForSignedWebhooks }));
      expressApp.setGlobalPrefix('api');
      app = expressApp;
      await app.init();
      server = app.getHttpServer() as Server;
    });

    afterAll(async () => {
      await app.close();
    });

    // JSON volontairement mis en forme avec des espaces : un JSON ré-encodé
    // n'aurait pas les mêmes octets, la signature échouerait.
    const raw =
      '{ "object": "whatsapp_business_account", "entry": [ { "changes": [ { "field": "messages", ' +
      `"value": { "metadata": { "phone_number_id": "${PHONE_NUMBER_ID}" }, "messages": [ ` +
      '{ "from": "22890000001", "id": "wamid.HTTP-1", "timestamp": "1791800100", "type": "text", "text": { "body": "bjr" } } ] } } ] } ] }';
    const signature = `sha256=${createHmac('sha256', APP_SECRET).update(raw).digest('hex')}`;

    it('accepte une notification signée sur ses octets exacts (200)', async () => {
      await request(server)
        .post('/api/webhooks/whatsapp')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', signature)
        .send(raw)
        .expect(200, { received: true });
      expect(prisma.whatsappMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ wamid: 'wamid.HTTP-1' }) as unknown }),
      );
    });

    it('refuse une signature fausse (401)', async () => {
      await request(server)
        .post('/api/webhooks/whatsapp')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', 'sha256=' + 'a'.repeat(64))
        .send(raw)
        .expect(401);
    });

    it('répond au challenge de l’abonnement en texte brut', async () => {
      const res = await request(server)
        .get('/api/webhooks/whatsapp')
        .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'jeton', 'hub.challenge': '987654' })
        .expect(200);
      expect(res.text).toBe('987654');
      expect(res.headers['content-type']).toContain('text/plain');
    });

    it('refuse un mauvais jeton de vérification (403)', async () => {
      await request(server)
        .get('/api/webhooks/whatsapp')
        .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'faux', 'hub.challenge': '1' })
        .expect(403);
    });
  });
});
