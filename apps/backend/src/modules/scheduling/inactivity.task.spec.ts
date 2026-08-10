import { InactivityTask } from './inactivity.task';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';

jest.mock('../../common/utils/advisory-lock', () => ({
  withAdvisoryLock: jest.fn((_prisma: unknown, _key: string, task: () => Promise<unknown>) =>
    task(),
  ),
}));

describe('InactivityTask', () => {
  let task: InactivityTask;
  let prisma: { user: { findMany: jest.Mock; update: jest.Mock } };
  let notify: { notifyUser: jest.Mock };
  let accountActivation: { reactivateIfEligible: jest.Mock; hasQualifyingActivity: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };
    accountActivation = {
      reactivateIfEligible: jest.fn().mockResolvedValue(false),
      hasQualifyingActivity: jest.fn().mockResolvedValue(false),
    };

    task = new InactivityTask(prisma as never, notify as never, accountActivation as never);
    (withAdvisoryLock as jest.Mock).mockClear();
  });

  it('pose un verrou applicatif avant de tourner', async () => {
    await task.run();
    expect(withAdvisoryLock).toHaveBeenCalledWith(prisma, 'inactivity-task', expect.any(Function));
  });

  it("n'échoue pas si le verrou est déjà détenu par une autre instance", async () => {
    (withAdvisoryLock as jest.Mock).mockResolvedValueOnce(null);
    await expect(task.run()).resolves.toBeUndefined();
  });

  it('phase 1 — tente de réactiver chaque compte SUSPENDED_INACTIVITY', async () => {
    prisma.user.findMany
      .mockResolvedValueOnce([{ id: 'u1' }, { id: 'u2' }]) // réactivation
      .mockResolvedValue([]); // avertissements + suspension (vide)

    await task.run();

    expect(accountActivation.reactivateIfEligible).toHaveBeenCalledWith('u1');
    expect(accountActivation.reactivateIfEligible).toHaveBeenCalledWith('u2');
  });

  it("phase 1 — une erreur sur un compte n'empêche pas de traiter les suivants", async () => {
    prisma.user.findMany.mockResolvedValueOnce([{ id: 'u1' }, { id: 'u2' }]).mockResolvedValue([]);
    accountActivation.reactivateIfEligible.mockRejectedValueOnce(new Error('boom'));

    await task.run();

    expect(accountActivation.reactivateIfEligible).toHaveBeenCalledTimes(2);
  });

  it('phase 2 — avertit un candidat toujours inactif et marque le rappel envoyé', async () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    prisma.user.findMany
      .mockResolvedValueOnce([]) // réactivation
      .mockResolvedValueOnce([{ id: 'u1', createdAt }]) // rappel J-30
      .mockResolvedValueOnce([]) // rappel J-7
      .mockResolvedValueOnce([]) // rappel J-1
      .mockResolvedValueOnce([]); // suspension
    accountActivation.hasQualifyingActivity.mockResolvedValueOnce(false);

    await task.run();

    expect(notify.notifyUser).toHaveBeenCalledWith({
      userId: 'u1',
      event: 'inactivity-warning',
      variables: { daysRemaining: 30, deadlineDate: '2026-03-02' },
    });
    const [updateArgs] = prisma.user.update.mock.calls[0] as [
      { where: { id: string }; data: { inactivityWarning30SentAt: Date } },
    ];
    expect(updateArgs.where).toEqual({ id: 'u1' });
    expect(updateArgs.data.inactivityWarning30SentAt).toBeInstanceOf(Date);
  });

  it('phase 2 — ne prévient pas un candidat redevenu actif entre-temps', async () => {
    prisma.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'u1', createdAt: new Date() }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    accountActivation.hasQualifyingActivity.mockResolvedValueOnce(true);

    await task.run();

    expect(notify.notifyUser).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('phase 3 — suspend un candidat toujours inactif après 60 jours et notifie', async () => {
    prisma.user.findMany
      .mockResolvedValueOnce([]) // réactivation
      .mockResolvedValueOnce([]) // J-30
      .mockResolvedValueOnce([]) // J-7
      .mockResolvedValueOnce([]) // J-1
      .mockResolvedValueOnce([{ id: 'u1', createdAt: new Date('2020-01-01T00:00:00Z') }]);
    accountActivation.hasQualifyingActivity.mockResolvedValueOnce(false);

    await task.run();

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { accountStatus: 'SUSPENDED_INACTIVITY' },
    });
    const [notifyArgs] = notify.notifyUser.mock.calls[0] as [
      { userId: string; event: string; variables: { reason: string } },
    ];
    expect(notifyArgs.userId).toBe('u1');
    expect(notifyArgs.event).toBe('account-suspended');
    expect(typeof notifyArgs.variables.reason).toBe('string');
  });

  it('phase 3 — ne suspend pas un candidat redevenu actif entre-temps', async () => {
    prisma.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'u1', createdAt: new Date('2020-01-01T00:00:00Z') }]);
    accountActivation.hasQualifyingActivity.mockResolvedValueOnce(true);

    await task.run();

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(notify.notifyUser).not.toHaveBeenCalled();
  });
});
