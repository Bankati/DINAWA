import type { Config } from '@jest/types';
import { OverdueAlertsTask } from './overdue.task';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';

jest.mock('../../common/utils/advisory-lock', () => ({
  withAdvisoryLock: jest.fn((_prisma: unknown, _key: string, task: () => Promise<unknown>) =>
    task(),
  ),
}));

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Plage d'envoi aux locataires (7 h – 21 h, heure de Lomé = UTC) : les
// tests fixent l'horloge pour ne pas dépendre de l'heure où ils tournent.
const ONLY_DATE: Config.FakeableAPI[] = [
  'hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame',
  'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval',
  'setTimeout', 'clearTimeout',
];
function setClock(iso: string): void {
  jest.useFakeTimers({ now: new Date(iso), doNotFake: ONLY_DATE });
}

describe('OverdueAlertsTask', () => {
  let task: OverdueAlertsTask;
  let prisma: {
    paymentScheduleEntry: { findMany: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    mandate: { findMany: jest.Mock };
  };
  let notify: { notifyUser: jest.Mock };
  let payLinks: { payLinkFor: jest.Mock };

  function makeEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'entry-1',
      periodStart: new Date('2026-08-01T00:00:00.000Z'),
      periodEnd: new Date('2026-08-31T00:00:00.000Z'),
      dueDate: new Date(Date.now() - 5 * MS_PER_DAY),
      expectedAmount: 60000,
      paidAmount: 0,
      status: 'PENDING',
      overdueAlertSentAt: null,
      tenantOverdueSentAt: null,
      lease: {
        overdueAlertWindowDays: null,
        owner: { overdueGraceDays: 3 },
        tenant: { id: 'tenant-1', firstName: 'Ama', lastName: 'Kodjo' },
        property: { id: 'prop-1', ownerId: 'owner-1', address: '12 rue de Lomé' },
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    setClock('2026-10-16T10:00:00.000Z');
    prisma = {
      paymentScheduleEntry: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      mandate: { findMany: jest.fn().mockResolvedValue([]) },
    };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };
    payLinks = { payLinkFor: jest.fn().mockReturnValue({ token: 'jeton', url: 'https://warah.test/payer/jeton' }) };
    task = new OverdueAlertsTask(prisma as never, notify as never, payLinks as never);
    (withAdvisoryLock as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('pose un verrou applicatif avant de tourner', async () => {
    await task.run();
    expect(withAdvisoryLock).toHaveBeenCalledWith(
      prisma,
      'overdue-alerts-task',
      expect.any(Function),
    );
  });

  it('interroge les échéances passées sans alerte agence OU sans relance locataire', async () => {
    await task.run();
    const [args] = prisma.paymentScheduleEntry.findMany.mock.calls[0] as [
      { where: { OR: unknown[]; dueDate: { lt: Date } } },
    ];
    expect(args.where.OR).toEqual([
      { status: { in: ['PENDING', 'PARTIAL'] }, overdueAlertSentAt: null },
      { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] }, tenantOverdueSentAt: null },
    ]);
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
    prisma.mandate.findMany.mockResolvedValueOnce([
      { propertyId: 'prop-1', managerId: 'manager-1' },
    ]);
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

    // e1 : alerte agence en échec, relance locataire quand même ; e2 : les deux.
    expect(notify.notifyUser).toHaveBeenCalledTimes(4);
    expect(prisma.paymentScheduleEntry.update).toHaveBeenCalledTimes(1);
  });

  describe('relance unique du locataire (unité 46)', () => {
    const tenantCalls = (): Array<Record<string, unknown>> =>
      (notify.notifyUser.mock.calls as Array<[Record<string, unknown>]>)
        .map(([params]) => params)
        .filter((params) => params['event'] === 'tenant-overdue');

    it('réserve la relance (échéance toujours impayée) puis l’envoie avec le lien de paiement', async () => {
      const entry = makeEntry();
      prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([entry]);

      await task.run();

      const [claim] = prisma.paymentScheduleEntry.updateMany.mock.calls[0] as [
        { where: Record<string, unknown>; data: { tenantOverdueSentAt: Date } },
      ];
      expect(claim.where).toEqual({
        id: 'entry-1',
        tenantOverdueSentAt: null,
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      });
      expect(claim.data.tenantOverdueSentAt).toBeInstanceOf(Date);
      expect(payLinks.payLinkFor).toHaveBeenCalledWith(entry);
      expect(tenantCalls()).toEqual([
        expect.objectContaining({
          userId: 'tenant-1',
          relatedTo: { scheduleEntryId: 'entry-1' },
          variables: expect.objectContaining({
            tenantFirstName: 'Ama',
            amount: 60000,
            payToken: 'jeton',
            payLinkUrl: 'https://warah.test/payer/jeton',
          }) as unknown,
        }),
      ]);
    });

    it('payée entre la lecture et l’envoi : la réservation échoue, aucune relance', async () => {
      prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([makeEntry()]);
      prisma.paymentScheduleEntry.updateMany.mockResolvedValueOnce({ count: 0 });

      await task.run();

      expect(tenantCalls()).toHaveLength(0);
      // L'alerte agence, elle, est partie (indépendante).
      expect(notify.notifyUser).toHaveBeenCalledWith(expect.objectContaining({ event: 'overdue-alert' }));
    });

    it('erreur avant tout envoi : la réservation est effacée pour le prochain passage', async () => {
      prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([makeEntry()]);
      notify.notifyUser.mockImplementation((params: { event: string }) =>
        params.event === 'tenant-overdue' ? Promise.reject(new Error('base indisponible')) : Promise.resolve(),
      );

      await task.run();

      expect(prisma.paymentScheduleEntry.updateMany).toHaveBeenLastCalledWith({
        where: { id: 'entry-1' },
        data: { tenantOverdueSentAt: null },
      });
    });

    it('déjà signalée à l’agence (OVERDUE) mais pas au locataire : seulement la relance', async () => {
      prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([
        makeEntry({ status: 'OVERDUE', overdueAlertSentAt: new Date() }),
      ]);

      await task.run();

      expect(notify.notifyUser).toHaveBeenCalledTimes(1);
      expect(tenantCalls()).toHaveLength(1);
      expect(prisma.paymentScheduleEntry.update).not.toHaveBeenCalled();
    });

    it('relance déjà faite : jamais une seconde', async () => {
      prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([makeEntry({ tenantOverdueSentAt: new Date() })]);

      await task.run();

      expect(tenantCalls()).toHaveLength(0);
      expect(prisma.paymentScheduleEntry.updateMany).not.toHaveBeenCalled();
    });

    it('la nuit : l’agence est alertée, le locataire n’est ni réservé ni relancé', async () => {
      setClock('2026-10-16T02:00:00.000Z');
      prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([makeEntry()]);

      await task.run();

      expect(notify.notifyUser).toHaveBeenCalledWith(expect.objectContaining({ event: 'overdue-alert' }));
      expect(tenantCalls()).toHaveLength(0);
      expect(prisma.paymentScheduleEntry.updateMany).not.toHaveBeenCalled();
    });

    it('retard constaté la nuit : relance au passage de 7 h, une seule fois', async () => {
      setClock('2026-10-16T02:00:00.000Z');
      prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([makeEntry()]);
      await task.run();

      setClock('2026-10-16T07:00:00.000Z');
      prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([
        makeEntry({ status: 'OVERDUE', overdueAlertSentAt: new Date() }),
      ]);
      await task.run();

      expect(tenantCalls()).toHaveLength(1);
      expect(prisma.paymentScheduleEntry.updateMany).toHaveBeenCalledTimes(1);
    });

    it('21 h pile : hors plage, pas de relance', async () => {
      setClock('2026-10-16T21:00:00.000Z');
      prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([makeEntry({ status: 'OVERDUE', overdueAlertSentAt: new Date() })]);
      await task.run();
      expect(tenantCalls()).toHaveLength(0);
    });

    it('avant la fin du délai de tolérance : pas de relance non plus', async () => {
      prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([makeEntry({ dueDate: new Date(Date.now() - MS_PER_DAY) })]);
      await task.run();
      expect(prisma.paymentScheduleEntry.updateMany).not.toHaveBeenCalled();
    });
  });
});
