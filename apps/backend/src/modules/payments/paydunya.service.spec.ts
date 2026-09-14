import axios from 'axios';
import { PaydunyaService, PaydunyaError, fallbackCheckoutUrl } from './paydunya.service';

const post = jest.fn();
const get = jest.fn();

function mockPost(...args: unknown[]): unknown {
  return post(...args);
}
function mockGet(...args: unknown[]): unknown {
  return get(...args);
}

jest.mock('axios', () => ({
  create: jest.fn(() => ({ post: mockPost, get: mockGet })),
}));

function makeConfig(overrides: Record<string, string> = {}): { get: jest.Mock } {
  const values: Record<string, string> = {
    PAYDUNYA_MODE: 'test',
    PAYDUNYA_MASTER_KEY: 'master-1',
    PAYDUNYA_TEST_PUBLIC_KEY: 'pub-test',
    PAYDUNYA_TEST_PRIVATE_KEY: 'priv-test',
    PAYDUNYA_TEST_TOKEN: 'token-test',
    ...overrides,
  };
  return { get: jest.fn((key: string) => values[key]) };
}

describe('PaydunyaService', () => {
  beforeEach(() => {
    post.mockReset();
    get.mockReset();
  });

  it('est désactivé si une clé API manque', () => {
    const service = new PaydunyaService(makeConfig({ PAYDUNYA_TEST_TOKEN: '' }) as never);
    expect(service.isEnabled()).toBe(false);
  });

  it('est activé quand master/private/token du mode courant sont présents (clé publique non requise)', () => {
    const service = new PaydunyaService(makeConfig({ PAYDUNYA_TEST_PUBLIC_KEY: '' }) as never);
    expect(service.isEnabled()).toBe(true);
  });

  it("utilise l'hôte sandbox en mode test et l'hôte production en mode live (bug trouvé le 2026-09-11 — l'API tapait toujours sur l'hôte prod)", () => {
    new PaydunyaService(makeConfig({ PAYDUNYA_MODE: 'test' }) as never);
    const [[testArgs]] = (axios.create as jest.Mock).mock.calls.slice(-1) as [
      [{ baseURL: string }],
    ];
    expect(testArgs.baseURL).toBe('https://app.paydunya.com/sandbox-api/v1');

    new PaydunyaService(
      makeConfig({
        PAYDUNYA_MODE: 'live',
        PAYDUNYA_LIVE_PRIVATE_KEY: 'priv-live',
        PAYDUNYA_LIVE_TOKEN: 'token-live',
      }) as never,
    );
    const [[liveArgs]] = (axios.create as jest.Mock).mock.calls.slice(-1) as [
      [{ baseURL: string }],
    ];
    expect(liveArgs.baseURL).toBe('https://app.paydunya.com/api/v1');
  });

  it("n'envoie jamais PAYDUNYA-PUBLIC-KEY — non requis par ces endpoints (doc PayDunya, 2026-09-11)", () => {
    new PaydunyaService(makeConfig() as never);
    const [[{ headers }]] = (axios.create as jest.Mock).mock.calls.slice(-1) as [
      [{ headers: Record<string, unknown> }],
    ];
    expect(headers).not.toHaveProperty('PAYDUNYA-PUBLIC-KEY');
    expect(headers).toMatchObject({
      'PAYDUNYA-MASTER-KEY': 'master-1',
      'PAYDUNYA-PRIVATE-KEY': 'priv-test',
      'PAYDUNYA-TOKEN': 'token-test',
    });
  });

  it('mappe TMONEY/FLOOZ vers les codes opérateur PayDunya du Togo', () => {
    const service = new PaydunyaService(makeConfig() as never);
    expect(service.operatorCodeFor('TMONEY')).toBe('t-money-togo');
    expect(service.operatorCodeFor('FLOOZ')).toBe('moov-togo');
  });

  it("createInvoice utilise l'URL renvoyée par PayDunya (jamais reconstruite — sandbox vs prod)", async () => {
    post.mockResolvedValue({
      data: {
        response_code: '00',
        token: 'inv-abc',
        response_text: 'https://paydunya.com/sandbox-checkout/invoice/inv-abc',
      },
    });
    const service = new PaydunyaService(makeConfig() as never);

    const invoice = await service.createInvoice({
      amount: 55000,
      description: 'WARAH — test',
      paymentId: 'payment-1',
      callbackUrl: 'https://api.warah.tg/api/payments/webhooks/paydunya?paymentId=payment-1',
      returnUrl: 'https://warah.tg/ok',
      cancelUrl: 'https://warah.tg/cancel',
    });

    expect(invoice).toEqual({
      token: 'inv-abc',
      checkoutUrl: 'https://paydunya.com/sandbox-checkout/invoice/inv-abc',
    });
  });

  it("createInvoice retombe sur l'URL best-effort si PayDunya n'en renvoie aucune", async () => {
    post.mockResolvedValue({ data: { response_code: '00', token: 'inv-abc' } });
    const service = new PaydunyaService(makeConfig() as never);

    const invoice = await service.createInvoice({
      amount: 55000,
      description: 'WARAH — test',
      paymentId: 'payment-1',
      callbackUrl: 'https://api.warah.tg/api/payments/webhooks/paydunya?paymentId=payment-1',
      returnUrl: 'https://warah.tg/ok',
      cancelUrl: 'https://warah.tg/cancel',
    });

    expect(invoice.checkoutUrl).toBe('https://paydunya.com/checkout/invoice/inv-abc');
  });

  it('createInvoice lève PaydunyaError si response_code ≠ "00"', async () => {
    post.mockResolvedValue({ data: { response_code: '01', response_text: 'Compte invalide' } });
    const service = new PaydunyaService(makeConfig() as never);

    await expect(
      service.createInvoice({
        amount: 55000,
        description: 'WARAH — test',
        paymentId: 'payment-1',
        callbackUrl: 'https://api.warah.tg/api/payments/webhooks/paydunya?paymentId=payment-1',
        returnUrl: 'https://warah.tg/ok',
        cancelUrl: 'https://warah.tg/cancel',
      }),
    ).rejects.toThrow(PaydunyaError);
  });

  it("createInvoice n'effectue qu'un seul essai — jamais de retry (opération non idempotente, /review 2026-09-07)", async () => {
    post.mockRejectedValue(new Error('ECONNRESET'));
    const service = new PaydunyaService(makeConfig() as never);

    await expect(
      service.createInvoice({
        amount: 55000,
        description: 'WARAH — test',
        paymentId: 'payment-1',
        callbackUrl: 'https://api.warah.tg/api/payments/webhooks/paydunya?paymentId=payment-1',
        returnUrl: 'https://warah.tg/ok',
        cancelUrl: 'https://warah.tg/cancel',
      }),
    ).rejects.toThrow('ECONNRESET');
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('fallbackCheckoutUrl construit une URL de production best-effort', () => {
    expect(fallbackCheckoutUrl('inv-abc')).toBe('https://paydunya.com/checkout/invoice/inv-abc');
  });

  it('createInvoice lève PaydunyaError sans appeler PayDunya si les clés manquent', async () => {
    const service = new PaydunyaService(makeConfig({ PAYDUNYA_TEST_TOKEN: '' }) as never);

    await expect(
      service.createInvoice({
        amount: 55000,
        description: 'WARAH — test',
        paymentId: 'payment-1',
        callbackUrl: 'https://api.warah.tg/api/payments/webhooks/paydunya?paymentId=payment-1',
        returnUrl: 'https://warah.tg/ok',
        cancelUrl: 'https://warah.tg/cancel',
      }),
    ).rejects.toThrow(PaydunyaError);
    expect(post).not.toHaveBeenCalled();
  });

  it.each([
    ['completed', 'completed'],
    ['cancelled', 'cancelled'],
    ['failed', 'failed'],
    ['waiting', 'pending'],
  ])('confirmInvoiceStatus mappe le statut PayDunya "%s" en "%s"', async (raw, expected) => {
    get.mockResolvedValue({ data: { status: raw } });
    const service = new PaydunyaService(makeConfig() as never);

    await expect(service.confirmInvoiceStatus('inv-abc')).resolves.toEqual({
      status: expected,
      amount: null,
    });
  });

  it('confirmInvoiceStatus remonte invoice.total_amount — jamais confiance dans notre propre montant attendu (/architect 2026-09-14, génération de quittance)', async () => {
    get.mockResolvedValue({ data: { status: 'completed', invoice: { total_amount: 55000 } } });
    const service = new PaydunyaService(makeConfig() as never);

    await expect(service.confirmInvoiceStatus('inv-abc')).resolves.toEqual({
      status: 'completed',
      amount: 55000,
    });
  });
});
