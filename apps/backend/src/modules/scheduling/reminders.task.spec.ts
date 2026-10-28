import type { Config } from '@jest/types';
import { RemindersTask } from './reminders.task';
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

describe('RemindersTask', () => {
  let task: RemindersTask;
  let prisma: {
    paymentScheduleEntry: { findMany: jest.Mock; update: jest.Mock };
  };
  let notify: { notifyUser: jest.Mock };
  let payLinks: { payLinkFor: jest.Mock };

  function makeEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'entry-1',
      periodStart: new Date('2026-08-01T00:00:00.000Z'),
      periodEnd: new Date('2026-08-31T00:00:00.000Z'),
      dueDate: new Date(Date.now() + 3 * MS_PER_DAY),
      expectedAmount: 60000,
      paidAmount: 0,
      lease: {
        reminderDaysBefore: null,
        owner: { reminderDaysBefore: 5 },
        tenant: { id: 'tenant-1', firstName: 'Ama' },
        property: { address: '12 rue de Lomé' },
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    setClock('2026-10-16T10:00:00.000Z');
    prisma = {
      paymentScheduleEntry: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
    };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };
    payLinks = { payLinkFor: jest.fn().mockReturnValue({ token: 'jeton', url: 'https://warah.test/payer/jeton' }) };
    task = new RemindersTask(prisma as never, notify as never, payLinks as never);
    (withAdvisoryLock as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('plage d’envoi 7 h – 21 h (/review unité 46)', () => {
    it.each(['2026-10-16T21:00:00.000Z', '2026-10-16T03:00:00.000Z', '2026-10-16T06:59:00.000Z'])(
      'à %s : aucun rappel, l’échéance reste à traiter',
      async (iso) => {
        setClock(iso);
        prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([makeEntry()]);
        await task.run();
        expect(notify.notifyUser).not.toHaveBeenCalled();
        expect(prisma.paymentScheduleEntry.update).not.toHaveBeenCalled();
      },
    );

    it('échéance entrée dans la fenêtre la nuit : rappel envoyé au passage de 7 h', async () => {
      setClock('2026-10-16T03:00:00.000Z');
      const entry = makeEntry();
      prisma.paymentScheduleEntry.findMany.mockResolvedValue([entry]);
      await task.run();
      expect(notify.notifyUser).not.toHaveBeenCalled();

      setClock('2026-10-16T07:00:00.000Z');
      await task.run();
      expect(notify.notifyUser).toHaveBeenCalledTimes(1);
      expect(prisma.paymentScheduleEntry.update).toHaveBeenCalledTimes(1);
    });

    it('20 h 59 : encore dans la plage', async () => {
      setClock('2026-10-16T20:59:00.000Z');
      prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([makeEntry()]);
      await task.run();
      expect(notify.notifyUser).toHaveBeenCalledTimes(1);
    });
  });

  it('pose un verrou applicatif avant de tourner', async () => {
    await task.run();
    expect(withAdvisoryLock).toHaveBeenCalledWith(
      prisma,
      'payment-reminders-task',
      expect.any(Function),
    );
  });

  it('interroge les échéances PENDING/PARTIAL sans rappel déjà envoyé', async () => {
    await task.run();
    const [args] = prisma.paymentScheduleEntry.findMany.mock.calls[0] as [
      { where: { status: { in: string[] }; reminderSentAt: null } },
    ];
    expect(args.where.status.in).toEqual(['PENDING', 'PARTIAL']);
    expect(args.where.reminderSentAt).toBeNull();
  });

  it('notifie le locataire et pose reminderSentAt quand l’échéance entre dans la fenêtre du propriétaire (repli)', async () => {
    prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([makeEntry()]);

    await task.run();

    expect(notify.notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'tenant-1', event: 'payment-reminder' }),
    );
    const [updateArgs] = prisma.paymentScheduleEntry.update.mock.calls[0] as [
      { where: { id: string }; data: { reminderSentAt: Date } },
    ];
    expect(updateArgs.where).toEqual({ id: 'entry-1' });
    expect(updateArgs.data.reminderSentAt).toBeInstanceOf(Date);
  });

  it('ajoute prénom, lien de paiement (sans requête) et échéance rattachée pour le WhatsApp (unité 46)', async () => {
    const entry = makeEntry();
    prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([entry]);

    await task.run();

    expect(payLinks.payLinkFor).toHaveBeenCalledWith(entry);
    const [params] = notify.notifyUser.mock.calls[0] as [{ variables: Record<string, unknown>; relatedTo: unknown }];
    expect(params.relatedTo).toEqual({ scheduleEntryId: 'entry-1' });
    expect(params.variables).toMatchObject({
      tenantFirstName: 'Ama',
      payToken: 'jeton',
      payLinkUrl: 'https://warah.test/payer/jeton',
      amount: 60000,
    });
  });

  it('utilise Lease.reminderDaysBefore en priorité sur le réglage du propriétaire', async () => {
    // dueDate dans 3 jours, Lease.reminderDaysBefore=1 (trop tôt), owner=5 (serait notifié) — doit primer sur le bail, donc PAS notifié
    prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([
      makeEntry({
        lease: {
          reminderDaysBefore: 1,
          owner: { reminderDaysBefore: 5 },
          tenant: { id: 'tenant-1' },
          property: { address: 'x' },
        },
      }),
    ]);

    await task.run();

    expect(notify.notifyUser).not.toHaveBeenCalled();
  });

  it("ne notifie pas si l'échéance est encore hors de la fenêtre de rappel effective", async () => {
    prisma.paymentScheduleEntry.findMany.mockResolvedValueOnce([
      makeEntry({ dueDate: new Date(Date.now() + 20 * MS_PER_DAY) }), // owner reminderDaysBefore=5, échéance dans 20j
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
