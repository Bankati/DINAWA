import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentDeclarationsService } from './payment-declarations.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CreatePaymentDeclarationDto } from './dto/create-payment-declaration.dto';

describe('PaymentDeclarationsService', () => {
  let service: PaymentDeclarationsService;
  let prisma: {
    $transaction: jest.Mock;
    paymentScheduleEntry: { findUnique: jest.Mock };
    payment: { findUnique: jest.Mock; delete: jest.Mock };
    mandate: { findFirst: jest.Mock };
  };
  let tx: {
    payment: { create: jest.Mock; update: jest.Mock };
    paymentDeclaration: { create: jest.Mock; update: jest.Mock };
  };
  let storage: { upload: jest.Mock };
  let notify: { notifyUser: jest.Mock };

  const tenant = {
    id: 'tenant-1',
    role: 'TENANT',
    firstName: 'Ama',
    lastName: 'Kodjo',
  } as AuthenticatedUser;
  const otherTenant = { id: 'tenant-2', role: 'TENANT' } as AuthenticatedUser;

  function makeScheduleEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'entry-1',
      leaseId: 'lease-1',
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
      leaseId: 'lease-1',
      status: 'PENDING_CONFIRMATION',
      declaration: { id: 'declaration-1' },
      lease: {
        tenantUserId: 'tenant-1',
        property: { id: 'prop-1', ownerId: 'owner-1', address: '12 rue de Lomé' },
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    tx = {
      payment: {
        create: jest.fn().mockResolvedValue({ id: 'payment-1', status: 'PENDING_CONFIRMATION' }),
        update: jest.fn().mockResolvedValue({ id: 'payment-1', status: 'PENDING_CONFIRMATION' }),
      },
      paymentDeclaration: {
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    prisma = {
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(tx)),
      paymentScheduleEntry: { findUnique: jest.fn() },
      payment: { findUnique: jest.fn(), delete: jest.fn().mockResolvedValue({}) },
      mandate: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    storage = { upload: jest.fn().mockResolvedValue(undefined) };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };

    service = new PaymentDeclarationsService(prisma as never, storage as never, notify as never);
  });

  describe('create', () => {
    const dto: CreatePaymentDeclarationDto = {
      scheduleEntryId: 'entry-1',
      declaredAmount: 55000,
      declaredAt: '2026-01-01',
      declaredMethod: 'CASH',
    };

    beforeEach(() => {
      prisma.paymentScheduleEntry.findUnique.mockResolvedValue(makeScheduleEntry());
    });

    it("lève NotFoundException si l'échéance est introuvable", async () => {
      prisma.paymentScheduleEntry.findUnique.mockResolvedValue(null);
      await expect(service.create(tenant, dto)).rejects.toThrow(NotFoundException);
    });

    it("lève ForbiddenException si l'appelant n'est pas le locataire de ce bail", async () => {
      await expect(service.create(otherTenant, dto)).rejects.toThrow(ForbiddenException);
    });

    it('crée un Payment PENDING_CONFIRMATION avec source TENANT_DECLARATION et une PaymentDeclaration liée', async () => {
      await service.create(tenant, dto);

      const [paymentArgs] = tx.payment.create.mock.calls[0] as [
        { data: { source: string; status: string; paidAmount: number } },
      ];
      expect(paymentArgs.data.source).toBe('TENANT_DECLARATION');
      expect(paymentArgs.data.status).toBe('PENDING_CONFIRMATION');
      expect(paymentArgs.data.paidAmount).toBe(55000);

      expect(tx.paymentDeclaration.create).toHaveBeenCalled();
    });

    it('notifie le propriétaire (celui qui peut agir sur le bien)', async () => {
      await service.create(tenant, dto);

      expect(notify.notifyUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'owner-1', event: 'payment-declaration-pending' }),
      );
    });

    it('notifie le gestionnaire mandaté plutôt que le propriétaire si un mandat actif existe', async () => {
      prisma.mandate.findFirst.mockResolvedValue({ managerId: 'manager-1', status: 'ACTIVE' });
      await service.create(tenant, dto);

      expect(notify.notifyUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'manager-1' }),
      );
    });

    it('upload le justificatif si fourni', async () => {
      const proof = { buffer: Buffer.from('x'), mimetype: 'image/png' } as Express.Multer.File;
      await service.create(tenant, dto, proof);
      expect(storage.upload).toHaveBeenCalledWith(
        'payment-proofs',
        expect.stringContaining('lease-1/'),
        proof.buffer,
        'image/png',
      );
    });
  });

  describe('update', () => {
    it('lève NotFoundException si la déclaration est introuvable', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.update(tenant, 'payment-1', {})).rejects.toThrow(NotFoundException);
    });

    it("lève ForbiddenException si l'appelant n'est pas le locataire déclarant", async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment());
      await expect(service.update(otherTenant, 'payment-1', {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lève ConflictException si la déclaration est déjà traitée', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment({ status: 'PAID' }));
      await expect(service.update(tenant, 'payment-1', {})).rejects.toThrow(ConflictException);
    });

    it('met à jour le Payment et la PaymentDeclaration, marque editedAt', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment());

      await service.update(tenant, 'payment-1', { declaredAmount: 60000 });

      const [paymentUpdateArgs] = tx.payment.update.mock.calls[0] as [
        { where: { id: string }; data: { paidAmount: number } },
      ];
      expect(paymentUpdateArgs.where).toEqual({ id: 'payment-1' });
      expect(paymentUpdateArgs.data.paidAmount).toBe(60000);

      const [declarationUpdateArgs] = tx.paymentDeclaration.update.mock.calls[0] as [
        { where: { paymentId: string }; data: { declaredAmount: number; editedAt: Date } },
      ];
      expect(declarationUpdateArgs.where).toEqual({ paymentId: 'payment-1' });
      expect(declarationUpdateArgs.data.declaredAmount).toBe(60000);
      expect(declarationUpdateArgs.data.editedAt).toBeInstanceOf(Date);
    });

    it('upload et attache un nouveau justificatif au Payment et à la PaymentDeclaration', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment());
      const proof = { buffer: Buffer.from('x'), mimetype: 'image/png' } as Express.Multer.File;

      await service.update(tenant, 'payment-1', {}, proof);

      expect(storage.upload).toHaveBeenCalledWith(
        'payment-proofs',
        expect.stringContaining('lease-1/'),
        proof.buffer,
        'image/png',
      );
      const [paymentUpdateArgs] = tx.payment.update.mock.calls[0] as [
        { data: { proofStoragePath?: string } },
      ];
      expect(paymentUpdateArgs.data.proofStoragePath).toContain('lease-1/');
      const [declarationUpdateArgs] = tx.paymentDeclaration.update.mock.calls[0] as [
        { data: { proofStoragePath?: string } },
      ];
      expect(declarationUpdateArgs.data.proofStoragePath).toContain('lease-1/');
    });
  });

  describe('cancel', () => {
    it('lève ConflictException si la déclaration est déjà traitée', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment({ status: 'REJECTED' }));
      await expect(service.cancel(tenant, 'payment-1')).rejects.toThrow(ConflictException);
    });

    it('supprime le Payment (cascade sur PaymentDeclaration)', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment());

      const result = await service.cancel(tenant, 'payment-1');

      expect(prisma.payment.delete).toHaveBeenCalledWith({ where: { id: 'payment-1' } });
      expect(result).toEqual({ message: 'Déclaration annulée' });
    });
  });
});
