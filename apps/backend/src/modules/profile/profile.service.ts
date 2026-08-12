import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { compressPhoto } from '../storage/image-processor';
import { SupabaseAdminService } from '../supabase/supabase-admin.service';
import { AuthService, AuthMeResponse } from '../auth/auth.service';
import { TokenService } from '../auth/token.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateNotificationConsentDto } from './dto/update-notification-consent.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly authService: AuthService,
    private readonly tokens: TokenService,
  ) {}

  async getProfile(
    user: AuthenticatedUser,
  ): Promise<AuthMeResponse & { profilePhotoUrl: string | null }> {
    const me = await this.authService.getMe(user);
    const profilePhotoUrl = me.profilePhotoPath
      ? await this.storage.getSignedUrl('profile-photos', me.profilePhotoPath)
      : null;
    return { ...me, profilePhotoUrl };
  }

  async updateProfile(
    user: AuthenticatedUser,
    dto: UpdateProfileDto,
    photo?: Express.Multer.File,
  ): Promise<User> {
    const data: Prisma.UserUpdateInput = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.city !== undefined) data.city = dto.city;
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

    let updated: User;
    try {
      updated = await this.prisma.user.update({ where: { id: user.id }, data });
    } catch (dbError) {
      // `phone` est unique (@unique en base) — jamais laisser une violation
      // de contrainte remonter en 500 brut (même pattern que
      // AuthService.mapDuplicateError()).
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2002') {
        throw new ConflictException('Ce numéro de téléphone est déjà utilisé par un autre compte');
      }
      throw dbError;
    }

    if (photo && previousPhotoPath) {
      await this.storage.remove('profile-photos', previousPhotoPath);
    }

    return updated;
  }

  // Changement de mot de passe pour un utilisateur déjà connecté — distinct
  // du flux « mot de passe oublié » (OTP). Révoque toutes les sessions
  // (refresh tokens) existantes, y compris celle en cours : l'appelant
  // recevra un 401 sur son prochain refresh et devra se reconnecter avec le
  // nouveau mot de passe, même logique que changer son mot de passe partout
  // ailleurs (déconnexion de tous les appareils par sécurité).
  async changePassword(
    user: AuthenticatedUser,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const fullUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      omit: { passwordHash: false },
    });

    const matches = await this.tokens.comparePassword(dto.currentPassword, fullUser.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }

    const newHash = await this.tokens.hashPassword(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } }),
      this.prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Mot de passe mis à jour — reconnectez-vous sur vos autres appareils' };
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
      const supabaseId = user.supabaseId;
      await this.supabaseAdmin.withRetry(() =>
        this.supabaseAdmin.auth.admin.deleteUser(supabaseId),
      );
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
