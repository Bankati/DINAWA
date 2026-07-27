import { ReceiptPdfService } from './receipt-pdf.service';
import { PaymentWithAccess } from '../payments/payments.service';

describe('ReceiptPdfService', () => {
  let service: ReceiptPdfService;

  function makePayment(overrides: Record<string, unknown> = {}): PaymentWithAccess {
    return {
      id: 'payment-1',
      paidAmount: 55000,
      paidAt: new Date('2026-01-05T10:30:00Z'),
      paymentMethod: 'CASH',
      transactionId: null,
      source: 'MANUAL_OWNER',
      scheduleEntry: {
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-02-01'),
      },
      lease: {
        paymentFrequency: 'MONTHLY',
        property: { address: '12 rue de Lomé' },
        owner: { firstName: 'Jean', lastName: 'Dupont' },
        tenant: { firstName: 'Ama', lastName: 'Kodjo' },
      },
      ...overrides,
    } as unknown as PaymentWithAccess;
  }

  beforeEach(() => {
    service = new ReceiptPdfService();
  });

  it('génère un PDF valide (en-tête %PDF) pour un bail mensuel', async () => {
    const buffer = await service.generate(makePayment());
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(100);
  });

  it('génère un PDF valide pour un bail non mensuel (mention explicite de la période)', async () => {
    const buffer = await service.generate(
      makePayment({ lease: { ...makePayment().lease, paymentFrequency: 'QUARTERLY' } }),
    );
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it("n'échoue pas quand paidAt ou paymentMethod sont absents", async () => {
    const buffer = await service.generate(makePayment({ paidAt: null, paymentMethod: null }));
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
