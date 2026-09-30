import { PlatformSettingsService } from './platform-settings.service';

describe('PlatformSettingsService', () => {
  let service: PlatformSettingsService;
  let prisma: { platformSettings: { upsert: jest.Mock; update: jest.Mock } };

  beforeEach(() => {
    prisma = { platformSettings: { upsert: jest.fn(), update: jest.fn() } };
    service = new PlatformSettingsService(prisma as never);
  });

  describe('get', () => {
    it('crée la ligne singleton (valeurs par défaut) si elle n’existe pas encore', async () => {
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
      prisma.platformSettings.upsert.mockResolvedValueOnce({
        id: 'singleton',
        subscriptionQuotasSuspended: true,
        subscriptionBillingEnabled: false,
      });
      await expect(service.quotasSuspended()).resolves.toBe(true);

      prisma.platformSettings.upsert.mockResolvedValueOnce({
        id: 'singleton',
        subscriptionQuotasSuspended: true,
        subscriptionBillingEnabled: true,
      });
      await expect(service.billingEnabled()).resolves.toBe(true);
    });
  });

  describe('update', () => {
    it('met à jour uniquement les champs fournis', async () => {
      prisma.platformSettings.upsert.mockResolvedValueOnce({
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
