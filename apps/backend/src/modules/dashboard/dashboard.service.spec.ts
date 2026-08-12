import { DashboardService } from './dashboard.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    property: { count: jest.Mock; findMany: jest.Mock };
    user: { count: jest.Mock };
    payment: { findMany: jest.Mock };
    paymentScheduleEntry: { count: jest.Mock };
  };

  const owner = { id: 'owner-1', role: 'OWNER' } as AuthenticatedUser;

  beforeEach(() => {
    prisma = {
      property: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: { count: jest.fn().mockResolvedValue(0) },
      payment: { findMany: jest.fn().mockResolvedValue([]) },
      paymentScheduleEntry: { count: jest.fn().mockResolvedValue(0) },
    };
    service = new DashboardService(prisma as never);
  });

  describe('getSummary', () => {
    // Bug réel corrigé le 2026-08-09 : l'ancienne requête comptait
    // Payment.status='OVERDUE', une valeur jamais assignée dans tout le
    // codebase (seul PaymentScheduleEntry.status la reçoit, posée par
    // overdue.task.ts) — le KPI "impayés" restait donc toujours à 0.
    it('compte les impayés via PaymentScheduleEntry.status=OVERDUE, jamais Payment.status', async () => {
      prisma.paymentScheduleEntry.count.mockResolvedValueOnce(3);

      const result = await service.getSummary(owner, 2026);

      expect(result.kpis.impayes).toBe(3);
      const [countArgs] = prisma.paymentScheduleEntry.count.mock.calls[0] as [
        { where: { status: string; lease: { property: unknown } } },
      ];
      expect(countArgs.where.status).toBe('OVERDUE');
      expect(countArgs.where.lease.property).toBeDefined();
    });

    it("n'appelle jamais Payment.count pour les impayés (le mock payment n'expose pas cette méthode)", async () => {
      // `prisma.payment` n'a volontairement que `findMany` dans ce mock — si
      // le service appelait encore `payment.count(...)`, cet appel lèverait
      // immédiatement "is not a function" et ferait échouer ce test.
      await expect(service.getSummary(owner, 2026)).resolves.toBeDefined();
    });

    // Bug réel corrigé le 2026-08-12 : le donut "répartition par type"
    // affichait la somme nominale de Property.monthlyRent (valeur saisie à
    // la création du bien) plutôt que ce qui a réellement été encaissé —
    // signalé par le développeur (240k nominal affiché alors que seuls 150k
    // avaient été payés).
    it('calcule la répartition des loyers RÉELLEMENT ENCAISSÉS par type de bien, jamais la valeur nominale des biens', async () => {
      prisma.payment.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
        {
          paidAmount: 100000,
          paidAt: new Date(Date.UTC(2026, 2, 15)),
          lease: { property: { id: 'prop-1', type: 'VILLA' } },
        },
        {
          paidAmount: 50000,
          paidAt: new Date(Date.UTC(2026, 5, 10)),
          lease: { property: { id: 'prop-2', type: 'STUDIO' } },
        },
        {
          paidAmount: 25000,
          paidAt: new Date(Date.UTC(2026, 6, 5)),
          lease: { property: { id: 'prop-1', type: 'VILLA' } },
        },
      ]);

      const result = await service.getSummary(owner, 2026);

      expect(result.repartitionLoyersParType).toEqual(
        expect.arrayContaining([
          { type: 'VILLA', montant: 125000, nombreBiens: 1 },
          { type: 'STUDIO', montant: 50000, nombreBiens: 1 },
        ]),
      );
      expect(result.repartitionLoyersParType).toHaveLength(2);
      // Le mock property.groupBy n'existe plus du tout dans ce fichier — si
      // le service l'appelait encore, ce test échouerait avec "is not a
      // function", garantissant qu'on ne régresse pas vers l'ancien calcul.
    });

    it('calcule le revenu mensuel pour le mois filtré, pas seulement le mois courant', async () => {
      // 1er appel payment.findMany = derniersPaiements (non pertinent ici),
      // 2e appel = paidPayments de l'année (celui qui alimente le KPI).
      prisma.payment.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
        { paidAmount: 100000, paidAt: new Date(Date.UTC(2026, 2, 15)) },
        { paidAmount: 200000, paidAt: new Date(Date.UTC(2026, 5, 10)) },
      ]);

      const result = await service.getSummary(owner, 2026, 6);

      expect(result.kpis.revenusMensuels).toBe(200000);
    });
  });
});
