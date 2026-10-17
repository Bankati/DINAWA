import { WhatsappRetryTask } from './whatsapp-retry.task';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';
import { WHATSAPP_MAX_ATTEMPTS, WHATSAPP_RETRY_WINDOW_MS } from '../../common/constants';

jest.mock('../../common/utils/advisory-lock', () => ({
  withAdvisoryLock: jest.fn((_prisma: unknown, _key: string, task: () => Promise<unknown>) => task()),
}));
jest.mock('@sentry/nestjs', () => ({ captureMessage: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Sentry = require('@sentry/nestjs') as { captureMessage: jest.Mock };

const NOW = new Date('2026-10-16T20:00:00.000Z');
const FIRST_SENT = new Date('2026-10-16T19:40:00.000Z');

function failed(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'wa-1',
    userId: 'tenant-1',
    source: 'payment-reminder',
    templateName: 'rappel_loyer',
    payload: { bodyParams: ['Ama', '75 000', 'Bè, Lomé', '31/10/2026'], buttonParam: 'jeton' },
    scheduleEntryId: 'entry-1',
    paymentId: null,
    attempt: 1,
    firstAttemptAt: null,
    createdAt: FIRST_SENT,
    ...overrides,
  };
}

describe('WhatsappRetryTask (unité 46)', () => {
  let prisma: {
    whatsappMessage: { findMany: jest.Mock; updateMany: jest.Mock };
    paymentScheduleEntry: { findMany: jest.Mock };
  };
  let whatsapp: { send: jest.Mock };
  let task: WhatsappRetryTask;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      whatsappMessage: { findMany: jest.fn().mockResolvedValue([failed()]), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      paymentScheduleEntry: { findMany: jest.fn().mockResolvedValue([]) },
    };
    whatsapp = { send: jest.fn().mockResolvedValue({ outcome: 'SENT', messageId: 'wa-2', wamid: 'w' }) };
    task = new WhatsappRetryTask(prisma as never, whatsapp as never);
  });

  it('tourne sous verrou Postgres', async () => {
    await task.run();
    expect(withAdvisoryLock).toHaveBeenCalledWith(prisma, 'whatsapp-retry-task', expect.any(Function));
  });

  it('candidats : refus temporaires des modèles réessayables, tentative < 3, premier envoi il y a moins d’une heure — jamais UNKNOWN', async () => {
    await task.retryFailed(NOW);
    const [args] = prisma.whatsappMessage.findMany.mock.calls[0] as [{ where: Record<string, unknown>; take: number }];
    const windowStart = new Date(NOW.getTime() - WHATSAPP_RETRY_WINDOW_MS);
    expect(args.where).toEqual({
      direction: 'OUTBOUND',
      status: 'FAILED',
      retryable: true,
      userId: { not: null },
      templateName: { in: ['rappel_loyer', 'loyer_en_retard'] },
      attempt: { lt: WHATSAPP_MAX_ATTEMPTS },
      OR: [{ firstAttemptAt: null, createdAt: { gte: windowStart } }, { firstAttemptAt: { gte: windowStart } }],
    });
    expect(args.take).toBeLessThanOrEqual(100);
  });

  it('réserve l’envoi raté puis le renvoie comme tentative 2 de la même série', async () => {
    await expect(task.retryFailed(NOW)).resolves.toBe(1);
    expect(prisma.whatsappMessage.updateMany).toHaveBeenCalledWith({
      where: { id: 'wa-1', status: 'FAILED', retryable: true },
      data: { retryable: false },
    });
    expect(whatsapp.send).toHaveBeenCalledWith({
      userId: 'tenant-1',
      source: 'payment-reminder',
      scheduleEntryId: 'entry-1',
      paymentId: undefined,
      kind: 'template',
      template: { name: 'rappel_loyer', bodyParams: ['Ama', '75 000', 'Bè, Lomé', '31/10/2026'], buttonParam: 'jeton' },
      retryOf: { attempt: 2, firstAttemptAt: FIRST_SENT },
    });
  });

  it('deux exécutions en même temps : celle qui perd la réservation ne renvoie rien', async () => {
    prisma.whatsappMessage.updateMany.mockResolvedValue({ count: 0 });
    await expect(task.retryFailed(NOW)).resolves.toBe(0);
    expect(whatsapp.send).not.toHaveBeenCalled();
  });

  it('tentative 3 garde l’heure du premier envoi (limite d’une heure comptée depuis lui)', async () => {
    const first = new Date('2026-10-16T19:20:00.000Z');
    prisma.whatsappMessage.findMany.mockResolvedValue([failed({ attempt: 2, firstAttemptAt: first, createdAt: NOW })]);
    await task.retryFailed(NOW);
    expect(whatsapp.send).toHaveBeenCalledWith(expect.objectContaining({ retryOf: { attempt: 3, firstAttemptAt: first } }));
  });

  it('3e tentative encore refusée : abandon signalé', async () => {
    prisma.whatsappMessage.findMany.mockResolvedValue([failed({ attempt: 2, firstAttemptAt: FIRST_SENT })]);
    whatsapp.send.mockResolvedValue({ outcome: 'FAILED', messageId: 'wa-3', retryable: true });
    await task.retryFailed(NOW);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(expect.stringContaining('abandonné après 3 tentatives'), 'warning');
  });

  it('échéance payée entre-temps : pas de rappel « à régler »', async () => {
    prisma.paymentScheduleEntry.findMany.mockResolvedValue([{ id: 'entry-1' }]);
    await expect(task.retryFailed(NOW)).resolves.toBe(0);
    expect(whatsapp.send).not.toHaveBeenCalled();
    // Une seule requête pour tout le lot.
    expect(prisma.paymentScheduleEntry.findMany).toHaveBeenCalledTimes(1);
  });

  it('contenu illisible ou modèle non réessayable (quittance) : jamais renvoyé', async () => {
    prisma.whatsappMessage.findMany.mockResolvedValue([
      failed({ id: 'wa-a', payload: { autre: true } }),
      failed({ id: 'wa-b', templateName: 'paiement_recu' }),
    ]);
    await expect(task.retryFailed(NOW)).resolves.toBe(0);
    expect(whatsapp.send).not.toHaveBeenCalled();
  });

  it('21 h (heure de Lomé) : hors plage, rien n’est réservé ni renvoyé', async () => {
    await expect(task.retryFailed(new Date('2026-10-16T21:00:00.000Z'))).resolves.toBe(0);
    expect(prisma.whatsappMessage.findMany).not.toHaveBeenCalled();
    expect(prisma.whatsappMessage.updateMany).not.toHaveBeenCalled();
  });

  describe('abandon hors délai (/review unité 46)', () => {
    it('envois expirés avant la 3e tentative : marqués non réessayables et UNE alerte pour le lot', async () => {
      prisma.whatsappMessage.findMany.mockResolvedValue([{ id: 'wa-a' }, { id: 'wa-b' }]);
      prisma.whatsappMessage.updateMany.mockResolvedValue({ count: 2 });

      await expect(task.alertExpired(NOW)).resolves.toBe(2);

      const windowStart = new Date(NOW.getTime() - WHATSAPP_RETRY_WINDOW_MS);
      const [find] = prisma.whatsappMessage.findMany.mock.calls[0] as [{ where: Record<string, unknown> }];
      expect(find.where).toMatchObject({
        status: 'FAILED',
        retryable: true,
        attempt: { lt: WHATSAPP_MAX_ATTEMPTS },
        OR: [{ firstAttemptAt: null, createdAt: { lt: windowStart } }, { firstAttemptAt: { lt: windowStart } }],
      });
      const [update] = prisma.whatsappMessage.updateMany.mock.calls[0] as [{ where: Record<string, unknown>; data: unknown }];
      expect(update.where).toMatchObject({ retryable: true, id: { in: ['wa-a', 'wa-b'] } });
      expect(update.data).toEqual({ retryable: false });
      expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
      expect(Sentry.captureMessage).toHaveBeenCalledWith(expect.stringContaining('2 envoi(s) abandonné(s)'), 'warning');
    });

    it('déjà marqués par une autre exécution : aucune alerte en double', async () => {
      prisma.whatsappMessage.findMany.mockResolvedValue([{ id: 'wa-a' }]);
      prisma.whatsappMessage.updateMany.mockResolvedValue({ count: 0 });
      await expect(task.alertExpired(NOW)).resolves.toBe(0);
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });

    it('rien d’expiré : ni écriture ni alerte', async () => {
      prisma.whatsappMessage.findMany.mockResolvedValue([]);
      await expect(task.alertExpired(NOW)).resolves.toBe(0);
      expect(prisma.whatsappMessage.updateMany).not.toHaveBeenCalled();
    });
  });

  it('une erreur sur un message n’empêche pas les suivants', async () => {
    prisma.whatsappMessage.findMany.mockResolvedValue([failed({ id: 'wa-a' }), failed({ id: 'wa-b', scheduleEntryId: null })]);
    prisma.whatsappMessage.updateMany.mockRejectedValueOnce(new Error('coupure')).mockResolvedValueOnce({ count: 1 });
    await expect(task.retryFailed(NOW)).resolves.toBe(1);
  });
});
