import { PayoutsTask } from './payouts.task';

jest.mock('../../common/utils/advisory-lock', () => ({
  withAdvisoryLock: jest.fn((_prisma: unknown, _key: string, fn: () => Promise<void>) => fn()),
}));

describe('PayoutsTask', () => {
  let task: PayoutsTask;
  let prisma: {
    payment: { findMany: jest.Mock };
    payout: { findMany: jest.Mock };
  };
  let payouts: { createForPayment: jest.Mock; process: jest.Mock };

  beforeEach(() => {
    prisma = {
      payment: { findMany: jest.fn().mockResolvedValue([]) },
      payout: { findMany: jest.fn().mockResolvedValue([]) },
    };
    payouts = {
      createForPayment: jest.fn().mockResolvedValue({ id: 'payout-x' }),
      process: jest.fn().mockResolvedValue(undefined),
    };
    task = new PayoutsTask(prisma as never, payouts as never);
  });

  it('crée le reversement des paiements PayDunya confirmés qui n’en ont pas (événement perdu)', async () => {
    prisma.payment.findMany.mockResolvedValue([{ id: 'pay-1' }, { id: 'pay-2' }]);

    await task.run();

    const [findArgs] = prisma.payment.findMany.mock.calls[0] as [{ where: unknown }];
    expect(findArgs.where).toMatchObject({
      source: 'PAYDUNYA_API',
      status: 'PAID',
      beneficiaryUserId: { not: null },
      payout: { is: null },
    });
    expect(payouts.createForPayment).toHaveBeenCalledWith('pay-1');
    expect(payouts.createForPayment).toHaveBeenCalledWith('pay-2');
  });

  it('traite les reversements PENDING échus et les SENDING interrompus', async () => {
    prisma.payout.findMany.mockResolvedValue([
      { id: 'p1' },
      { id: 'p2' },
      { id: 'p3' },
      { id: 'p4' },
    ]);

    await task.run();

    const [args] = prisma.payout.findMany.mock.calls[0] as [{ where: { OR: unknown[] } }];
    expect(args.where.OR).toHaveLength(2);
    expect(payouts.process).toHaveBeenCalledTimes(4);
  });

  it('un échec sur un reversement n’empêche pas de traiter les suivants', async () => {
    prisma.payout.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    payouts.process.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);

    await expect(task.run()).resolves.toBeUndefined();

    expect(payouts.process).toHaveBeenCalledTimes(2);
  });

  it('un échec de création d’un reversement manquant n’arrête pas le rattrapage', async () => {
    prisma.payment.findMany.mockResolvedValue([{ id: 'pay-1' }, { id: 'pay-2' }]);
    payouts.createForPayment.mockRejectedValueOnce(new Error('db')).mockResolvedValue(null);

    await expect(task.run()).resolves.toBeUndefined();

    expect(payouts.createForPayment).toHaveBeenCalledTimes(2);
  });
});
