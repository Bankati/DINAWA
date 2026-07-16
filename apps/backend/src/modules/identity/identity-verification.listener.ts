import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IDENTITY_VERIFICATION_REQUESTED,
  IdentityVerificationRequestedEvent,
} from './identity-verification.events';
import {
  IdentityVerificationService,
  OcrBackResult,
  OcrFrontResult,
} from './identity-verification.service';

// IdentityVerificationService essaie jusqu'à 4 rotations séquentielles par
// image (photo de CNI souvent de travers) — budget généreux car ce
// traitement est déjà entièrement en arrière-plan (invariant #15), aucune
// requête HTTP n'en dépend directement.
const FRONT_OCR_TIMEOUT_MS = 40_000;
const BACK_OCR_TIMEOUT_MS = 40_000;

const EMPTY_BACK_RESULT: OcrBackResult = {
  rawText: '',
  emergencyContactRaw: null,
  emergencyContactPhone: null,
  mrzChecksumValid: null,
};

class OcrTimeoutError extends Error {}

// Post-traitement asynchrone découplé de la requête HTTP (invariant #15) —
// jamais de logique métier critique dans l'événement lui-même, seulement le
// déclenchement de ce traitement. La décision VERIFIED/REJECTED reste
// entièrement basée sur le recto (IdentityVerificationService.verifyFront) ;
// le verso (verifyBack) est un enrichissement best-effort qui ne peut jamais
// faire échouer ni changer cette décision.
@Injectable()
export class IdentityVerificationListener {
  private readonly logger = new Logger(IdentityVerificationListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ocr: IdentityVerificationService,
  ) {}

  @OnEvent(IDENTITY_VERIFICATION_REQUESTED, { async: true, promisify: true })
  async handle(event: IdentityVerificationRequestedEvent): Promise<void> {
    const front = await this.runFrontOcr(event);
    const back = await this.runBackOcr(event);

    await this.prisma.identityVerification.update({
      where: { id: event.verificationId },
      data: {
        status: front.status,
        reason: front.reason,
        rawText: front.rawText,
        rawTextBack: back.rawText,
        emergencyContactRaw: back.emergencyContactRaw,
        emergencyContactPhone: back.emergencyContactPhone,
        mrzChecksumValid: back.mrzChecksumValid,
      },
    });

    // Le statut du profil est un miroir de IdentityVerification.status —
    // une erreur ici ne doit jamais laisser l'utilisateur bloqué en
    // PENDING alors que l'OCR a bien tranché.
    try {
      await this.updateProfileStatus(event.userId, event.userRole, front.status);
    } catch (error) {
      this.logger.error(`[identity] profil non synchronisé pour user=${event.userId}`, error);
    }
  }

  private async runFrontOcr(event: IdentityVerificationRequestedEvent): Promise<OcrFrontResult> {
    try {
      return await this.raceWithTimeout(
        this.ocr.verifyFront(event.imageBuffer),
        FRONT_OCR_TIMEOUT_MS,
      );
    } catch (error) {
      if (error instanceof OcrTimeoutError) {
        return {
          status: 'REJECTED',
          reason: 'Délai de traitement dépassé, veuillez réessayer',
          rawText: '',
        };
      }
      this.logger.error(
        `[identity] OCR recto en échec pour verification=${event.verificationId}`,
        error,
      );
      return {
        status: 'REJECTED',
        reason: 'Erreur technique pendant la vérification, veuillez réessayer',
        rawText: '',
      };
    }
  }

  // Best-effort strict : quoi qu'il arrive (timeout, erreur, verso illisible),
  // ne renvoie jamais autre chose que des champs vides — jamais de statut, ni
  // d'impact sur la décision VERIFIED/REJECTED du recto.
  private async runBackOcr(event: IdentityVerificationRequestedEvent): Promise<OcrBackResult> {
    try {
      return await this.raceWithTimeout(
        this.ocr.verifyBack(event.imageBackBuffer),
        BACK_OCR_TIMEOUT_MS,
      );
    } catch (error) {
      this.logger.error(
        `[identity] OCR verso en échec pour verification=${event.verificationId}`,
        error,
      );
      return EMPTY_BACK_RESULT;
    }
  }

  private async raceWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer!: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new OcrTimeoutError()), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  private async updateProfileStatus(
    userId: string,
    role: IdentityVerificationRequestedEvent['userRole'],
    status: 'VERIFIED' | 'REJECTED',
  ): Promise<void> {
    switch (role) {
      case 'OWNER':
        await this.prisma.ownerProfile.update({
          where: { userId },
          data: { idVerificationStatus: status },
        });
        return;
      case 'TENANT':
        await this.prisma.tenantProfile.update({
          where: { userId },
          data: { idVerificationStatus: status },
        });
        return;
      case 'MANAGER':
        await this.prisma.managerProfile.update({
          where: { userId },
          data: { idVerificationStatus: status },
        });
        return;
    }
  }
}
