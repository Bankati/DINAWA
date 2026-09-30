import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Subscription, SubscriptionTier } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { SUBSCRIPTION_TIERS } from '../../common/constants';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import { QuotaStatus } from './subscriptions.types';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { PaydunyaService } from '../payments/paydunya.service';
import { NotifyService } from '../notify/notify.service';
import { formatPeriodLabel } from './format-period-label';

// Ordre des forfaits pour valider qu'un upgrade va bien vers un forfait
// strictement supérieur — jamais de downgrade via POST /subscription/upgrade
// (voir /architect unité 35).
const TIER_ORDER: Record<SubscriptionTier, number> = { STARTER: 0, PRO: 1, PREMIUM: 2 };

// « Bien facturable » (voir /architect unité 35 — renommé pour éviter toute
// collision avec « bien géré » de l'unité 32, qui désigne autre chose : un
// bien sous mandat ACTIVE) : un bien avec un locataire actif, OU une annonce
// active, OU au statut RENOVATION. Jamais la définition du dashboard
// gestionnaire — ce service ne touche jamais aux mandats.
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly platformSettings: PlatformSettingsService,
    private readonly paydunya: PaydunyaService,
    private readonly config: ConfigService,
    private readonly notify: NotifyService,
  ) {}

  async countBillableProperties(ownerId: string): Promise<number> {
    return this.countBillableWith(this.prisma, ownerId);
  }

  async getQuotaStatus(user: AuthenticatedUser): Promise<QuotaStatus> {
    const subscription = await this.getSubscriptionOrThrow(this.prisma, user.id);
    const billablePropertiesCount = await this.countBillableProperties(user.id);
    const suspended = await this.platformSettings.quotasSuspended();
    const quota = suspended ? null : SUBSCRIPTION_TIERS[subscription.tier].managedPropertiesQuota;
    const pendingInvoice = await this.prisma.subscriptionInvoice.findFirst({
      where: { subscriptionId: subscription.id, status: 'PENDING' },
      orderBy: { periodStart: 'asc' },
      select: { amount: true, periodStart: true },
    });

    return {
      tier: subscription.tier,
      status: subscription.status,
      managedPropertiesQuota: quota,
      billablePropertiesCount,
      remaining: quota === null ? null : Math.max(0, quota - billablePropertiesCount),
      betaUntil: subscription.betaUntil,
      pendingInvoice: pendingInvoice
        ? {
            amount: pendingInvoice.amount,
            periodLabel: formatPeriodLabel(pendingInvoice.periodStart),
          }
        : null,
    };
  }

  // Toujours appelé à l'intérieur d'une transaction déjà ouverte par
  // l'appelant (même convention que ListingsService.publishForProperty()),
  // juste après un verrou consultatif par owner — voir /review unité 35 :
  // sans ce verrou, deux créations de biens concurrentes du même owner
  // juste sous le quota pouvaient toutes les deux passer la vérification
  // puis insérer, dépassant le quota sans filet de rattrapage en base
  // (contrairement au pattern mandats, protégé par une contrainte unique).
  // `pg_advisory_xact_lock` bloque la 2e transaction jusqu'à la fin de la
  // 1re et se libère automatiquement au commit/rollback — aucun unlock
  // explicite nécessaire.
  //
  // Seul point du cycle de vie où le compteur de biens facturables peut
  // réellement augmenter (voir /architect unité 35 : créer un bail ou
  // repasser en RENOVATION ne fait jamais qu'échanger la raison d'être
  // facturable d'un bien déjà compté, jamais en ajouter un nouveau).
  async assertQuotaAvailable(tx: Prisma.TransactionClient, ownerId: string): Promise<void> {
    if (await this.platformSettings.quotasSuspended()) return;

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ownerId}))`;

    const subscription = await this.getSubscriptionOrThrow(tx, ownerId);
    const quota = SUBSCRIPTION_TIERS[subscription.tier].managedPropertiesQuota;
    if (quota === null) return;

    const billablePropertiesCount = await this.countBillableWith(tx, ownerId);
    if (billablePropertiesCount >= quota) {
      throw new ConflictException(
        `Quota du forfait ${subscription.tier} atteint (${quota} biens facturables) — passez à un forfait supérieur pour continuer.`,
      );
    }
  }

  // Un upgrade réactive aussi un abonnement PENDING_CANCELLATION (décision
  // explicite /review unité 35 : monter de forfait annule une résiliation
  // en attente plutôt que de coexister avec elle — jamais les deux à la
  // fois pour un même abonnement).
  async upgrade(user: AuthenticatedUser, dto: UpgradeSubscriptionDto): Promise<Subscription> {
    const subscription = await this.getSubscriptionOrThrow(this.prisma, user.id);
    if (TIER_ORDER[dto.tier] <= TIER_ORDER[subscription.tier]) {
      throw new ForbiddenException(
        `Impossible de "monter" vers ${dto.tier} depuis ${subscription.tier} — seul un forfait strictement supérieur est autorisé via cet endpoint.`,
      );
    }

    return this.prisma.subscription.update({
      where: { userId: user.id },
      data: { tier: dto.tier, status: 'ACTIVE' },
    });
  }

  // Ne facture jamais rien elle-même — juste une intention. La facturation
  // réelle (unité 36, ressuscitée le 2026-09-30, voir /architect abonnements)
  // respecte `cancelAt` : SubscriptionBillingTask ne facture plus un
  // abonnement dont `cancelAt` est dépassé, et le finalise en `CANCELLED`.
  async cancel(user: AuthenticatedUser): Promise<Subscription> {
    const subscription = await this.getSubscriptionOrThrow(this.prisma, user.id);

    return this.prisma.subscription.update({
      where: { userId: user.id },
      data: {
        status: 'PENDING_CANCELLATION',
        cancelAt: subscription.currentPeriodEnd ?? new Date(),
      },
    });
  }

  // Point d'entrée "Payer mon abonnement maintenant" (carte Abonnement du
  // profil) — jamais de lien PayDunya pré-généré par le cron (voir
  // /architect abonnements, 2026-09-30) : la facture PayDunya est créée ici,
  // à la demande, exactement comme PaymentsService.initiate() pour le loyer.
  // Réutilise la référence PayDunya déjà créée si un essai précédent existe
  // encore (même pattern que initiate() — évite de créer une 2e facture
  // PayDunya orpheline pour la même échéance).
  async payCurrentInvoice(
    user: AuthenticatedUser,
  ): Promise<{ invoiceId: string; checkoutUrl: string }> {
    const subscription = await this.getSubscriptionOrThrow(this.prisma, user.id);
    const invoice = await this.prisma.subscriptionInvoice.findFirst({
      where: { subscriptionId: subscription.id, status: 'PENDING' },
      orderBy: { periodStart: 'asc' },
    });
    if (!invoice) {
      throw new NotFoundException('Aucune facture d’abonnement à régler pour le moment');
    }
    if (invoice.transactionId && invoice.checkoutUrl) {
      return { invoiceId: invoice.id, checkoutUrl: invoice.checkoutUrl };
    }

    const apiBaseUrl = this.config.getOrThrow<string>('API_BASE_URL');
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    const periodLabel = formatPeriodLabel(invoice.periodStart);

    const created = await this.paydunya.createInvoice({
      amount: invoice.amount,
      description: `WARAH — Abonnement ${subscription.tier} (${periodLabel})`,
      paymentId: invoice.id,
      callbackUrl: `${apiBaseUrl}/payments/webhooks/paydunya?subscriptionInvoiceId=${invoice.id}`,
      returnUrl: `${frontendUrl}/profil?paydunya=success`,
      cancelUrl: `${frontendUrl}/profil?paydunya=cancelled`,
    });

    // Même filet de sécurité que PaymentsService.initiate() : la facture
    // PayDunya existe déjà à ce stade (argent potentiellement engagé côté
    // PayDunya) — si la persistance échoue malgré les tentatives, on loggue
    // en ERROR pour rattrapage manuel plutôt que de perdre la référence.
    try {
      const { default: pRetry } = await import('p-retry');
      await pRetry(
        () =>
          this.prisma.subscriptionInvoice.update({
            where: { id: invoice.id },
            data: {
              transactionId: created.token,
              checkoutUrl: created.checkoutUrl,
              attemptCount: { increment: 1 },
            },
          }),
        { retries: 3, minTimeout: 200, maxTimeout: 2000 },
      );
    } catch (error) {
      this.logger.error(
        `[subscriptions/pay] CRITIQUE — facture PayDunya créée mais référence non persistée. invoice=${invoice.id} token=${created.token} url=${created.checkoutUrl}`,
        error,
      );
      throw error;
    }

    return { invoiceId: invoice.id, checkoutUrl: created.checkoutUrl };
  }

  // Revérifie le statut réel d'une SubscriptionInvoice auprès de PayDunya —
  // réutilisé par le webhook (immédiat) et par PaydunyaReconciliationTask
  // (rattrapage périodique), même principe que
  // PaymentsService.reconcilePaydunyaPayment(). Idempotence réelle :
  // `updateMany({ where: { id, status: 'PENDING' } })`, jamais un
  // findUnique+update séparés (voir /review unité 35 — même course déjà
  // trouvée et corrigée côté loyer).
  async reconcilePaydunyaSubscriptionInvoice(invoiceId: string): Promise<void> {
    const invoice = await this.prisma.subscriptionInvoice.findUnique({
      where: { id: invoiceId },
      include: { subscription: true },
    });
    if (!invoice || invoice.status !== 'PENDING' || !invoice.transactionId) return;

    let paydunyaStatus: Awaited<ReturnType<PaydunyaService['confirmInvoiceStatus']>>['status'];
    try {
      ({ status: paydunyaStatus } = await this.paydunya.confirmInvoiceStatus(
        invoice.transactionId,
      ));
    } catch (error) {
      this.logger.error(`[subscriptions/reconcile] échec vérification invoice=${invoiceId}`, error);
      return; // on retentera au prochain webhook ou passage du cron
    }

    if (paydunyaStatus === 'completed') {
      const { count } = await this.prisma.subscriptionInvoice.updateMany({
        where: { id: invoiceId, status: 'PENDING' },
        data: { status: 'PAID', paidAt: new Date() },
      });
      if (count === 0) return; // déjà traité par un appel concurrent
      await this.reactivateIfSuspendedForPayment(invoice.subscription.userId);
      return;
    }

    if (paydunyaStatus === 'cancelled' || paydunyaStatus === 'failed') {
      // Jamais rejetée/supprimée : contrairement à un paiement de loyer, une
      // facture d'abonnement reste due tant qu'elle n'est pas payée — c'est
      // SubscriptionBillingTask (relances J+3/J+7 puis suspension) qui gère
      // la suite, pas la réconciliation PayDunya elle-même.
      return;
    }
  }

  private async reactivateIfSuspendedForPayment(userId: string): Promise<void> {
    const { count } = await this.prisma.user.updateMany({
      where: { id: userId, accountStatus: 'SUSPENDED_PAYMENT' },
      data: { accountStatus: 'ACTIVE' },
    });
    if (count === 0) return;
    try {
      await this.notify.notifyUser({ userId, event: 'account-reactivated', variables: {} });
    } catch (error) {
      this.logger.error(
        `[subscriptions/reactivate] notification échouée pour user=${userId}`,
        error,
      );
    }
  }

  private countBillableWith(
    client: Prisma.TransactionClient | PrismaService,
    ownerId: string,
  ): Promise<number> {
    return client.property.count({
      where: {
        ownerId,
        archivedAt: null,
        OR: [
          { leases: { some: { status: 'ACTIVE' } } },
          { listings: { some: { status: 'ACTIVE' } } },
          { status: 'RENOVATION' },
        ],
      },
    });
  }

  private async getSubscriptionOrThrow(
    client: Prisma.TransactionClient | PrismaService,
    userId: string,
  ): Promise<Subscription> {
    const subscription = await client.subscription.findUnique({ where: { userId } });
    if (!subscription) throw new NotFoundException('Abonnement introuvable');
    return subscription;
  }
}
