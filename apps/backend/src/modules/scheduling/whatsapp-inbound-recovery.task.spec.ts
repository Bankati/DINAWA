import { WhatsappInboundRecoveryTask } from './whatsapp-inbound-recovery.task';

// Verrou de transaction (correctif #79, pooler Supabase) : la tâche s'exécute
// dans prisma.$transaction, le verrou est pris par tx.$queryRaw et libéré
// seul par Postgres à la fin de la transaction.
describe('WhatsappInboundRecoveryTask', () => {
  let tx: { $queryRaw: jest.Mock };
  let prisma: { $transaction: jest.Mock };
  let processor: { recoverPending: jest.Mock };
  let task: WhatsappInboundRecoveryTask;

  beforeEach(() => {
    tx = { $queryRaw: jest.fn().mockResolvedValue([{ locked: true }]) };
    prisma = {
      $transaction: jest.fn((work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    };
    processor = { recoverPending: jest.fn().mockResolvedValue(2) };
    task = new WhatsappInboundRecoveryTask(prisma as never, processor as never);
  });

  it('reprend les messages en attente sous verrou Postgres', async () => {
    await task.run();
    expect(processor.recoverPending).toHaveBeenCalledTimes(1);
    // Un seul appel : le verrou de transaction se libère sans « unlock ».
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('ne fait rien si une autre instance détient le verrou', async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ locked: false }]);
    await task.run();
    expect(processor.recoverPending).not.toHaveBeenCalled();
  });
});
