import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotifyService } from '../notify/notify.service';
import {
  ManagerReportsService,
  previousMonthRange,
} from '../manager-reports/manager-reports.service';
import { MonthlyReportPdfService } from '../manager-reports/monthly-report-pdf.service';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';
import { CRON_MONTHLY_REPORTS } from '../../common/constants';

const ADVISORY_LOCK_KEY = 'monthly-reports-task';

// Rapport mensuel consolidé par propriétaire mandant (voir build-plan.md
// unité 33) — le 1er de chaque mois, couvre le mois civil qui vient de se
// terminer. Regroupe les mandats ACTIVE par paire (gestionnaire,
// propriétaire) : un propriétaire ayant confié plusieurs biens au même
// gestionnaire ne reçoit qu'un seul rapport (voir /architect, décision
// consolidation).
@Injectable()
export class MonthlyReportsTask {
  private readonly logger = new Logger(MonthlyReportsTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly managerReports: ManagerReportsService,
    private readonly reportPdf: MonthlyReportPdfService,
    private readonly notify: NotifyService,
  ) {}

  @Cron(CRON_MONTHLY_REPORTS)
  async run(): Promise<void> {
    const ran = await withAdvisoryLock(this.prisma, ADVISORY_LOCK_KEY, () => this.execute());
    if (ran === null) {
      this.logger.warn('[monthly-reports] exécution ignorée — une instance détient déjà le verrou');
    }
  }

  private async execute(): Promise<void> {
    const period = previousMonthRange();
    const pairs = await this.collectActiveMandatePairs();

    for (const { managerId, ownerId } of pairs.values()) {
      try {
        const data = await this.managerReports.getConsolidatedReportData(
          managerId,
          ownerId,
          period,
        );
        const pdf = await this.reportPdf.generate(data);

        await this.notify.notifyUser({
          userId: ownerId,
          event: 'monthly-report',
          variables: {
            managerName: `${data.manager.firstName} ${data.manager.lastName}`,
            periodLabel: data.periodLabel,
            propertyCount: data.properties.length,
            totalReceived: data.totalReceived,
            overdueCount: data.overdueEntries.length,
          },
          emailAttachments: [{ filename: `rapport-warah-${data.periodLabel}.pdf`, content: pdf }],
        });
      } catch (error) {
        this.logger.error(
          `[monthly-reports] échec pour manager=${managerId} owner=${ownerId}`,
          error,
        );
      }
    }
  }

  // Pagination par curseur sur l'ensemble des mandats ACTIVE de la
  // plateforme — jamais un simple `take` fixe ici (voir /review unité 33) :
  // contrairement aux autres `take: 100` du projet qui bornent les données
  // d'un seul utilisateur, cette requête porte sur TOUTE la plateforme et
  // doit donc scaler avec elle plutôt que perdre silencieusement des paires
  // (gestionnaire, propriétaire) au-delà d'un plafond fixe.
  private async collectActiveMandatePairs(): Promise<
    Map<string, { managerId: string; ownerId: string }>
  > {
    const pairs = new Map<string, { managerId: string; ownerId: string }>();
    const PAGE_SIZE = 500;
    let cursor: string | undefined;

    for (;;) {
      const batch = await this.prisma.mandate.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, managerId: true, ownerId: true },
        orderBy: { id: 'asc' },
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      if (batch.length === 0) break;

      for (const mandate of batch) {
        pairs.set(`${mandate.managerId}:${mandate.ownerId}`, mandate);
      }

      if (batch.length < PAGE_SIZE) break;
      cursor = batch[batch.length - 1].id;
    }

    return pairs;
  }
}
