import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { resolveResponsibleUserId } from '../../common/permissions/property-access';
import { toWhatsappNumber } from '../../common/utils/phone';

export type WhatsappAccessRefusal =
  | 'CHANNEL_DISABLED'
  | 'USER_NOT_FOUND'
  | 'NO_CONSENT'
  | 'NO_VALID_NUMBER'
  | 'NO_ACTIVE_LEASE'
  | 'TIER_NOT_INCLUDED';

export type WhatsappAccess =
  | { allowed: true; recipientPhone: string; metaNumber: string }
  | { allowed: false; reason: WhatsappAccessRefusal };

// Seule autorité qui décide si un locataire peut recevoir un message
// WhatsApp (unité 42, /architect 2026-10-08) — utilisée par WhatsappService
// avant tout envoi, et plus tard par le robot (unité 47). Quatre contrôles,
// dans l'ordre : interrupteur général, consentement, numéro exploitable,
// forfait du responsable du bien. Un refus n'est jamais une erreur : l'email
// ou le push part comme avant, seul le canal WhatsApp est sauté.
@Injectable()
export class WhatsappAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly platformSettings: PlatformSettingsService,
  ) {}

  async canUseWhatsapp(userId: string): Promise<WhatsappAccess> {
    if (this.config.get<boolean>('WHATSAPP_ENABLED') !== true) {
      return refuse('CHANNEL_DISABLED');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, whatsappPhone: true, whatsappConsent: true },
    });
    if (!user) return refuse('USER_NOT_FOUND');
    // STOPPED compris : après un STOP, plus aucun envoi tant que le
    // locataire n'a pas lui-même redonné son accord.
    if (user.whatsappConsent !== 'ACCEPTED') return refuse('NO_CONSENT');

    // Numéro WhatsApp dédié s'il a été saisi, sinon le numéro principal.
    // recipientPhone est redérivé du format Meta pour garantir 8 chiffres
    // normalisés dans WhatsappMessage, quel que soit le format en base.
    const metaNumber = toWhatsappNumber(user.whatsappPhone ?? user.phone);
    if (!metaNumber) return refuse('NO_VALID_NUMBER');
    const recipientPhone = metaNumber.slice(3);

    // Un locataire n'a qu'un bail actif (invariant #13) : c'est lui qui
    // désigne le bien, donc le responsable dont le forfait compte.
    const lease = await this.prisma.lease.findFirst({
      where: { tenantUserId: userId, status: 'ACTIVE' },
      include: { property: true },
    });
    if (!lease) return refuse('NO_ACTIVE_LEASE');

    const responsibleUserId = await resolveResponsibleUserId(this.prisma, lease.property);
    const [subscription, enabledTiers] = await Promise.all([
      this.prisma.subscription.findUnique({
        where: { userId: responsibleUserId },
        select: { tier: true },
      }),
      this.platformSettings.whatsappEnabledTiers(),
    ]);
    // Pas de ligne d'abonnement (cas théorique : elle est créée à
    // l'inscription) = forfait par défaut du schéma, Starter.
    if (!enabledTiers.includes(subscription?.tier ?? 'STARTER')) {
      return refuse('TIER_NOT_INCLUDED');
    }

    return { allowed: true, recipientPhone, metaNumber };
  }
}

function refuse(reason: WhatsappAccessRefusal): WhatsappAccess {
  return { allowed: false, reason };
}
