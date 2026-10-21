import { WhatsappConsent, WhatsappConsentSource } from '@prisma/client';
import { WHATSAPP_INVITATION_TTL_MS } from '../../common/constants';

// Règles du consentement WhatsApp (unité 45, /architect 2026-10-16) — seule
// définition des transitions, appliquée par ConsentWriter. Fonction pure :
// elle décide, l'écriture (conditionnée à l'état lu) est faite ailleurs.
//
// Principes :
// - l'agence peut seulement DEMANDER (→ PENDING) ou noter un refus
//   (→ STOPPED) ; seul le locataire fait passer à ACCEPTED ;
// - personne d'autre que le locataire ne sort de STOPPED ;
// - un STOP s'applique toujours, même arrivé en retard (côté sûr) ;
// - un « OUI » ou un « REPRENDRE » dont l'heure Meta n'est pas strictement
//   postérieure au dernier changement est ignoré (messages dans le désordre,
//   même seconde = ambigu = on ne réactive pas).

export type ConsentState = {
  consent: WhatsappConsent;
  changedAt: Date | null;
  requestId: string | null;
  requestExpiresAt: Date | null;
  // Dernière invitation « répondez OUI » du robot (unité 47).
  invitedAt: Date | null;
};

export type ConsentCommand =
  | { type: 'AGENCY_REQUEST' }
  | { type: 'AGENCY_REFUSAL' }
  | { type: 'TENANT_ACCEPT' }
  | { type: 'TENANT_WITHDRAW' }
  | { type: 'BOT_CONFIRM'; sourceAt: Date }
  | { type: 'BOT_RESUME'; sourceAt: Date }
  | { type: 'BOT_STOP'; sourceAt: Date }
  // newPhone : nouveau numéro WhatsApp dédié, 8 chiffres ; null = plus de
  // numéro dédié, WhatsApp suit le numéro principal (changé depuis le profil).
  | { type: 'PHONE_CHANGE'; by: 'AGENCY' | 'TENANT'; newPhone: string | null }
  | { type: 'SYSTEM_STOP' };

export type ConsentUnchangedReason =
  | 'ALREADY_IN_STATE'
  | 'NO_PENDING_REQUEST'
  | 'REQUEST_EXPIRED'
  | 'NOT_STOPPED'
  | 'STALE';

export type ConsentRefusedReason = 'STOPPED_BY_TENANT';

export type ConsentDecision =
  | {
      kind: 'changed';
      next: WhatsappConsent;
      source: WhatsappConsentSource;
      // Heure à retenir comme dernier changement (jamais en arrière).
      changedAt: Date;
      // Demande d'accord : ouverte (AGENCY_REQUEST) ou refermée (toute
      // autre transition).
      request: 'open' | 'close';
      // Demande à laquelle répond un « OUI » (preuve).
      answeredRequestId: string | null;
      // Invitation du robot à laquelle répond un « OUI » (preuve, unité 47).
      answeredInvitationAt: Date | null;
    }
  | { kind: 'unchanged'; reason: ConsentUnchangedReason }
  | { kind: 'refused'; reason: ConsentRefusedReason };

export function decideConsent(state: ConsentState, command: ConsentCommand, now: Date): ConsentDecision {
  const { consent } = state;

  switch (command.type) {
    case 'AGENCY_REQUEST':
      if (consent === 'STOPPED') return refused();
      if (consent === 'ACCEPTED') return unchanged('ALREADY_IN_STATE');
      // NOT_ASKED ou PENDING : une nouvelle demande remplace l'ancienne
      // (une seule demande valable à la fois par locataire).
      return changed(state, 'PENDING', 'AGENCY', now, 'open');

    case 'AGENCY_REFUSAL':
      if (consent === 'STOPPED') return unchanged('ALREADY_IN_STATE');
      return changed(state, 'STOPPED', 'AGENCY', now, 'close');

    case 'TENANT_ACCEPT':
      if (consent === 'ACCEPTED') return unchanged('ALREADY_IN_STATE');
      return changed(state, 'ACCEPTED', 'TENANT_PORTAL', now, 'close');

    case 'TENANT_WITHDRAW':
      if (consent === 'STOPPED') return unchanged('ALREADY_IN_STATE');
      return changed(state, 'STOPPED', 'TENANT_PORTAL', now, 'close');

    case 'BOT_CONFIRM': {
      // Un « OUI » ne vaut accord qu'en réponse à une demande de l'agence
      // encore valable, ou à une invitation du robot de moins de 24 h (unité
      // 47). Sinon il vérifie seulement le numéro (fait par le webhook).
      const requestValid =
        consent === 'PENDING' &&
        state.requestId !== null &&
        state.requestExpiresAt !== null &&
        command.sourceAt < state.requestExpiresAt;
      const invitationValid =
        (consent === 'NOT_ASKED' || consent === 'PENDING') &&
        state.invitedAt !== null &&
        command.sourceAt > state.invitedAt &&
        command.sourceAt.getTime() < state.invitedAt.getTime() + WHATSAPP_INVITATION_TTL_MS;
      if (!requestValid && !invitationValid) {
        return unchanged(consent === 'PENDING' && state.requestId ? 'REQUEST_EXPIRED' : 'NO_PENDING_REQUEST');
      }
      if (isStale(state, command.sourceAt)) return unchanged('STALE');
      return {
        ...changed(state, 'ACCEPTED', 'BOT', command.sourceAt, 'close'),
        answeredRequestId: requestValid ? state.requestId : null,
        answeredInvitationAt: requestValid ? null : state.invitedAt,
      };
    }

    case 'BOT_RESUME':
      if (consent !== 'STOPPED') return unchanged('NOT_STOPPED');
      if (isStale(state, command.sourceAt)) return unchanged('STALE');
      return changed(state, 'ACCEPTED', 'BOT', command.sourceAt, 'close');

    case 'BOT_STOP':
      if (consent === 'STOPPED') return unchanged('ALREADY_IN_STATE');
      // Pas de contrôle d'ancienneté : un STOP en retard s'applique quand
      // même. changedAt ne recule jamais, donc un « REPRENDRE » plus ancien
      // que le dernier changement reste ignoré.
      return changed(state, 'STOPPED', 'BOT', command.sourceAt, 'close');

    case 'PHONE_CHANGE':
      // Après un arrêt, l'agence ne peut pas changer le numéro (elle
      // pourrait sinon redemander l'accord sur un autre numéro). Le
      // locataire, lui, le peut, mais l'arrêt reste en place.
      if (consent === 'STOPPED' && command.by === 'AGENCY') return refused();
      return changed(
        state,
        consent === 'STOPPED' ? 'STOPPED' : 'NOT_ASKED',
        command.by === 'AGENCY' ? 'AGENCY' : 'TENANT_PORTAL',
        now,
        'close',
      );

    case 'SYSTEM_STOP':
      if (consent === 'STOPPED') return unchanged('ALREADY_IN_STATE');
      return changed(state, 'STOPPED', 'SYSTEM', now, 'close');
  }
}

function isStale(state: ConsentState, sourceAt: Date): boolean {
  return state.changedAt !== null && sourceAt.getTime() <= state.changedAt.getTime();
}

function changed(
  state: ConsentState,
  next: WhatsappConsent,
  source: WhatsappConsentSource,
  at: Date,
  request: 'open' | 'close',
): Extract<ConsentDecision, { kind: 'changed' }> {
  const changedAt = state.changedAt && state.changedAt.getTime() > at.getTime() ? state.changedAt : at;
  return { kind: 'changed', next, source, changedAt, request, answeredRequestId: null, answeredInvitationAt: null };
}

function unchanged(reason: ConsentUnchangedReason): ConsentDecision {
  return { kind: 'unchanged', reason };
}

function refused(): ConsentDecision {
  return { kind: 'refused', reason: 'STOPPED_BY_TENANT' };
}
