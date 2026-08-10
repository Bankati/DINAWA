import { PaymentConfirmedListener } from './payment-confirmed.listener';

describe('PaymentConfirmedListener', () => {
  let listener: PaymentConfirmedListener;
  let prisma: { payment: { findUnique: jest.Mock } };
  let receiptPdf: { generate: jest.Mock };
  let notify: { notifyUser: jest.Mock };

  function makePayment(): Record<string, unknown> {
    return {
      id: 'payment-1',
      paidAmount: 55000,
      scheduleEntry: { periodStart: new Date('2026-01-01'), periodEnd: new Date('2026-02-01') },
      lease: {
        ownerId: 'owner-1',
        tenantUserId: 'tenant-1',
        property: { address: '12 rue de Lomé' },
        owner: { firstName: 'Jean', lastName: 'Dupont' },
        tenant: { firstName: 'Ama', lastName: 'Kodjo' },
      },
    };
  }

  beforeEach(() => {
    prisma = { payment: { findUnique: jest.fn().mockResolvedValue(makePayment()) } };
    receiptPdf = { generate: jest.fn().mockResolvedValue(Buffer.from('%PDF-fake')) };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };

    listener = new PaymentConfirmedListener(prisma as never, receiptPdf as never, notify as never);
  });

  it('ne fait rien si le paiement est introuvable (ne lève pas)', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    await expect(listener.handle({ paymentId: 'missing' })).resolves.toBeUndefined();
    expect(notify.notifyUser).not.toHaveBeenCalled();
  });

  it('génère la quittance une seule fois et notifie propriétaire et locataire avec la pièce jointe', async () => {
    await listener.handle({ paymentId: 'payment-1' });

    expect(receiptPdf.generate).toHaveBeenCalledTimes(1);
    expect(notify.notifyUser).toHaveBeenCalledTimes(2);

    const calls = notify.notifyUser.mock.calls.map(
      ([params]: [{ userId: string; event: string; emailAttachments?: unknown[] }]) => params,
    );
    expect(calls.map((c) => c.userId).sort()).toEqual(['owner-1', 'tenant-1']);
    for (const call of calls) {
      expect(call.event).toBe('receipt');
      expect(call.emailAttachments).toHaveLength(1);
    }
  });

  it("n'échoue jamais même si notifyUser rejette", async () => {
    notify.notifyUser.mockRejectedValue(new Error('down'));
    await expect(listener.handle({ paymentId: 'payment-1' })).resolves.toBeUndefined();
  });
});
