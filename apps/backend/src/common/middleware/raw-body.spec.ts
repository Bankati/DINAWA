import type { IncomingMessage } from 'node:http';
import { keepRawBodyForSignedWebhooks } from './raw-body';

function request(url: string): IncomingMessage & { rawBody?: Buffer } {
  return { url } as IncomingMessage & { rawBody?: Buffer };
}

describe('keepRawBodyForSignedWebhooks', () => {
  const buf = Buffer.from('{"object":"whatsapp_business_account"}');

  it('garde le corps brut du webhook WhatsApp', () => {
    const req = request('/api/webhooks/whatsapp');
    keepRawBodyForSignedWebhooks(req, undefined, buf);
    expect(req.rawBody).toBe(buf);
  });

  it('tolère une barre finale', () => {
    const req = request('/api/webhooks/whatsapp/');
    keepRawBodyForSignedWebhooks(req, undefined, buf);
    expect(req.rawBody).toBe(buf);
  });

  it('ignore la chaîne de requête', () => {
    const req = request('/api/webhooks/whatsapp?x=1');
    keepRawBodyForSignedWebhooks(req, undefined, buf);
    expect(req.rawBody).toBe(buf);
  });

  it.each(['/api/properties', '/api/webhooks/whatsapp-autre', '/api/payments/webhooks/paydunya'])(
    'ne garde rien pour %s',
    (url) => {
      const req = request(url);
      keepRawBodyForSignedWebhooks(req, undefined, buf);
      expect(req.rawBody).toBeUndefined();
    },
  );
});
