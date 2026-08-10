import { MonthlyReportsTask } from './monthly-reports.task';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';

jest.mock('../../common/utils/advisory-lock', () => ({
  withAdvisoryLock: jest.fn((_prisma: unknown, _key: string, task: () => Promise<unknown>) =>
    task(),
  ),
}));

describe('MonthlyReportsTask', () => {
  let task: MonthlyReportsTask;
  let prisma: { mandate: { findMany: jest.Mock } };
  let managerReports: { getConsolidatedReportData: jest.Mock };
  let reportPdf: { generate: jest.Mock };
  let notify: { notifyUser: jest.Mock };

  function makeReportData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      owner: { id: 'owner-1', firstName: 'O', lastName: 'W' },
      manager: { id: 'manager-1', firstName: 'M', lastName: 'N' },
      periodLabel: '2026-07',
      properties: [{ id: 'prop-1', address: 'Adresse 1' }],
      totalReceived: 75000,
      overdueEntries: [],
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = { mandate: { findMany: jest.fn().mockResolvedValue([]) } };
    managerReports = {
      getConsolidatedReportData: jest.fn().mockResolvedValue(makeReportData()),
    };
    reportPdf = { generate: jest.fn().mockResolvedValue(Buffer.from('pdf')) };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };
    task = new MonthlyReportsTask(
      prisma as never,
      managerReports as never,
      reportPdf as never,
      notify as never,
    );
    (withAdvisoryLock as jest.Mock).mockClear();
  });

  it('pose un verrou applicatif avant de tourner', async () => {
    await task.run();
    expect(withAdvisoryLock).toHaveBeenCalledWith(
      prisma,
      'monthly-reports-task',
      expect.any(Function),
    );
  });

  it('déduplique plusieurs mandats de la même paire (gestionnaire, propriétaire) en un seul rapport', async () => {
    prisma.mandate.findMany.mockResolvedValueOnce([
      { managerId: 'manager-1', ownerId: 'owner-1' },
      { managerId: 'manager-1', ownerId: 'owner-1' },
    ]);

    await task.run();

    expect(managerReports.getConsolidatedReportData).toHaveBeenCalledTimes(1);
    expect(managerReports.getConsolidatedReportData).toHaveBeenCalledWith(
      'manager-1',
      'owner-1',
      expect.any(Object),
    );
  });

  it('génère un rapport distinct par paire (gestionnaire, propriétaire) distincte', async () => {
    prisma.mandate.findMany.mockResolvedValueOnce([
      { managerId: 'manager-1', ownerId: 'owner-1' },
      { managerId: 'manager-1', ownerId: 'owner-2' },
      { managerId: 'manager-2', ownerId: 'owner-1' },
    ]);

    await task.run();

    expect(managerReports.getConsolidatedReportData).toHaveBeenCalledTimes(3);
    expect(notify.notifyUser).toHaveBeenCalledTimes(3);
  });

  it('notifie le propriétaire avec le PDF en pièce jointe', async () => {
    prisma.mandate.findMany.mockResolvedValueOnce([{ managerId: 'manager-1', ownerId: 'owner-1' }]);

    await task.run();

    expect(notify.notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'owner-1',
        event: 'monthly-report',
        emailAttachments: [expect.objectContaining({ content: Buffer.from('pdf') })],
      }),
    );
  });

  it('pagine par curseur au-delà de la taille d’une page — jamais un plafond fixe sur les mandats de toute la plateforme', async () => {
    const PAGE_SIZE = 500;
    const firstPage = Array.from({ length: PAGE_SIZE }, (_, i) => ({
      id: `mandate-${i}`,
      managerId: `manager-${i}`,
      ownerId: `owner-${i}`,
    }));
    const secondPage = [{ id: 'mandate-500', managerId: 'manager-500', ownerId: 'owner-500' }];
    prisma.mandate.findMany.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage);

    await task.run();

    expect(prisma.mandate.findMany).toHaveBeenCalledTimes(2);
    const [, secondCallArgs] = prisma.mandate.findMany.mock.calls as [
      unknown,
      [{ cursor: { id: string }; skip: number }],
    ];
    expect(secondCallArgs[0].cursor).toEqual({ id: 'mandate-499' });
    expect(secondCallArgs[0].skip).toBe(1);
    // 500 paires de la première page + 1 de la seconde = 501 rapports.
    expect(managerReports.getConsolidatedReportData).toHaveBeenCalledTimes(PAGE_SIZE + 1);
  });

  it("un échec sur une paire n'empêche pas le traitement des autres", async () => {
    prisma.mandate.findMany.mockResolvedValueOnce([
      { managerId: 'manager-1', ownerId: 'owner-1' },
      { managerId: 'manager-1', ownerId: 'owner-2' },
    ]);
    managerReports.getConsolidatedReportData
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce(makeReportData());

    await task.run();

    expect(notify.notifyUser).toHaveBeenCalledTimes(1);
  });
});
