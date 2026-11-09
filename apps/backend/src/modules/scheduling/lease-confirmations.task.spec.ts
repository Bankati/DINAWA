import { LeaseConfirmationsTask } from './lease-confirmations.task';

describe('LeaseConfirmationsTask', () => {
  let confirmations: { expireDue: jest.Mock; sendDueReminders: jest.Mock };
  let prisma: { $transaction: jest.Mock };
  let task: LeaseConfirmationsTask;

  beforeEach(() => {
    confirmations = {
      expireDue: jest.fn().mockResolvedValue(0),
      sendDueReminders: jest.fn().mockResolvedValue(0),
    };
    prisma = { $transaction: jest.fn() };
    task = new LeaseConfirmationsTask(prisma as never, confirmations as never);
  });

  it('expire puis envoie les rappels, avec la même heure', async () => {
    const now = new Date('2026-11-12T10:15:00Z');
    await task.execute(now);
    expect(confirmations.expireDue).toHaveBeenCalledWith(now);
    expect(confirmations.sendDueReminders).toHaveBeenCalledWith(now);
  });

  it('une panne de l’expiration n’empêche pas les rappels (et inversement)', async () => {
    confirmations.expireDue.mockRejectedValueOnce(new Error('base indisponible'));
    await expect(task.execute(new Date())).resolves.toBeUndefined();
    expect(confirmations.sendDueReminders).toHaveBeenCalled();

    confirmations.sendDueReminders.mockRejectedValueOnce(new Error('Resend en panne'));
    await expect(task.execute(new Date())).resolves.toBeUndefined();
  });

  it('ne tourne pas si une autre instance détient le verrou', async () => {
    prisma.$transaction.mockImplementationOnce((fn: (tx: unknown) => unknown) =>
      fn({ $queryRaw: jest.fn().mockResolvedValue([{ locked: false }]) }),
    );
    await task.run();
    expect(confirmations.expireDue).not.toHaveBeenCalled();
  });
});
