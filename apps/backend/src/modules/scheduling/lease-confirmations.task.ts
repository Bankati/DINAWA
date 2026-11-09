import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { LeaseConfirmationsService } from '../lease-confirmations/lease-confirmations.service';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';
import { CRON_LEASE_CONFIRMATIONS } from '../../common/constants';

const ADVISORY_LOCK_KEY = 'lease-confirmations-task';

// Accord du locataire déjà inscrit (09/11/2026) : rappels à 2 et 5 jours,
// expiration à 7 jours (bien et annonce rétablis). Toutes les décisions
// « qui, quand » sont en base (sentAt, reminder*SentAt, expiresAt) ; la
// tâche passe toutes les heures. Verrou Postgres : jamais deux passages en
// même temps (les écritures conditionnelles empêchent de toute façon les
// doublons).
@Injectable()
export class LeaseConfirmationsTask {
  private readonly logger = new Logger(LeaseConfirmationsTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly confirmations: LeaseConfirmationsService,
  ) {}

  @Cron(CRON_LEASE_CONFIRMATIONS)
  async run(): Promise<void> {
    const ran = await withAdvisoryLock(this.prisma, ADVISORY_LOCK_KEY, () => this.execute(new Date()));
    if (ran === null) {
      this.logger.warn('[lease-confirmations] exécution ignorée — une instance détient déjà le verrou');
    }
  }

  async execute(now: Date): Promise<void> {
    // Chaque étape est isolée : une panne des rappels n'empêche jamais
    // l'expiration (qui rend le bien et l'annonce), et inversement.
    try {
      const expired = await this.confirmations.expireDue(now);
      if (expired > 0) this.logger.log(`[lease-confirmations] ${expired} demande(s) expirée(s)`);
    } catch (error) {
      this.logger.error('[lease-confirmations] expiration impossible', error);
    }
    try {
      const reminded = await this.confirmations.sendDueReminders(now);
      if (reminded > 0) this.logger.log(`[lease-confirmations] ${reminded} rappel(s) envoyé(s)`);
    } catch (error) {
      this.logger.error('[lease-confirmations] rappels impossibles', error);
    }
  }
}
