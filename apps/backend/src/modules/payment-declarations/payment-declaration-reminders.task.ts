import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotifyService } from '../notify/notify.service';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';
import { CRON_PAYMENT_DECLARATION_REMINDERS } from '../../common/constants';

const ADVISORY_LOCK_KEY = 'payment-declaration-reminders-task';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Relance quotidienne du propriétaire/gestionnaire pour les déclarations
// laissées en PENDING_CONFIRMATION (voir build-plan.md unité 20) — jamais
// de confirmation automatique, seulement un rappel. reminder3SentAt /
// reminder7SentAt empêchent tout renvoi (même principe que InactivityTask).
@Injectable()
export class PaymentDeclarationRemindersTask {
  private readonly logger = new Logger(PaymentDeclarationRemindersTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
  ) {}

  @Cron(CRON_PAYMENT_DECLARATION_REMINDERS)
  async run(): Promise<void> {
    const ran = await withAdvisoryLock(this.prisma, ADVISORY_LOCK_KEY, () => this.execute());
    if (ran === null) {
      this.logger.warn(
        '[payment-declaration-reminders] exécution ignorée — une instance détient déjà le verrou',
      );
    }
  }

  private async execute(): Promise<void> {
    // 3 jours avant 7 — ordre chronologique naturel. Si le cron a manqué
    // plusieurs jours, une déclaration déjà ≥ 7 jours peut recevoir les deux
    // relances dans la même exécution : acceptable, mieux vaut sur-notifier
    // qu'oublier après une interruption.
    await this.sendRemindersFor(3, 'reminder3SentAt');
    await this.sendRemindersFor(7, 'reminder7SentAt');
  }

  private async sendRemindersFor(
    days: number,
    field: 'reminder3SentAt' | 'reminder7SentAt',
  ): Promise<void> {
    const threshold = new Date(Date.now() - days * MS_PER_DAY);

    const declarations = await this.prisma.paymentDeclaration.findMany({
      where: {
        [field]: null,
        createdAt: { lte: threshold },
        payment: { status: 'PENDING_CONFIRMATION' },
      },
      include: {
        payment: {
          include: { lease: { include: { property: true, tenant: true } } },
        },
      },
      take: 100,
    });

    // Un seul aller-retour DB pour tous les mandats actifs des biens candidats,
    // plutôt qu'un resolveResponsibleUserId() (donc un findFirst) par itération
    // (voir /review — N+1 corrigé).
    const propertyIds = [...new Set(declarations.map((d) => d.payment.lease.property.id))];
    const activeMandates = await this.prisma.mandate.findMany({
      where: { propertyId: { in: propertyIds }, status: 'ACTIVE' },
      select: { propertyId: true, managerId: true },
    });
    const responsibleUserByPropertyId = new Map(
      activeMandates.map((m) => [m.propertyId, m.managerId]),
    );

    for (const declaration of declarations) {
      try {
        const responsibleUserId =
          responsibleUserByPropertyId.get(declaration.payment.lease.property.id) ??
          declaration.payment.lease.property.ownerId;
        await this.notify.notifyUser({
          userId: responsibleUserId,
          event: 'payment-declaration-pending',
          variables: {
            tenantName: `${declaration.payment.lease.tenant.firstName} ${declaration.payment.lease.tenant.lastName}`,
            propertyAddress: declaration.payment.lease.property.address,
            amount: declaration.declaredAmount,
          },
        });
        await this.prisma.paymentDeclaration.update({
          where: { id: declaration.id },
          data: { [field]: new Date() },
        });
      } catch (error) {
        this.logger.error(
          `[payment-declaration-reminders/${days}j] échec pour declaration=${declaration.id}`,
          error,
        );
      }
    }
  }
}
