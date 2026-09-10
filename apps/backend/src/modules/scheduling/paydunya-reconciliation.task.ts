import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';
import { CRON_PAYDUNYA_RECONCILIATION, PAYDUNYA_RECONCILE_AFTER_MS } from '../../common/constants';

const ADVISORY_LOCK_KEY = 'paydunya-reconciliation-task';

// Bornes de traitement par exécution (trouvé en /review 2026-09-10) : chaque
// reconcilePaydunyaPayment() fait un appel PayDunya jusqu'à ~45s dans le pire
// cas (timeout 15s × 3 tentatives). BATCH × PARALLELISM plafonne la durée
// d'un run bien en dessous de l'intervalle de 15 min même si PayDunya est
// lent — au-delà, le reste est repris au prochain passage.
const RECONCILE_BATCH = 30;
const RECONCILE_PARALLELISM = 5;

// Filet de sécurité pour les webhooks (IPN) PayDunya jamais reçus (voir
// /architect 2026-09-07, build-plan.md unité 18 adaptée à PayDunya) —
// revérifie périodiquement les Payment PAYDUNYA_API restés PENDING plus
// longtemps que PAYDUNYA_RECONCILE_AFTER_MS. Réutilise exactement la même
// logique que le webhook (PaymentsService.reconcilePaydunyaPayment()),
// idempotente par construction : aucun risque de double traitement si le
// webhook et ce cron se chevauchent.
@Injectable()
export class PaydunyaReconciliationTask {
  private readonly logger = new Logger(PaydunyaReconciliationTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Cron(CRON_PAYDUNYA_RECONCILIATION)
  async run(): Promise<void> {
    const ran = await withAdvisoryLock(this.prisma, ADVISORY_LOCK_KEY, () => this.execute());
    if (ran === null) {
      this.logger.warn(
        '[paydunya-reconciliation] exécution ignorée — une instance détient déjà le verrou',
      );
    }
  }

  private async execute(): Promise<void> {
    const cutoff = new Date(Date.now() - PAYDUNYA_RECONCILE_AFTER_MS);

    // Pas de filtre `transactionId` : reconcilePaydunyaPayment() gère aussi
    // les orphelins (facture créée mais référence non persistée) — il les
    // rejette passé le délai d'abandon (trouvé en /review 2026-09-10).
    const candidates = await this.prisma.payment.findMany({
      where: {
        source: 'PAYDUNYA_API',
        status: 'PENDING',
        createdAt: { lt: cutoff },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: RECONCILE_BATCH,
    });

    for (let i = 0; i < candidates.length; i += RECONCILE_PARALLELISM) {
      const slice = candidates.slice(i, i + RECONCILE_PARALLELISM);
      await Promise.all(
        slice.map(({ id }) =>
          this.paymentsService.reconcilePaydunyaPayment(id).catch((error: unknown) => {
            this.logger.error(`[paydunya-reconciliation] échec pour payment=${id}`, error);
          }),
        ),
      );
    }
  }
}
