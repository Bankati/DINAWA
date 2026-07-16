import { AccountActivationService } from './account-activation.service';

describe('AccountActivationService', () => {
  let service: AccountActivationService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    property: { count: jest.Mock };
    mandate: { count: jest.Mock };
  };
  let notify: { notifyUser: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      property: { count: jest.fn().mockResolvedValue(0) },
      mandate: { count: jest.fn().mockResolvedValue(0) },
    };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };

    service = new AccountActivationService(prisma as never, notify as never);
  });

  describe('hasQualifyingActivity', () => {
    it('considère toujours actif un TENANT/ADMIN — aucune notion de bien possédé', async () => {
      await expect(service.hasQualifyingActivity({ id: 'u1', role: 'TENANT' })).resolves.toBe(true);
      expect(prisma.property.count).not.toHaveBeenCalled();
    });

    it('OWNER avec au moins un bien non archivé est actif', async () => {
      prisma.property.count.mockResolvedValueOnce(1);
      await expect(service.hasQualifyingActivity({ id: 'u1', role: 'OWNER' })).resolves.toBe(true);
    });

    it('OWNER sans aucun bien non archivé est inactif', async () => {
      prisma.property.count.mockResolvedValueOnce(0);
      await expect(service.hasQualifyingActivity({ id: 'u1', role: 'OWNER' })).resolves.toBe(false);
      expect(prisma.mandate.count).not.toHaveBeenCalled();
    });

    it('MANAGER sans bien propre mais avec un mandat actif est actif', async () => {
      prisma.property.count.mockResolvedValueOnce(0);
      prisma.mandate.count.mockResolvedValueOnce(1);
      await expect(service.hasQualifyingActivity({ id: 'u1', role: 'MANAGER' })).resolves.toBe(
        true,
      );
    });

    it('MANAGER sans bien propre ni mandat actif est inactif', async () => {
      prisma.property.count.mockResolvedValueOnce(0);
      prisma.mandate.count.mockResolvedValueOnce(0);
      await expect(service.hasQualifyingActivity({ id: 'u1', role: 'MANAGER' })).resolves.toBe(
        false,
      );
    });
  });

  describe('reactivateIfEligible', () => {
    it("ne fait rien si l'utilisateur est introuvable", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.reactivateIfEligible('missing')).resolves.toBe(false);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("ne fait rien si le compte n'est pas SUSPENDED_INACTIVITY", async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'u1', accountStatus: 'ACTIVE' });
      await expect(service.reactivateIfEligible('u1')).resolves.toBe(false);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("ne réactive pas un compte suspendu qui n'a toujours aucune activité qualifiante", async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        role: 'OWNER',
        accountStatus: 'SUSPENDED_INACTIVITY',
      });
      prisma.property.count.mockResolvedValueOnce(0);
      await expect(service.reactivateIfEligible('u1')).resolves.toBe(false);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(notify.notifyUser).not.toHaveBeenCalled();
    });

    it('réactive, réinitialise les compteurs de rappel et notifie quand redevenu éligible', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        role: 'OWNER',
        accountStatus: 'SUSPENDED_INACTIVITY',
      });
      prisma.property.count.mockResolvedValueOnce(1);

      await expect(service.reactivateIfEligible('u1')).resolves.toBe(true);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          accountStatus: 'ACTIVE',
          inactivityWarning30SentAt: null,
          inactivityWarning7SentAt: null,
          inactivityWarning1SentAt: null,
        },
      });
      expect(notify.notifyUser).toHaveBeenCalledWith({
        userId: 'u1',
        event: 'account-reactivated',
        variables: {},
      });
    });

    it("réactive quand même si l'envoi de la notification échoue", async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        role: 'OWNER',
        accountStatus: 'SUSPENDED_INACTIVITY',
      });
      prisma.property.count.mockResolvedValueOnce(1);
      notify.notifyUser.mockRejectedValueOnce(new Error('resend down'));

      await expect(service.reactivateIfEligible('u1')).resolves.toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });
});
