import { WhatsappInboundRecoveryTask } from './whatsapp-inbound-recovery.task';

describe('WhatsappInboundRecoveryTask', () => {
  let prisma: { $queryRaw: jest.Mock };
  let processor: { recoverPending: jest.Mock };
  let task: WhatsappInboundRecoveryTask;

  beforeEach(() => {
    prisma = { $queryRaw: jest.fn().mockResolvedValue([{ locked: true }]) };
    processor = { recoverPending: jest.fn().mockResolvedValue(2) };
    task = new WhatsappInboundRecoveryTask(prisma as never, processor as never);
  });

  it('reprend les messages en attente sous verrou Postgres', async () => {
    await task.run();
    expect(processor.recoverPending).toHaveBeenCalledTimes(1);
    // Verrou pris puis relâché.
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('ne fait rien si une autre instance détient le verrou', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ locked: false }]);
    await task.run();
    expect(processor.recoverPending).not.toHaveBeenCalled();
  });
});
