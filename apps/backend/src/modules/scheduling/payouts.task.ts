import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { PayoutsService } from '../payouts/payouts.service';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';
import { CRON_PAYOUTS, PAYOUT_STALE_SENDING_MS } from '../../common/constants';

const ADVISORY_LOCK_KEY = 'payouts-task';

// Bornes par passage (même logique que PaydunyaReconciliationTask) : chaque
// process() fait jusqu'à trois appels PayDunya de 15 s — BATCH × PARALLELISM
// garde un run bien en dessous de l'intervalle de 5 min.
const BATCH = 30;
const PARALLELISM = 3;
// Laisse le listener payment.confirmed créer/envoyer le Payout normalement
// avant que le rattrapage ne s'en mêle.
const MISSING_PAYOUT_GRACE_MS = 2 * 60 * 1000;

// Rattrapage des reversements (voir /architect reversement, 2026-09-25) :
//  1. Crée les Payout manquants (paiement PayDunya confirmé dont l'événement
//     payment.confirmed n'a pas abouti — crash, redéploiement).
//  2. Relance les PENDING dont le délai de reprise est échu.
//  3. Reprend les SENDING interrompus (statut vérifié chez PayDunya, jamais
//     renvoyé à l'aveugle — voir PayoutsService.process()).
@Injectable()
export class PayoutsTask {
  private readonly logger = new Logger(PayoutsTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payouts: PayoutsService,
  ) {}

  @Cron(CRON_PAYOUTS)
  async run(): Promise<void> {
    const ran = await withAdvisoryLock(this.prisma, ADVISORY_LOCK_KEY, () => this.execute());
    if (ran === null) {
      this.logger.warn('[payouts] exécution ignorée — une instance détient déjà le verrou');
    }
  }

  private async execute(): Promise<void> {
    await this.createMissing();

    const now = new Date();
    const candidates = await this.prisma.payout.findMany({
      where: {
        OR: [
          { status: 'PENDING', nextAttemptAt: { lte: now } },
          {
            status: 'SENDING',
            updatedAt: { lt: new Date(now.getTime() - PAYOUT_STALE_SENDING_MS) },
          },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: BATCH,
    });

    for (let i = 0; i < candidates.length; i += PARALLELISM) {
      const slice = candidates.slice(i, i + PARALLELISM);
      await Promise.all(
        slice.map(({ id }) =>
          this.payouts.process(id).catch((error: unknown) => {
            this.logger.error(`[payouts] échec pour payout=${id}`, error);
          }),
        ),
      );
    }
  }

  private async createMissing(): Promise<void> {
    const missing = await this.prisma.payment.findMany({
      where: {
        source: 'PAYDUNYA_API',
        status: 'PAID',
        beneficiaryUserId: { not: null },
        payout: { is: null },
        paidAt: { lt: new Date(Date.now() - MISSING_PAYOUT_GRACE_MS) },
      },
      select: { id: true },
      orderBy: { paidAt: 'asc' },
      take: BATCH,
    });

    for (const { id } of missing) {
      try {
        await this.payouts.createForPayment(id);
      } catch (error) {
        this.logger.error(
          `[payouts] création du reversement manquant échouée payment=${id}`,
          error,
        );
      }
    }
  }
}
