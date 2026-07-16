import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { compressPhoto } from '../storage/image-processor';

jest.mock('../storage/image-processor', () => ({
  compressPhoto: jest.fn().mockResolvedValue(Buffer.from('compressed')),
}));

function makeFile(overrides: Record<string, unknown> = {}): Express.Multer.File {
  return {
    buffer: Buffer.from('raw'),
    originalname: 'photo.jpg',
    mimetype: 'image/jpeg',
    ...overrides,
  } as Express.Multer.File;
}

describe('PropertiesService', () => {
  let service: PropertiesService;
  let prisma: {
    property: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    mandate: { findFirst: jest.Mock };
    lease: { findFirst: jest.Mock };
    ownerProfile: { findUnique: jest.Mock };
    managerProfile: { findUnique: jest.Mock };
    propertyPhoto: {
      count: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
    propertyDocument: {
      count: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      delete: jest.Mock;
    };
  };
  let accountActivation: { reactivateIfEligible: jest.Mock };
  let storage: { upload: jest.Mock; getSignedUrl: jest.Mock; remove: jest.Mock };

  const owner = { id: 'owner-1', role: 'OWNER' } as AuthenticatedUser;
  const manager = { id: 'manager-1', role: 'MANAGER' } as AuthenticatedUser;
  const stranger = { id: 'stranger-1', role: 'OWNER' } as AuthenticatedUser;
  const admin = { id: 'admin-1', role: 'ADMIN' } as AuthenticatedUser;

  function makeProperty(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'prop-1',
      ownerId: 'owner-1',
      type: 'APARTMENT',
      status: 'VACANT',
      address: '1 Rue Test',
      neighborhood: 'Bè',
      city: 'Lomé',
      surfaceArea: 40,
      roomsCount: null,
      monthlyRent: 30000,
      monthlyCharges: 0,
      description: null,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      photos: [],
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      property: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      mandate: { findFirst: jest.fn().mockResolvedValue(null) },
      lease: { findFirst: jest.fn().mockResolvedValue(null) },
      // VERIFIED par défaut — la plupart des tests ne portent pas sur le
      // verrou d'identité (voir /architect révision inscription
      // owner/manager) ; les tests dédiés ci-dessous écrasent cette valeur.
      ownerProfile: {
        findUnique: jest.fn().mockResolvedValue({ idVerificationStatus: 'VERIFIED' }),
      },
      managerProfile: {
        findUnique: jest.fn().mockResolvedValue({ idVerificationStatus: 'VERIFIED' }),
      },
      propertyPhoto: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
      },
      propertyDocument: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    accountActivation = { reactivateIfEligible: jest.fn().mockResolvedValue(false) };
    storage = {
      upload: jest.fn().mockResolvedValue('path'),
      getSignedUrl: jest.fn().mockResolvedValue('https://signed.example/url'),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    service = new PropertiesService(prisma as never, accountActivation as never, storage as never);
  });

  describe('create', () => {
    it('force ownerId=utilisateur courant, status=VACANT, et ignore toute valeur cliente pour ces champs', async () => {
      prisma.property.create.mockResolvedValueOnce(makeProperty());

      await service.create(owner, {
        type: 'APARTMENT',
        address: '1 Rue Test',
        neighborhood: 'Bè',
        city: 'Lomé',
        surfaceArea: 40,
        monthlyRent: 30000,
      } as never);

      const [createArgs] = prisma.property.create.mock.calls[0] as [
        { data: { ownerId: string; status: string; monthlyCharges: number } },
      ];
      expect(createArgs.data.ownerId).toBe('owner-1');
      expect(createArgs.data.status).toBe('VACANT');
      expect(createArgs.data.monthlyCharges).toBe(0);
    });

    it("appelle reactivateIfEligible après création — referme la dépendance de l'étape 11", async () => {
      prisma.property.create.mockResolvedValueOnce(makeProperty());

      await service.create(owner, {
        type: 'APARTMENT',
        address: '1 Rue Test',
        neighborhood: 'Bè',
        city: 'Lomé',
        surfaceArea: 40,
        monthlyRent: 30000,
      } as never);

      expect(accountActivation.reactivateIfEligible).toHaveBeenCalledWith('owner-1');
    });

    // CNI facultative à l'inscription mais bloquante à la création de bien
    // (voir /architect révision inscription owner/manager) —
    // assertIdentityVerified() est le seul verrou fonctionnel.
    describe('verrou identité (idVerificationStatus)', () => {
      const createDto = {
        type: 'APARTMENT',
        address: '1 Rue Test',
        neighborhood: 'Bè',
        city: 'Lomé',
        surfaceArea: 40,
        monthlyRent: 30000,
      } as never;

      it('rejette avec 403 si le propriétaire a idVerificationStatus=PENDING (jamais soumis)', async () => {
        prisma.ownerProfile.findUnique.mockResolvedValueOnce({ idVerificationStatus: 'PENDING' });

        await expect(service.create(owner, createDto)).rejects.toThrow(ForbiddenException);
        expect(prisma.property.create).not.toHaveBeenCalled();
      });

      it('rejette avec 403 si le propriétaire a idVerificationStatus=REJECTED', async () => {
        prisma.ownerProfile.findUnique.mockResolvedValueOnce({ idVerificationStatus: 'REJECTED' });

        await expect(service.create(owner, createDto)).rejects.toThrow(ForbiddenException);
        expect(prisma.property.create).not.toHaveBeenCalled();
      });

      it('autorise la création si le propriétaire est VERIFIED', async () => {
        prisma.ownerProfile.findUnique.mockResolvedValueOnce({ idVerificationStatus: 'VERIFIED' });
        prisma.property.create.mockResolvedValueOnce(makeProperty());

        await expect(service.create(owner, createDto)).resolves.toBeDefined();
      });

      it('vérifie le profil gestionnaire (pas propriétaire) quand un MANAGER crée son propre bien', async () => {
        prisma.managerProfile.findUnique.mockResolvedValueOnce({
          idVerificationStatus: 'PENDING',
        });

        await expect(service.create(manager, createDto)).rejects.toThrow(ForbiddenException);
        expect(prisma.ownerProfile.findUnique).not.toHaveBeenCalled();
      });
    });
  });

  describe('findAll', () => {
    it('un ADMIN voit tout le parc — aucun filtre ownerId/mandat', async () => {
      await service.findAll(admin, {});

      const [findManyArgs] = prisma.property.findMany.mock.calls[0] as [
        { where: Record<string, unknown> },
      ];
      expect(findManyArgs.where['OR']).toBeUndefined();
    });

    it('un OWNER/MANAGER ne voit que ses biens possédés ou sous mandat actif', async () => {
      await service.findAll(owner, {});

      const [findManyArgs] = prisma.property.findMany.mock.calls[0] as [
        {
          where: {
            OR: [
              { ownerId: string },
              { mandates: { some: { managerId: string; status: string } } },
            ];
          };
        },
      ];
      expect(findManyArgs.where['OR']).toEqual([
        { ownerId: 'owner-1' },
        { mandates: { some: { managerId: 'owner-1', status: 'ACTIVE' } } },
      ]);
    });

    it('applique le filtre status quand fourni', async () => {
      await service.findAll(owner, { status: 'VACANT' } as never);

      const [findManyArgs] = prisma.property.findMany.mock.calls[0] as [
        { where: { status?: string } },
      ];
      expect(findManyArgs.where.status).toBe('VACANT');
    });

    it('calcule skip/take à partir de page/limit et renvoie une enveloppe paginée', async () => {
      prisma.property.count.mockResolvedValueOnce(42);
      const result = await service.findAll(owner, { page: 3, limit: 10 });

      const [findManyArgs] = prisma.property.findMany.mock.calls[0] as [
        { skip: number; take: number },
      ];
      expect(findManyArgs.skip).toBe(20);
      expect(findManyArgs.take).toBe(10);
      expect(result).toMatchObject({ page: 3, limit: 10, total: 42 });
    });
  });

  describe('findOne', () => {
    it('lève NotFoundException si le bien est introuvable', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne(owner, 'missing')).rejects.toThrow(NotFoundException);
    });

    it('lève ForbiddenException si canRead est faux', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      await expect(service.findOne(stranger, 'prop-1')).rejects.toThrow(ForbiddenException);
    });

    it('renvoie le bien si le propriétaire y a accès', async () => {
      const property = makeProperty();
      prisma.property.findUnique.mockResolvedValueOnce(property);
      await expect(service.findOne(owner, 'prop-1')).resolves.toEqual(property);
    });
  });

  describe('update', () => {
    it('lève ForbiddenException pour un propriétaire en lecture seule (mandat actif en cours)', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.mandate.findFirst.mockResolvedValueOnce({ managerId: 'manager-1' });
      await expect(service.update(owner, 'prop-1', {})).rejects.toThrow(ForbiddenException);
    });

    it('permet au gestionnaire mandataire de modifier le bien', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.mandate.findFirst.mockResolvedValueOnce({ managerId: 'manager-1' });
      prisma.property.update.mockResolvedValueOnce(makeProperty({ address: '2 Rue Modifiée' }));

      await service.update(manager, 'prop-1', { address: '2 Rue Modifiée' });
      expect(prisma.property.update).toHaveBeenCalled();
    });

    it('refuse toute transition à partir de ARCHIVED — statut terminal', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty({ status: 'ARCHIVED' }));
      await expect(service.update(owner, 'prop-1', { status: 'VACANT' } as never)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuse la transition vers ARCHIVED via PATCH — seul DELETE peut archiver', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty({ status: 'VACANT' }));
      await expect(
        service.update(owner, 'prop-1', { status: 'ARCHIVED' } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuse la transition vers OCCUPIED — piloté uniquement par un futur bail', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty({ status: 'VACANT' }));
      await expect(
        service.update(owner, 'prop-1', { status: 'OCCUPIED' } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuse OCCUPIED -> VACANT si un bail actif existe encore', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty({ status: 'OCCUPIED' }));
      prisma.lease.findFirst.mockResolvedValueOnce({ id: 'lease-1', status: 'ACTIVE' });
      await expect(service.update(owner, 'prop-1', { status: 'VACANT' } as never)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('autorise OCCUPIED -> VACANT si aucun bail actif', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty({ status: 'OCCUPIED' }));
      prisma.lease.findFirst.mockResolvedValueOnce(null);
      prisma.property.update.mockResolvedValueOnce(makeProperty({ status: 'VACANT' }));

      await expect(
        service.update(owner, 'prop-1', { status: 'VACANT' } as never),
      ).resolves.toBeDefined();
    });

    it('autorise VACANT <-> RENOVATION librement', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty({ status: 'VACANT' }));
      prisma.property.update.mockResolvedValueOnce(makeProperty({ status: 'RENOVATION' }));

      await expect(
        service.update(owner, 'prop-1', { status: 'RENOVATION' } as never),
      ).resolves.toBeDefined();
      expect(prisma.lease.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it("lève ConflictException si un bail actif existe — impossible d'archiver", async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty({ status: 'OCCUPIED' }));
      prisma.lease.findFirst.mockResolvedValueOnce({ id: 'lease-1', status: 'ACTIVE' });
      await expect(service.remove(owner, 'prop-1')).rejects.toThrow(ConflictException);
      expect(prisma.property.update).not.toHaveBeenCalled();
    });

    it('archive logiquement (status=ARCHIVED, archivedAt renseigné) sans bail actif', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty({ status: 'VACANT' }));
      prisma.lease.findFirst.mockResolvedValueOnce(null);
      prisma.property.update.mockResolvedValueOnce(makeProperty({ status: 'ARCHIVED' }));

      await service.remove(owner, 'prop-1');

      const [updateArgs] = prisma.property.update.mock.calls[0] as [
        { where: { id: string }; data: { status: string; archivedAt: Date } },
      ];
      expect(updateArgs.where).toEqual({ id: 'prop-1' });
      expect(updateArgs.data.status).toBe('ARCHIVED');
      expect(updateArgs.data.archivedAt).toBeInstanceOf(Date);
    });

    it('lève ForbiddenException si canMutate est faux (propriétaire en lecture seule)', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.mandate.findFirst.mockResolvedValueOnce({ managerId: 'manager-1' });
      await expect(service.remove(owner, 'prop-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addPhotos', () => {
    it('rejette sans fichier fourni', async () => {
      await expect(service.addPhotos(owner, 'prop-1', [])).rejects.toThrow(BadRequestException);
    });

    it('rejette si canMutate est faux', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.mandate.findFirst.mockResolvedValueOnce({ managerId: 'manager-1' });
      await expect(service.addPhotos(owner, 'prop-1', [makeFile()])).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejette si le plafond cumulatif serait dépassé', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.propertyPhoto.count.mockResolvedValueOnce(9);
      await expect(service.addPhotos(owner, 'prop-1', [makeFile(), makeFile()])).rejects.toThrow(
        BadRequestException,
      );
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('rejette sans rien écrire si une photo du lot est corrompue', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      (compressPhoto as jest.Mock).mockRejectedValueOnce(new Error('corrupt header'));

      await expect(service.addPhotos(owner, 'prop-1', [makeFile(), makeFile()])).rejects.toThrow(
        BadRequestException,
      );
      expect(storage.upload).not.toHaveBeenCalled();
      expect(prisma.propertyPhoto.create).not.toHaveBeenCalled();
    });

    it('compresse, uploade en WebP et positionne après les photos existantes', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.propertyPhoto.count.mockResolvedValueOnce(2);
      prisma.propertyPhoto.create
        .mockResolvedValueOnce({ id: 'photo-3', position: 2 })
        .mockResolvedValueOnce({ id: 'photo-4', position: 3 });

      const result = await service.addPhotos(owner, 'prop-1', [makeFile(), makeFile()]);

      const uploadArgs = storage.upload.mock.calls[0] as [string, string, Buffer, string];
      expect(uploadArgs[0]).toBe('property-photos');
      expect(uploadArgs[1]).toMatch(/^prop-1\/[0-9a-f-]+\.webp$/);
      expect(uploadArgs[3]).toBe('image/webp');

      const [createArgs] = prisma.propertyPhoto.create.mock.calls[0] as [
        { data: { propertyId: string; position: number } },
      ];
      expect(createArgs.data.propertyId).toBe('prop-1');
      expect(createArgs.data.position).toBe(2);

      expect(result).toEqual([
        { id: 'photo-3', position: 2, url: 'https://signed.example/url' },
        { id: 'photo-4', position: 3, url: 'https://signed.example/url' },
      ]);
    });
  });

  describe('removePhoto', () => {
    it('lève NotFoundException si la photo est introuvable', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.propertyPhoto.findUnique.mockResolvedValueOnce(null);
      await expect(service.removePhoto(owner, 'prop-1', 'photo-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lève NotFoundException si la photo appartient à un autre bien', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.propertyPhoto.findUnique.mockResolvedValueOnce({
        id: 'photo-1',
        propertyId: 'autre-bien',
        storagePath: 'x',
      });
      await expect(service.removePhoto(owner, 'prop-1', 'photo-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('supprime le fichier Storage avant la ligne Prisma', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.propertyPhoto.findUnique.mockResolvedValueOnce({
        id: 'photo-1',
        propertyId: 'prop-1',
        storagePath: 'prop-1/abc.webp',
      });
      const callOrder: string[] = [];
      storage.remove.mockImplementationOnce(() => {
        callOrder.push('storage.remove');
        return Promise.resolve(undefined);
      });
      prisma.propertyPhoto.delete.mockImplementationOnce(() => {
        callOrder.push('prisma.delete');
        return Promise.resolve({});
      });

      await service.removePhoto(owner, 'prop-1', 'photo-1');

      expect(storage.remove).toHaveBeenCalledWith('property-photos', 'prop-1/abc.webp');
      expect(callOrder).toEqual(['storage.remove', 'prisma.delete']);
    });
  });

  describe('addDocuments', () => {
    it('rejette sans fichier fourni', async () => {
      await expect(service.addDocuments(owner, 'prop-1', 'STATE_OF_PLAY', [])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejette si le plafond cumulatif serait dépassé', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.propertyDocument.count.mockResolvedValueOnce(19);
      await expect(
        service.addDocuments(owner, 'prop-1', 'PROPERTY_TITLE', [makeFile(), makeFile()]),
      ).rejects.toThrow(BadRequestException);
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it("uploade sans compression, avec le type fourni et l'extension déduite du mimetype", async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.propertyDocument.create.mockResolvedValueOnce({
        id: 'doc-1',
        type: 'INSURANCE',
        createdAt: new Date('2026-01-01'),
      });

      const result = await service.addDocuments(owner, 'prop-1', 'INSURANCE', [
        makeFile({ mimetype: 'application/pdf', originalname: 'assurance.pdf' }),
      ]);

      const uploadArgs = storage.upload.mock.calls[0] as [string, string, Buffer, string];
      expect(uploadArgs[0]).toBe('property-documents');
      expect(uploadArgs[1]).toMatch(/^prop-1\/[0-9a-f-]+\.pdf$/);
      expect(uploadArgs[3]).toBe('application/pdf');

      const [createArgs] = prisma.propertyDocument.create.mock.calls[0] as [
        { data: { propertyId: string; type: string } },
      ];
      expect(createArgs.data.propertyId).toBe('prop-1');
      expect(createArgs.data.type).toBe('INSURANCE');

      expect(result[0]).toMatchObject({
        id: 'doc-1',
        type: 'INSURANCE',
        url: 'https://signed.example/url',
      });
    });
  });

  describe('listDocuments', () => {
    it('lève ForbiddenException si canRead est faux', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      await expect(service.listDocuments(stranger, 'prop-1')).rejects.toThrow(ForbiddenException);
    });

    it('renvoie les documents avec une URL signée, jamais le chemin Storage brut', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.propertyDocument.findMany.mockResolvedValueOnce([
        { id: 'doc-1', type: 'OTHER', storagePath: 'prop-1/secret.pdf', createdAt: new Date() },
      ]);

      const result = await service.listDocuments(owner, 'prop-1');

      expect(result[0]).not.toHaveProperty('storagePath');
      expect(result[0].url).toBe('https://signed.example/url');
    });
  });

  describe('removeDocument', () => {
    it('lève NotFoundException si le document appartient à un autre bien', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.propertyDocument.findUnique.mockResolvedValueOnce({
        id: 'doc-1',
        propertyId: 'autre-bien',
        storagePath: 'x',
      });
      await expect(service.removeDocument(owner, 'prop-1', 'doc-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('supprime le fichier Storage avant la ligne Prisma', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(makeProperty());
      prisma.propertyDocument.findUnique.mockResolvedValueOnce({
        id: 'doc-1',
        propertyId: 'prop-1',
        storagePath: 'prop-1/doc.pdf',
      });

      await service.removeDocument(owner, 'prop-1', 'doc-1');

      expect(storage.remove).toHaveBeenCalledWith('property-documents', 'prop-1/doc.pdf');
      expect(prisma.propertyDocument.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
    });
  });
});
