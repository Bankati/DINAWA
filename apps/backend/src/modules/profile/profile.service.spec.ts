import { BadRequestException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { compressPhoto } from '../storage/image-processor';

jest.mock('../storage/image-processor', () => ({
  compressPhoto: jest.fn().mockResolvedValue(Buffer.from('compressed')),
}));

describe('ProfileService', () => {
  let service: ProfileService;
  let prisma: { user: { update: jest.Mock } };
  let storage: { upload: jest.Mock; remove: jest.Mock };
  let supabaseAdmin: { auth: { admin: { deleteUser: jest.Mock } } };
  let authService: { getMe: jest.Mock };

  const user = { id: 'user-1', supabaseId: 'supabase-uid-1', role: 'OWNER' } as AuthenticatedUser;

  beforeEach(() => {
    prisma = { user: { update: jest.fn().mockResolvedValue({}) } };
    storage = {
      upload: jest.fn().mockResolvedValue('path'),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    supabaseAdmin = {
      auth: { admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) } },
    };
    authService = { getMe: jest.fn().mockResolvedValue({ id: 'user-1' }) };

    service = new ProfileService(
      prisma as never,
      storage as never,
      supabaseAdmin as never,
      authService as never,
    );
  });

  describe('getProfile', () => {
    it('délègue à AuthService.getMe()', async () => {
      const result = await service.getProfile(user);
      expect(authService.getMe).toHaveBeenCalledWith(user);
      expect(result).toEqual({ id: 'user-1' });
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
