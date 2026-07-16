import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotifyService } from '../notify/notify.service';
import { AccountActivationService } from '../account/account-activation.service';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';
import {
  CRON_INACTIVITY,
  INACTIVITY_SUSPENSION_DAYS,
  INACTIVITY_WARNING_DAYS,
} from '../../common/constants';

const WARNING_FIELD = {
  30: 'inactivityWarning30SentAt',
  7: 'inactivityWarning7SentAt',
  1: 'inactivityWarning1SentAt',
} as const satisfies Record<(typeof INACTIVITY_WARNING_DAYS)[number], keyof User>;

const ADVISORY_LOCK_KEY = 'inactivity-task';

// Blocage automatique des comptes OWNER/MANAGER inactifs (voir
// build-plan.md unité 11). Trois phases dans le même verrou, dans cet
// ordre : réactiver ceux qui sont redevenus éligibles (filet de sécurité —
// le déblocage "immédiat" passe normalement par AccountActivationService
// appelé directement depuis PropertiesService/MandatesService, pas encore
// construits), avertir ceux qui approchent de l'échéance, suspendre ceux
// qui l'ont dépassée.
@Injectable()
export class InactivityTask {
  private readonly logger = new Logger(InactivityTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
    private readonly accountActivation: AccountActivationService,
  ) {}

  @Cron(CRON_INACTIVITY)
  async run(): Promise<void> {
    const ran = await withAdvisoryLock(this.prisma, ADVISORY_LOCK_KEY, () => this.execute());
    if (ran === null) {
      this.logger.warn('[inactivity] exécution ignorée — une instance détient déjà le verrou');
    }
  }

  private async execute(): Promise<void> {
    await this.reactivateEligibleAccounts();
    await this.sendWarnings();
    await this.suspendOverdueAccounts();
  }

  private async reactivateEligibleAccounts(): Promise<void> {
    const suspended = await this.prisma.user.findMany({
      where: { accountStatus: 'SUSPENDED_INACTIVITY' },
      select: { id: true },
      take: 100,
    });

    for (const { id } of suspended) {
      try {
        await this.accountActivation.reactivateIfEligible(id);
      } catch (error) {
        this.logger.error(`[inactivity/reactivate] user=${id}`, error);
      }
    }
  }

  private async sendWarnings(): Promise<void> {
    for (const daysRemaining of INACTIVITY_WARNING_DAYS) {
      const ageThresholdDays = INACTIVITY_SUSPENSION_DAYS - daysRemaining;
      const cutoff = new Date(Date.now() - ageThresholdDays * 24 * 60 * 60 * 1000);
      const warningField = WARNING_FIELD[daysRemaining];

      const candidates = await this.prisma.user.findMany({
        where: {
          role: { in: ['OWNER', 'MANAGER'] },
          accountStatus: 'ACTIVE',
          createdAt: { lte: cutoff },
          [warningField]: null,
        },
        take: 100,
      });

      for (const user of candidates) {
        try {
          const active = await this.accountActivation.hasQualifyingActivity(user);
          if (active) continue;

          const deadlineDate = new Date(
            user.createdAt.getTime() + INACTIVITY_SUSPENSION_DAYS * 24 * 60 * 60 * 1000,
          );
          await this.notify.notifyUser({
            userId: user.id,
            event: 'inactivity-warning',
            variables: {
              daysRemaining,
              deadlineDate: deadlineDate.toISOString().slice(0, 10),
            },
          });
          await this.prisma.user.update({
            where: { id: user.id },
            data: { [warningField]: new Date() },
          });
        } catch (error) {
          this.logger.error(`[inactivity/warn-${daysRemaining}] user=${user.id}`, error);
        }
      }
    }
  }

  private async suspendOverdueAccounts(): Promise<void> {
    const cutoff = new Date(Date.now() - INACTIVITY_SUSPENSION_DAYS * 24 * 60 * 60 * 1000);

    const candidates = await this.prisma.user.findMany({
      where: {
        role: { in: ['OWNER', 'MANAGER'] },
        accountStatus: 'ACTIVE',
        createdAt: { lte: cutoff },
      },
      take: 100,
    });

    for (const user of candidates) {
      try {
        const active = await this.accountActivation.hasQualifyingActivity(user);
        if (active) continue;

        await this.prisma.user.update({
          where: { id: user.id },
          data: { accountStatus: 'SUSPENDED_INACTIVITY' },
        });
        await this.notify.notifyUser({
          userId: user.id,
          event: 'account-suspended',
          variables: { reason: 'aucun bien enregistré ni mandat actif depuis plus de 60 jours' },
        });
      } catch (error) {
        this.logger.error(`[inactivity/suspend] user=${user.id}`, error);
      }
    }
  }
}
