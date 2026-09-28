import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PayoutsService } from './payouts.service';
import { PaydunyaError } from '../payments/paydunya.service';
import { PAYOUT_MAX_ATTEMPTS } from '../../common/constants';

describe('PayoutsService', () => {
  let service: PayoutsService;
  let prisma: {
    payment: { findUnique: jest.Mock };
    payout: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    payoutAccount: { findUnique: jest.Mock };
    user: { findMany: jest.Mock };
  };
  let paydunya: {
    isDisburseEnabled: jest.Mock;
    createDisbursement: jest.Mock;
    submitDisbursement: jest.Mock;
    checkDisbursementStatus: jest.Mock;
  };
  let notify: { notifyUser: jest.Mock };
  let config: { getOrThrow: jest.Mock };

  function makePayout(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'payout-1',
      paymentId: 'payment-1',
      beneficiaryUserId: 'owner-1',
      amount: 55_000,
      status: 'SENDING',
      attempts: 1,
      disburseToken: null,
      operator: 'TMONEY',
      phone: '90330557',
      payment: {
        lease: { property: { address: null, neighborhood: 'Bè', city: 'Lomé' } },
      },
      beneficiary: { id: 'owner-1', firstName: 'Jean', lastName: 'Dupont', role: 'OWNER' },
      ...overrides,
    };
  }

  // Statuts vers lesquels le service a fait transiter le Payout (hors prise
  // en charge initiale PENDING → SENDING).
  function transitions(): string[] {
    return prisma.payout.updateMany.mock.calls
      .map(([arg]: [{ data: { status?: string } }]) => arg.data.status)
      .filter((status: string | undefined): status is string => status !== undefined);
  }

  // Données de la première écriture qui pose ce statut (hors prise en charge).
  function updateManyData(status: string): Record<string, unknown> {
    const call = (
      prisma.payout.updateMany.mock.calls as Array<[{ data: Record<string, unknown> }]>
    ).find(([arg]) => arg.data['status'] === status);
    if (!call) throw new Error(`aucune écriture avec le statut ${status}`);
    return call[0].data;
  }

  beforeEach(() => {
    prisma = {
      payment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'payment-1',
          source: 'PAYDUNYA_API',
          status: 'PAID',
          paidAmount: 55_000,
          beneficiaryUserId: 'owner-1',
        }),
      },
      payout: {
        create: jest.fn().mockResolvedValue({ id: 'payout-1' }),
        findUnique: jest.fn().mockResolvedValue(makePayout()),
        findUniqueOrThrow: jest.fn().mockResolvedValue(makePayout({ status: 'PENDING' })),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payoutAccount: {
        findUnique: jest.fn().mockResolvedValue({ operator: 'TMONEY', phone: '90330557' }),
      },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'admin-1' }]) },
    };
    paydunya = {
      isDisburseEnabled: jest.fn().mockReturnValue(true),
      createDisbursement: jest.fn().mockResolvedValue({ token: 'disb-token-1' }),
      submitDisbursement: jest.fn().mockResolvedValue({ status: 'pending', transactionId: null }),
      checkDisbursementStatus: jest
        .fn()
        .mockResolvedValue({ status: 'created', fees: null, transactionId: null }),
    };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };
    config = { getOrThrow: jest.fn().mockReturnValue('https://api.example.com/api') };

    service = new PayoutsService(
      prisma as never,
      paydunya as never,
      notify as never,
      config as never,
    );
  });

  describe('createForPayment', () => {
    it('crée un reversement du loyer (paidAmount) vers le bénéficiaire figé sur le paiement', async () => {
      await service.createForPayment('payment-1');

      expect(prisma.payout.create).toHaveBeenCalledWith({
        data: { paymentId: 'payment-1', beneficiaryUserId: 'owner-1', amount: 55_000 },
      });
    });

    it.each([
      ['un paiement introuvable', null],
      [
        'un paiement non PayDunya',
        { source: 'MANUAL_OWNER', status: 'PAID', beneficiaryUserId: 'o' },
      ],
      [
        'un paiement non confirmé',
        { source: 'PAYDUNYA_API', status: 'PENDING', beneficiaryUserId: 'o' },
      ],
      [
        'un paiement antérieur au reversement (sans bénéficiaire)',
        { source: 'PAYDUNYA_API', status: 'PAID', beneficiaryUserId: null },
      ],
    ])('ne crée rien pour %s', async (_label, payment) => {
      prisma.payment.findUnique.mockResolvedValue(payment);

      await expect(service.createForPayment('payment-1')).resolves.toBeNull();
      expect(prisma.payout.create).not.toHaveBeenCalled();
    });

    it('est idempotent : un événement rejoué retombe sur le reversement existant', async () => {
      prisma.payout.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'x' }),
      );
      prisma.payout.findUnique.mockResolvedValue({ id: 'payout-1' });

      await expect(service.createForPayment('payment-1')).resolves.toEqual({ id: 'payout-1' });
    });
  });

  describe('process', () => {
    it('ne fait rien en mode test / PayDunya non configuré', async () => {
      paydunya.isDisburseEnabled.mockReturnValue(false);

      await service.process('payout-1');

      expect(prisma.payout.updateMany).not.toHaveBeenCalled();
      expect(paydunya.createDisbursement).not.toHaveBeenCalled();
    });

    it('ne fait aucun appel PayDunya si un autre traitement a déjà pris le reversement', async () => {
      prisma.payout.updateMany.mockResolvedValue({ count: 0 });

      await service.process('payout-1');

      expect(paydunya.createDisbursement).not.toHaveBeenCalled();
      expect(paydunya.submitDisbursement).not.toHaveBeenCalled();
    });

    it('envoie : jeton persisté AVANT submit, submit seulement si le jeton est `created`, puis SUCCESS + notification', async () => {
      paydunya.checkDisbursementStatus
        .mockResolvedValueOnce({ status: 'created', fees: null, transactionId: null })
        .mockResolvedValueOnce({ status: 'success', fees: 8, transactionId: 'TFA-1' });

      await service.process('payout-1');

      expect(paydunya.createDisbursement).toHaveBeenCalledWith({
        amount: 55_000,
        operator: 'TMONEY',
        phone: '90330557',
        callbackUrl: 'https://api.example.com/api/payouts/webhooks/paydunya?payoutId=payout-1',
      });
      expect(prisma.payout.update).toHaveBeenCalledWith({
        where: { id: 'payout-1' },
        data: { disburseToken: 'disb-token-1', operator: 'TMONEY', phone: '90330557' },
      });
      // Ordre : persistance du jeton avant l'appel qui déplace l'argent.
      expect(prisma.payout.update.mock.invocationCallOrder[0]).toBeLessThan(
        paydunya.submitDisbursement.mock.invocationCallOrder[0],
      );
      expect(paydunya.submitDisbursement).toHaveBeenCalledWith('disb-token-1', 'payout-1');

      expect(updateManyData('SUCCESS')).toMatchObject({ providerFee: 8, transactionId: 'TFA-1' });
      expect(notify.notifyUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'owner-1', event: 'payout-sent' }),
      );
    });

    it('reste SENDING (ni succès ni relance) tant que PayDunya répond `pending`', async () => {
      paydunya.checkDisbursementStatus
        .mockResolvedValueOnce({ status: 'created', fees: null, transactionId: null })
        .mockResolvedValueOnce({ status: 'pending', fees: null, transactionId: null });

      await service.process('payout-1');

      expect(transitions()).toEqual(['SENDING']); // uniquement la prise en charge
      expect(notify.notifyUser).not.toHaveBeenCalled();
    });

    it('NE REJOUE JAMAIS submit quand le jeton existe déjà et n’est plus `created` (pas de double envoi)', async () => {
      prisma.payout.findUnique.mockResolvedValue(makePayout({ disburseToken: 'disb-token-1' }));
      paydunya.checkDisbursementStatus.mockResolvedValue({
        status: 'pending',
        fees: null,
        transactionId: null,
      });

      await service.process('payout-1');

      expect(paydunya.createDisbursement).not.toHaveBeenCalled();
      expect(paydunya.submitDisbursement).not.toHaveBeenCalled();
    });

    it('conclut SUCCESS sur reprise d’un envoi interrompu, sans rien renvoyer', async () => {
      prisma.payout.findUnique.mockResolvedValue(makePayout({ disburseToken: 'disb-token-1' }));
      paydunya.checkDisbursementStatus.mockResolvedValue({
        status: 'success',
        fees: 8,
        transactionId: 'TFA-1',
      });

      await service.process('payout-1');

      expect(paydunya.submitDisbursement).not.toHaveBeenCalled();
      expect(transitions()).toContain('SUCCESS');
    });

    it('erreur AMBIGUË à submit (timeout) : ne relance pas, ne conclut pas, reste SENDING', async () => {
      paydunya.checkDisbursementStatus.mockResolvedValue({
        status: 'created',
        fees: null,
        transactionId: null,
      });
      paydunya.submitDisbursement.mockRejectedValue(new Error('timeout of 15000ms exceeded'));

      await service.process('payout-1');

      expect(paydunya.submitDisbursement).toHaveBeenCalledTimes(1);
      expect(transitions()).toEqual(['SENDING']);
      expect(notify.notifyUser).not.toHaveBeenCalled();
    });

    it('refus PayDunya « fonds insuffisants » : PENDING avec jeton jeté et alerte admin dès la 1re tentative', async () => {
      paydunya.checkDisbursementStatus.mockResolvedValue({
        status: 'created',
        fees: null,
        transactionId: null,
      });
      paydunya.submitDisbursement.mockRejectedValue(new PaydunyaError('Solde insuffisant', '4002'));

      await service.process('payout-1');

      const released = updateManyData('PENDING');
      expect(released).toMatchObject({ disburseToken: null, lastError: 'Solde insuffisant' });
      expect(released['nextAttemptAt']).toBeInstanceOf(Date);
      expect(notify.notifyUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'admin-1', event: 'payout-failed-admin' }),
      );
    });

    it('passe en FAILED au plafond de tentatives et prévient le bénéficiaire ET les admins', async () => {
      prisma.payout.findUnique.mockResolvedValue(makePayout({ attempts: PAYOUT_MAX_ATTEMPTS }));
      paydunya.checkDisbursementStatus.mockResolvedValue({
        status: 'created',
        fees: null,
        transactionId: null,
      });
      paydunya.submitDisbursement.mockRejectedValue(new PaydunyaError('Compte inactif', '5000'));

      await service.process('payout-1');

      expect(transitions()).toContain('FAILED');
      const events = notify.notifyUser.mock.calls.map(
        ([arg]: [{ userId: string; event: string }]) => `${arg.userId}:${arg.event}`,
      );
      expect(events).toEqual(
        expect.arrayContaining(['owner-1:payout-failed', 'admin-1:payout-failed-admin']),
      );
    });

    it('n’envoie aucune notification si un traitement concurrent a déjà conclu (count 0)', async () => {
      prisma.payout.findUnique.mockResolvedValue(makePayout({ attempts: PAYOUT_MAX_ATTEMPTS }));
      paydunya.checkDisbursementStatus.mockResolvedValue({
        status: 'failed',
        fees: null,
        transactionId: null,
      });
      // 1re updateMany = prise en charge (count 1), les suivantes = perdues.
      prisma.payout.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValue({ count: 0 });
      prisma.payout.findUnique.mockResolvedValue(
        makePayout({ attempts: PAYOUT_MAX_ATTEMPTS, disburseToken: 'disb-token-1' }),
      );

      await service.process('payout-1');

      expect(notify.notifyUser).not.toHaveBeenCalled();
    });

    it('sans numéro de réception : relance plus tard, aucun appel PayDunya', async () => {
      prisma.payoutAccount.findUnique.mockResolvedValue(null);

      await service.process('payout-1');

      expect(paydunya.createDisbursement).not.toHaveBeenCalled();
      expect(transitions()).toContain('PENDING');
    });

    it('échec avant tout jeton (get-invoice) : échec sûr, relance planifiée', async () => {
      paydunya.createDisbursement.mockRejectedValue(new Error('ECONNRESET'));

      await service.process('payout-1');

      expect(paydunya.submitDisbursement).not.toHaveBeenCalled();
      expect(transitions()).toContain('PENDING');
    });

    it('check-status en panne alors que le jeton existe : reste SENDING, jamais de conclusion hâtive', async () => {
      prisma.payout.findUnique.mockResolvedValue(makePayout({ disburseToken: 'disb-token-1' }));
      paydunya.checkDisbursementStatus.mockRejectedValue(new Error('network'));

      await service.process('payout-1');

      expect(paydunya.submitDisbursement).not.toHaveBeenCalled();
      expect(transitions()).toEqual(['SENDING']);
    });
  });

  describe('retry', () => {
    it('remet un reversement FAILED à zéro et le retraite', async () => {
      await service.retry('payout-1');

      const [[resetArgs]] = prisma.payout.updateMany.mock.calls as [[{ where: unknown }]];
      expect(resetArgs.where).toEqual({ id: 'payout-1', status: 'FAILED' });
      expect(updateManyData('PENDING')).toMatchObject({ attempts: 0, disburseToken: null });
      expect(paydunya.isDisburseEnabled).toHaveBeenCalled();
    });

    it('refuse de relancer un reversement qui n’est pas en échec', async () => {
      prisma.payout.updateMany.mockResolvedValue({ count: 0 });
      prisma.payout.findUnique.mockResolvedValue({ id: 'payout-1' });

      await expect(service.retry('payout-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('404 sur un reversement inconnu', async () => {
      prisma.payout.updateMany.mockResolvedValue({ count: 0 });
      prisma.payout.findUnique.mockResolvedValue(null);

      await expect(service.retry('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('handleCallback', () => {
    it('ignore un callback sans payoutId', async () => {
      await expect(service.handleCallback(undefined)).resolves.toEqual({ status: 'ignored' });
      expect(paydunya.checkDisbursementStatus).not.toHaveBeenCalled();
    });

    it('revérifie le statut chez PayDunya (jamais le payload) et conclut SUCCESS', async () => {
      prisma.payout.findUnique.mockResolvedValue(makePayout({ disburseToken: 'disb-token-1' }));
      paydunya.checkDisbursementStatus.mockResolvedValue({
        status: 'success',
        fees: 8,
        transactionId: 'TFA-1',
      });

      await expect(service.handleCallback('payout-1')).resolves.toEqual({ status: 'ok' });

      expect(paydunya.checkDisbursementStatus).toHaveBeenCalledWith('disb-token-1');
      expect(transitions()).toContain('SUCCESS');
    });

    it('répond ok même si la vérification échoue (rattrapage par le cron)', async () => {
      prisma.payout.findUnique.mockResolvedValue(makePayout({ disburseToken: 'disb-token-1' }));
      paydunya.checkDisbursementStatus.mockRejectedValue(new Error('boom'));

      await expect(service.handleCallback('payout-1')).resolves.toEqual({ status: 'ok' });
    });
  });
});
