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
// etc.) — distincte d'une erreur réseau/timeout.
export class PaydunyaError extends Error {}

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
  private readonly enabled: boolean;

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

    this.http = axios.create({
      baseURL: PAYDUNYA_BASE_URL[mode === 'live' ? 'live' : 'test'],
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': masterKey,
        'PAYDUNYA-PRIVATE-KEY': privateKey,
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
