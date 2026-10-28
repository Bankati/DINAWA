import { withAdvisoryLock } from './advisory-lock';

// Le verrou vit dans une transaction (correctif du 2026-10-18, pooler
// Supabase en mode transaction) : ces tests vérifient le contrat ; le
// comportement réel face au pooler a été vérifié sur la base partagée.
describe('withAdvisoryLock', () => {
  let tx: { $queryRaw: jest.Mock };
  let prisma: { $transaction: jest.Mock };

  beforeEach(() => {
    tx = { $queryRaw: jest.fn().mockResolvedValue([{ locked: true }]) };
    prisma = {
      $transaction: jest.fn((work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    };
  });

  it('verrou obtenu : exécute la tâche et renvoie son résultat', async () => {
    const task = jest.fn().mockResolvedValue(42);
    await expect(withAdvisoryLock(prisma as never, 'payouts-task', task)).resolves.toBe(42);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('verrou de transaction (libéré seul par Postgres), jamais de verrou de session', async () => {
    await withAdvisoryLock(prisma as never, 'payouts-task', jest.fn());
    const [sql] = tx.$queryRaw.mock.calls[0] as [TemplateStringsArray];
    const text = sql.join('?');
    expect(text).toContain('pg_try_advisory_xact_lock');
    expect(text).not.toContain('pg_advisory_unlock');
    // Clé passée en paramètre, jamais concaténée dans le SQL.
    expect(tx.$queryRaw.mock.calls[0]).toContain('payouts-task');
  });

  it('verrou déjà tenu (autre instance) : la tâche est sautée, renvoie null', async () => {
    tx.$queryRaw.mockResolvedValue([{ locked: false }]);
    const task = jest.fn();
    await expect(withAdvisoryLock(prisma as never, 'payouts-task', task)).resolves.toBeNull();
    expect(task).not.toHaveBeenCalled();
  });

  it('la transaction dure assez longtemps pour les tâches lentes (reversements)', async () => {
    await withAdvisoryLock(prisma as never, 'payouts-task', jest.fn());
    const [, options] = prisma.$transaction.mock.calls[0] as [unknown, { timeout: number; maxWait: number }];
    expect(options.timeout).toBeGreaterThanOrEqual(5 * 60 * 1000);
    expect(options.maxWait).toBeGreaterThan(0);
  });

  it('une erreur de la tâche remonte (la transaction est annulée, le verrou tombe)', async () => {
    await expect(
      withAdvisoryLock(prisma as never, 'payouts-task', () => Promise.reject(new Error('PayDunya injoignable'))),
    ).rejects.toThrow('PayDunya injoignable');
  });
});
