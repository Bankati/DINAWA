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
  });
});
