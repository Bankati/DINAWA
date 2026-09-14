import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PAYMENT_CONFIRMED } from './payment.events';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CreateManualPaymentDto } from './dto/create-manual-payment.dto';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: {
    $transaction: jest.Mock;
    paymentScheduleEntry: { findUnique: jest.Mock };
    payment: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    mandate: { findFirst: jest.Mock };
  };
  let tx: {
    payment: { create: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    paymentScheduleEntry: { update: jest.Mock };
  };
  let storage: { upload: jest.Mock };
  let notify: { notifyUser: jest.Mock };
  let events: { emit: jest.Mock };
  let paydunya: { createInvoice: jest.Mock; confirmInvoiceStatus: jest.Mock };
  let config: { getOrThrow: jest.Mock; get: jest.Mock };

  const owner = { id: 'owner-1', role: 'OWNER' } as AuthenticatedUser;
  const stranger = { id: 'stranger-1', role: 'OWNER' } as AuthenticatedUser;
  const tenant = { id: 'tenant-1', role: 'TENANT' } as AuthenticatedUser;

  function makeScheduleEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'entry-1',
      leaseId: 'lease-1',
      expectedAmount: 55000,
      paidAmount: 0,
      lease: {
        id: 'lease-1',
        ownerId: 'owner-1',
        tenantUserId: 'tenant-1',
        property: { id: 'prop-1', ownerId: 'owner-1', address: '12 rue de Lomé' },
      },
      ...overrides,
    };
  }

  function makePayment(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'payment-1',
      scheduleEntryId: 'entry-1',
      leaseId: 'lease-1',
      source: 'TENANT_DECLARATION',
      status: 'PENDING_CONFIRMATION',
      paidAmount: 55000,
      scheduleEntry: { expectedAmount: 55000, paidAmount: 0 },
      lease: {
        id: 'lease-1',
        ownerId: 'owner-1',
        tenantUserId: 'tenant-1',
        property: { id: 'prop-1', ownerId: 'owner-1', address: '12 rue de Lomé' },
        owner: { id: 'owner-1', firstName: 'Jean', lastName: 'Dupont' },
        tenant: { id: 'tenant-1', firstName: 'Ama', lastName: 'Kodjo' },
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    tx = {
      payment: {
        create: jest
          .fn()
          .mockResolvedValue(makePayment({ status: 'PAID', source: 'MANUAL_OWNER' })),
        update: jest.fn().mockResolvedValue(makePayment({ status: 'PAID' })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      paymentScheduleEntry: {
        update: jest.fn().mockResolvedValue({ paidAmount: 55000, expectedAmount: 55000 }),
      },
    };
    prisma = {
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(tx)),
      paymentScheduleEntry: { findUnique: jest.fn() },
      payment: {
        create: jest
          .fn()
          .mockResolvedValue(makePayment({ source: 'PAYDUNYA_API', status: 'PENDING' })),
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue(makePayment({ status: 'REJECTED' })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      mandate: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    storage = { upload: jest.fn().mockResolvedValue(undefined) };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };
    events = { emit: jest.fn() };
    paydunya = {
      createInvoice: jest.fn().mockResolvedValue({
        token: 'pd-token-1',
        checkoutUrl: 'https://paydunya.com/checkout/invoice/pd-token-1',
      }),
      confirmInvoiceStatus: jest.fn().mockResolvedValue({ status: 'pending', amount: null }),
    };
    config = {
      getOrThrow: jest.fn((key: string) =>
        key === 'API_BASE_URL' ? 'http://localhost:3001/api' : 'http://localhost:3000',
      ),
      get: jest.fn(),
    };

    service = new PaymentsService(
      prisma as never,
      storage as never,
      notify as never,
      events as never,
      paydunya as never,
      config as never,
    );
  });

  describe('createManual', () => {
    const dto: CreateManualPaymentDto = {
      scheduleEntryId: 'entry-1',
      paidAmount: 55000,
      paidAt: '2026-01-01',
      paymentMethod: 'CASH',
    };

    beforeEach(() => {
      prisma.paymentScheduleEntry.findUnique.mockResolvedValue(makeScheduleEntry());
    });

    it('lève NotFoundException si l’échéance est introuvable', async () => {
      prisma.paymentScheduleEntry.findUnique.mockResolvedValue(null);
      await expect(service.createManual(owner, dto)).rejects.toThrow(NotFoundException);
    });

    it('lève ForbiddenException si canMutate est faux', async () => {
      await expect(service.createManual(stranger, dto)).rejects.toThrow(ForbiddenException);
    });

    it('crée le paiement en PAID avec source MANUAL_OWNER, marque l’échéance PAID', async () => {
      await service.createManual(owner, dto);

      const [createArgs] = tx.payment.create.mock.calls[0] as [
        { data: { source: string; status: string; recordedByUserId: string } },
      ];
      expect(createArgs.data.source).toBe('MANUAL_OWNER');
      expect(createArgs.data.status).toBe('PAID');
      expect(createArgs.data.recordedByUserId).toBe('owner-1');

      expect(tx.paymentScheduleEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: { paidAmount: 55000, status: 'PAID' },
      });
    });

    it('marque l’échéance PARTIAL si le montant payé est inférieur au montant attendu', async () => {
      await service.createManual(owner, { ...dto, paidAmount: 20000 });

      expect(tx.paymentScheduleEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: { paidAmount: 20000, status: 'PARTIAL' },
      });
    });

    it('upload le justificatif si fourni et l’attache au paiement', async () => {
      const proof = { buffer: Buffer.from('x'), mimetype: 'image/jpeg' } as Express.Multer.File;
      await service.createManual(owner, dto, proof);

      expect(storage.upload).toHaveBeenCalledWith(
        'payment-proofs',
        expect.stringContaining('lease-1/'),
        proof.buffer,
        'image/jpeg',
      );
      const [createArgs] = tx.payment.create.mock.calls[0] as [
        { data: { proofStoragePath?: string } },
      ];
      expect(createArgs.data.proofStoragePath).toContain('lease-1/');
    });

    it('émet payment.confirmed après création', async () => {
      const result = await service.createManual(owner, dto);
      expect(events.emit).toHaveBeenCalledWith(PAYMENT_CONFIRMED, { paymentId: result.id });
    });

    it('permet au gestionnaire mandaté de saisir le paiement', async () => {
      const manager = { id: 'manager-1', role: 'MANAGER' } as AuthenticatedUser;
      prisma.mandate.findFirst.mockResolvedValue({ managerId: 'manager-1', status: 'ACTIVE' });
      await expect(service.createManual(manager, dto)).resolves.toBeDefined();
    });
  });

  describe('confirm', () => {
    it('lève NotFoundException si le paiement est introuvable', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.confirm(owner, 'payment-1')).rejects.toThrow(NotFoundException);
    });

    it('lève ForbiddenException si canMutate est faux', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment());
      await expect(service.confirm(stranger, 'payment-1')).rejects.toThrow(ForbiddenException);
    });

    it('lève ForbiddenException si le paiement vient de PayDunya', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment({ source: 'PAYDUNYA_API' }));
      await expect(service.confirm(owner, 'payment-1')).rejects.toThrow(ForbiddenException);
    });

    it("lève ConflictException si le paiement n'est pas PENDING_CONFIRMATION", async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment({ status: 'PAID' }));
      await expect(service.confirm(owner, 'payment-1')).rejects.toThrow(ConflictException);
    });

    it('passe le paiement à PAID, met à jour l’échéance et émet payment.confirmed', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment());

      await service.confirm(owner, 'payment-1');

      const [updateArgs] = tx.payment.update.mock.calls[0] as [
        { where: { id: string }; data: { status: string; confirmedByUserId: string } },
      ];
      expect(updateArgs.where).toEqual({ id: 'payment-1' });
      expect(updateArgs.data.status).toBe('PAID');
      expect(updateArgs.data.confirmedByUserId).toBe('owner-1');

      expect(tx.paymentScheduleEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: { paidAmount: 55000, status: 'PAID' },
      });
      expect(events.emit).toHaveBeenCalledWith(PAYMENT_CONFIRMED, { paymentId: 'payment-1' });
    });
  });

  describe('reject', () => {
    it("lève ConflictException si le paiement n'est pas PENDING_CONFIRMATION", async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment({ status: 'REJECTED' }));
      await expect(
        service.reject(owner, 'payment-1', { rejectionReason: 'Preuve invalide' }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejette le paiement avec le motif et notifie le locataire', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment());

      await service.reject(owner, 'payment-1', { rejectionReason: 'Preuve invalide' });

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: { status: 'REJECTED', rejectionReason: 'Preuve invalide' },
      });
      expect(notify.notifyUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'tenant-1', event: 'payment-rejected' }),
      );
    });

    it("n'échoue pas le rejet si la notification échoue", async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment());
      notify.notifyUser.mockRejectedValueOnce(new Error('push down'));

      await expect(
        service.reject(owner, 'payment-1', { rejectionReason: 'Preuve invalide' }),
      ).resolves.toBeDefined();
    });
  });

  describe('generateReceiptTarget', () => {
    it('lève ConflictException si le paiement n’est pas PAID', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment({ status: 'PENDING_CONFIRMATION' }));
      await expect(service.generateReceiptTarget(owner, 'payment-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('autorise le locataire concerné en lecture seule', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment({ status: 'PAID' }));
      await expect(service.generateReceiptTarget(tenant, 'payment-1')).resolves.toBeDefined();
    });

    it('rejette un tiers sans accès au bien', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment({ status: 'PAID' }));
      await expect(service.generateReceiptTarget(stranger, 'payment-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('initiate', () => {
    const dto = { scheduleEntryId: 'entry-1', paymentMethod: 'TMONEY' as const };

    beforeEach(() => {
      prisma.paymentScheduleEntry.findUnique.mockResolvedValue(makeScheduleEntry());
    });

    it("lève NotFoundException si l'échéance est introuvable", async () => {
      prisma.paymentScheduleEntry.findUnique.mockResolvedValue(null);
      await expect(service.initiate(tenant, dto)).rejects.toThrow(NotFoundException);
    });

    it("lève ForbiddenException si l'appelant n'est pas le locataire du bail", async () => {
      await expect(service.initiate(owner, dto)).rejects.toThrow(ForbiddenException);
      await expect(
        service.initiate({ id: 'other-tenant', role: 'TENANT' } as AuthenticatedUser, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lève ConflictException si l’échéance est déjà réglée', async () => {
      prisma.paymentScheduleEntry.findUnique.mockResolvedValue(
        makeScheduleEntry({ paidAmount: 55000 }),
      );
      await expect(service.initiate(tenant, dto)).rejects.toThrow(ConflictException);
    });

    it('crée un Payment PENDING/PAYDUNYA_API, persiste token + URL PayDunya, renvoie la checkoutUrl renvoyée', async () => {
      prisma.paymentScheduleEntry.findUnique.mockResolvedValue(
        makeScheduleEntry({ paidAmount: 20000 }),
      );

      const result = await service.initiate(tenant, dto);

      const [createArgs] = prisma.payment.create.mock.calls[0] as [
        { data: { source: string; status: string; paidAmount: number; paymentMethod: string } },
      ];
      expect(createArgs.data.source).toBe('PAYDUNYA_API');
      expect(createArgs.data.status).toBe('PENDING');
      expect(createArgs.data.paidAmount).toBe(35000);
      expect(createArgs.data.paymentMethod).toBe('TMONEY');

      expect(paydunya.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 35000, paymentId: 'payment-1' }),
      );
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: {
          transactionId: 'pd-token-1',
          paydunyaCheckoutUrl: 'https://paydunya.com/checkout/invoice/pd-token-1',
        },
      });
      expect(result).toEqual({
        paymentId: 'payment-1',
        checkoutUrl: 'https://paydunya.com/checkout/invoice/pd-token-1',
      });
    });

    it('lève ServiceUnavailableException si la création de facture PayDunya échoue', async () => {
      paydunya.createInvoice.mockRejectedValue(new Error('réseau down'));

      await expect(service.initiate(tenant, dto)).rejects.toThrow('indisponible');
      expect(prisma.payment.create).toHaveBeenCalled();
    });

    it('lève ServiceUnavailableException "incident technique" si la persistance de la référence échoue après création de la facture', async () => {
      prisma.payment.update.mockRejectedValue(new Error('DB down'));

      await expect(service.initiate(tenant, dto)).rejects.toThrow('incident technique');
      expect(paydunya.createInvoice).toHaveBeenCalled();
    });

    it('remappe un P2002 (deux initiate() concurrents) en 409 au lieu d’un 500 brut', async () => {
      prisma.payment.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: '5.22.0',
        }),
      );

      await expect(service.initiate(tenant, dto)).rejects.toThrow(ConflictException);
    });

    it('rejoue la facture PENDING existante si son montant correspond encore au solde restant', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'payment-existing',
        transactionId: 'pd-token-existing',
        paydunyaCheckoutUrl: 'https://paydunya.com/sandbox-checkout/invoice/pd-token-existing',
        paidAmount: 55000,
      });

      const result = await service.initiate(tenant, dto);

      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(paydunya.createInvoice).not.toHaveBeenCalled();
      expect(result).toEqual({
        paymentId: 'payment-existing',
        checkoutUrl: 'https://paydunya.com/sandbox-checkout/invoice/pd-token-existing',
      });
    });

    it('refuse (409) de rejouer une facture PENDING dont le montant ne correspond plus au solde restant', async () => {
      prisma.paymentScheduleEntry.findUnique.mockResolvedValue(
        makeScheduleEntry({ paidAmount: 20000 }), // solde restant = 35000
      );
      prisma.payment.findFirst.mockResolvedValue({
        id: 'payment-existing',
        transactionId: 'pd-token-existing',
        paydunyaCheckoutUrl: 'https://paydunya.com/checkout/invoice/pd-token-existing',
        paidAmount: 55000, // ancienne facture au montant plein
      });

      await expect(service.initiate(tenant, dto)).rejects.toThrow(ConflictException);
      expect(paydunya.createInvoice).not.toHaveBeenCalled();
    });

    it('réutilise la ligne PENDING orpheline (sans référence PayDunya) au lieu d’en créer une nouvelle', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'payment-orphan',
        transactionId: null,
        paydunyaCheckoutUrl: null,
        paidAmount: 55000,
      });
      prisma.payment.update.mockResolvedValue({ id: 'payment-orphan' });

      await service.initiate(tenant, dto);

      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'payment-orphan' } }),
      );
      expect(paydunya.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({ paymentId: 'payment-orphan' }),
      );
    });
  });

  describe('reconcilePaydunyaPayment', () => {
    function makePaydunyaPayment(overrides: Record<string, unknown> = {}): Record<string, unknown> {
      return {
        id: 'payment-1',
        scheduleEntryId: 'entry-1',
        source: 'PAYDUNYA_API',
        status: 'PENDING',
        transactionId: 'pd-token-1',
        paidAmount: 55000,
        createdAt: new Date(),
        scheduleEntry: { expectedAmount: 55000, paidAmount: 0 },
        ...overrides,
      };
    }

    it("ne fait rien si le paiement n'est pas PAYDUNYA_API ou plus PENDING", async () => {
      prisma.payment.findUnique.mockResolvedValue(makePaydunyaPayment({ status: 'PAID' }));
      await service.reconcilePaydunyaPayment('payment-1');
      expect(paydunya.confirmInvoiceStatus).not.toHaveBeenCalled();
    });

    it('ne fait rien pour un orphelin (transactionId null) encore dans le délai d’abandon', async () => {
      prisma.payment.findUnique.mockResolvedValue(
        makePaydunyaPayment({ transactionId: null, createdAt: new Date() }),
      );
      await service.reconcilePaydunyaPayment('payment-1');
      expect(paydunya.confirmInvoiceStatus).not.toHaveBeenCalled();
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });

    it('rejette un orphelin (transactionId null) passé le délai d’abandon', async () => {
      prisma.payment.findUnique.mockResolvedValue(
        makePaydunyaPayment({
          transactionId: null,
          createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        }),
      );

      await service.reconcilePaydunyaPayment('payment-1');

      expect(paydunya.confirmInvoiceStatus).not.toHaveBeenCalled();
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { id: 'payment-1', status: 'PENDING' },
        data: {
          status: 'REJECTED',
          rejectionReason:
            'Paiement PayDunya sans référence de transaction — incident technique, à relancer',
        },
      });
    });

    it('passe à PAID et émet payment.confirmed quand PayDunya confirme "completed"', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePaydunyaPayment());
      paydunya.confirmInvoiceStatus.mockResolvedValue({ status: 'completed', amount: 55000 });

      await service.reconcilePaydunyaPayment('payment-1');

      const [updateManyArgs] = tx.payment.updateMany.mock.calls[0] as [
        { where: { id: string; status: string }; data: { status: string; paidAmount: number } },
      ];
      expect(updateManyArgs.where).toEqual({ id: 'payment-1', status: 'PENDING' });
      expect(updateManyArgs.data.status).toBe('PAID');
      expect(updateManyArgs.data.paidAmount).toBe(55000);
      // Incrément atomique, jamais un SET sur valeur périmée (/review 2026-09-10)
      expect(tx.paymentScheduleEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: { paidAmount: { increment: 55000 } },
      });
      expect(events.emit).toHaveBeenCalledWith(PAYMENT_CONFIRMED, { paymentId: 'payment-1' });
    });

    it('crédite le montant confirmé par PayDunya, pas notre propre montant attendu, en cas de divergence (/architect 2026-09-14)', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePaydunyaPayment({ paidAmount: 55000 }));
      paydunya.confirmInvoiceStatus.mockResolvedValue({ status: 'completed', amount: 40000 });

      await service.reconcilePaydunyaPayment('payment-1');

      const [updateManyArgs] = tx.payment.updateMany.mock.calls[0] as [
        { data: { paidAmount: number } },
      ];
      expect(updateManyArgs.data.paidAmount).toBe(40000);
      expect(tx.paymentScheduleEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: { paidAmount: { increment: 40000 } },
      });
    });

    it("n'incrémente rien et n'émet aucun événement si un appel concurrent a déjà traité ce paiement (course webhook/cron)", async () => {
      prisma.payment.findUnique.mockResolvedValue(makePaydunyaPayment());
      paydunya.confirmInvoiceStatus.mockResolvedValue({ status: 'completed', amount: 55000 });
      tx.payment.updateMany.mockResolvedValue({ count: 0 });

      await service.reconcilePaydunyaPayment('payment-1');

      expect(tx.paymentScheduleEntry.update).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('passe à REJECTED quand PayDunya confirme "cancelled"', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePaydunyaPayment());
      paydunya.confirmInvoiceStatus.mockResolvedValue({ status: 'cancelled', amount: null });

      await service.reconcilePaydunyaPayment('payment-1');

      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { id: 'payment-1', status: 'PENDING' },
        data: { status: 'REJECTED', rejectionReason: 'Paiement PayDunya annulé' },
      });
    });

    it('ne touche rien si PayDunya répond encore "pending" et le délai d’abandon (24h) n’est pas dépassé', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePaydunyaPayment({ createdAt: new Date() }));
      paydunya.confirmInvoiceStatus.mockResolvedValue({ status: 'pending', amount: null });

      await service.reconcilePaydunyaPayment('payment-1');

      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
      expect(tx.payment.updateMany).not.toHaveBeenCalled();
    });

    it('bascule en REJECTED si toujours "pending" après le délai d’abandon (24h)', async () => {
      prisma.payment.findUnique.mockResolvedValue(
        makePaydunyaPayment({ createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) }),
      );
      paydunya.confirmInvoiceStatus.mockResolvedValue({ status: 'pending', amount: null });

      await service.reconcilePaydunyaPayment('payment-1');

      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { id: 'payment-1', status: 'PENDING' },
        data: {
          status: 'REJECTED',
          rejectionReason: 'Paiement PayDunya non confirmé après 24h — expiré',
        },
      });
    });

    it('ne casse rien si la vérification PayDunya échoue (retenté plus tard)', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePaydunyaPayment());
      paydunya.confirmInvoiceStatus.mockRejectedValue(new Error('timeout'));

      await expect(service.reconcilePaydunyaPayment('payment-1')).resolves.toBeUndefined();
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('handlePaydunyaCallback', () => {
    it('ignore un callback sans paymentId, sans lever ni planter', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      const result = await service.handlePaydunyaCallback(undefined);
      expect(result).toEqual({ status: 'ignored' });
    });

    it('déclenche la réconciliation et renvoie "ok" même si elle échoue en interne', async () => {
      prisma.payment.findUnique.mockRejectedValue(new Error('DB down'));
      const result = await service.handlePaydunyaCallback('payment-1');
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('findAll', () => {
    it('filtre par nom/prénom/email du locataire quand `search` est fourni', async () => {
      await service.findAll(owner, { page: 1, limit: 20, search: 'Kodjo' });

      const [findManyArgs] = prisma.payment.findMany.mock.calls[0] as [
        { where: { lease: { tenant?: { OR: Array<Record<string, unknown>> } } } },
      ];
      expect(findManyArgs.where.lease.tenant?.OR).toEqual([
        { firstName: { contains: 'Kodjo', mode: 'insensitive' } },
        { lastName: { contains: 'Kodjo', mode: 'insensitive' } },
        { email: { contains: 'Kodjo', mode: 'insensitive' } },
      ]);
    });

    it("n'ajoute aucun filtre tenant quand `search` est absent", async () => {
      await service.findAll(owner, { page: 1, limit: 20 });

      const [findManyArgs] = prisma.payment.findMany.mock.calls[0] as [
        { where: { lease: { tenant?: unknown } } },
      ];
      expect(findManyArgs.where.lease.tenant).toBeUndefined();
    });
  });
});
