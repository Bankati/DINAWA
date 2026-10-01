import { PlatformSettingsService } from './platform-settings.service';

describe('PlatformSettingsService', () => {
  let service: PlatformSettingsService;
  let prisma: {
    platformSettings: { findUnique: jest.Mock; upsert: jest.Mock; update: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      platformSettings: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
    };
    service = new PlatformSettingsService(prisma as never);
  });

  describe('get', () => {
    it('lit directement la ligne singleton si elle existe déjà — jamais d’upsert (voir /review abonnements, chemin chaud)', async () => {
      prisma.platformSettings.findUnique.mockResolvedValueOnce({
        id: 'singleton',
        subscriptionQuotasSuspended: false,
        subscriptionBillingEnabled: false,
      });

      await service.get();

      expect(prisma.platformSettings.findUnique).toHaveBeenCalledWith({
        where: { id: 'singleton' },
      });
      expect(prisma.platformSettings.upsert).not.toHaveBeenCalled();
    });

    it('crée la ligne singleton (valeurs par défaut) seulement si elle n’existe pas encore', async () => {
      prisma.platformSettings.findUnique.mockResolvedValueOnce(null);
      prisma.platformSettings.upsert.mockResolvedValueOnce({
        id: 'singleton',
        subscriptionQuotasSuspended: false,
        subscriptionBillingEnabled: false,
      });

      await service.get();

      expect(prisma.platformSettings.upsert).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        update: {},
        create: { id: 'singleton' },
      });
    });
  });

  describe('quotasSuspended / billingEnabled', () => {
    it('reflète l’état courant en base, sans cache', async () => {
      prisma.platformSettings.findUnique.mockResolvedValueOnce({
        id: 'singleton',
        subscriptionQuotasSuspended: true,
        subscriptionBillingEnabled: false,
      });
      await expect(service.quotasSuspended()).resolves.toBe(true);

      prisma.platformSettings.findUnique.mockResolvedValueOnce({
        id: 'singleton',
        subscriptionQuotasSuspended: true,
        subscriptionBillingEnabled: true,
      });
      await expect(service.billingEnabled()).resolves.toBe(true);
    });
  });

  describe('update', () => {
    it('met à jour uniquement les champs fournis', async () => {
      prisma.platformSettings.findUnique.mockResolvedValueOnce({
        id: 'singleton',
        subscriptionQuotasSuspended: false,
        subscriptionBillingEnabled: false,
      });
      prisma.platformSettings.update.mockResolvedValueOnce({
        id: 'singleton',
        subscriptionQuotasSuspended: true,
        subscriptionBillingEnabled: false,
      });

      await service.update({ subscriptionQuotasSuspended: true });

      expect(prisma.platformSettings.update).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        data: { subscriptionQuotasSuspended: true },
      });
    });
  });
});
