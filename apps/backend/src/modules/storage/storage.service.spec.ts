import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;
  let fromMock: jest.Mock;
  let supabase: {
    withRetry: jest.Mock;
    raw: { storage: { from: jest.Mock } };
  };

  beforeEach(() => {
    fromMock = jest.fn();
    supabase = {
      // Reflète le comportement réel de SupabaseAdminService.withRetry() :
      // exécute simplement la fonction passée, ne retente jamais tant
      // qu'aucune exception n'est levée (une erreur métier {data,error}
      // retournée par le SDK ne throw jamais).
      withRetry: jest.fn((fn: () => unknown) => fn()),
      raw: { storage: { from: fromMock } },
    };
    service = new StorageService(supabase as never);
  });

  describe('upload', () => {
    const validFile = Buffer.from('fake-image-bytes');

    it('passe par withRetry() et retourne le chemin en cas de succès', async () => {
      const upload = jest.fn().mockResolvedValue({ error: null });
      fromMock.mockReturnValue({ upload });

      const path = await service.upload('property-photos', 'p1/x.webp', validFile, 'image/webp');

      expect(supabase.withRetry).toHaveBeenCalledTimes(1);
      expect(fromMock).toHaveBeenCalledWith('property-photos');
      expect(upload).toHaveBeenCalledWith('p1/x.webp', validFile, {
        contentType: 'image/webp',
        upsert: false,
      });
      expect(path).toBe('p1/x.webp');
    });

    it("rejette avant tout appel réseau si le type MIME n'est pas autorisé pour ce bucket", async () => {
      await expect(
        service.upload('property-photos', 'p1/x.pdf', validFile, 'application/pdf'),
      ).rejects.toThrow(BadRequestException);
      expect(supabase.withRetry).not.toHaveBeenCalled();
    });

    it('remonte une erreur métier {data,error} du SDK sans jamais la faire retenter', async () => {
      const upload = jest.fn().mockResolvedValue({ error: { message: 'bucket introuvable' } });
      fromMock.mockReturnValue({ upload });

      await expect(
        service.upload('property-photos', 'p1/x.webp', validFile, 'image/webp'),
      ).rejects.toThrow(InternalServerErrorException);
      expect(upload).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSignedUrl', () => {
    it('passe par withRetry() et met le résultat en cache', async () => {
      const createSignedUrl = jest
        .fn()
        .mockResolvedValue({ data: { signedUrl: 'https://x/signed' }, error: null });
      fromMock.mockReturnValue({ createSignedUrl });

      const url = await service.getSignedUrl('property-photos', 'p1/x.webp', 900);

      expect(supabase.withRetry).toHaveBeenCalledTimes(1);
      expect(createSignedUrl).toHaveBeenCalledWith('p1/x.webp', 900);
      expect(url).toBe('https://x/signed');

      // Second appel — servi depuis le cache, aucun nouvel appel réseau
      const cachedUrl = await service.getSignedUrl('property-photos', 'p1/x.webp', 900);
      expect(cachedUrl).toBe('https://x/signed');
      expect(createSignedUrl).toHaveBeenCalledTimes(1);
    });

    it('lève une exception typée si le SDK renvoie une erreur métier', async () => {
      const createSignedUrl = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'introuvable' } });
      fromMock.mockReturnValue({ createSignedUrl });

      await expect(service.getSignedUrl('property-photos', 'p1/missing.webp')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    // Bug réel corrigé le 2026-08-11 : le cache gardait une URL 55 min alors
    // que Supabase la révoque après `expiresIn` (900s) — le cache doit
    // expirer AVANT (ou au plus tard au moment où) l'URL réelle expire,
    // jamais après.
    it("n'expose jamais une URL en cache plus longtemps que sa durée de vie réelle (expiresIn)", async () => {
      const createSignedUrl = jest
        .fn()
        .mockResolvedValue({ data: { signedUrl: 'https://x/signed' }, error: null });
      fromMock.mockReturnValue({ createSignedUrl });

      const before = Date.now();
      await service.getSignedUrl('property-photos', 'p1/x.webp', 900);
      const cached = (
        service as unknown as { urlCache: Map<string, { expiresAt: number }> }
      ).urlCache.get('property-photos:p1/x.webp')!;

      expect(cached.expiresAt).toBeLessThanOrEqual(before + 900 * 1000);
    });
  });

  describe('getSignedUrls', () => {
    it('passe par withRetry() pour les chemins non cachés', async () => {
      const createSignedUrls = jest.fn().mockResolvedValue({
        data: [{ path: 'p1/a.webp', signedUrl: 'https://x/a' }],
        error: null,
      });
      fromMock.mockReturnValue({ createSignedUrls });

      const result = await service.getSignedUrls('property-photos', ['p1/a.webp']);

      expect(supabase.withRetry).toHaveBeenCalledTimes(1);
      expect(result.get('p1/a.webp')).toBe('https://x/a');
    });

    it('retourne une map vide sans appel réseau si aucun chemin fourni', async () => {
      const result = await service.getSignedUrls('property-photos', []);
      expect(result.size).toBe(0);
      expect(supabase.withRetry).not.toHaveBeenCalled();
    });

    // Même bug que getSignedUrl (voir ci-dessus) — c'est cette méthode
    // qu'utilisent ListingsService.findAllPublic()/findOnePublic(), donc
    // celle directement responsable des photos cassées sur /annonces.
    it("n'expose jamais une URL en cache plus longtemps que sa durée de vie réelle (expiresIn)", async () => {
      const createSignedUrls = jest.fn().mockResolvedValue({
        data: [{ path: 'p1/a.webp', signedUrl: 'https://x/a' }],
        error: null,
      });
      fromMock.mockReturnValue({ createSignedUrls });

      const before = Date.now();
      await service.getSignedUrls('property-photos', ['p1/a.webp'], 900);
      const cached = (
        service as unknown as { urlCache: Map<string, { expiresAt: number }> }
      ).urlCache.get('property-photos:p1/a.webp')!;

      expect(cached.expiresAt).toBeLessThanOrEqual(before + 900 * 1000);
    });
  });

  describe('remove', () => {
    it('passe par withRetry() avec un budget réduit (1 tentative, 5s) — appel en ligne dans une requête utilisateur', async () => {
      const remove = jest.fn().mockResolvedValue({ error: null });
      fromMock.mockReturnValue({ remove });

      await service.remove('payment-proofs', 'lease-1/old.pdf');

      expect(supabase.withRetry).toHaveBeenCalledWith(expect.any(Function), {
        retries: 0,
        timeoutMs: 5_000,
      });
      expect(remove).toHaveBeenCalledWith(['lease-1/old.pdf']);
    });
  });
});
