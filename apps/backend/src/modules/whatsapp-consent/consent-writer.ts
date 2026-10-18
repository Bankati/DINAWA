import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, WhatsappConsent, WhatsappConsentMethod } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { WHATSAPP_CONSENT_REQUEST_TTL_MS } from '../../common/constants';
import { toWhatsappNumber } from '../../common/utils/phone';
import { ConsentCommand, ConsentDecision, decideConsent } from './consent-transition';

// Une autre écriture peut croiser la nôtre (STOP reçu pendant que l'agence
// enregistre une demande...) : l'écriture est conditionnée à l'état lu, et
// la décision recalculée si elle a perdu la course.
const CONSENT_WRITE_ATTEMPTS = 3;

export type ApplyConsentInput = {
  userId: string;
  command: ConsentCommand;
  // Qui a concrètement agi : agent (AGENCY), locataire (TENANT_PORTAL,
  // BOT), null pour SYSTEM.
  actorUserId: string | null;
  noticeVersion?: string;
  collectionMethod?: WhatsappConsentMethod;
};

export type ApplyConsentResult = {
  decision: ConsentDecision;
  previous: WhatsappConsent;
  eventId: string | null;
};

// Seul point d'écriture du consentement WhatsApp (unité 45) : lit l'état,
// applique decideConsent, écrit l'état ET la ligne d'historique dans la
// transaction fournie. Utilisé par WhatsappConsentService (agence, espace
// locataire), le webhook (OUI, STOP, REPRENDRE) et l'anonymisation.
export async function applyConsentCommand(
  tx: Prisma.TransactionClient,
  input: ApplyConsentInput,
  now: Date = new Date(),
): Promise<ApplyConsentResult> {
  for (let attempt = 0; attempt < CONSENT_WRITE_ATTEMPTS; attempt += 1) {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: {
        phone: true,
        whatsappPhone: true,
        whatsappConsent: true,
        whatsappConsentChangedAt: true,
        whatsappConsentRequestId: true,
        whatsappConsentRequestExpiresAt: true,
        whatsappInvitedAt: true,
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const state = {
      consent: user.whatsappConsent,
      changedAt: user.whatsappConsentChangedAt,
      requestId: user.whatsappConsentRequestId,
      requestExpiresAt: user.whatsappConsentRequestExpiresAt,
      invitedAt: user.whatsappInvitedAt,
    };
    const decision = decideConsent(state, input.command, now);
    if (decision.kind !== 'changed') return { decision, previous: state.consent, eventId: null };

    const eventId = randomUUID();
    const isPhoneChange = input.command.type === 'PHONE_CHANGE';
    const newPhone = input.command.type === 'PHONE_CHANGE' ? input.command.newPhone : null;

    const data: Prisma.UserUpdateManyMutationInput = {
      whatsappConsent: decision.next,
      whatsappConsentChangedAt: decision.changedAt,
      ...(decision.request === 'open'
        ? {
            whatsappConsentRequestId: eventId,
            whatsappConsentRequestExpiresAt: new Date(now.getTime() + WHATSAPP_CONSENT_REQUEST_TTL_MS),
          }
        : { whatsappConsentRequestId: null, whatsappConsentRequestExpiresAt: null }),
      // Tout changement d'état rend caduque une invitation du robot (unité 47).
      whatsappInvitedAt: null,
      ...(decision.next === 'ACCEPTED' ? { whatsappConsentAt: decision.changedAt, whatsappConsentById: input.actorUserId } : {}),
      ...(decision.next === 'STOPPED' && state.consent !== 'STOPPED' ? { whatsappStoppedAt: decision.changedAt } : {}),
      // Nouveau numéro = plus vérifié, quel qu'il soit (décision 3).
      ...(isPhoneChange ? { whatsappPhone: newPhone, whatsappVerifiedPhone: null, whatsappPhoneVerifiedAt: null } : {}),
    };

    // Compare-and-swap : l'écriture n'a lieu que si personne n'a changé
    // l'état entre la lecture et maintenant.
    const { count } = await tx.user.updateMany({
      where: {
        id: input.userId,
        whatsappConsent: state.consent,
        whatsappConsentChangedAt: state.changedAt,
        whatsappConsentRequestId: state.requestId,
      },
      data,
    });
    if (count === 0) continue;

    // Changement depuis le profil (newPhone null) : le numéro principal est
    // déjà à jour dans la transaction, effectiveLocalPhone le relit.
    const concernedPhone = newPhone ?? effectiveLocalPhone(user);
    await tx.whatsappConsentEvent.create({
      data: {
        id: eventId,
        userId: input.userId,
        kind: isPhoneChange ? 'PHONE_CHANGE' : 'CONSENT',
        previousConsent: state.consent,
        newConsent: decision.next,
        source: decision.source,
        actorUserId: input.actorUserId,
        noticeVersion: input.noticeVersion ?? null,
        collectionMethod: input.collectionMethod ?? null,
        phoneLast2: concernedPhone ? concernedPhone.slice(-2) : null,
        requestId: decision.answeredRequestId,
        invitedAt: decision.answeredInvitationAt,
        sourceAt: 'sourceAt' in input.command ? input.command.sourceAt : null,
      },
    });

    // Nouveau numéro = nouveau code à créer par le locataire (décision 3) :
    // l'ancien code ne doit pas suivre un numéro qui a changé de mains.
    if (isPhoneChange) {
      await tx.tenantProfile.updateMany({
        where: { userId: input.userId },
        data: { whatsappPinHash: null, pinFailedAttempts: 0, pinLockedUntil: null, pinVerifiedAt: null, pinVerifiedPhone: null },
      });
      // Conversation en cours avec le robot fermée (point reporté de l'unité
      // 45) : un nouveau numéro repart du menu, sans code vérifié.
      await tx.whatsappConversation.deleteMany({ where: { userId: input.userId } });
    }

    return { decision, previous: state.consent, eventId };
  }

  throw new ConflictException('Le statut WhatsApp vient de changer, veuillez réessayer');
}

// Numéro auquel WhatsApp écrirait (même priorité que WhatsappAccessService) :
// numéro dédié, sinon numéro principal ramené à 8 chiffres.
export function effectiveLocalPhone(user: { phone: string | null; whatsappPhone: string | null }): string | null {
  return toWhatsappNumber(user.whatsappPhone ?? user.phone)?.slice(3) ?? null;
}

// Le numéro auquel WhatsApp écrirait a-t-il bien écrit à WARAH (unité 45) ?
// Même règle que WhatsappAccessService : comparé au numéro lui-même.
export function isWhatsappPhoneVerified(user: {
  phone: string | null;
  whatsappPhone: string | null;
  whatsappVerifiedPhone: string | null;
}): boolean {
  const phone = effectiveLocalPhone(user);
  return phone !== null && user.whatsappVerifiedPhone === phone;
}
