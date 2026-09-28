import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { withTimeout } from '../../common/utils/with-timeout';

// Deux hôtes distincts selon le mode — erreur trouvée le 2026-09-11 (doc
// PayDunya officielle transmise par le N+1 du développeur) : le mode test
// N'UTILISE PAS `api/v1`, il a son propre préfixe `sandbox-api/v1`. Le code
// tapait jusqu'ici toujours sur l'hôte production, avec des clés test — ce
// qui produit exactement `"Invalid Masterkey Specified"` côté PayDunya
// (clés test sur l'API live). Ce n'était donc pas un problème de valeur de
// clé comme supposé initialement, mais de configuration d'environnement —
// l'API elle-même n'a jamais été en cause.
const PAYDUNYA_BASE_URL = {
  test: 'https://app.paydunya.com/sandbox-api/v1',
  live: 'https://app.paydunya.com/api/v1',
} as const;
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
// etc.) — distincte d'une erreur réseau/timeout. `code` = response_code
// PayDunya quand il existe (ex. '4002' fonds insuffisants sur un décaissement).
export class PaydunyaError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

// API PUSH (décaissement) — hôte et préfixe distincts de Checkout Invoice
// (v2 au lieu de v1). Aucun équivalent sandbox n'est documenté : le
// décaissement n'est donc utilisable qu'en mode live (voir isDisburseEnabled()).
const PAYDUNYA_DISBURSE_BASE_URL = 'https://app.paydunya.com/api/v2/disburse';

// Nos opérateurs de réception → `withdraw_mode` de l'API PUSH.
const DISBURSE_MODE: Record<'TMONEY' | 'FLOOZ', string> = {
  TMONEY: 't-money-togo',
  FLOOZ: 'moov-togo',
};

export type PaydunyaDisburseStatus = 'created' | 'pending' | 'success' | 'failed';

// Repli UNIQUEMENT si PayDunya ne renvoie pas d'URL exploitable dans sa
// réponse de création (ne devrait jamais arriver). Best-effort, hôte de
// production : ne fonctionne pas en sandbox (l'URL de test PayDunya a un
// chemin différent). La vraie URL vient toujours de la réponse PayDunya
// (`response_text`), stockée sur `Payment.paydunyaCheckoutUrl` — voir
// createInvoice() et PaymentsService.initiate() (/review 2026-09-10).
export function fallbackCheckoutUrl(token: string): string {
  return `https://paydunya.com/checkout/invoice/${token}`;
}

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
  private readonly disburseHttp: AxiosInstance;
  private readonly enabled: boolean;
  private readonly live: boolean;

  constructor(config: ConfigService) {
    const mode = config.get<string>('PAYDUNYA_MODE') ?? 'test';
    const masterKey = config.get<string>('PAYDUNYA_MASTER_KEY') ?? '';
    const privateKey =
      config.get<string>(
        mode === 'live' ? 'PAYDUNYA_LIVE_PRIVATE_KEY' : 'PAYDUNYA_TEST_PRIVATE_KEY',
      ) ?? '';
    const token =
      config.get<string>(mode === 'live' ? 'PAYDUNYA_LIVE_TOKEN' : 'PAYDUNYA_TEST_TOKEN') ?? '';

    // Master/Private/Token seuls sont requis pour créer/confirmer une
    // facture (doc PayDunya, 2026-09-11) — la clé publique n'entre dans
    // aucun de ces deux appels, jamais envoyée en en-tête ici.
    this.enabled = Boolean(masterKey && privateKey && token);

    this.live = mode === 'live';
    const headers = {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': masterKey,
      'PAYDUNYA-PRIVATE-KEY': privateKey,
      'PAYDUNYA-TOKEN': token,
    };

    this.http = axios.create({
      baseURL: PAYDUNYA_BASE_URL[this.live ? 'live' : 'test'],
      headers,
    });
    this.disburseHttp = axios.create({ baseURL: PAYDUNYA_DISBURSE_BASE_URL, headers });

    if (!this.enabled) {
      this.logger.warn(
        '[paydunya] clés API manquantes — le paiement mobile money est indisponible (attendu en dev sans compte marchand)',
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Le décaissement n'a pas d'hôte sandbox documenté : en mode test, les
  // reversements restent PENDING (voir PayoutsService) plutôt que d'envoyer
  // de l'argent réel avec des clés de test — ou d'échouer à chaque passage.
  isDisburseEnabled(): boolean {
    return this.enabled && this.live;
  }

  // `paymentMethod` (TMONEY/FLOOZ) est une préférence indicative côté WARAH
  // — Checkout Invoice ne permet pas de l'imposer à PayDunya (le locataire
  // choisit librement son opérateur sur leur page de paiement). Le flux
  // Softpay permettrait de forcer l'opérateur mais sa forme exacte de
  // requête n'a pas été confirmée dans la doc reçue (voir commentaire de
  // classe). Cette méthode reste disponible pour ce jour-là ; non appelée
  // actuellement (constaté en /review 2026-09-07 — assumé, pas un oubli).
  operatorCodeFor(method: 'TMONEY' | 'FLOOZ'): string {
    return OPERATOR_CODE[method];
  }

  // Crée une facture PayDunya — le locataire complète le paiement sur
  // checkoutUrl (choix de l'opérateur mobile money inclus dans leur
  // interface). Le Payment reste PENDING côté WARAH jusqu'à confirmation
  // (webhook IPN ou cron de réconciliation, voir PaymentsService).
  // Volontairement UN SEUL essai, sans retry — opération non idempotente
  // (chaque appel réussi crée une facture distincte chez PayDunya) : un
  // retry après un timeout dont la réponse s'est perdue créerait une
  // seconde facture orpheline pour le même Payment. Un retry avait été
  // ajouté par erreur ici puis retiré en /review (2026-09-07) — voir
  // architecture.md, section PayDunya, qui documentait déjà cette règle
  // avant même l'implémentation.
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

    const response = await withTimeout(
      this.http.post<{
        response_code?: string;
        token?: string;
        response_text?: string;
        invoice_url?: string;
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
      }),
      CALL_TIMEOUT_MS,
    );
    const data = response.data;

    if (data.response_code !== '00' || !data.token) {
      this.logger.error(`[paydunya/create-invoice] échec — ${JSON.stringify(data)}`);
      throw new PaydunyaError(data.response_text ?? 'Échec de création de la facture PayDunya');
    }

    // Sur succès PayDunya renvoie l'URL de paiement dans `response_text` (et
    // parfois `invoice_url`) — c'est la seule URL fiable (sandbox vs prod ont
    // des hôtes différents). On ne la reconstruit jamais nous-mêmes ; repli
    // best-effort seulement si la réponse n'en contient aucune (anormal).
    const returnedUrl = [data.invoice_url, data.response_text].find(
      (u): u is string => typeof u === 'string' && u.startsWith('http'),
    );
    return { token: data.token, checkoutUrl: returnedUrl ?? fallbackCheckoutUrl(data.token) };
  }

  // Revérifie le statut réel d'une facture auprès de PayDunya — jamais fait
  // confiance au payload IPN entrant seul (celui-ci ne sert qu'à savoir QUAND
  // revérifier, pas à quoi). Même mécanisme réutilisé par le cron de
  // réconciliation (voir PaymentsService.reconcilePaydunyaPayment()).
  // Remonte aussi `invoice.total_amount` — le montant que PayDunya a
  // réellement encaissé, jamais supposé égal à ce qu'on avait demandé à
  // l'initiation (utilisé pour créditer l'échéance et générer la quittance,
  // voir /architect 2026-09-14).
  async confirmInvoiceStatus(
    token: string,
  ): Promise<{ status: PaydunyaInvoiceStatus; amount: number | null }> {
    if (!this.enabled) {
      throw new PaydunyaError('PayDunya non configuré (clés API manquantes)');
    }

    const data = await this.getWithRetry<{
      status?: string;
      invoice?: { total_amount?: number };
    }>(`/checkout-invoice/confirm/${token}`);
    const amount =
      typeof data.invoice?.total_amount === 'number' ? data.invoice.total_amount : null;

    if (data.status === 'completed') return { status: 'completed', amount };
    if (data.status === 'cancelled') return { status: 'cancelled', amount };
    if (data.status === 'failed') return { status: 'failed', amount };
    return { status: 'pending', amount };
  }

  // ── API PUSH (décaissement) — reversement du loyer au bénéficiaire ──
  // Trois appels (doc PayDunya API PUSH, lue le 2026-09-25) : get-invoice
  // crée un jeton, submit-invoice l'exécute (mouvement d'argent réel),
  // check-status donne l'état. Règle de sécurité de tout le flux : submit-invoice
  // n'est JAMAIS rejoué sans avoir vérifié par check-status que le jeton est
  // encore au statut `created` — la doc ne garantit pas que `disburse_id`
  // dédoublonne, et un rejeu après un timeout dont la réponse s'est perdue
  // paierait deux fois (voir PayoutsService.attempt()).

  // Crée le jeton de décaissement. Aucun argent ne bouge à cette étape.
  async createDisbursement(params: {
    amount: number;
    operator: 'TMONEY' | 'FLOOZ';
    phone: string;
    callbackUrl: string;
  }): Promise<{ token: string }> {
    this.assertDisburseEnabled();

    const response = await withTimeout(
      this.disburseHttp.post<{
        response_code?: string;
        disburse_token?: string;
        response_text?: string;
      }>('/get-invoice', {
        account_alias: params.phone,
        amount: params.amount,
        withdraw_mode: DISBURSE_MODE[params.operator],
        callback_url: params.callbackUrl,
      }),
      CALL_TIMEOUT_MS,
    );
    const data = response.data;

    if (data.response_code !== '00' || !data.disburse_token) {
      // Jamais la réponse brute : elle peut contenir le numéro du bénéficiaire.
      this.logger.error(
        `[paydunya/disburse-create] échec code=${data.response_code} — ${data.response_text}`,
      );
      throw new PaydunyaError(
        data.response_text ?? 'Échec de création du décaissement PayDunya',
        data.response_code,
      );
    }
    return { token: data.disburse_token };
  }

  // Exécute le décaissement (argent réel). UN SEUL essai, jamais de retry
  // automatique. Une PaydunyaError signifie "refusé, rien n'a été envoyé" ;
  // toute autre erreur (timeout, réseau) est AMBIGUË — l'appelant doit alors
  // passer par checkDisbursementStatus() avant toute nouvelle tentative.
  // `disburseId` = notre identifiant de reversement, renvoyé par PayDunya dans
  // le callback et check-status pour recoller les deux côtés.
  async submitDisbursement(
    token: string,
    disburseId: string,
  ): Promise<{ status: PaydunyaDisburseStatus | null; transactionId: string | null }> {
    this.assertDisburseEnabled();

    const response = await withTimeout(
      this.disburseHttp.post<{
        response_code?: string;
        status?: string;
        response_text?: string;
        transaction_id?: string;
      }>('/submit-invoice', { disburse_invoice: token, disburse_id: disburseId }),
      CALL_TIMEOUT_MS,
    );
    const data = response.data;

    if (data.response_code !== '00') {
      this.logger.error(
        `[paydunya/disburse-submit] refusé code=${data.response_code} — ${data.response_text}`,
      );
      throw new PaydunyaError(
        data.response_text ?? 'Décaissement refusé par PayDunya',
        data.response_code,
      );
    }
    return {
      status: PaydunyaService.parseDisburseStatus(data.status),
      transactionId: typeof data.transaction_id === 'string' ? data.transaction_id : null,
    };
  }

  // Source de vérité de l'état d'un décaissement (jamais le payload du
  // callback, qui ne sert qu'à savoir QUAND revérifier — même principe que
  // confirmInvoiceStatus()). POST sans effet de bord → rejouable en cas
  // d'erreur réseau. `fees` = frais réellement facturés par PayDunya.
  async checkDisbursementStatus(token: string): Promise<{
    status: PaydunyaDisburseStatus;
    fees: number | null;
    transactionId: string | null;
  }> {
    this.assertDisburseEnabled();

    const { default: pRetry } = await import('p-retry');
    const data = await pRetry(
      async () => {
        const response = await withTimeout(
          this.disburseHttp.post<{
            response_code?: string;
            status?: string;
            fees?: string | number;
            transaction_id?: string;
            response_text?: string;
          }>('/check-status', { disburse_invoice: token }),
          CALL_TIMEOUT_MS,
        );
        return response.data;
      },
      { retries: 2, minTimeout: 1000, maxTimeout: 8000 },
    );

    if (data.response_code !== '00') {
      throw new PaydunyaError(
        data.response_text ?? 'Vérification du décaissement impossible',
        data.response_code,
      );
    }

    const fees = data.fees !== undefined ? Math.round(Number(data.fees)) : NaN;
    return {
      // Un statut absent ou inconnu est traité comme `pending` : jamais
      // supposer un succès ni un échec qu'on ne peut pas prouver.
      status: PaydunyaService.parseDisburseStatus(data.status) ?? 'pending',
      fees: Number.isFinite(fees) ? fees : null,
      transactionId: typeof data.transaction_id === 'string' ? data.transaction_id : null,
    };
  }

  private assertDisburseEnabled(): void {
    if (!this.enabled) {
      throw new PaydunyaError('PayDunya non configuré (clés API manquantes)');
    }
    if (!this.live) {
      throw new PaydunyaError('Le décaissement PayDunya n’est disponible qu’en mode live');
    }
  }

  private static parseDisburseStatus(raw: unknown): PaydunyaDisburseStatus | null {
    const value = typeof raw === 'string' ? raw.toLowerCase() : '';
    return value === 'created' || value === 'pending' || value === 'success' || value === 'failed'
      ? value
      : null;
  }

  // Retry réservé aux opérations idempotentes — confirmInvoiceStatus() est
  // un GET sans effet de bord, sûr à rejouer sur échec réseau/timeout réel
  // (axios ne throw que dans ces cas ou sur un statut HTTP non-2xx) ; jamais
  // sur un refus métier PayDunya, qui revient en 200 avec response_code ≠
  // "00" et n'entre donc jamais dans ce chemin. createInvoice() n'utilise
  // volontairement PAS ce helper — voir son commentaire (opération non
  // idempotente).
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
