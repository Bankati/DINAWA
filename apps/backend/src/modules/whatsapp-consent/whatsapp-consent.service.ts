import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WhatsappConsent } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../common/cache/cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../auth/token.service';
import { canActOnProperty } from '../../common/permissions/property-access';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import {
  CONSENT_TRANSACTION_OPTIONS,
  WHATSAPP_AGENCY_ATTESTATION_TEXT,
  WHATSAPP_CONSENT_NOTICE_VERSION,
  WHATSAPP_CONSENT_PREFILL_TEXT,
  WHATSAPP_TENANT_NOTICE_TEXT,
} from '../../common/constants';
import { storedPhoneVariants } from '../../common/utils/phone';
import {
  ApplyConsentInput,
  ApplyConsentResult,
  applyConsentCommand,
  effectiveLocalPhone,
  isWhatsappPhoneVerified,
} from './consent-writer';
import { AgencyConsentRefusalDto, AgencyConsentRequestDto, TenantConsentDto } from './dto/whatsapp-consent.dto';

// Ce que l'agence et le locataire voient de l'état WhatsApp. Jamais le code
// (seulement s'il existe) ; le numéro est celui que le locataire ou
// l'agence a saisi, déjà visible des deux.
export type WhatsappStatusView = {
  consent: WhatsappConsent;
  whatsappPhone: string | null;
  // Le numéro auquel WhatsApp écrirait a bien envoyé un message à WARAH.
  phoneVerified: boolean;
  requestExpiresAt: Date | null;
  requestExpired: boolean;
  consentAt: Date | null;
  stoppedAt: Date | null;
  pinSet: boolean;
  // Lien « Écrire à WARAH » (wa.me) avec la phrase d'accord pré-remplie :
  // ouvert ou scanné (QR code) par le locataire pour confirmer et vérifier
  // son numéro. Null si le numéro de WARAH n'est pas configuré.
  contactLink: string | null;
  // Textes d'accord de la version enregistrée en preuve (seule source).
  notice: { version: string; agencyAttestation: string; tenantNotice: string };
};

const NOTICE = {
  version: WHATSAPP_CONSENT_NOTICE_VERSION,
  agencyAttestation: WHATSAPP_AGENCY_ATTESTATION_TEXT,
  tenantNotice: WHATSAPP_TENANT_NOTICE_TEXT,
};

const STATUS_SELECT = {
  phone: true,
  whatsappPhone: true,
  whatsappConsent: true,
  whatsappConsentAt: true,
  whatsappStoppedAt: true,
  whatsappConsentRequestExpiresAt: true,
  whatsappVerifiedPhone: true,
  tenantProfile: { select: { whatsappPinHash: true } },
} as const;

// Nouveau code ou réinitialisation : la vérification du robot (30 jours,
// unité 47) tombe avec l'ancien code.
const PIN_RESET = {
  whatsappPinHash: null,
  pinFailedAttempts: 0,
  pinLockedUntil: null,
  pinVerifiedAt: null,
  pinVerifiedPhone: null,
};

const STOPPED_MESSAGE = 'Le locataire a arrêté les messages WhatsApp : lui seul peut les réactiver';
// Message volontairement neutre : ne révèle pas à qui appartient le numéro.
const PHONE_UNAVAILABLE_MESSAGE = 'Ce numéro ne peut pas être utilisé pour WhatsApp';

// Consentement WhatsApp côté agence et espace locataire (unité 45,
// /architect 2026-10-16). Toute écriture passe par applyConsentCommand,
// dans une transaction. L'agence agit seulement sur un locataire dont le
// bail actif porte sur un bien qu'elle peut modifier (canActOnProperty).
@Injectable()
export class WhatsappConsentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {}

  // --- Agence (OWNER / MANAGER) ---

  async getForAgency(user: AuthenticatedUser, tenantUserId: string): Promise<WhatsappStatusView> {
    await this.assertAgencyAccess(user, tenantUserId, 'read');
    return this.status(tenantUserId);
  }

  // Déclare l'accord recueilli par l'agence : passe « en attente » du OUI
  // du locataire, jamais directement « accepté » (décision 1 révisée).
  async requestByAgency(user: AuthenticatedUser, tenantUserId: string, dto: AgencyConsentRequestDto): Promise<WhatsappStatusView> {
    await this.assertAgencyAccess(user, tenantUserId, 'mutate');
    await this.inTransaction(async (tx) => {
      await this.setPhone(tx, tenantUserId, dto.whatsappPhone, 'AGENCY', user.id);
      await this.apply(tx, {
        userId: tenantUserId,
        command: { type: 'AGENCY_REQUEST' },
        actorUserId: user.id,
        noticeVersion: WHATSAPP_CONSENT_NOTICE_VERSION,
        collectionMethod: dto.collectionMethod,
      });
    });
    return this.afterChange(tenantUserId);
  }

  // Refus ou retrait exprimé par le locataire auprès de l'agence : arrêt,
  // que seul le locataire pourra lever.
  async refusalByAgency(user: AuthenticatedUser, tenantUserId: string, dto: AgencyConsentRefusalDto): Promise<WhatsappStatusView> {
    await this.assertAgencyAccess(user, tenantUserId, 'mutate');
    await this.inTransaction((tx) =>
      this.apply(tx, {
        userId: tenantUserId,
        command: { type: 'AGENCY_REFUSAL' },
        actorUserId: user.id,
        collectionMethod: dto.collectionMethod,
      }),
    );
    return this.afterChange(tenantUserId);
  }

  async changePhoneByAgency(user: AuthenticatedUser, tenantUserId: string, whatsappPhone: string): Promise<WhatsappStatusView> {
    await this.assertAgencyAccess(user, tenantUserId, 'mutate');
    await this.inTransaction((tx) => this.setPhone(tx, tenantUserId, whatsappPhone, 'AGENCY', user.id));
    return this.afterChange(tenantUserId);
  }

  // Réinitialise le code sans jamais le voir (décision 2) : le locataire
  // devra en générer un nouveau dans son espace.
  async resetPinByAgency(user: AuthenticatedUser, tenantUserId: string): Promise<WhatsappStatusView> {
    await this.assertAgencyAccess(user, tenantUserId, 'mutate');
    await this.prisma.tenantProfile.updateMany({ where: { userId: tenantUserId }, data: PIN_RESET });
    return this.status(tenantUserId);
  }

  // --- Espace locataire (toujours le compte connecté, jamais un id reçu) ---

  async getForTenant(user: AuthenticatedUser): Promise<WhatsappStatusView> {
    return this.status(user.id);
  }

  async setConsentByTenant(user: AuthenticatedUser, dto: TenantConsentDto): Promise<WhatsappStatusView> {
    await this.inTransaction(async (tx) => {
      if (dto.action === 'WITHDRAW') {
        await this.apply(tx, { userId: user.id, command: { type: 'TENANT_WITHDRAW' }, actorUserId: user.id });
        return;
      }
      const current = await tx.user.findUniqueOrThrow({ where: { id: user.id }, select: { phone: true, whatsappPhone: true } });
      const phone = dto.whatsappPhone ?? effectiveLocalPhone(current);
      if (!phone) throw new BadRequestException('Indiquez votre numéro WhatsApp');
      await this.setPhone(tx, user.id, phone, 'TENANT', user.id);
      // Accord enregistré même si le numéro n'est pas encore vérifié : rien
      // ne partira tant que le locataire n'a pas écrit à WARAH (décision 3).
      await this.apply(tx, {
        userId: user.id,
        command: { type: 'TENANT_ACCEPT' },
        actorUserId: user.id,
        noticeVersion: WHATSAPP_CONSENT_NOTICE_VERSION,
      });
    });
    return this.afterChange(user.id);
  }

  async changePhoneByTenant(user: AuthenticatedUser, whatsappPhone: string): Promise<WhatsappStatusView> {
    await this.inTransaction((tx) => this.setPhone(tx, user.id, whatsappPhone, 'TENANT', user.id));
    return this.afterChange(user.id);
  }

  // Nouveau code tiré au hasard (jamais trop simple), renvoyé UNE seule fois
  // et stocké haché : WARAH ne peut plus le réafficher. Remplace l'ancien
  // code et remet à zéro compteur d'essais et blocage (décision 2).
  async generatePinForTenant(user: AuthenticatedUser): Promise<{ pin: string }> {
    const pin = this.tokens.generatePin();
    const whatsappPinHash = await this.tokens.hashPin(pin);
    const { count } = await this.prisma.tenantProfile.updateMany({
      where: { userId: user.id },
      data: { ...PIN_RESET, whatsappPinHash },
    });
    if (count === 0) throw new NotFoundException('Profil locataire introuvable');
    return { pin };
  }

  // --- Interne ---

  // Fixe le numéro WhatsApp. Numéro différent de celui auquel WhatsApp
  // écrirait = changement de numéro (tout est remis à zéro). Même numéro
  // mais pas encore enregistré comme numéro WhatsApp dédié : on le fige,
  // pour qu'une modification ultérieure du numéro principal (profil) ne
  // déplace pas silencieusement le canal.
  private async setPhone(
    tx: Prisma.TransactionClient,
    userId: string,
    whatsappPhone: string,
    by: 'AGENCY' | 'TENANT',
    actorUserId: string,
  ): Promise<void> {
    const current = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { phone: true, whatsappPhone: true, whatsappConsent: true },
    });
    const effective = effectiveLocalPhone(current);
    if (effective === whatsappPhone && current.whatsappPhone === whatsappPhone) return;
    // Refus avant toute vérification du numéro : après un arrêt, l'agence ne
    // touche pas au numéro, même pour le figer.
    if (by === 'AGENCY' && current.whatsappConsent === 'STOPPED') throw new ConflictException(STOPPED_MESSAGE);

    await this.assertPhoneAvailable(tx, userId, whatsappPhone);
    if (effective === whatsappPhone) {
      await this.writePhone(tx, userId, whatsappPhone);
      return;
    }
    await this.apply(tx, { userId, command: { type: 'PHONE_CHANGE', by, newPhone: whatsappPhone }, actorUserId });
  }

  // Un numéro WhatsApp ne doit désigner qu'un seul compte : le webhook doit
  // retrouver sans ambiguïté qui écrit (décision 3). Toutes les formes
  // enregistrables sont vérifiées (storedPhoneVariants, /review unité 44).
  private async assertPhoneAvailable(tx: Prisma.TransactionClient, userId: string, local: string): Promise<void> {
    const variants = storedPhoneVariants(local);
    const taken = await tx.user.findFirst({
      where: {
        id: { not: userId },
        OR: [{ whatsappPhone: { in: variants } }, { whatsappPhone: null, phone: { in: variants } }],
      },
      select: { id: true },
    });
    if (taken) throw new ConflictException(PHONE_UNAVAILABLE_MESSAGE);
  }

  private async writePhone(tx: Prisma.TransactionClient, userId: string, whatsappPhone: string): Promise<void> {
    try {
      await tx.user.update({ where: { id: userId }, data: { whatsappPhone } });
    } catch (error) {
      throw mapPhoneConflict(error);
    }
  }

  private async apply(tx: Prisma.TransactionClient, input: ApplyConsentInput): Promise<ApplyConsentResult> {
    let result: ApplyConsentResult;
    try {
      result = await applyConsentCommand(tx, input);
    } catch (error) {
      throw mapPhoneConflict(error);
    }
    if (result.decision.kind === 'refused') throw new ConflictException(STOPPED_MESSAGE);
    return result;
  }

  private inTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work, CONSENT_TRANSACTION_OPTIONS);
  }

  // Lecture : propriétaire ou gestionnaire mandaté du bien du bail actif.
  // Modification : canMutate (un propriétaire dont le bien est sous mandat
  // actif voit l'état mais ne le modifie pas). Sans bail actif, pas de
  // WhatsApp possible (canUseWhatsapp l'exige aussi).
  private async assertAgencyAccess(user: AuthenticatedUser, tenantUserId: string, mode: 'read' | 'mutate'): Promise<void> {
    const lease = await this.prisma.lease.findFirst({
      where: { tenantUserId, status: 'ACTIVE', tenant: { role: 'TENANT', anonymizedAt: null } },
      include: { property: true },
    });
    if (!lease) throw new NotFoundException('Locataire introuvable ou sans bail actif');
    const access = await canActOnProperty(this.prisma, user, lease.property);
    if (mode === 'read' ? !access.canRead : !access.canMutate) {
      throw new ForbiddenException('Accès refusé à ce locataire');
    }
  }

  private contactLink(): string | null {
    const number = this.config.get<string>('WHATSAPP_BUSINESS_NUMBER');
    return number ? `https://wa.me/${number}?text=${encodeURIComponent(WHATSAPP_CONSENT_PREFILL_TEXT)}` : null;
  }

  // Le badge WhatsApp de la liste « Locataires » est mis en cache par
  // utilisateur : un changement fait par le locataire, le robot ou un autre
  // membre de l'agence doit vider le cache de tous ceux qui voient ce
  // locataire (propriétaire, gestionnaire mandaté, auteur de l'invitation).
  async refreshAgencyLists(tenantUserId: string): Promise<void> {
    const [lease, profile] = await Promise.all([
      this.prisma.lease.findFirst({
        where: { tenantUserId, status: 'ACTIVE' },
        select: {
          property: {
            select: { ownerId: true, mandates: { where: { status: 'ACTIVE' }, select: { managerId: true }, take: 1 } },
          },
        },
      }),
      this.prisma.tenantProfile.findUnique({ where: { userId: tenantUserId }, select: { invitedByUserId: true } }),
    ]);
    const viewers = [lease?.property.ownerId, lease?.property.mandates[0]?.managerId, profile?.invitedByUserId];
    for (const userId of new Set(viewers)) {
      if (userId) this.cache.invalidateUser(userId);
    }
  }

  private async afterChange(tenantUserId: string): Promise<WhatsappStatusView> {
    await this.refreshAgencyLists(tenantUserId);
    return this.status(tenantUserId);
  }

  private async status(userId: string): Promise<WhatsappStatusView> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: STATUS_SELECT });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    const whatsappPhone = effectiveLocalPhone(user);
    const expiresAt = user.whatsappConsent === 'PENDING' ? user.whatsappConsentRequestExpiresAt : null;
    return {
      consent: user.whatsappConsent,
      whatsappPhone,
      phoneVerified: isWhatsappPhoneVerified(user),
      requestExpiresAt: expiresAt,
      requestExpired: expiresAt !== null && expiresAt.getTime() <= Date.now(),
      consentAt: user.whatsappConsentAt,
      stoppedAt: user.whatsappStoppedAt,
      pinSet: Boolean(user.tenantProfile?.whatsappPinHash),
      contactLink: this.contactLink(),
      notice: NOTICE,
    };
  }
}

// Course entre la vérification et l'écriture : la contrainte unique de
// whatsappPhone est la vraie garantie, remappée en 409 neutre.
function mapPhoneConflict(error: unknown): unknown {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return new ConflictException(PHONE_UNAVAILABLE_MESSAGE);
  }
  return error;
}
