import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nestjs';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../auth/token.service';
import {
  PIN_FAILURE_ALERT_THRESHOLD,
  PIN_LOCK_MS,
  PIN_MAX_ATTEMPTS,
  PIN_VERIFICATION_VALIDITY_MS,
} from '../../common/constants';

export type PinCheck =
  | { result: 'OK' }
  | { result: 'WRONG'; remaining: number }
  | { result: 'LOCKED'; until: Date }
  | { result: 'NO_PIN' }
  | { result: 'UNAVAILABLE' };

type PinState = {
  whatsappPinHash: string | null;
  pinVerifiedAt: Date | null;
  pinVerifiedPhone: string | null;
};

const ALERT_WINDOW_MS = 60 * 60 * 1000;

// Code locataire demandé par le robot (unité 47, décision 2). Le code n'est
// jamais reçu en clair : le webhook ne garde que son empreinte HMAC
// (TokenService.pinDigest), comparée ici au hachage bcrypt.
//
// Compteur d'essais SANS contournement : chaque essai est d'abord RÉSERVÉ
// par une seule écriture (+1, refusée si le code est bloqué), puis comparé.
// Au plus 5 comparaisons par période, même avec des messages simultanés :
// la 5e erreur pose le blocage d'une heure, les essais au-delà de 5 ne sont
// même pas comparés.
@Injectable()
export class BotIdentityService {
  private readonly logger = new Logger(BotIdentityService.name);
  // Échecs récents tous comptes confondus (cette instance) : alerte si une
  // attaque essaie des codes sur de nombreux comptes.
  private failures: number[] = [];
  private lastAlertAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  // Vérification encore valable ? Revérifiée à CHAQUE action protégée :
  // code toujours existant, moins de 30 jours, et même numéro vérifié.
  isVerified(pin: PinState, currentVerifiedPhone: string | null, now: Date): boolean {
    return (
      pin.whatsappPinHash !== null &&
      pin.pinVerifiedAt !== null &&
      now.getTime() - pin.pinVerifiedAt.getTime() < PIN_VERIFICATION_VALIDITY_MS &&
      currentVerifiedPhone !== null &&
      pin.pinVerifiedPhone === currentVerifiedPhone
    );
  }

  async check(
    userId: string,
    digest: string | null,
    verifiedPhone: string,
    now: Date,
  ): Promise<PinCheck> {
    if (!digest) return { result: 'UNAVAILABLE' };

    let reserved: { pinFailedAttempts: number; whatsappPinHash: string | null };
    try {
      reserved = await this.prisma.tenantProfile.update({
        where: {
          userId,
          whatsappPinHash: { not: null },
          OR: [{ pinLockedUntil: null }, { pinLockedUntil: { lte: now } }],
        },
        data: { pinFailedAttempts: { increment: 1 } },
        select: { pinFailedAttempts: true, whatsappPinHash: true },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'))
        throw error;
      return this.whyRefused(userId, now);
    }

    const attempt = reserved.pinFailedAttempts;
    const hash = reserved.whatsappPinHash;
    // Au-delà de 5 : une autre requête simultanée est en train de bloquer.
    if (!hash || attempt > PIN_MAX_ATTEMPTS) return this.whyRefused(userId, now);

    if (await this.tokens.verifyPinDigest(digest, hash)) {
      // Seulement si le code n'a pas changé entre-temps (nouveau code généré).
      await this.prisma.tenantProfile.updateMany({
        where: { userId, whatsappPinHash: hash },
        data: {
          pinFailedAttempts: 0,
          pinLockedUntil: null,
          pinVerifiedAt: now,
          pinVerifiedPhone: verifiedPhone,
        },
      });
      return { result: 'OK' };
    }

    this.recordFailure(now);
    if (attempt >= PIN_MAX_ATTEMPTS) {
      const until = new Date(now.getTime() + PIN_LOCK_MS);
      await this.prisma.tenantProfile.updateMany({
        where: { userId },
        data: { pinLockedUntil: until, pinFailedAttempts: 0 },
      });
      return { result: 'LOCKED', until };
    }
    return { result: 'WRONG', remaining: PIN_MAX_ATTEMPTS - attempt };
  }

  private async whyRefused(userId: string, now: Date): Promise<PinCheck> {
    const profile = await this.prisma.tenantProfile.findUnique({
      where: { userId },
      select: { whatsappPinHash: true, pinLockedUntil: true },
    });
    if (!profile?.whatsappPinHash) return { result: 'NO_PIN' };
    const until =
      profile.pinLockedUntil && profile.pinLockedUntil > now
        ? profile.pinLockedUntil
        : new Date(now.getTime() + PIN_LOCK_MS);
    return { result: 'LOCKED', until };
  }

  // Ni code, ni numéro, ni nom dans l'alerte : seulement un nombre.
  private recordFailure(now: Date): void {
    const since = now.getTime() - ALERT_WINDOW_MS;
    this.failures = this.failures.filter((at) => at > since);
    this.failures.push(now.getTime());
    if (
      this.failures.length >= PIN_FAILURE_ALERT_THRESHOLD &&
      now.getTime() - this.lastAlertAt > ALERT_WINDOW_MS
    ) {
      this.lastAlertAt = now.getTime();
      const summary = `[whatsapp-bot] ${this.failures.length} codes locataire faux en 1 h, tous comptes confondus`;
      this.logger.warn(summary);
      Sentry.captureMessage(`WhatsApp : nombre anormal d'échecs du code — ${summary}`, 'warning');
    }
  }
}
