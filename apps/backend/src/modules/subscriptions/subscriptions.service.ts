import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Subscription, SubscriptionTier } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { SUBSCRIPTION_TIERS } from '../../common/constants';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import { QuotaStatus } from './subscriptions.types';

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
  constructor(private readonly prisma: PrismaService) {}

  async countBillableProperties(ownerId: string): Promise<number> {
    return this.countBillableWith(this.prisma, ownerId);
  }

  async getQuotaStatus(user: AuthenticatedUser): Promise<QuotaStatus> {
    const subscription = await this.getSubscriptionOrThrow(this.prisma, user.id);
    const billablePropertiesCount = await this.countBillableProperties(user.id);
    const quota = SUBSCRIPTION_TIERS[subscription.tier].managedPropertiesQuota;

    return {
      tier: subscription.tier,
      status: subscription.status,
      managedPropertiesQuota: quota,
      billablePropertiesCount,
      remaining: quota === null ? null : Math.max(0, quota - billablePropertiesCount),
      betaUntil: subscription.betaUntil,
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

  // Purement déclaratif pour l'instant — sans conséquence de facturation
  // réelle tant que l'unité 36 (prélèvement automatique, reportée en
  // attendant les agréments Cashpay) n'existe pas.
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
