import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Payout, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PAYOUT_MAX_ATTEMPTS,
  PAYOUT_RETRY_DELAYS_MS,
  PAYOUT_STALE_SENDING_MS,
} from '../../common/constants';
import { formatPropertyLocation } from '../../common/utils/format-property-location';
import { normalizeTogoPhone } from '../../common/utils/normalize-togo-phone';
import { PAYOUT_OPERATOR_LABEL } from '../../common/utils/payout-operator-label';
import { NotifyService } from '../notify/notify.service';
import {
  PaydunyaDisburseStatus,
  PaydunyaError,
  PaydunyaService,
} from '../payments/paydunya.service';
import { ListPayoutsQueryDto } from './dto/list-payouts-query.dto';

// Code PayDunya « fonds insuffisants » (ou callback injoignable) — voir doc
// API PUSH. Le seul échec qui exige une action humaine immédiate : rester
// silencieux laisserait des loyers bloqués sans que personne ne le sache.
const INSUFFICIENT_FUNDS_CODE = '4002';

const PAYOUT_WITH_CONTEXT = {
  payment: { include: { lease: { include: { property: true } } } },
  beneficiary: true,
} satisfies Prisma.PayoutInclude;

type PayoutWithContext = Prisma.PayoutGetPayload<{ include: typeof PAYOUT_WITH_CONTEXT }>;

export type PaginatedPayouts = {
  data: Array<
    Payout & {
      beneficiary: { id: string; firstName: string; lastName: string; role: string };
      propertyLabel: string;
    }
  >;
  page: number;
  limit: number;
  total: number;
};

// Reversement du loyer au bénéficiaire après un paiement PayDunya confirmé
// (voir /architect reversement, 2026-09-25, révisé le 2026-09-28 : bénéficiaire
// = gestionnaire du mandat actif sinon propriétaire, 100 % du loyer, frais à
// la charge du locataire ; le numéro et l'opérateur de réception sont ceux du
// compte lui-même — User.phone/payoutOperator — plus de numéro séparé).
// Machine à états PENDING → SENDING → SUCCESS | FAILED.
//
// Règles de sécurité de l'argent (jamais de double envoi, jamais de perte) :
//  1. Le Payout est créé une seule fois par paiement (paymentId unique).
//  2. Toute transition d'état est un `updateMany` gardé par le statut attendu
//     — webhook, cron et action admin peuvent se chevaucher, un seul gagne
//     (même principe que PaymentsService.reconcilePaydunyaPayment()).
//  3. Le jeton PayDunya est enregistré AVANT submit-invoice, et submit n'est
//     appelé que si check-status affirme que le jeton est encore `created`.
//  4. Erreur ambiguë au moment de submit (timeout) → on ne fait rien de plus :
//     le Payout reste SENDING et le prochain passage vérifie son statut.
@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);
  private warnedDisabled = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paydunya: PaydunyaService,
    private readonly notify: NotifyService,
    private readonly config: ConfigService,
  ) {}

  // Crée le Payout d'un paiement PayDunya confirmé. Idempotent : rejoué par
  // l'événement payment.confirmed ET par le rattrapage du cron, le second
  // appel retombe sur la ligne existante (contrainte unique paymentId).
  async createForPayment(paymentId: string): Promise<Payout | null> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (
      !payment ||
      payment.source !== 'PAYDUNYA_API' ||
      payment.status !== 'PAID' ||
      // null = paiement antérieur au reversement automatique : jamais reversé
      // rétroactivement (décision /architect 2026-09-25).
      !payment.beneficiaryUserId
    ) {
      return null;
    }

    try {
      return await this.prisma.payout.create({
        data: {
          paymentId: payment.id,
          beneficiaryUserId: payment.beneficiaryUserId,
          amount: payment.paidAmount,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.prisma.payout.findUnique({ where: { paymentId: payment.id } });
      }
      throw error;
    }
  }

  // Tente d'envoyer (ou de reprendre) un reversement. Appelé à la création,
  // par le cron de rattrapage et par la relance admin. Ne lève jamais pour un
  // échec d'envoi — il est enregistré sur le Payout (statut, lastError).
  async process(payoutId: string): Promise<void> {
    if (!this.paydunya.isDisburseEnabled()) {
      if (!this.warnedDisabled) {
        this.warnedDisabled = true;
        this.logger.warn(
          '[payouts] envoi désactivé (PayDunya non configuré ou mode test) — les reversements restent en attente',
        );
      }
      return;
    }

    if (!(await this.claim(payoutId))) return;

    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: PAYOUT_WITH_CONTEXT,
    });
    if (!payout) return;

    let tokenPersisted = Boolean(payout.disburseToken);
    try {
      let token = payout.disburseToken;

      if (!token) {
        // Le numéro et l'opérateur de réception sont ceux du compte lui-même
        // (voir /architect reversement, révisé le 2026-09-28 : plus de
        // numéro séparé — User.phone/payoutOperator, demandés à l'inscription
        // ou complétés depuis le profil).
        const beneficiary = await this.prisma.user.findUnique({
          where: { id: payout.beneficiaryUserId },
          select: { phone: true, payoutOperator: true },
        });
        const normalizedPhone =
          typeof beneficiary?.phone === 'string'
            ? String(normalizeTogoPhone(beneficiary.phone))
            : null;
        if (!beneficiary?.payoutOperator || !normalizedPhone || !/^\d{8}$/.test(normalizedPhone)) {
          await this.releaseForRetry(
            payout,
            "Le bénéficiaire n'a pas de numéro et d'opérateur mobile money valides dans son profil",
          );
          return;
        }
        const operator = beneficiary.payoutOperator;
        const phone = normalizedPhone;

        ({ token } = await this.paydunya.createDisbursement({
          amount: payout.amount,
          operator,
          phone,
          callbackUrl: `${this.config.getOrThrow<string>('API_BASE_URL')}/payouts/webhooks/paydunya?payoutId=${payout.id}`,
        }));
        // Persisté AVANT submit : si le processus s'arrête juste après, le
        // prochain passage retrouve le jeton et vérifie son statut au lieu
        // d'en créer un second (règle 3).
        await this.prisma.payout.update({
          where: { id: payout.id },
          data: { disburseToken: token, operator, phone },
        });
        tokenPersisted = true;
      }

      let check = await this.paydunya.checkDisbursementStatus(token);

      if (check.status === 'created') {
        // Seul état où l'argent n'est PAS déjà parti ni en route.
        try {
          await this.paydunya.submitDisbursement(token, payout.id);
        } catch (error) {
          if (error instanceof PaydunyaError) {
            await this.releaseForRetry(payout, error.message, error.code);
            return;
          }
          // Ambiguïté (timeout, réseau) : peut-être parti, peut-être pas. On
          // ne rejoue JAMAIS ici — reste SENDING, vérifié au prochain passage.
          this.logger.error(
            `[payouts] réponse de submit inconnue pour payout=${payout.id} — statut à vérifier`,
            error,
          );
          return;
        }
        check = await this.paydunya.checkDisbursementStatus(token);
      }

      await this.applyStatus(payout, check);
    } catch (error) {
      if (!tokenPersisted) {
        // Rien n'a pu partir sans jeton : échec sûr, on retentera.
        const code = error instanceof PaydunyaError ? error.code : undefined;
        await this.releaseForRetry(payout, this.describe(error), code);
        return;
      }
      // Jeton connu, statut inconnu (check-status en panne) : reste SENDING,
      // le prochain passage vérifiera — jamais de conclusion hâtive.
      this.logger.error(`[payouts] vérification impossible pour payout=${payout.id}`, error);
    }
  }

  // Callback PayDunya : simple signal « va vérifier » — le payload n'est
  // jamais cru (même principe que l'IPN de paiement). L'identifiant vient de
  // callback_url, construit par nous dans process().
  async handleCallback(payoutId: string | undefined): Promise<{ status: string }> {
    if (!payoutId) {
      this.logger.warn('[payouts/webhook] callback reçu sans payoutId — ignoré');
      return { status: 'ignored' };
    }
    try {
      const payout = await this.prisma.payout.findUnique({
        where: { id: payoutId },
        include: PAYOUT_WITH_CONTEXT,
      });
      if (payout?.status === 'SENDING' && payout.disburseToken) {
        const check = await this.paydunya.checkDisbursementStatus(payout.disburseToken);
        await this.applyStatus(payout, check);
      }
    } catch (error) {
      // Ne jamais faire échouer l'accusé de réception — rattrapé par le cron.
      this.logger.error(`[payouts/webhook] échec inattendu pour payout=${payoutId}`, error);
    }
    return { status: 'ok' };
  }

  // Relance manuelle d'un reversement FAILED par un admin, après correction
  // de la cause (solde rechargé, numéro corrigé...).
  async retry(payoutId: string): Promise<Payout> {
    const { count } = await this.prisma.payout.updateMany({
      where: { id: payoutId, status: 'FAILED' },
      data: {
        status: 'PENDING',
        attempts: 0,
        nextAttemptAt: new Date(),
        disburseToken: null,
        lastError: null,
        completedAt: null,
      },
    });
    if (count === 0) {
      const exists = await this.prisma.payout.findUnique({
        where: { id: payoutId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Reversement introuvable');
      throw new ConflictException('Seul un reversement en échec peut être relancé');
    }

    await this.process(payoutId);
    return this.prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });
  }

  async list(query: ListPayoutsQueryDto): Promise<PaginatedPayouts> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.PayoutWhereInput = query.status ? { status: query.status } : {};

    const [rows, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        include: PAYOUT_WITH_CONTEXT,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payout.count({ where }),
    ]);

    return {
      data: rows.map(({ payment, beneficiary, ...payout }) => ({
        ...payout,
        beneficiary: {
          id: beneficiary.id,
          firstName: beneficiary.firstName,
          lastName: beneficiary.lastName,
          role: beneficiary.role,
        },
        propertyLabel: formatPropertyLocation(payment.lease.property),
      })),
      page,
      limit,
      total,
    };
  }

  // Prise en charge atomique : PENDING échu → SENDING (nouvelle tentative
  // comptée), ou SENDING interrompu depuis trop longtemps → repris sans
  // compter de tentative (règle 2).
  private async claim(payoutId: string): Promise<boolean> {
    const fresh = await this.prisma.payout.updateMany({
      where: { id: payoutId, status: 'PENDING', nextAttemptAt: { lte: new Date() } },
      data: { status: 'SENDING', attempts: { increment: 1 } },
    });
    if (fresh.count > 0) return true;

    const stale = await this.prisma.payout.updateMany({
      where: {
        id: payoutId,
        status: 'SENDING',
        updatedAt: { lt: new Date(Date.now() - PAYOUT_STALE_SENDING_MS) },
      },
      data: { status: 'SENDING' },
    });
    return stale.count > 0;
  }

  private async applyStatus(
    payout: PayoutWithContext,
    check: { status: PaydunyaDisburseStatus; fees: number | null; transactionId: string | null },
  ): Promise<void> {
    if (check.status === 'success') {
      const { count } = await this.prisma.payout.updateMany({
        where: { id: payout.id, status: 'SENDING' },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
          lastError: null,
          providerFee: check.fees,
          transactionId: check.transactionId,
        },
      });
      if (count > 0) await this.notifySuccess(payout);
      return;
    }

    if (check.status === 'failed') {
      await this.releaseForRetry(payout, 'PayDunya a signalé un échec du transfert');
    }
    // created / pending : en cours chez PayDunya — reste SENDING.
  }

  // Échec temporaire → nouvelle tentative plus tard (jeton jeté : une reprise
  // recrée un décaissement vers le numéro CONNU À CE MOMENT-LÀ, pas un
  // ancien). Plafond atteint → FAILED, alerte bénéficiaire + admins.
  private async releaseForRetry(
    payout: PayoutWithContext,
    reason: string,
    code?: string,
  ): Promise<void> {
    if (payout.attempts >= PAYOUT_MAX_ATTEMPTS) {
      const { count } = await this.prisma.payout.updateMany({
        where: { id: payout.id, status: 'SENDING' },
        data: { status: 'FAILED', lastError: reason, completedAt: new Date() },
      });
      if (count > 0) await this.notifyFailure(payout, reason);
      return;
    }

    const delay =
      PAYOUT_RETRY_DELAYS_MS[Math.min(payout.attempts, PAYOUT_RETRY_DELAYS_MS.length) - 1] ??
      PAYOUT_RETRY_DELAYS_MS[PAYOUT_RETRY_DELAYS_MS.length - 1];
    const { count } = await this.prisma.payout.updateMany({
      where: { id: payout.id, status: 'SENDING' },
      data: {
        status: 'PENDING',
        disburseToken: null,
        lastError: reason,
        nextAttemptAt: new Date(Date.now() + delay),
      },
    });

    // Solde insuffisant : alerte dès la première occurrence, sans attendre
    // l'échec définitif — l'admin peut recharger avant que les loyers
    // s'accumulent.
    if (count > 0 && code === INSUFFICIENT_FUNDS_CODE && payout.attempts === 1) {
      await this.alertAdmins(payout, `${reason} (solde PayDunya à vérifier)`);
    }
  }

  private async notifySuccess(payout: PayoutWithContext): Promise<void> {
    try {
      const done = await this.prisma.payout.findUnique({ where: { id: payout.id } });
      await this.notify.notifyUser({
        userId: payout.beneficiaryUserId,
        event: 'payout-sent',
        variables: {
          propertyAddress: formatPropertyLocation(payout.payment.lease.property),
          amount: payout.amount,
          operator: done?.operator ? PAYOUT_OPERATOR_LABEL[done.operator] : '',
          phone: done?.phone ?? '',
        },
      });
    } catch (error) {
      this.logger.error(`[payouts] notification de succès échouée payout=${payout.id}`, error);
    }
  }

  private async notifyFailure(payout: PayoutWithContext, reason: string): Promise<void> {
    try {
      const current = await this.prisma.payout.findUnique({ where: { id: payout.id } });
      await this.notify.notifyUser({
        userId: payout.beneficiaryUserId,
        event: 'payout-failed',
        variables: {
          propertyAddress: formatPropertyLocation(payout.payment.lease.property),
          amount: payout.amount,
          operator: current?.operator ? PAYOUT_OPERATOR_LABEL[current.operator] : '',
          phone: current?.phone ?? '',
        },
      });
    } catch (error) {
      this.logger.error(`[payouts] notification d'échec échouée payout=${payout.id}`, error);
    }
    await this.alertAdmins(payout, reason);
  }

  private async alertAdmins(payout: PayoutWithContext, reason: string): Promise<void> {
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN', anonymizedAt: null },
        select: { id: true },
        take: 20,
      });
      const variables = {
        payoutId: payout.id,
        amount: payout.amount,
        beneficiaryName: `${payout.beneficiary.firstName} ${payout.beneficiary.lastName}`,
        reason,
        attempts: payout.attempts,
      };
      await Promise.all(
        admins.map((admin) =>
          this.notify.notifyUser({
            userId: admin.id,
            event: 'payout-failed-admin',
            variables,
            forceEmail: true,
          }),
        ),
      );
    } catch (error) {
      this.logger.error(`[payouts] alerte admin échouée payout=${payout.id}`, error);
    }
  }

  private describe(error: unknown): string {
    return error instanceof Error ? error.message : 'Erreur inconnue lors du reversement';
  }
}
