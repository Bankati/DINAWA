import { PaydunyaReconciliationTask } from './paydunya-reconciliation.task';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';

jest.mock('../../common/utils/advisory-lock', () => ({
  withAdvisoryLock: jest.fn((_prisma: unknown, _key: string, task: () => Promise<unknown>) =>
    task(),
  ),
}));

describe('PaydunyaReconciliationTask', () => {
  let task: PaydunyaReconciliationTask;
  let prisma: { payment: { findMany: jest.Mock } };
  let paymentsService: { reconcilePaydunyaPayment: jest.Mock };

  beforeEach(() => {
    prisma = { payment: { findMany: jest.fn().mockResolvedValue([]) } };
    paymentsService = { reconcilePaydunyaPayment: jest.fn().mockResolvedValue(undefined) };
    task = new PaydunyaReconciliationTask(prisma as never, paymentsService as never);
    (withAdvisoryLock as jest.Mock).mockClear();
  });

  it('pose un verrou applicatif avant de tourner', async () => {
    await task.run();
    expect(withAdvisoryLock).toHaveBeenCalledWith(
      prisma,
      'paydunya-reconciliation-task',
      expect.any(Function),
    );
  });

  it('ne cible que les Payment PAYDUNYA_API PENDING avec transactionId, restés bloqués au-delà du seuil', async () => {
    await task.run();

    const [findManyArgs] = prisma.payment.findMany.mock.calls[0] as [
      { where: Record<string, unknown>; take: number },
    ];
    expect(findManyArgs.where).toEqual(
      expect.objectContaining({
        source: 'PAYDUNYA_API',
        status: 'PENDING',
        transactionId: { not: null },
      }),
    );
    expect(findManyArgs.take).toBe(100);
  });

  it('réconcilie chaque candidat trouvé', async () => {
    prisma.payment.findMany.mockResolvedValue([{ id: 'payment-1' }, { id: 'payment-2' }]);

    await task.run();

    expect(paymentsService.reconcilePaydunyaPayment).toHaveBeenCalledWith('payment-1');
    expect(paymentsService.reconcilePaydunyaPayment).toHaveBeenCalledWith('payment-2');
  });

  it("continue sur les autres candidats si l'un échoue", async () => {
    prisma.payment.findMany.mockResolvedValue([{ id: 'payment-1' }, { id: 'payment-2' }]);
    paymentsService.reconcilePaydunyaPayment.mockRejectedValueOnce(new Error('boom'));

    await expect(task.run()).resolves.toBeUndefined();
    expect(paymentsService.reconcilePaydunyaPayment).toHaveBeenCalledTimes(2);
  });
});
