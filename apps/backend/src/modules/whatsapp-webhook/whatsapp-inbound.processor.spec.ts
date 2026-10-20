import * as Sentry from '@sentry/nestjs';
import { WhatsappInboundProcessor } from './whatsapp-inbound.processor';
import { WHATSAPP_INBOUND_MAX_ATTEMPTS, WHATSAPP_INBOUND_RETRY_AFTER_MS } from '../../common/constants';

jest.mock('@sentry/nestjs', () => ({ captureMessage: jest.fn() }));

const NOW = new Date('2026-10-13T10:00:00Z');
const STOP_AT = new Date('2026-10-13T09:59:30Z');
const STOP_META_AT = new Date('2026-10-13T09:59:28Z');

describe('WhatsappInboundProcessor', () => {
  let prisma: {
    whatsappMessage: { updateMany: jest.Mock; findUnique: jest.Mock; findFirst: jest.Mock; update: jest.Mock; findMany: jest.Mock };
  };
  let whatsapp: { sendStopConfirmation: jest.Mock; reply: jest.Mock };
  let bot: { handle: jest.Mock };
  let processor: WhatsappInboundProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      whatsappMessage: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest
          .fn()
          .mockResolvedValue({ userId: 'tenant-1', inboundAction: 'STOP_CONFIRMATION', createdAt: STOP_AT, sentAt: STOP_META_AT, processingAttempts: 1 }),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    whatsapp = {
      sendStopConfirmation: jest.fn().mockResolvedValue({ outcome: 'SENT', messageId: 'out-1', wamid: 'w' }),
      reply: jest.fn().mockResolvedValue({ outcome: 'SENT', messageId: 'out-2', wamid: 'w2' }),
    };
    bot = { handle: jest.fn().mockResolvedValue(undefined) };
    processor = new WhatsappInboundProcessor(prisma as never, whatsapp as never, bot as never);
  });

  it('action BOT : le robot reçoit le message (texte, contenu, heure Meta), puis le message est marqué traité (unité 47)', async () => {
    prisma.whatsappMessage.findUnique.mockResolvedValue({
      userId: 'tenant-1',
      inboundAction: 'BOT',
      createdAt: STOP_AT,
      sentAt: STOP_META_AT,
      processingAttempts: 1,
      body: 'payer',
      payload: { replyId: 'PAY' },
    });
    await processor.process('in-1', NOW);
    expect(bot.handle).toHaveBeenCalledWith({
      messageId: 'in-1',
      userId: 'tenant-1',
      receivedAt: STOP_META_AT,
      text: 'payer',
      payload: { replyId: 'PAY' },
    });
    expect(whatsapp.reply).not.toHaveBeenCalled();
    expect(prisma.whatsappMessage.update).toHaveBeenCalled();
  });

  it('réserve le message par une écriture conditionnelle avant de le traiter', async () => {
    await processor.process('in-1', NOW);
    const cutoff = new Date(NOW.getTime() - WHATSAPP_INBOUND_RETRY_AFTER_MS);
    expect(prisma.whatsappMessage.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'in-1',
        direction: 'INBOUND',
        processedAt: null,
        inboundAction: { not: null },
        processingAttempts: { lt: WHATSAPP_INBOUND_MAX_ATTEMPTS },
        OR: [{ processingStartedAt: null }, { processingStartedAt: { lt: cutoff } }],
      },
      data: { processingStartedAt: NOW, processingAttempts: { increment: 1 } },
    });
  });

  it('envoie la confirmation du STOP puis marque le message traité', async () => {
    await processor.process('in-1', NOW);
    // Fenêtre de 24 h comptée depuis l'heure Meta du STOP (unité 45).
    expect(whatsapp.sendStopConfirmation).toHaveBeenCalledWith('tenant-1', STOP_META_AT);
    expect(prisma.whatsappMessage.update).toHaveBeenCalledWith({
      where: { id: 'in-1' },
      data: { processedAt: expect.any(Date) as unknown },
    });
  });

  it.each([
    ['CONSENT_WELCOME', 'consent-welcome'],
    ['RESUME_CONFIRMATION', 'resume-confirmation'],
  ] as const)('%s : réponse libre avec tous les contrôles refaits à l’envoi (unité 45)', async (action, source) => {
    prisma.whatsappMessage.findUnique.mockResolvedValue({
      userId: 'tenant-1',
      inboundAction: action,
      createdAt: STOP_AT,
      sentAt: STOP_META_AT,
      processingAttempts: 1,
    });
    await processor.process('in-1', NOW);
    expect(whatsapp.reply).toHaveBeenCalledWith({
      userId: 'tenant-1',
      source,
      text: expect.stringContaining('STOP') as unknown,
      inboundReceivedAt: STOP_META_AT,
    });
    expect(whatsapp.sendStopConfirmation).not.toHaveBeenCalled();
    expect(prisma.whatsappMessage.findFirst).toHaveBeenCalledWith({
      where: { userId: 'tenant-1', direction: 'OUTBOUND', source, createdAt: { gte: STOP_AT } },
      select: { id: true },
    });
    expect(prisma.whatsappMessage.update).toHaveBeenCalled();
  });

  it('bienvenue refusée (STOP ou changement de numéro depuis, fenêtre fermée) : tâche abandonnée, rien n’est relancé', async () => {
    prisma.whatsappMessage.findUnique.mockResolvedValue({
      userId: 'tenant-1',
      inboundAction: 'CONSENT_WELCOME',
      createdAt: STOP_AT,
      sentAt: STOP_META_AT,
      processingAttempts: 1,
    });
    whatsapp.reply.mockResolvedValue({ outcome: 'REFUSED', reason: 'NO_CONSENT' });
    await processor.process('in-1', NOW);
    expect(prisma.whatsappMessage.update).toHaveBeenCalledWith({
      where: { id: 'in-1' },
      data: { processedAt: expect.any(Date) as unknown },
    });
  });

  it('ne fait rien si le message est déjà traité ou en cours ailleurs', async () => {
    prisma.whatsappMessage.updateMany.mockResolvedValue({ count: 0 });
    await processor.process('in-1', NOW);
    expect(whatsapp.sendStopConfirmation).not.toHaveBeenCalled();
    expect(prisma.whatsappMessage.update).not.toHaveBeenCalled();
  });

  it('ne renvoie jamais une confirmation déjà créée depuis le STOP (traitement interrompu puis repris)', async () => {
    prisma.whatsappMessage.findFirst.mockResolvedValue({ id: 'out-1' });
    await processor.process('in-1', NOW);
    expect(prisma.whatsappMessage.findFirst).toHaveBeenCalledWith({
      where: { userId: 'tenant-1', direction: 'OUTBOUND', source: 'stop-confirmation', createdAt: { gte: STOP_AT } },
      select: { id: true },
    });
    expect(whatsapp.sendStopConfirmation).not.toHaveBeenCalled();
    expect(prisma.whatsappMessage.update).toHaveBeenCalled();
  });

  it.each(['REFUSED', 'FAILED', 'UNKNOWN'] as const)(
    'une confirmation %s ne relance rien : l’arrêt est déjà enregistré',
    async (outcome) => {
      whatsapp.sendStopConfirmation.mockResolvedValue({ outcome, reason: 'CHANNEL_DISABLED', messageId: 'o', retryable: true });
      await processor.process('in-1', NOW);
      expect(prisma.whatsappMessage.update).toHaveBeenCalled();
    },
  );

  it('une erreur laisse le message dans la liste de travail, sans alerte avant le dernier essai', async () => {
    whatsapp.sendStopConfirmation.mockRejectedValue(new Error('base indisponible'));
    await processor.process('in-1', NOW);
    expect(prisma.whatsappMessage.update).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it(`met le message de côté et alerte après ${WHATSAPP_INBOUND_MAX_ATTEMPTS} échecs`, async () => {
    prisma.whatsappMessage.findUnique.mockResolvedValue({
      userId: 'tenant-1',
      inboundAction: 'STOP_CONFIRMATION',
      createdAt: STOP_AT,
      sentAt: STOP_META_AT,
      processingAttempts: WHATSAPP_INBOUND_MAX_ATTEMPTS,
    });
    whatsapp.sendStopConfirmation.mockRejectedValue(new Error('base indisponible'));
    await processor.process('in-1', NOW);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(expect.stringContaining('mis de côté'), 'error');
  });

  it('le signal du webhook ne lève jamais, même base indisponible à la réservation', async () => {
    prisma.whatsappMessage.updateMany.mockRejectedValue(new Error('base indisponible'));
    await expect(processor.handle({ messageId: 'in-1' })).resolves.toBeUndefined();
  });

  it('le rattrapage reprend les messages restés en attente, les plus anciens d’abord', async () => {
    prisma.whatsappMessage.findMany.mockResolvedValue([{ id: 'in-1' }, { id: 'in-2' }]);
    const recovered = await processor.recoverPending(NOW);
    const cutoff = new Date(NOW.getTime() - WHATSAPP_INBOUND_RETRY_AFTER_MS);
    expect(prisma.whatsappMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ processedAt: null, createdAt: { lt: cutoff } }) as unknown,
        orderBy: { createdAt: 'asc' },
      }),
    );
    expect(recovered).toBe(2);
    expect(whatsapp.sendStopConfirmation).toHaveBeenCalledTimes(2);
  });

  it('une erreur sur un message du rattrapage n’empêche pas les suivants', async () => {
    prisma.whatsappMessage.findMany.mockResolvedValue([{ id: 'in-1' }, { id: 'in-2' }]);
    prisma.whatsappMessage.updateMany.mockRejectedValueOnce(new Error('coupure')).mockResolvedValueOnce({ count: 1 });
    await processor.recoverPending(NOW);
    expect(whatsapp.sendStopConfirmation).toHaveBeenCalledTimes(1);
  });
});
