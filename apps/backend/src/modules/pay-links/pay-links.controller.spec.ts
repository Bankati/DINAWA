import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Server } from 'node:http';
import request from 'supertest';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { PAY_LINK_THROTTLERS } from '../../common/throttle/pay-link-throttlers';
import { PayLinksController } from './pay-links.controller';
import { PayLinksService } from './pay-links.service';

// Le portier du lien de paiement public (unité 43) : présence des
// protections sur chaque route, puis comportement réel sur un serveur de test
// (seuils, requêtes simultanées, adresse forgée, autres routes intactes).

// Route quelconque hors lien de paiement : les limites dédiées ne doivent
// jamais s'y appliquer (seule la limite générale de 100/min compte).
@Controller('autre')
class OtherController {
  @Get()
  ping(): { ok: true } {
    return { ok: true };
  }
}

describe('PayLinksController', () => {
  describe('protections déclarées', () => {
    // Méthode lue via son descripteur (cible de Reflect.getMetadata, jamais appelée).
    const handler = (name: 'getView' | 'initiate'): object =>
      Object.getOwnPropertyDescriptor(PayLinksController.prototype, name)?.value as object;

    it.each([
      ['getView' as const],
      ['initiate' as const],
    ])('%s est public et soumis au portier du lien de paiement', (name) => {
      const method = handler(name);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, method)).toBe(true);
      expect(Reflect.getMetadata('payLinkThrottled', method)).toBe(true);
    });

    it('resserre les limites sur le lancement du paiement (20 par adresse, 5 par lien)', () => {
      expect(Reflect.getMetadata('THROTTLER:LIMITpayLinkIp', handler('initiate'))).toBe(20);
      expect(Reflect.getMetadata('THROTTLER:LIMITpayLinkToken', handler('initiate'))).toBe(5);
    });

    it('ne réduit plus la limite générale de la route (plus de surcharge de « default »)', () => {
      expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler('getView'))).toBeUndefined();
      expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler('initiate'))).toBeUndefined();
    });
  });

  describe('comportement réel du portier', () => {
    let app: INestApplication;
    let server: Server;
    const payLinks = {
      getView: jest.fn().mockResolvedValue({ status: 'PAYABLE' }),
      initiate: jest.fn().mockResolvedValue({ checkoutUrl: 'https://paydunya/checkout' }),
    };

    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }, ...PAY_LINK_THROTTLERS]),
        ],
        controllers: [PayLinksController, OtherController],
        providers: [
          { provide: PayLinksService, useValue: payLinks },
          { provide: APP_GUARD, useClass: ThrottlerGuard },
        ],
      }).compile();
      const expressApp = moduleRef.createNestApplication<NestExpressApplication>();
      // Comme en production derrière Railway (TRUST_PROXY_HOPS=1) : seule
      // l'adresse ajoutée par le dernier proxy compte.
      expressApp.set('trust proxy', 1);
      app = expressApp;
      await app.init();
      server = app.getHttpServer() as Server;
    });

    afterEach(async () => {
      await app.close();
    });

    // Ces tests envoient jusqu'à 70 vraies requêtes HTTP : délai explicite,
    // la limite Jest de 5 s est dépassée sur une machine chargée.
    const MANY_REQUESTS_TIMEOUT_MS = 60_000;

    const view = (token: string, ip = '10.0.0.1'): request.Test =>
      request(server).get(`/pay-links/${token}`).set('X-Forwarded-For', ip);
    const pay = (token: string, ip = '10.0.0.1'): request.Test =>
      request(server)
        .post(`/pay-links/${token}/initiate`)
        .set('X-Forwarded-For', ip)
        .send({ paymentMethod: 'FLOOZ' });

    it('accepte 10 ouvertures d’un même lien par adresse, refuse la 11e (429)', async () => {
      for (let i = 0; i < 10; i++) await view('lien-a').expect(200);
      await view('lien-a').expect(429);
    });

    it('accepte 60 ouvertures par adresse sur des liens différents, refuse la 61e', async () => {
      for (let i = 0; i < 60; i++) await view(`lien-${i}`).expect(200);
      await view('lien-61').expect(429);
    }, MANY_REQUESTS_TIMEOUT_MS);

    it('limite le lancement du paiement à 5 par lien et 20 par adresse', async () => {
      for (let i = 0; i < 5; i++) await pay('lien-a').expect(200);
      await pay('lien-a').expect(429);

      // La requête refusée compte aussi dans la limite par adresse : 6 déjà
      // comptées, il en reste 14 avant la 21e (refusée).
      for (let i = 0; i < 14; i++) await pay(`lien-${i}`).expect(200);
      await pay('lien-x').expect(429);
    }, MANY_REQUESTS_TIMEOUT_MS);

    it('applique la limite exactement sous des requêtes simultanées', async () => {
      const responses = await Promise.all(Array.from({ length: 15 }, () => view('lien-a')));
      const codes = responses.map((res) => res.status);
      expect(codes.filter((code) => code === 200)).toHaveLength(10);
      expect(codes.filter((code) => code === 429)).toHaveLength(5);
    });

    it('compte séparément deux clients distincts', async () => {
      for (let i = 0; i < 10; i++) await view('lien-a', '10.0.0.1').expect(200);
      await view('lien-a', '10.0.0.1').expect(429);
      await view('lien-a', '10.0.0.2').expect(200);
    });

    it('ignore une adresse forgée par le client devant celle ajoutée par le proxy', async () => {
      for (let i = 0; i < 10; i++) {
        await view('lien-a', `203.0.113.${i}, 10.0.0.1`).expect(200);
      }
      await view('lien-a', '198.51.100.7, 10.0.0.1').expect(429);
    });

    it('n’applique pas les limites du lien de paiement aux autres routes', async () => {
      for (let i = 0; i < 70; i++) {
        await request(server).get('/autre').set('X-Forwarded-For', '10.0.0.1').expect(200);
      }
    }, MANY_REQUESTS_TIMEOUT_MS);
  });
});
