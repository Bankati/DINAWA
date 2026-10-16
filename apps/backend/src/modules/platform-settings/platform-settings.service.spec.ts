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
    it('met à jour les champs fournis sans toucher freePromotionEndsAt si subscriptionQuotasSuspended est absent', async () => {
      prisma.platformSettings.findUnique.mockResolvedValueOnce({
        id: 'singleton',
        subscriptionQuotasSuspended: false,
        subscriptionBillingEnabled: false,
      });
      prisma.platformSettings.update.mockResolvedValueOnce({});

      await service.update({ subscriptionBillingEnabled: true });

      expect(prisma.platformSettings.update).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        data: { subscriptionBillingEnabled: true },
      });
    });

    it('calcule freePromotionEndsAt à +6 mois quand subscriptionQuotasSuspended passe à true (voir /architect bandeau promotionnel)', async () => {
      prisma.platformSettings.findUnique.mockResolvedValueOnce({
        id: 'singleton',
        subscriptionQuotasSuspended: false,
        subscriptionBillingEnabled: false,
      });
      prisma.platformSettings.update.mockResolvedValueOnce({});

      await service.update({ subscriptionQuotasSuspended: true });

      const [callArgs] = prisma.platformSettings.update.mock.calls[0] as [
        { data: { subscriptionQuotasSuspended: boolean; freePromotionEndsAt: Date } },
      ];
      expect(callArgs.data.subscriptionQuotasSuspended).toBe(true);
      const monthsAhead =
        callArgs.data.freePromotionEndsAt.getUTCMonth() - new Date().getUTCMonth();
      expect((monthsAhead + 12) % 12).toBe(6);
    });

    it('efface freePromotionEndsAt quand subscriptionQuotasSuspended repasse à false', async () => {
      prisma.platformSettings.findUnique.mockResolvedValueOnce({
        id: 'singleton',
        subscriptionQuotasSuspended: true,
        subscriptionBillingEnabled: false,
      });
      prisma.platformSettings.update.mockResolvedValueOnce({});

      await service.update({ subscriptionQuotasSuspended: false });

      expect(prisma.platformSettings.update).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        data: { subscriptionQuotasSuspended: false, freePromotionEndsAt: null },
      });
    });

    it('ne touche pas freePromotionEndsAt si subscriptionQuotasSuspended est déjà true (pas de vraie transition — voir /review bandeau promotionnel)', async () => {
      prisma.platformSettings.findUnique.mockResolvedValueOnce({
        id: 'singleton',
        subscriptionQuotasSuspended: true,
        subscriptionBillingEnabled: false,
      });
      prisma.platformSettings.update.mockResolvedValueOnce({});

      await service.update({ subscriptionQuotasSuspended: true });

      expect(prisma.platformSettings.update).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        data: { subscriptionQuotasSuspended: true },
      });
    });

    it('ne touche pas freePromotionEndsAt si subscriptionQuotasSuspended est déjà false', async () => {
      prisma.platformSettings.findUnique.mockResolvedValueOnce({
        id: 'singleton',
        subscriptionQuotasSuspended: false,
        subscriptionBillingEnabled: false,
      });
      prisma.platformSettings.update.mockResolvedValueOnce({});

      await service.update({ subscriptionQuotasSuspended: false });

      expect(prisma.platformSettings.update).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        data: { subscriptionQuotasSuspended: false },
      });
    });
  });

  describe('whatsappEnabledTiers (unité 42)', () => {
    it('reflète la liste courante en base, sans cache', async () => {
      prisma.platformSettings.findUnique.mockResolvedValueOnce({
        id: 'singleton',
        whatsappEnabledTiers: ['PRO', 'PREMIUM'],
      });
      await expect(service.whatsappEnabledTiers()).resolves.toEqual(['PRO', 'PREMIUM']);
    });

    it('enregistre la liste choisie par l’admin, liste vide comprise', async () => {
      prisma.platformSettings.findUnique.mockResolvedValueOnce({
        id: 'singleton',
        subscriptionQuotasSuspended: false,
      });
      prisma.platformSettings.update.mockResolvedValueOnce({});

      await service.update({ whatsappEnabledTiers: [] });

      expect(prisma.platformSettings.update).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        data: { whatsappEnabledTiers: [] },
      });
    });
  });
});
