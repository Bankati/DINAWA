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
  | 'NUMBER_NOT_VERIFIED'
  | 'NO_ACTIVE_LEASE'
  | 'TIER_NOT_INCLUDED'
  // Réponse libre hors de la fenêtre de 24 h (WhatsappService, unité 45).
  | 'REPLY_WINDOW_CLOSED';

export type WhatsappAccess =
  | { allowed: true; recipientPhone: string; metaNumber: string }
  | { allowed: false; reason: WhatsappAccessRefusal };

// Seule autorité qui décide si un locataire peut recevoir un message
// WhatsApp (unité 42, /architect 2026-10-08) — utilisée par WhatsappService
// avant tout envoi, et plus tard par le robot (unité 47). Cinq contrôles,
// dans l'ordre : interrupteur général, consentement, numéro exploitable,
// numéro vérifié (unité 45 : le locataire a écrit à WARAH depuis CE
// numéro), forfait du responsable du bien. Un refus n'est jamais une erreur : l'email
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
      select: { phone: true, whatsappPhone: true, whatsappConsent: true, whatsappVerifiedPhone: true },
    });
    if (!user) return refuse('USER_NOT_FOUND');
    // PENDING et STOPPED compris : ni une simple déclaration de l'agence, ni
    // un arrêt ne permettent d'envoyer (seul le locataire active, unité 45).
    if (user.whatsappConsent !== 'ACCEPTED') return refuse('NO_CONSENT');

    // Numéro WhatsApp dédié s'il a été saisi, sinon le numéro principal.
    // recipientPhone est redérivé du format Meta pour garantir 8 chiffres
    // normalisés dans WhatsappMessage, quel que soit le format en base.
    const metaNumber = toWhatsappNumber(user.whatsappPhone ?? user.phone);
    if (!metaNumber) return refuse('NO_VALID_NUMBER');
    const recipientPhone = metaNumber.slice(3);
    // Règle stricte (unité 45, décision 3) : aucun envoi vers un numéro qui
    // n'a jamais écrit à WARAH. Comparé au numéro lui-même : un numéro
    // modifié depuis n'est plus vérifié.
    if (user.whatsappVerifiedPhone !== recipientPhone) return refuse('NUMBER_NOT_VERIFIED');

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

  // Seule exception à canUseWhatsapp (unité 44, /architect 2026-10-13) : la
  // confirmation d'un STOP part alors que le consentement vient justement de
  // passer à STOPPED. Ni consentement, ni bail, ni forfait ne sont vérifiés
  // — la personne vient d'écrire, la réponse est légitime (fenêtre de 24 h
  // vérifiée par WhatsappService) — mais l'interrupteur général et un numéro
  // exploitable ET vérifié restent exigés : la confirmation ne part que vers
  // le numéro qui a écrit STOP (vérifié dans la même transaction, unité 45).
  // À n'utiliser QUE pour cette confirmation (WhatsappService.sendStopConfirmation).
  async canSendStopConfirmation(userId: string): Promise<WhatsappAccess> {
    if (this.config.get<boolean>('WHATSAPP_ENABLED') !== true) {
      return refuse('CHANNEL_DISABLED');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, whatsappPhone: true, whatsappConsent: true, whatsappVerifiedPhone: true },
    });
    if (!user) return refuse('USER_NOT_FOUND');
    // Garde-fou : jamais pour quelqu'un dont l'arrêt n'est pas enregistré.
    if (user.whatsappConsent !== 'STOPPED') return refuse('NO_CONSENT');

    const metaNumber = toWhatsappNumber(user.whatsappPhone ?? user.phone);
    if (!metaNumber) return refuse('NO_VALID_NUMBER');
    const recipientPhone = metaNumber.slice(3);
    if (user.whatsappVerifiedPhone !== recipientPhone) return refuse('NUMBER_NOT_VERIFIED');
    return { allowed: true, recipientPhone, metaNumber };
  }
}

function refuse(reason: WhatsappAccessRefusal): WhatsappAccess {
  return { allowed: false, reason };
}
