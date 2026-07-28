import { OverdueAlertsTask } from './overdue.task';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';

jest.mock('../../common/utils/advisory-lock', () => ({
  withAdvisoryLock: jest.fn((_prisma: unknown, _key: string, task: () => Promise<unknown>) =>
    task(),
  ),
}));

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe('OverdueAlertsTask', () => {
  let task: OverdueAlertsTask;
  let prisma: {
    paymentScheduleEntry: { findMany: jest.Mock; update: jest.Mock };
    mandate: { findFirst: jest.Mock };
  };
  let notify: { notifyUser: jest.Mock };

  function makeEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'entry-1',
      periodStart: new Date('2026-08-01T00:00:00.000Z'),
      periodEnd: new Date('2026-08-31T00:00:00.000Z'),
      dueDate: new Date(Date.now() - 5 * MS_PER_DAY),
      expectedAmount: 60000,
      paidAmount: 0,
      lease: {
        overdueAlertWindowDays: null,
        owner: { overdueGraceDays: 3 },
        tenant: { firstName: 'Ama', lastName: 'Kodjo' },
        property: { id: 'prop-1', ownerId: 'owner-1', address: '12 rue de Lomé' },
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      paymentScheduleEntry: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
      mandate: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };
    task = new OverdueAlertsTask(prisma as never, notify as never);
    (withAdvisoryLock as jest.Mock).mockClear();
  });

  it('pose un verrou applicatif avant de tourner', async () => {
    await task.run();
    expect(withAdvisoryLock).toHaveBeenCalledWith(
      prisma,
      'overdue-alerts-task',
      expect.any(Function),
    );
  });

  it('interroge les échéances PENDING/PARTIAL passées et sans alerte déjà envoyée', async () => {
    await task.run();
    const [args] = prisma.paymentScheduleEntry.findMany.mock.calls[0] as [
      { where: { status: { in: string[] }; overdueAlertSentAt: null; dueDate: { lt: Date } } },
    ];
    expect(args.where.status.in).toEqual(['PENDING', 'PARTIAL']);
    expect(args.where.overdueAlertSentAt).toBeNull();
    expect(args.where.dueDate.lt).toBeInstanceOf(Date);
  });

  it('notifie le propriétaire, passe OVERDUE et pose overdueAlertSentAt quand le délai de grâce du propriétaire est dépassé', async () => {
    prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([makeEntry()]);

    await task.run();

    expect(notify.notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'owner-1', event: 'overdue-alert' }),
    );
    const [updateArgs] = prisma.paymentScheduleEntry.update.mock.calls[0] as [
      { where: { id: string }; data: { status: string; overdueAlertSentAt: Date } },
    ];
    expect(updateArgs.where).toEqual({ id: 'entry-1' });
    expect(updateArgs.data.status).toBe('OVERDUE');
    expect(updateArgs.data.overdueAlertSentAt).toBeInstanceOf(Date);
  });

  it('notifie le gestionnaire mandaté plutôt que le propriétaire si un mandat actif existe', async () => {
    prisma.mandate.findFirst.mockResolvedValueOnce({ managerId: 'manager-1', status: 'ACTIVE' });
    prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([makeEntry()]);

    await task.run();

    expect(notify.notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'manager-1' }),
    );
  });

  it('utilise Lease.overdueAlertWindowDays en priorité sur le réglage du propriétaire', async () => {
    // en retard de 5 jours, Lease.overdueAlertWindowDays=10 (pas encore atteint), owner=3 (serait déclenché) — le bail doit primer
    prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([
      makeEntry({
        lease: {
          overdueAlertWindowDays: 10,
          owner: { overdueGraceDays: 3 },
          tenant: { firstName: 'Ama', lastName: 'Kodjo' },
          property: { id: 'prop-1', ownerId: 'owner-1', address: 'x' },
        },
      }),
    ]);

    await task.run();

    expect(notify.notifyUser).not.toHaveBeenCalled();
  });

  it("ne notifie pas si le retard n'atteint pas encore le délai de grâce effectif", async () => {
    prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([
      makeEntry({ dueDate: new Date(Date.now() - 1 * MS_PER_DAY) }), // owner overdueGraceDays=3, retard de 1j seulement
    ]);

    await task.run();

    expect(notify.notifyUser).not.toHaveBeenCalled();
    expect(prisma.paymentScheduleEntry.update).not.toHaveBeenCalled();
  });

  it("une erreur sur une échéance n'empêche pas de traiter les suivantes", async () => {
    prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([
      makeEntry({ id: 'e1' }),
      makeEntry({ id: 'e2' }),
    ]);
    notify.notifyUser.mockRejectedValueOnce(new Error('down'));

    await task.run();

    expect(notify.notifyUser).toHaveBeenCalledTimes(2);
    expect(prisma.paymentScheduleEntry.update).toHaveBeenCalledTimes(1);
  });
});
