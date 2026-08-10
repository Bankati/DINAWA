import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    mandate: { findFirst: jest.Mock };
  };
  let tx: {
    payment: { create: jest.Mock; update: jest.Mock };
    paymentScheduleEntry: { update: jest.Mock };
  };
  let storage: { upload: jest.Mock };
  let notify: { notifyUser: jest.Mock };
  let events: { emit: jest.Mock };

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
      },
      paymentScheduleEntry: { update: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(tx)),
      paymentScheduleEntry: { findUnique: jest.fn() },
      payment: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue(makePayment({ status: 'REJECTED' })),
      },
      mandate: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    storage = { upload: jest.fn().mockResolvedValue(undefined) };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };
    events = { emit: jest.fn() };

    service = new PaymentsService(
      prisma as never,
      storage as never,
      notify as never,
      events as never,
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

    it('lève ForbiddenException si le paiement vient de Cashpay', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment({ source: 'CASHPAY_API' }));
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
});
