import { SupabaseAdminService } from './supabase-admin.service';

describe('SupabaseAdminService', () => {
  let service: SupabaseAdminService;

  beforeEach(() => {
    const config = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'SUPABASE_URL') return 'https://example.supabase.co';
        return 'dummy-key';
      }),
    };
    service = new SupabaseAdminService(config as never);
  });

  describe('withRetry', () => {
    it('résout au premier essai sans retenter si la fonction réussit directement', async () => {
      const fn = jest.fn().mockResolvedValue('ok');

      const result = await service.withRetry(fn, { retries: 2, minTimeout: 1, maxTimeout: 5 });

      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('ne retente jamais une erreur métier renvoyée (non levée) par le SDK — un seul appel', async () => {
      const businessError = { data: null, error: { code: 'email_exists' } };
      const fn = jest.fn().mockResolvedValue(businessError);

      const result = await service.withRetry(fn, { retries: 2, minTimeout: 1, maxTimeout: 5 });

      expect(result).toBe(businessError);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retente sur exception levée (échec réseau) puis réussit', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockResolvedValueOnce('ok');

      const result = await service.withRetry(fn, { retries: 2, minTimeout: 1, maxTimeout: 5 });

      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('abandonne après épuisement des tentatives et relance la dernière erreur', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fetch failed'));

      await expect(
        service.withRetry(fn, { retries: 1, minTimeout: 1, maxTimeout: 5 }),
      ).rejects.toThrow('fetch failed');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
