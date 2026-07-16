import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IdentityVerification, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { MAX_PHOTO_BYTES } from '../../common/constants';
import {
  IDENTITY_VERIFICATION_REQUESTED,
  IdentityVerificationRequestedEvent,
} from './identity-verification.events';

// Au-delà de cette fenêtre, une ligne PENDING est considérée comme
// abandonnée (ex. le conteneur a redémarré pendant le traitement, le
// listener n'a jamais tourné) — l'utilisateur peut relancer une
// vérification plutôt que de rester bloqué indéfiniment par la contrainte
// unique partielle (voir prisma/schema.prisma, modèle IdentityVerification).
const STALE_PENDING_MS = 20_000;

export type IdentityVerificationFiles = {
  image?: Express.Multer.File[];
  imageBack?: Express.Multer.File[];
};

// Point d'entrée unique pour déclencher une vérification CNI — répond vite
// (upload + création de la ligne PENDING), jamais l'OCR lui-même (invariant
// #15, voir architecture.md). L'OCR est traité en arrière-plan par
// IdentityVerificationListener via l'événement IDENTITY_VERIFICATION_REQUESTED.
// Le verso est obligatoire à l'upload (valeur métier : « Personne à
// prévenir ») mais ne gate jamais la décision VERIFIED/REJECTED, qui reste
// basée uniquement sur le recto.
@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly events: EventEmitter2,
  ) {}

  async verify(
    user: AuthenticatedUser,
    files: IdentityVerificationFiles,
  ): Promise<IdentityVerification> {
    const front = files.image?.[0];
    const back = files.imageBack?.[0];
    this.assertImage(front, 'Image du recto de la CNI requise');
    this.assertImage(back, 'Image du verso de la CNI requise');

    const { role } = user;
    if (role === 'ADMIN') {
      throw new BadRequestException("Un administrateur n'a pas de vérification CNI");
    }

    const existingPending = await this.prisma.identityVerification.findFirst({
      where: { userId: user.id, status: 'PENDING' },
    });
    if (existingPending && !this.isStale(existingPending.updatedAt)) {
      throw new ConflictException('Une vérification CNI est déjà en cours pour ce compte');
    }

    const frontPath = `${user.id}/${randomUUID()}.${front.mimetype.split('/')[1]}`;
    const backPath = `${user.id}/${randomUUID()}.${back.mimetype.split('/')[1]}`;
    await this.storage.upload('id-documents', frontPath, front.buffer, front.mimetype);
    await this.storage.upload('id-documents', backPath, back.buffer, back.mimetype);

    const verification = await this.createOrReusePending(
      existingPending?.id,
      user.id,
      frontPath,
      backPath,
    );

    this.events.emit(IDENTITY_VERIFICATION_REQUESTED, {
      verificationId: verification.id,
      userId: user.id,
      userRole: role,
      imageBuffer: front.buffer,
      imageBackBuffer: back.buffer,
    } satisfies IdentityVerificationRequestedEvent);

    return verification;
  }

  async getLatestStatus(userId: string): Promise<IdentityVerification | null> {
    return this.prisma.identityVerification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async createOrReusePending(
    existingId: string | undefined,
    userId: string,
    storagePath: string,
    storagePathBack: string,
  ): Promise<IdentityVerification> {
    const resetFields = {
      reason: null,
      rawText: null,
      rawTextBack: null,
      emergencyContactRaw: null,
      emergencyContactPhone: null,
      mrzChecksumValid: null,
    };

    if (existingId) {
      return this.prisma.identityVerification.update({
        where: { id: existingId },
        data: { storagePath, storagePathBack, status: 'PENDING', ...resetFields },
      });
    }

    try {
      return await this.prisma.identityVerification.create({
        data: { userId, storagePath, storagePathBack, status: 'PENDING' },
      });
    } catch (error) {
      // Course possible entre le findFirst et le create — la contrainte
      // unique partielle en base est l'autorité finale, pas ce check.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Une vérification CNI est déjà en cours pour ce compte');
      }
      throw error;
    }
  }

  private isStale(updatedAt: Date): boolean {
    return Date.now() - updatedAt.getTime() > STALE_PENDING_MS;
  }

  private assertImage(
    file: Express.Multer.File | undefined,
    missingMessage: string,
  ): asserts file is Express.Multer.File {
    if (!file) {
      throw new BadRequestException(missingMessage);
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new BadRequestException(
        `Image trop volumineuse (max ${MAX_PHOTO_BYTES / (1024 * 1024)} Mo)`,
      );
    }
  }
}
