import { ReceiptPdfService } from './receipt-pdf.service';
import { PaymentWithAccess } from '../payments/payments.service';

describe('ReceiptPdfService - Format WARAH', () => {
  let service: ReceiptPdfService;

  function makePayment(overrides: Record<string, unknown> = {}): PaymentWithAccess {
    return {
      id: 'abc12345-def67-89012',
      paidAmount: 55000,
      paidAt: new Date('2026-01-05T10:30:00Z'),
      paymentMethod: 'CASH',
      transactionId: 'TXN-2026-001',
      source: 'MANUAL_OWNER',
      scheduleEntry: {
        id: 'schedule-1',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-02-01'),
        expectedAmount: 55000,
        paidAmount: 55000,
        status: 'PAID',
      },
      lease: {
        id: 'lease-1',
        paymentFrequency: 'MONTHLY',
        property: { 
          id: 'prop-1',
          address: '12 rue de Lomé, Tokoin',
          type: 'Appartement',
          city: 'Lomé',
        },
        owner: { 
          firstName: 'Jean', 
          lastName: 'Dupont',
          email: 'jean.dupont@example.com',
          phone: '+228 90 00 00 00',
          city: 'Lomé',
        },
        tenant: { 
          firstName: 'Ama', 
          lastName: 'Kodjo',
          email: 'ama.kodjo@example.com',
          phone: '+228 91 00 00 00',
        },
        ownerId: 'owner-1',
        tenantUserId: 'tenant-1',
      },
      leaseId: 'lease-1',
      scheduleEntryId: 'schedule-1',
      status: 'PAID',
      createdAt: new Date('2026-01-05T10:30:00Z'),
      confirmedAt: new Date('2026-01-05T10:30:00Z'),
      ...overrides,
    } as unknown as PaymentWithAccess;
  }

  beforeEach(() => {
    service = new ReceiptPdfService();
  });

  // PDFKit encode le texte en hex dans les content streams TJ (ex. <466c6f6f7a> pour "Flooz").
  // extractPdfText(buffer) ne retrouve pas ce texte — il faut décoder les hex-strings.
  function extractPdfText(buffer: Buffer): string {
    const raw = buffer.toString('latin1');
    return [...raw.matchAll(/<([0-9a-fA-F]+)>/g)]
      .map((m) => Buffer.from(m[1], 'hex').toString('latin1'))
      .join('');
  }

  it('génère un PDF valide (en-tête %PDF) pour un paiement', async () => {
    const buffer = await service.generate(makePayment());
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('contient le texte WARAH dans le PDF généré', async () => {
    const buffer = await service.generate(makePayment());
    const pdfText = extractPdfText(buffer);
    expect(pdfText).toContain('WARAH');
    expect(pdfText).toContain('QUITTANCE DE LOYER');
  });

  it('contient les informations du propriétaire', async () => {
    const buffer = await service.generate(makePayment());
    const pdfText = extractPdfText(buffer);
    expect(pdfText).toContain('Jean Dupont');
    expect(pdfText).toContain('jean.dupont@example.com');
  });

  it('contient les informations du locataire', async () => {
    const buffer = await service.generate(makePayment());
    const pdfText = extractPdfText(buffer);
    expect(pdfText).toContain('Ama Kodjo');
    expect(pdfText).toContain('ama.kodjo@example.com');
  });

  it('contient ladresse du bien', async () => {
    const buffer = await service.generate(makePayment());
    const pdfText = extractPdfText(buffer);
    expect(pdfText).toContain('12 rue de Lomé, Tokoin');
  });

  it('contient le numéro de quittance', async () => {
    const buffer = await service.generate(makePayment());
    const pdfText = extractPdfText(buffer);
    expect(pdfText).toContain('ABC12345');
  });

  it('contient le montant en FCFA', async () => {
    const buffer = await service.generate(makePayment());
    const pdfText = extractPdfText(buffer);
    expect(pdfText).toContain('55 000 FCFA');
  });

  it('contient la mention légale', async () => {
    const buffer = await service.generate(makePayment());
    const pdfText = extractPdfText(buffer);
    expect(pdfText).toContain('Le bailleur soussigné reconnaît avoir reçu');
    expect(pdfText).toContain('quittance annule tout reçu provisoire');
  });

  it('contient lURL de vérification', async () => {
    const buffer = await service.generate(makePayment());
    const pdfText = extractPdfText(buffer);
    expect(pdfText).toContain('www.warah.tg/verif/');
  });

  it('gère les données manquantes sans erreur', async () => {
    const buffer = await service.generate(
      makePayment({ 
        paidAt: null, 
        paymentMethod: null,
        transactionId: null,
        lease: {
          ...makePayment().lease,
          owner: { firstName: 'Test', lastName: 'Owner' } as any,
          tenant: { firstName: 'Test', lastName: 'Tenant' } as any,
          property: { address: 'Test Address' } as any,
        }
      })
    );
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('fonctionne avec T-Money comme méthode de paiement', async () => {
    const buffer = await service.generate(
      makePayment({ paymentMethod: 'TMONEY' })
    );
    const pdfText = extractPdfText(buffer);
    expect(pdfText).toContain('T-Money');
  });

  it('fonctionne avec Flooz comme méthode de paiement', async () => {
    const buffer = await service.generate(
      makePayment({ paymentMethod: 'FLOOZ' })
    );
    const pdfText = extractPdfText(buffer);
    expect(pdfText).toContain('Flooz');
  });
});
