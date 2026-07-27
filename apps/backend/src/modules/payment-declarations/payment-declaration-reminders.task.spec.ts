import { PaymentDeclarationRemindersTask } from './payment-declaration-reminders.task';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';

jest.mock('../../common/utils/advisory-lock', () => ({
  withAdvisoryLock: jest.fn((_prisma: unknown, _key: string, task: () => Promise<unknown>) =>
    task(),
  ),
}));

describe('PaymentDeclarationRemindersTask', () => {
  let task: PaymentDeclarationRemindersTask;
  let prisma: {
    paymentDeclaration: { findMany: jest.Mock; update: jest.Mock };
    mandate: { findFirst: jest.Mock };
  };
  let notify: { notifyUser: jest.Mock };

  function makeDeclaration(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'declaration-1',
      declaredAmount: 55000,
      payment: {
        lease: {
          property: { id: 'prop-1', ownerId: 'owner-1', address: '12 rue de Lomé' },
          tenant: { firstName: 'Ama', lastName: 'Kodjo' },
        },
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      paymentDeclaration: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
      mandate: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };

    task = new PaymentDeclarationRemindersTask(prisma as never, notify as never);
    (withAdvisoryLock as jest.Mock).mockClear();
  });

  it('pose un verrou applicatif avant de tourner', async () => {
    await task.run();
    expect(withAdvisoryLock).toHaveBeenCalledWith(
      prisma,
      'payment-declaration-reminders-task',
      expect.any(Function),
    );
  });

  it('interroge le seuil de 3 jours puis celui de 7 jours', async () => {
    await task.run();
    expect(prisma.paymentDeclaration.findMany).toHaveBeenCalledTimes(2);
  });

  it('notifie le propriétaire et pose reminder3SentAt pour une déclaration ≥ 3 jours', async () => {
    prisma.paymentDeclaration.findMany
      .mockResolvedValueOnce([makeDeclaration()])
      .mockResolvedValueOnce([]);

    await task.run();

    expect(notify.notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'owner-1', event: 'payment-declaration-pending' }),
    );
    const [updateArgs] = prisma.paymentDeclaration.update.mock.calls[0] as [
      { where: { id: string }; data: { reminder3SentAt: Date } },
    ];
    expect(updateArgs.where).toEqual({ id: 'declaration-1' });
    expect(updateArgs.data.reminder3SentAt).toBeInstanceOf(Date);
  });

  it('notifie le gestionnaire mandaté plutôt que le propriétaire si un mandat actif existe', async () => {
    prisma.mandate.findFirst.mockResolvedValue({ managerId: 'manager-1', status: 'ACTIVE' });
    prisma.paymentDeclaration.findMany
      .mockResolvedValueOnce([makeDeclaration()])
      .mockResolvedValueOnce([]);

    await task.run();

    expect(notify.notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'manager-1' }),
    );
  });

  it("une erreur sur une déclaration n'empêche pas de traiter les suivantes", async () => {
    prisma.paymentDeclaration.findMany
      .mockResolvedValueOnce([makeDeclaration({ id: 'd1' }), makeDeclaration({ id: 'd2' })])
      .mockResolvedValueOnce([]);
    notify.notifyUser.mockRejectedValueOnce(new Error('down'));

    await task.run();

    expect(notify.notifyUser).toHaveBeenCalledTimes(2);
    expect(prisma.paymentDeclaration.update).toHaveBeenCalledTimes(1);
  });
});
