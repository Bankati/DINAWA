import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { MAX_PHOTO_BYTES } from '../../common/constants';
import { AuthMeResponse } from '../auth/auth.service';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateNotificationConsentDto } from './dto/update-notification-consent.dto';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: "Profil de l'utilisateur courant" })
  getProfile(@CurrentUser() user: AuthenticatedUser): Promise<AuthMeResponse> {
    return this.profileService.getProfile(user);
  }

  @Patch()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Met à jour les informations personnelles et/ou la photo de profil',
    description:
      'Tous les champs sont optionnels (mise à jour partielle). La photo (`photo`) est ' +
      'compressée et convertie en WebP avant stockage.',
  })
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: MAX_PHOTO_BYTES } }))
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() photo?: Express.Multer.File,
  ): Promise<User> {
    return this.profileService.updateProfile(user, dto, photo);
  }

  @Patch('notification-consent')
  @ApiOperation({
    summary: 'Active ou désactive les notifications',
    description:
      "Bascule uniquement la préférence — n'affecte pas les abonnements push déjà enregistrés " +
      'sur les appareils (voir POST /push/subscribe, étape 06).',
  })
  updateNotificationConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationConsentDto,
  ): Promise<User> {
    return this.profileService.updateNotificationConsent(user, dto);
  }

  @Delete()
  @ApiOperation({
    summary: 'Anonymise et désactive le compte',
    description:
      'Supprime le compte Supabase Auth (connexion impossible ensuite) et vide les champs ' +
      "personnels côté Prisma (email, téléphone, nom). L'historique des paiements et baux est " +
      'conservé pour les obligations légales.',
  })
  anonymize(@CurrentUser() user: AuthenticatedUser): Promise<{ message: string }> {
    return this.profileService.anonymize(user);
  }
}
