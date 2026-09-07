import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { withTimeout } from '../../common/utils/with-timeout';

const PAYDUNYA_BASE_URL = 'https://app.paydunya.com/api/v1';
const CALL_TIMEOUT_MS = 15_000;

// Correspondance entre notre enum interne (ce que voient nos utilisateurs —
// TMONEY/FLOOZ, voir build-plan.md unité 17) et le code opérateur PayDunya.
// Flooz a été rebrandé Moov Money côté opérateur télécom togolais — c'est le
// même service que nos utilisateurs connaissent sous le nom Flooz, PayDunya
// l'expose simplement sous le code `moov-togo` (voir /architect 2026-09-07,
// doc PayDunya reçue du développeur — section "Opérateurs Mobile Money").
const OPERATOR_CODE: Record<'TMONEY' | 'FLOOZ', string> = {
  TMONEY: 't-money-togo',
  FLOOZ: 'moov-togo',
};

export type PaydunyaInvoice = {
  token: string;
  checkoutUrl: string;
};

export type PaydunyaInvoiceStatus = 'pending' | 'completed' | 'cancelled' | 'failed';

// Erreur métier PayDunya (facture refusée, compte marchand mal configuré,
// etc.) — distincte d'une erreur réseau/timeout (retryée avant d'atteindre
// ce point, voir postWithRetry ci-dessous).
export class PaydunyaError extends Error {}

// Wrapper sur l'API PayDunya "Checkout Invoice" (voir /architect 2026-09-07).
// Le flux Softpay (charge directe par opérateur, sans redirection) existe
// chez PayDunya mais n'est pas utilisé ici : sa forme exacte de requête n'a
// pas été confirmée dans la doc reçue, contrairement à Checkout Invoice +
// IPN qui sont documentés avec certitude. Le locataire est donc redirigé
// vers la page de paiement hébergée par PayDunya (checkoutUrl) plutôt que
// de payer directement dans l'app — à revisiter si Softpay est confirmé.
@Injectable()
export class PaydunyaService {
  private readonly logger = new Logger(PaydunyaService.name);
  private readonly http: AxiosInstance;
  private readonly enabled: boolean;

  constructor(config: ConfigService) {
    const mode = config.get<string>('PAYDUNYA_MODE') ?? 'test';
    const masterKey = config.get<string>('PAYDUNYA_MASTER_KEY') ?? '';
    const publicKey =
      config.get<string>(
        mode === 'live' ? 'PAYDUNYA_LIVE_PUBLIC_KEY' : 'PAYDUNYA_TEST_PUBLIC_KEY',
      ) ?? '';
    const privateKey =
      config.get<string>(
        mode === 'live' ? 'PAYDUNYA_LIVE_PRIVATE_KEY' : 'PAYDUNYA_TEST_PRIVATE_KEY',
      ) ?? '';
    const token =
      config.get<string>(mode === 'live' ? 'PAYDUNYA_LIVE_TOKEN' : 'PAYDUNYA_TEST_TOKEN') ?? '';

    this.enabled = Boolean(masterKey && publicKey && privateKey && token);

    this.http = axios.create({
      baseURL: PAYDUNYA_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': masterKey,
        'PAYDUNYA-PRIVATE-KEY': privateKey,
        'PAYDUNYA-PUBLIC-KEY': publicKey,
        'PAYDUNYA-TOKEN': token,
      },
    });

    if (!this.enabled) {
      this.logger.warn(
        '[paydunya] clés API manquantes — le paiement mobile money est indisponible (attendu en dev sans compte marchand)',
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  operatorCodeFor(method: 'TMONEY' | 'FLOOZ'): string {
    return OPERATOR_CODE[method];
  }

  // Crée une facture PayDunya — le locataire complète le paiement sur
  // checkoutUrl (choix de l'opérateur mobile money inclus dans leur
  // interface). Le Payment reste PENDING côté WARAH jusqu'à confirmation
  // (webhook IPN ou cron de réconciliation, voir PaymentsService).
  async createInvoice(params: {
    amount: number;
    description: string;
    paymentId: string;
    callbackUrl: string;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<PaydunyaInvoice> {
    if (!this.enabled) {
      throw new PaydunyaError('PayDunya non configuré (clés API manquantes)');
    }

    const data = await this.postWithRetry<{
      response_code?: string;
      token?: string;
      response_text?: string;
    }>('/checkout-invoice/create', {
      invoice: {
        total_amount: params.amount,
        description: params.description,
      },
      store: { name: 'WARAH' },
      actions: {
        callback_url: params.callbackUrl,
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
      },
      custom_data: { paymentId: params.paymentId },
    });

    if (data.response_code !== '00' || !data.token) {
      this.logger.error(`[paydunya/create-invoice] échec — ${JSON.stringify(data)}`);
      throw new PaydunyaError(data.response_text ?? 'Échec de création de la facture PayDunya');
    }

    return {
      token: data.token,
      checkoutUrl: `https://paydunya.com/checkout/invoice/${data.token}`,
    };
  }

  // Revérifie le statut réel d'une facture auprès de PayDunya — jamais fait
  // confiance au payload IPN entrant seul (celui-ci ne sert qu'à savoir QUAND
  // revérifier, pas à quoi). Même mécanisme réutilisé par le cron de
  // réconciliation (voir PaymentsService.reconcilePaydunyaPayment()).
  async confirmInvoiceStatus(token: string): Promise<PaydunyaInvoiceStatus> {
    if (!this.enabled) {
      throw new PaydunyaError('PayDunya non configuré (clés API manquantes)');
    }

    const data = await this.getWithRetry<{ status?: string }>(`/checkout-invoice/confirm/${token}`);

    if (data.status === 'completed') return 'completed';
    if (data.status === 'cancelled') return 'cancelled';
    if (data.status === 'failed') return 'failed';
    return 'pending';
  }

  // Retry uniquement sur les échecs réseau/timeout réels (axios ne throw que
  // dans ces cas ou sur un statut HTTP non-2xx) — jamais sur un refus métier
  // PayDunya, qui revient en 200 avec response_code ≠ "00" et n'entre donc
  // jamais dans ce chemin (voir code-standards.md, "Timeouts et retry").
  private async postWithRetry<T>(path: string, body: unknown): Promise<T> {
    const { default: pRetry } = await import('p-retry');
    return pRetry(
      async () => {
        const response = await withTimeout(this.http.post<T>(path, body), CALL_TIMEOUT_MS);
        return response.data;
      },
      { retries: 2, minTimeout: 1000, maxTimeout: 8000 },
    );
  }

  private async getWithRetry<T>(path: string): Promise<T> {
    const { default: pRetry } = await import('p-retry');
    return pRetry(
      async () => {
        const response = await withTimeout(this.http.get<T>(path), CALL_TIMEOUT_MS);
        return response.data;
      },
      { retries: 2, minTimeout: 1000, maxTimeout: 8000 },
    );
  }
}
