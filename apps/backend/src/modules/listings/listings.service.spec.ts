import { NotFoundException } from '@nestjs/common';
import { ListingsService } from './listings.service';

describe('ListingsService', () => {
  let service: ListingsService;
  let prisma: {
    listing: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
    };
    user: { findUnique: jest.Mock };
    mandate: { findFirst: jest.Mock };
  };
  let tx: {
    listing: { create: jest.Mock; findUnique: jest.Mock; updateMany: jest.Mock };
  };
  let storage: { getSignedUrls: jest.Mock };

  const property = { id: 'prop-1', type: 'APARTMENT', neighborhood: 'Bè' } as never;

  beforeEach(() => {
    tx = {
      listing: {
        create: jest.fn().mockResolvedValue({ id: 'listing-1', slug: 'be-apartment-abc123' }),
        findUnique: jest.fn().mockResolvedValue(null), // aucune collision de slug par défaut
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma = {
      listing: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
      },
      user: { findUnique: jest.fn() },
      mandate: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    storage = {
      getSignedUrls: jest
        .fn()
        .mockImplementation((_bucket: string, paths: string[]) =>
          Promise.resolve(new Map(paths.map((p) => [p, `https://signed.example/${p}`]))),
        ),
    };

    service = new ListingsService(prisma as never, storage as never);
  });

  describe('publishForProperty', () => {
    it('crée une nouvelle ligne Listing, status=ACTIVE, avec un slug dérivé du bien', async () => {
      await service.publishForProperty(tx as never, property, 'owner-1');

      const [createArgs] = tx.listing.create.mock.calls[0] as [
        { data: { propertyId: string; publishedByUserId: string; status: string; slug: string } },
      ];
      expect(createArgs.data.propertyId).toBe('prop-1');
      expect(createArgs.data.publishedByUserId).toBe('owner-1');
      expect(createArgs.data.status).toBe('ACTIVE');
      expect(createArgs.data.slug).toMatch(/^be-apartment-/);
    });

    it('retente avec un nouveau suffixe si le slug généré existe déjà', async () => {
      tx.listing.findUnique
        .mockResolvedValueOnce({ id: 'existing' }) // 1ère tentative en collision
        .mockResolvedValueOnce(null); // 2ème tentative libre

      await service.publishForProperty(tx as never, property, 'owner-1');

      expect(tx.listing.findUnique).toHaveBeenCalledTimes(2);
      expect(tx.listing.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('deactivateForProperty', () => {
    it('désactive la ligne ACTIVE du bien (updateMany, jamais une 404 si aucune ligne)', async () => {
      await service.deactivateForProperty(tx as never, 'prop-1');

      const [updateArgs] = tx.listing.updateMany.mock.calls[0] as [
        { where: { propertyId: string; status: string }; data: { status: string } },
      ];
      expect(updateArgs.where).toEqual({ propertyId: 'prop-1', status: 'ACTIVE' });
      expect(updateArgs.data.status).toBe('DISABLED');
    });
  });

  describe('findAllPublic', () => {
    it('ne renvoie que les annonces ACTIVE, avec la vignette signée', async () => {
      prisma.listing.findMany.mockResolvedValueOnce([
        {
          id: 'listing-1',
          slug: 'be-apartment-abc',
          publishedAt: new Date(),
          property: {
            type: 'APARTMENT',
            neighborhood: 'Bè',
            city: 'Lomé',
            surfaceArea: 40,
            roomsCount: 2,
            monthlyRent: 50000,
            monthlyCharges: 0,
            photos: [{ storagePath: 'prop-1/photo1.webp' }],
          },
        },
      ]);
      prisma.listing.count.mockResolvedValueOnce(1);

      const result = await service.findAllPublic({ page: 1, limit: 20 });

      const [findManyArgs] = prisma.listing.findMany.mock.calls[0] as [
        { where: { status: string } },
      ];
      expect(findManyArgs.where.status).toBe('ACTIVE');
      expect(result.data[0].photo).toBe('https://signed.example/prop-1/photo1.webp');
      expect(result.total).toBe(1);
    });

    it('applique les filtres type/ville/quartier/loyer sur le bien lié', async () => {
      await service.findAllPublic({
        page: 1,
        limit: 20,
        type: 'VILLA',
        city: 'Lomé',
        minRent: 20000,
        maxRent: 100000,
      });

      const [findManyArgs] = prisma.listing.findMany.mock.calls[0] as [
        {
          where: {
            property: { type: string; city: unknown; monthlyRent: { gte: number; lte: number } };
          };
        },
      ];
      expect(findManyArgs.where.property.type).toBe('VILLA');
      expect(findManyArgs.where.property.monthlyRent).toEqual({ gte: 20000, lte: 100000 });
    });
  });

  describe('findOnePublic', () => {
    it("lève NotFoundException si le slug n'existe pas", async () => {
      prisma.listing.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOnePublic('inconnu')).rejects.toThrow(NotFoundException);
    });

    it("lève NotFoundException si l'annonce existe mais n'est plus ACTIVE (jamais visible)", async () => {
      prisma.listing.findUnique.mockResolvedValueOnce({
        id: 'listing-1',
        status: 'DISABLED',
        property: { photos: [] },
      });
      await expect(service.findOnePublic('desactivee')).rejects.toThrow(NotFoundException);
    });

    it('expose le téléphone du responsable (gestionnaire mandaté sinon propriétaire) et toutes les photos', async () => {
      prisma.listing.findUnique.mockResolvedValueOnce({
        id: 'listing-1',
        slug: 'be-apartment-abc',
        status: 'ACTIVE',
        publishedAt: new Date(),
        property: {
          id: 'prop-1',
          ownerId: 'owner-1',
          type: 'APARTMENT',
          neighborhood: 'Bè',
          city: 'Lomé',
          address: '1 Rue Test',
          surfaceArea: 40,
          roomsCount: 2,
          monthlyRent: 50000,
          monthlyCharges: 0,
          description: 'Bel appartement',
          photos: [{ storagePath: 'prop-1/a.webp' }, { storagePath: 'prop-1/b.webp' }],
          owner: { id: 'owner-1' },
        },
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        firstName: 'Jean',
        lastName: 'Dupont',
        phone: '+22890123456',
      });

      const result = await service.findOnePublic('be-apartment-abc');

      expect(result.contactPhone).toBe('+22890123456');
      expect(result.contactName).toBe('Jean Dupont');
      expect(result.photos).toHaveLength(2);
      expect(result.address).toBe('1 Rue Test');
    });
  });
});
