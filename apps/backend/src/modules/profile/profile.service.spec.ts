import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProfileService } from './profile.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { compressPhoto } from '../storage/image-processor';

jest.mock('../storage/image-processor', () => ({
  compressPhoto: jest.fn().mockResolvedValue(Buffer.from('compressed')),
}));

describe('ProfileService', () => {
  let service: ProfileService;
  let prisma: {
    user: { update: jest.Mock; findUniqueOrThrow: jest.Mock };
    session: { updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let storage: { upload: jest.Mock; remove: jest.Mock; getSignedUrl: jest.Mock };
  let supabaseAdmin: { auth: { admin: { deleteUser: jest.Mock } }; withRetry: jest.Mock };
  let authService: { getMe: jest.Mock };
  let tokens: { comparePassword: jest.Mock; hashPassword: jest.Mock };

  const user = { id: 'user-1', supabaseId: 'supabase-uid-1', role: 'OWNER' } as AuthenticatedUser;

  beforeEach(() => {
    prisma = {
      user: {
        update: jest.fn().mockResolvedValue({}),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'user-1', passwordHash: 'old-hash' }),
      },
      session: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    storage = {
      upload: jest.fn().mockResolvedValue('path'),
      remove: jest.fn().mockResolvedValue(undefined),
      getSignedUrl: jest.fn().mockResolvedValue('https://signed.example/photo.webp'),
    };
    supabaseAdmin = {
      auth: { admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) } },
      withRetry: jest.fn((fn: () => unknown) => fn()),
    };
    authService = { getMe: jest.fn().mockResolvedValue({ id: 'user-1' }) };
    tokens = {
      comparePassword: jest.fn().mockResolvedValue(true),
      hashPassword: jest.fn().mockResolvedValue('new-hash'),
    };

    service = new ProfileService(
      prisma as never,
      storage as never,
      supabaseAdmin as never,
      authService as never,
      tokens as never,
    );
  });

  describe('getProfile', () => {
    it('délègue à AuthService.getMe() et renvoie profilePhotoUrl=null sans photo', async () => {
      const result = await service.getProfile(user);
      expect(authService.getMe).toHaveBeenCalledWith(user);
      expect(result).toEqual({ id: 'user-1', profilePhotoUrl: null });
      expect(storage.getSignedUrl).not.toHaveBeenCalled();
    });

    it('résout profilePhotoUrl via une URL signée quand une photo existe', async () => {
      authService.getMe.mockResolvedValueOnce({
        id: 'user-1',
        profilePhotoPath: 'user-1/photo.webp',
      });

      const result = await service.getProfile(user);

      expect(storage.getSignedUrl).toHaveBeenCalledWith('profile-photos', 'user-1/photo.webp');
      expect(result.profilePhotoUrl).toBe('https://signed.example/photo.webp');
    });
  });

  describe('updateProfile', () => {
    it('ne met à jour que les champs fournis (mise à jour partielle)', async () => {
      await service.updateProfile(user, { firstName: 'Jean' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { firstName: 'Jean' },
      });
      expect(storage.upload).not.toHaveBeenCalled();
      expect(storage.remove).not.toHaveBeenCalled();
    });

    // Bug réel corrigé le 2026-08-11 : UpdateProfileDto n'avait pas ces
    // champs — le ValidationPipe global (whitelist) rejetait toute la
    // requête (photo comprise) dès qu'un formulaire envoyait phone/city.
    it('persiste phone et city (précédemment ignorés silencieusement)', async () => {
      await service.updateProfile(user, { phone: '+22890000000', city: 'Kara' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { phone: '+22890000000', city: 'Kara' },
      });
    });

    it('rejette avec 409 (jamais 500) si le téléphone est déjà utilisé par un autre compte', async () => {
      prisma.user.update.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('unique constraint', {
          code: 'P2002',
          clientVersion: '5.22.0',
          meta: { target: ['phone'] },
        }),
      );

      await expect(service.updateProfile(user, { phone: '+22890000000' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('compresse et uploade la photo sous userId/randomUUID.webp', async () => {
      const photo = { buffer: Buffer.from('raw'), mimetype: 'image/png' } as Express.Multer.File;

      await service.updateProfile(user, {}, photo);

      const [bucket, path, buffer, contentType] = storage.upload.mock.calls[0] as [
        string,
        string,
        Buffer,
        string,
      ];
      expect(bucket).toBe('profile-photos');
      expect(path).toMatch(new RegExp(`^${user.id}/[0-9a-f-]+\\.webp$`));
      expect(buffer).toEqual(Buffer.from('compressed'));
      expect(contentType).toBe('image/webp');

      const [updateArgs] = prisma.user.update.mock.calls[0] as [
        { data: { profilePhotoPath: string } },
      ];
      expect(updateArgs.data.profilePhotoPath).toBe(path);
    });

    it("ne supprime rien côté Storage si l'utilisateur n'avait pas encore de photo", async () => {
      const photo = { buffer: Buffer.from('raw'), mimetype: 'image/png' } as Express.Multer.File;

      await service.updateProfile(user, {}, photo);

      expect(storage.remove).not.toHaveBeenCalled();
    });

    it("supprime l'ancienne photo du Storage seulement après le succès de l'update Prisma", async () => {
      const userWithPhoto = {
        ...user,
        profilePhotoPath: 'user-1/old-photo.webp',
      } as AuthenticatedUser;
      const photo = { buffer: Buffer.from('raw'), mimetype: 'image/png' } as Express.Multer.File;
      const callOrder: string[] = [];
      prisma.user.update.mockImplementationOnce(() => {
        callOrder.push('update');
        return Promise.resolve({});
      });
      storage.remove.mockImplementationOnce(() => {
        callOrder.push('remove');
        return Promise.resolve(undefined);
      });

      await service.updateProfile(userWithPhoto, {}, photo);

      expect(storage.remove).toHaveBeenCalledWith('profile-photos', 'user-1/old-photo.webp');
      expect(callOrder).toEqual(['update', 'remove']);
    });

    it("ne touche pas au Storage si aucune nouvelle photo n'est fournie, même avec une photo existante", async () => {
      const userWithPhoto = {
        ...user,
        profilePhotoPath: 'user-1/old-photo.webp',
      } as AuthenticatedUser;

      await service.updateProfile(userWithPhoto, { firstName: 'Jean' });

      expect(storage.upload).not.toHaveBeenCalled();
      expect(storage.remove).not.toHaveBeenCalled();
    });

    it('rejette avec 400 (jamais 500) si la photo est corrompue — sharp lève une erreur brute non-HTTP', async () => {
      (compressPhoto as jest.Mock).mockRejectedValueOnce(
        new Error('Input buffer has corrupt header: VipsJpeg: Premature end of input file'),
      );
      const photo = {
        buffer: Buffer.from('corrupt'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      await expect(service.updateProfile(user, {}, photo)).rejects.toThrow(BadRequestException);
      expect(storage.upload).not.toHaveBeenCalled();
      expect(storage.remove).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('vérifie le mot de passe actuel via une relecture explicite (jamais user.passwordHash, omis globalement)', async () => {
      await service.changePassword(user, {
        currentPassword: 'old-pass',
        newPassword: 'new-password',
      });

      expect(prisma.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        omit: { passwordHash: false },
      });
      expect(tokens.comparePassword).toHaveBeenCalledWith('old-pass', 'old-hash');
    });

    it('rejette avec 401 si le mot de passe actuel est incorrect, sans toucher à la base', async () => {
      tokens.comparePassword.mockResolvedValueOnce(false);

      await expect(
        service.changePassword(user, { currentPassword: 'wrong', newPassword: 'new-password' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('hache le nouveau mot de passe et révoque toutes les sessions actives', async () => {
      await service.changePassword(user, {
        currentPassword: 'old-pass',
        newPassword: 'new-password',
      });

      expect(tokens.hashPassword).toHaveBeenCalledWith('new-password');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: 'new-hash' },
      });
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) as Date },
      });
    });
  });

  describe('updateNotificationConsent', () => {
    it('bascule uniquement la préférence, sans toucher aux abonnements push', async () => {
      await service.updateNotificationConsent(user, { consent: 'DECLINED' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { notificationConsent: 'DECLINED' },
      });
    });
  });

  describe('anonymize', () => {
    it('supprime le compte Supabase et vide les champs personnels côté Prisma', async () => {
      const result = await service.anonymize(user);

      expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('supabase-uid-1');
      type AnonymizeArgs = {
        where: { id: string };
        data: {
          email: null;
          phone: null;
          firstName: string;
          lastName: string;
          profilePhotoPath: null;
          supabaseId: null;
          anonymizedAt: Date;
        };
      };
      const [updateArgs] = prisma.user.update.mock.calls[0] as [AnonymizeArgs];
      expect(updateArgs.where).toEqual({ id: 'user-1' });
      expect(updateArgs.data).toMatchObject({
        email: null,
        phone: null,
        firstName: 'Utilisateur',
        lastName: 'Anonymisé',
        profilePhotoPath: null,
        supabaseId: null,
      });
      expect(updateArgs.data.anonymizedAt).toBeInstanceOf(Date);
      expect(result.message).toContain('anonymisé');
    });

    it('ne plante pas si le compte Supabase est déjà absent (supabaseId null)', async () => {
      const userWithoutSupabase = { ...user, supabaseId: null } as AuthenticatedUser;
      await service.anonymize(userWithoutSupabase);
      expect(supabaseAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
    });

    it('supprime la photo de profil du Storage — une photo de visage reste une donnée personnelle', async () => {
      const userWithPhoto = {
        ...user,
        profilePhotoPath: 'user-1/old-photo.webp',
      } as AuthenticatedUser;
      await service.anonymize(userWithPhoto);
      expect(storage.remove).toHaveBeenCalledWith('profile-photos', 'user-1/old-photo.webp');
    });

    it("ne touche pas au Storage si l'utilisateur n'avait pas de photo de profil", async () => {
      await service.anonymize(user);
      expect(storage.remove).not.toHaveBeenCalled();
    });
  });
});
