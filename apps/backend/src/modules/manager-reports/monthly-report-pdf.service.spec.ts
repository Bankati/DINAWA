import { MonthlyReportPdfService } from './monthly-report-pdf.service';
import { ConsolidatedReportData } from './manager-reports.types';

describe('MonthlyReportPdfService', () => {
  let service: MonthlyReportPdfService;

  function makeData(overrides: Partial<ConsolidatedReportData> = {}): ConsolidatedReportData {
    return {
      owner: { id: 'owner-1', firstName: 'Jean', lastName: 'Dupont', email: 'jean@warah.tg' },
      manager: { id: 'manager-1', firstName: 'Ama', lastName: 'Kodjo' },
      periodLabel: '2026-08',
      periodStart: new Date('2026-08-01'),
      periodEnd: new Date('2026-08-31'),
      properties: [{ id: 'prop-1', address: '12 rue de Lomé' }],
      paymentsByProperty: [
        {
          property: { id: 'prop-1', address: '12 rue de Lomé' },
          payments: [
            {
              id: 'pay-1',
              paidAmount: 75000,
              paidAt: new Date('2026-08-05'),
              paymentMethod: 'CASH',
            },
          ],
          totalReceived: 75000,
        },
      ],
      totalReceived: 75000,
      overdueEntries: [],
      processedDeclarations: [],
      ...overrides,
    };
  }

  function countPageObjects(buffer: Buffer): number {
    return (buffer.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
  }

  beforeEach(() => {
    service = new MonthlyReportPdfService();
  });

  it('génère un PDF valide (en-tête %PDF) sur une seule page pour un rapport court', async () => {
    const buffer = await service.generate(makeData());
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(countPageObjects(buffer)).toBe(1);
  });

  // Reproduit le cas trouvé en /review : un propriétaire avec beaucoup
  // d'impayés/paiements ne doit jamais produire un contenu tronqué ou
  // chevauché en bas de page — il doit basculer sur une nouvelle page.
  it('bascule sur une nouvelle page plutôt que de tronquer un rapport avec beaucoup de lignes', async () => {
    const manyOverdueEntries = Array.from({ length: 60 }, (_, i) => ({
      id: `entry-${i}`,
      dueDate: new Date('2026-08-01'),
      expectedAmount: 50000,
      paidAmount: 0,
      property: { id: `prop-${i}`, address: `Bien ${i}` },
      tenant: { id: `tenant-${i}`, firstName: 'T', lastName: `${i}` },
    }));

    const buffer = await service.generate(makeData({ overdueEntries: manyOverdueEntries }));

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(countPageObjects(buffer)).toBeGreaterThan(1);
  });

  it('gère un rapport sans aucun paiement/impayé/déclaration sans erreur', async () => {
    const buffer = await service.generate(
      makeData({
        paymentsByProperty: [
          { property: { id: 'prop-1', address: 'x' }, payments: [], totalReceived: 0 },
        ],
      }),
    );
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
