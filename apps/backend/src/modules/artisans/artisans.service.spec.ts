import { BadRequestException, ConflictException, ForbiddenException, GoneException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ArtisansService } from './artisans.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { ARTISAN_DIRECTORY_NOTICE_VERSION } from '../../common/constants';
import { signToken } from '../../common/utils/signed-token';

const SECRET = 'secret-de-test-assez-long-pour-hmac';

function artisan(overrides: Record<string, unknown> = {}) {
  return {
    id: 'art-1',
    phone: '90123456',
    displayName: 'Kossi Plomberie',
    trades: ['PLUMBER'],
    zones: ['Bè'],
    directoryStatus: 'PRIVATE',
    verifiedAt: null,
    ratingAverage: 0,
    ratingCount: 0,
    createdById: 'owner-1',
    invitations: [],
    ...overrides,
  };
}

function contactRow(overrides: Record<string, unknown> = {}) {
  return { privateNote: null, createdAt: new Date('2026-11-27'), artisan: artisan(overrides) };
}

describe('ArtisansService', () => {
  let service: ArtisansService;
  let prisma: {
    $transaction: jest.Mock;
    artisan: Record<'findUnique' | 'findUniqueOrThrow' | 'findFirst' | 'findMany' | 'count' | 'create' | 'update' | 'updateMany', jest.Mock>;
    artisanContact: Record<'findUnique' | 'findMany' | 'count' | 'create' | 'update' | 'deleteMany', jest.Mock>;
    artisanInvitation: Record<'findUnique' | 'create' | 'updateMany', jest.Mock>;
    artisanConsentEvent: Record<'create' | 'findFirst', jest.Mock>;
  };
  const owner = { id: 'owner-1', role: 'OWNER', firstName: 'Ama', lastName: 'Mensah' } as AuthenticatedUser;
  const otherOwner = { id: 'owner-2', role: 'OWNER', firstName: 'Yao', lastName: 'Kodjo' } as AuthenticatedUser;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
      artisan: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      artisanContact: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      artisanInvitation: {
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      artisanConsentEvent: { create: jest.fn(), findFirst: jest.fn() },
    };
    const config = {
      getOrThrow: jest.fn((key: string) => (key === 'FRONTEND_URL' ? 'https://www.warahcontact.com/' : SECRET)),
    };
    service = new ArtisansService(prisma as never, config as never);
  });

  describe('create', () => {
    const dto = { phone: '90123456', displayName: 'Kossi Plomberie', trades: ['PLUMBER' as const], zones: [' bè '] };

    it('crée la fiche et l’ajoute au carnet, quartiers normalisés', async () => {
      prisma.artisan.findUnique.mockResolvedValueOnce(null);
      prisma.artisan.findUniqueOrThrow.mockResolvedValueOnce({ id: 'art-1' });
      prisma.artisanContact.findUnique.mockResolvedValueOnce(contactRow());

      const view = await service.create(owner, dto);

      const [args] = prisma.artisan.create.mock.calls[0] as [{ data: { zones: string[]; createdById: string } }];
      expect(args.data.zones).toEqual(['Bè']);
      expect(args.data.createdById).toBe('owner-1');
      expect(view.canEditDetails).toBe(true);
    });

    it('réutilise la fiche existante du même numéro sans la modifier', async () => {
      prisma.artisan.findUnique.mockResolvedValueOnce(artisan({ createdById: 'owner-2', directoryStatus: 'PUBLIC' }));
      prisma.artisanContact.findUnique.mockResolvedValueOnce(
        contactRow({ createdById: 'owner-2', directoryStatus: 'PUBLIC' }),
      );

      const view = await service.create(owner, dto);

      expect(prisma.artisan.create).not.toHaveBeenCalled();
      expect(prisma.artisanContact.create).toHaveBeenCalledWith({
        data: { userId: 'owner-1', artisanId: 'art-1', privateNote: null },
      });
      expect(view.canEditDetails).toBe(false);
    });

    it('refuse un doublon dans le même carnet (409)', async () => {
      prisma.artisan.findUnique.mockResolvedValueOnce(artisan());
      prisma.artisanContact.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' }),
      );
      await expect(service.create(owner, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it("refuse de modifier la fiche d'un autre créateur (seule la note privée)", async () => {
      prisma.artisanContact.findUnique.mockResolvedValueOnce(contactRow({ createdById: 'owner-1' }));
      await expect(service.update(otherOwner, 'art-1', { displayName: 'Autre nom' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('refuse de modifier une fiche publique, même pour son créateur', async () => {
      prisma.artisanContact.findUnique.mockResolvedValueOnce(contactRow({ directoryStatus: 'PUBLIC' }));
      await expect(service.update(owner, 'art-1', { trades: ['MASON'] })).rejects.toThrow(ForbiddenException);
    });

    it('accepte la note privée sur une fiche publique', async () => {
      prisma.artisanContact.findUnique
        .mockResolvedValueOnce(contactRow({ directoryStatus: 'PUBLIC' }))
        .mockResolvedValueOnce(contactRow({ directoryStatus: 'PUBLIC' }));
      await service.update(otherOwner, 'art-1', { privateNote: '  Rapide  ' });
      expect(prisma.artisanContact.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { privateNote: 'Rapide' } }),
      );
    });
  });

  describe('createInvitation', () => {
    it('refuse un artisan déjà public ou retiré', async () => {
      prisma.artisanContact.findUnique.mockResolvedValueOnce(contactRow({ directoryStatus: 'PUBLIC' }));
      await expect(service.createInvitation(owner, 'art-1')).rejects.toThrow(ConflictException);
      prisma.artisanContact.findUnique.mockResolvedValueOnce(contactRow({ directoryStatus: 'SUSPENDED' }));
      await expect(service.createInvitation(owner, 'art-1')).rejects.toThrow(ConflictException);
    });

    it('clôt les anciens liens et renvoie un lien d’accord + un wa.me vers l’artisan', async () => {
      prisma.artisanContact.findUnique.mockResolvedValueOnce(contactRow());
      const expiresAt = new Date(Date.now() + 1000 * 60);
      prisma.artisanInvitation.create.mockResolvedValueOnce({ id: 'inv-1', expiresAt });

      const result = await service.createInvitation(owner, 'art-1');

      expect(prisma.artisanInvitation.updateMany).toHaveBeenCalled();
      expect(result.url).toMatch(/^https:\/\/www\.warahcontact\.com\/artisans\/accord\/.+/);
      expect(result.whatsappUrl).toMatch(/^https:\/\/wa\.me\/22890123456\?text=/);
      expect(result.message).toContain('Ama Mensah');
    });
  });

  describe('accord de l’artisan', () => {
    const tokenFor = (id: string): string =>
      signToken({ purpose: 'artisan-consent', data: { i: id }, expiresAt: new Date(Date.now() + 60_000) }, SECRET);
    const invitation = (overrides: Record<string, unknown> = {}) => ({
      id: 'inv-1',
      artisanId: 'art-1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      artisan: artisan(),
      createdBy: { firstName: 'Ama', lastName: 'Mensah' },
      ...overrides,
    });

    it('rejette un jeton d’un autre usage', async () => {
      const payLink = signToken({ purpose: 'pay-link', data: { i: 'inv-1' }, expiresAt: new Date(Date.now() + 60_000) }, SECRET);
      await expect(service.getConsent(payLink)).rejects.toThrow(BadRequestException);
    });

    it('masque le numéro et renvoie le texte versionné', async () => {
      prisma.artisanInvitation.findUnique.mockResolvedValueOnce(invitation());
      const view = await service.getConsent(tokenFor('inv-1'));
      expect(view.phoneMasked).toBe('90 •• •• 56');
      expect(view.notice.version).toBe(ARTISAN_DIRECTORY_NOTICE_VERSION);
      expect(view.invitedBy).toBe('Ama M.');
    });

    it('refuse un lien déjà utilisé (410)', async () => {
      prisma.artisanInvitation.findUnique.mockResolvedValueOnce(invitation({ usedAt: new Date() }));
      await expect(service.getConsent(tokenFor('inv-1'))).rejects.toThrow(GoneException);
    });

    it('publie la fiche et garde la preuve quand l’artisan accepte', async () => {
      prisma.artisanInvitation.findUnique.mockResolvedValueOnce(invitation());
      prisma.artisanInvitation.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.artisan.findUniqueOrThrow.mockResolvedValueOnce({ directoryStatus: 'PRIVATE', phone: '90123456' });

      const result = await service.decideConsent(tokenFor('inv-1'), {
        decision: 'ACCEPT',
        noticeVersion: ARTISAN_DIRECTORY_NOTICE_VERSION,
      });

      expect(result.directoryStatus).toBe('PUBLIC');
      const [eventArgs] = prisma.artisanConsentEvent.create.mock.calls[0] as [{ data: Record<string, unknown> }];
      expect(eventArgs.data).toMatchObject({
        previousStatus: 'PRIVATE',
        newStatus: 'PUBLIC',
        source: 'INVITATION_LINK',
        invitationId: 'inv-1',
        phoneLast2: '56',
      });
    });

    it('ne réutilise jamais un lien : deuxième réponse simultanée refusée', async () => {
      prisma.artisanInvitation.findUnique.mockResolvedValueOnce(invitation());
      prisma.artisanInvitation.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(
        service.decideConsent(tokenFor('inv-1'), { decision: 'ACCEPT', noticeVersion: ARTISAN_DIRECTORY_NOTICE_VERSION }),
      ).rejects.toThrow(GoneException);
      expect(prisma.artisan.update).not.toHaveBeenCalled();
    });

    it('refuse une version du texte périmée', async () => {
      await expect(
        service.decideConsent(tokenFor('inv-1'), { decision: 'ACCEPT', noticeVersion: 'ancienne' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('annuaire public', () => {
    it("ne liste que les fiches PUBLIC, même si le filtre demande autre chose", async () => {
      prisma.artisan.findMany.mockResolvedValueOnce([]);
      prisma.artisan.count.mockResolvedValueOnce(0);
      await service.findAllPublic({ page: 1, limit: 20, zone: 'bè', trade: 'PLUMBER' });
      const [args] = prisma.artisan.findMany.mock.calls[0] as [{ where: Record<string, unknown>; take: number }];
      expect(args.where).toEqual({
        trades: { has: 'PLUMBER' },
        zones: { has: 'Bè' },
        directoryStatus: 'PUBLIC',
      });
      expect(args.take).toBe(20);
    });

    it('cache le numéro au public, le montre aux comptes connectés', async () => {
      prisma.artisan.findMany.mockResolvedValue([artisan({ directoryStatus: 'PUBLIC' })]);
      prisma.artisan.count.mockResolvedValue(1);

      const publique = await service.findAllPublic({ page: 1, limit: 20 });
      expect(publique.data[0]?.phone).toBeNull();

      const connecte = await service.findAllPublic({ page: 1, limit: 20 }, true);
      expect(connecte.data[0]?.phone).toBe('90123456');
    });

    it('la fiche publique ne contient pas le numéro', async () => {
      prisma.artisan.findFirst.mockResolvedValueOnce({ ...artisan({ directoryStatus: 'PUBLIC' }), reviews: [] });
      const fiche = await service.findOnePublic('art-1');
      expect(fiche.phone).toBeNull();
      expect(JSON.stringify(fiche)).not.toContain('90123456');
    });
  });

  describe('admin', () => {
    const admin = { id: 'admin-1', role: 'ADMIN' } as AuthenticatedUser;

    it('remet l’état d’avant le retrait (jamais public sans accord)', async () => {
      prisma.artisan.findUnique.mockResolvedValueOnce(artisan({ directoryStatus: 'SUSPENDED' }));
      prisma.artisanConsentEvent.findFirst.mockResolvedValueOnce({ previousStatus: 'PRIVATE' });
      await service.adminReinstate(admin, 'art-1');
      expect(prisma.artisan.update).toHaveBeenCalledWith({
        where: { id: 'art-1' },
        data: { directoryStatus: 'PRIVATE', suspensionReason: null },
      });
    });
  });
});
