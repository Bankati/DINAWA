import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { compressPhoto } from '../storage/image-processor';
import { SupabaseAdminService } from '../supabase/supabase-admin.service';
import { AuthService, AuthMeResponse } from '../auth/auth.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateNotificationConsentDto } from './dto/update-notification-consent.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly authService: AuthService,
  ) {}

  async getProfile(user: AuthenticatedUser): Promise<AuthMeResponse> {
    return this.authService.getMe(user);
  }

  async updateProfile(
    user: AuthenticatedUser,
    dto: UpdateProfileDto,
    photo?: Express.Multer.File,
  ): Promise<User> {
    const data: Prisma.UserUpdateInput = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.reminderDaysBefore !== undefined) data.reminderDaysBefore = dto.reminderDaysBefore;
    if (dto.overdueGraceDays !== undefined) data.overdueGraceDays = dto.overdueGraceDays;

    // Suppression effective côté Storage quand la référence Prisma change
    // (voir architecture.md, étape 05 — même invariant que pour les photos
    // de bien à l'étape 13). L'ancienne photo n'est supprimée qu'après le
    // succès de l'update Prisma : si l'upload ou l'update échoue avant, le
    // profil garde sa photo actuelle valide plutôt que de pointer vers un
    // fichier supprimé.
    const previousPhotoPath = user.profilePhotoPath;

    if (photo) {
      // sharp lève une erreur brute (non-HTTP) sur un fichier corrompu —
      // jamais laisser ça remonter en 500 (voir /review, même famille de
      // bug que le crash tesseract.js de l'étape 07).
      let compressed: Buffer;
      try {
        compressed = await compressPhoto(photo.buffer);
      } catch {
        throw new BadRequestException('Photo invalide ou corrompue');
      }
      const path = `${user.id}/${randomUUID()}.webp`;
      await this.storage.upload('profile-photos', path, compressed, 'image/webp');
      data.profilePhotoPath = path;
    }

    const updated = await this.prisma.user.update({ where: { id: user.id }, data });

    if (photo && previousPhotoPath) {
      await this.storage.remove('profile-photos', previousPhotoPath);
    }

    return updated;
  }

  async updateNotificationConsent(
    user: AuthenticatedUser,
    dto: UpdateNotificationConsentDto,
  ): Promise<User> {
    // Bascule uniquement la préférence — n'affecte jamais les
    // PushSubscription existantes (voir /architect, décision prise avec le
    // développeur). NotifyService bascule directement sur email quand
    // consent = DECLINED, quel que soit l'état des abonnements en base.
    return this.prisma.user.update({
      where: { id: user.id },
      data: { notificationConsent: dto.consent },
    });
  }

  async anonymize(user: AuthenticatedUser): Promise<{ message: string }> {
    // Suppression définitive côté Supabase Auth — garantit l'impossibilité
    // de se reconnecter. La ligne Prisma est conservée (jamais supprimée) :
    // Payment/Lease y font référence pour les obligations légales.
    if (user.supabaseId) {
      await this.supabaseAdmin.auth.admin.deleteUser(user.supabaseId);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: null,
        phone: null,
        firstName: 'Utilisateur',
        lastName: 'Anonymisé',
        profilePhotoPath: null,
        supabaseId: null,
        anonymizedAt: new Date(),
      },
    });

    // Supprimée seulement après confirmation de l'update — une photo de
    // visage reste une donnée personnelle, l'anonymisation doit la
    // supprimer réellement, pas juste dé-référencer le pointeur en base.
    if (user.profilePhotoPath) {
      await this.storage.remove('profile-photos', user.profilePhotoPath);
    }

    return { message: 'Compte anonymisé' };
  }
}
