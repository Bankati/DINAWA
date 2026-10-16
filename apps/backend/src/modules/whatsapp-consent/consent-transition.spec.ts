import { WhatsappConsent } from '@prisma/client';
import { ConsentCommand, ConsentState, decideConsent } from './consent-transition';

const NOW = new Date('2026-10-16T10:00:00.000Z');
const EARLIER = new Date('2026-10-16T09:00:00.000Z');
const LATER = new Date('2026-10-16T11:00:00.000Z');
const EXPIRES = new Date('2026-10-23T10:00:00.000Z');

function state(consent: WhatsappConsent, extra: Partial<ConsentState> = {}): ConsentState {
  return { consent, changedAt: null, requestId: null, requestExpiresAt: null, ...extra };
}

const pending = (extra: Partial<ConsentState> = {}): ConsentState =>
  state('PENDING', { changedAt: NOW, requestId: 'req-1', requestExpiresAt: EXPIRES, ...extra });

const ALL: WhatsappConsent[] = ['NOT_ASKED', 'PENDING', 'ACCEPTED', 'STOPPED'];

describe('decideConsent — agence', () => {
  it.each(['NOT_ASKED', 'PENDING'] as const)('une demande de l’agence met « en attente » (%s), jamais « accepté »', (from) => {
    const decision = decideConsent(state(from), { type: 'AGENCY_REQUEST' }, NOW);
    expect(decision).toEqual({
      kind: 'changed',
      next: 'PENDING',
      source: 'AGENCY',
      changedAt: NOW,
      request: 'open',
      answeredRequestId: null,
    });
  });

  it('une demande sur un locataire déjà actif ne change rien (idempotent)', () => {
    expect(decideConsent(state('ACCEPTED'), { type: 'AGENCY_REQUEST' }, NOW)).toEqual({
      kind: 'unchanged',
      reason: 'ALREADY_IN_STATE',
    });
  });

  it('l’agence ne peut jamais lever un arrêt', () => {
    expect(decideConsent(state('STOPPED'), { type: 'AGENCY_REQUEST' }, NOW)).toEqual({
      kind: 'refused',
      reason: 'STOPPED_BY_TENANT',
    });
  });

  it.each(['NOT_ASKED', 'PENDING', 'ACCEPTED'] as const)('un refus noté par l’agence arrête le canal (%s)', (from) => {
    expect(decideConsent(state(from), { type: 'AGENCY_REFUSAL' }, NOW)).toMatchObject({
      kind: 'changed',
      next: 'STOPPED',
      source: 'AGENCY',
      request: 'close',
    });
  });

  it('un refus sur un canal déjà arrêté ne change rien', () => {
    expect(decideConsent(state('STOPPED'), { type: 'AGENCY_REFUSAL' }, NOW)).toMatchObject({ kind: 'unchanged' });
  });

  it('après un arrêt, l’agence ne peut pas changer le numéro', () => {
    expect(decideConsent(state('STOPPED'), { type: 'PHONE_CHANGE', by: 'AGENCY', newPhone: '99887766' }, NOW)).toEqual({
      kind: 'refused',
      reason: 'STOPPED_BY_TENANT',
    });
  });
});

describe('decideConsent — espace locataire', () => {
  it.each(['NOT_ASKED', 'PENDING', 'STOPPED'] as const)('le locataire active lui-même (%s → ACCEPTED)', (from) => {
    expect(decideConsent(state(from), { type: 'TENANT_ACCEPT' }, NOW)).toMatchObject({
      kind: 'changed',
      next: 'ACCEPTED',
      source: 'TENANT_PORTAL',
      request: 'close',
    });
  });

  it.each(['NOT_ASKED', 'PENDING', 'ACCEPTED'] as const)('le locataire retire son accord (%s → STOPPED)', (from) => {
    expect(decideConsent(state(from), { type: 'TENANT_WITHDRAW' }, NOW)).toMatchObject({
      kind: 'changed',
      next: 'STOPPED',
      source: 'TENANT_PORTAL',
    });
  });

  it('activer deux fois ne crée qu’un changement (double clic)', () => {
    expect(decideConsent(state('ACCEPTED'), { type: 'TENANT_ACCEPT' }, NOW)).toMatchObject({ kind: 'unchanged' });
  });
});

describe('decideConsent — « OUI » (confirmation par le robot)', () => {
  const oui = (sourceAt: Date): ConsentCommand => ({ type: 'BOT_CONFIRM', sourceAt });

  it('un OUI à une demande en cours active le canal et garde la référence de la demande', () => {
    expect(decideConsent(pending(), oui(LATER), LATER)).toEqual({
      kind: 'changed',
      next: 'ACCEPTED',
      source: 'BOT',
      changedAt: LATER,
      request: 'close',
      answeredRequestId: 'req-1',
    });
  });

  it.each(['NOT_ASKED', 'ACCEPTED', 'STOPPED'] as const)('un OUI sans demande en cours ne vaut pas accord (%s)', (from) => {
    expect(decideConsent(state(from), oui(LATER), LATER)).toEqual({ kind: 'unchanged', reason: 'NO_PENDING_REQUEST' });
  });

  it('un OUI après l’expiration de la demande ne vaut pas accord', () => {
    const afterExpiry = new Date(EXPIRES.getTime() + 1000);
    expect(decideConsent(pending(), oui(afterExpiry), afterExpiry)).toEqual({ kind: 'unchanged', reason: 'REQUEST_EXPIRED' });
  });

  it('un OUI envoyé avant la demande (message en retard) est ignoré', () => {
    expect(decideConsent(pending(), oui(EARLIER), LATER)).toEqual({ kind: 'unchanged', reason: 'STALE' });
  });

  it('même seconde que la demande = ambigu = pas d’activation', () => {
    expect(decideConsent(pending(), oui(NOW), LATER)).toEqual({ kind: 'unchanged', reason: 'STALE' });
  });
});

describe('decideConsent — STOP et REPRENDRE', () => {
  it.each(['NOT_ASKED', 'PENDING', 'ACCEPTED'] as const)('un STOP arrête toujours (%s)', (from) => {
    expect(decideConsent(state(from), { type: 'BOT_STOP', sourceAt: NOW }, NOW)).toMatchObject({
      kind: 'changed',
      next: 'STOPPED',
      source: 'BOT',
      request: 'close',
    });
  });

  it('un STOP en retard s’applique quand même, sans faire reculer l’heure du dernier changement', () => {
    const decision = decideConsent(state('ACCEPTED', { changedAt: LATER }), { type: 'BOT_STOP', sourceAt: EARLIER }, LATER);
    expect(decision).toMatchObject({ kind: 'changed', next: 'STOPPED', changedAt: LATER });
  });

  it('REPRENDRE après un arrêt réactive le canal', () => {
    expect(decideConsent(state('STOPPED', { changedAt: NOW }), { type: 'BOT_RESUME', sourceAt: LATER }, LATER)).toMatchObject({
      kind: 'changed',
      next: 'ACCEPTED',
      source: 'BOT',
      changedAt: LATER,
    });
  });

  it.each(['NOT_ASKED', 'PENDING', 'ACCEPTED'] as const)('REPRENDRE sans arrêt ne fait rien (%s)', (from) => {
    expect(decideConsent(state(from), { type: 'BOT_RESUME', sourceAt: LATER }, LATER)).toEqual({
      kind: 'unchanged',
      reason: 'NOT_STOPPED',
    });
  });

  it('un vieux REPRENDRE ne peut jamais annuler un STOP plus récent', () => {
    // Ama écrit REPRENDRE (09h) puis STOP (10h) ; Meta livre le STOP d'abord.
    const afterStop = decideConsent(state('ACCEPTED', { changedAt: EARLIER }), { type: 'BOT_STOP', sourceAt: NOW }, NOW);
    expect(afterStop).toMatchObject({ kind: 'changed', next: 'STOPPED', changedAt: NOW });
    const lateResume = decideConsent(state('STOPPED', { changedAt: NOW }), { type: 'BOT_RESUME', sourceAt: EARLIER }, LATER);
    expect(lateResume).toEqual({ kind: 'unchanged', reason: 'STALE' });
  });

  it('un STOP en retard après un REPRENDRE plus récent arrête quand même (côté sûr)', () => {
    // REPRENDRE (11h) livré d'abord, puis le STOP de 10h : on arrête.
    const decision = decideConsent(state('ACCEPTED', { changedAt: LATER }), { type: 'BOT_STOP', sourceAt: NOW }, LATER);
    expect(decision).toMatchObject({ kind: 'changed', next: 'STOPPED', changedAt: LATER });
    // Et ce REPRENDRE de 11h, s'il était renvoyé, ne réactive pas.
    expect(decideConsent(state('STOPPED', { changedAt: LATER }), { type: 'BOT_RESUME', sourceAt: LATER }, LATER)).toMatchObject({
      kind: 'unchanged',
    });
  });
});

describe('decideConsent — changement de numéro', () => {
  it.each(['NOT_ASKED', 'PENDING', 'ACCEPTED'] as const)('remet l’accord à zéro (%s → NOT_ASKED) et ferme la demande', (from) => {
    expect(decideConsent(state(from), { type: 'PHONE_CHANGE', by: 'AGENCY', newPhone: '99887766' }, NOW)).toMatchObject({
      kind: 'changed',
      next: 'NOT_ASKED',
      source: 'AGENCY',
      request: 'close',
    });
  });

  it('le locataire peut changer de numéro après un arrêt, mais l’arrêt reste', () => {
    expect(decideConsent(state('STOPPED'), { type: 'PHONE_CHANGE', by: 'TENANT', newPhone: '99887766' }, NOW)).toMatchObject({
      kind: 'changed',
      next: 'STOPPED',
      source: 'TENANT_PORTAL',
    });
  });

  it('un OUI envoyé avant un changement de numéro est ignoré', () => {
    // Le changement de numéro avance l'heure du dernier changement.
    const after = decideConsent(pending({ changedAt: EARLIER }), { type: 'PHONE_CHANGE', by: 'TENANT', newPhone: '99887766' }, NOW);
    expect(after).toMatchObject({ kind: 'changed', changedAt: NOW, next: 'NOT_ASKED' });
  });
});

describe('decideConsent — invariants', () => {
  const agencyCommands: ConsentCommand[] = [
    { type: 'AGENCY_REQUEST' },
    { type: 'AGENCY_REFUSAL' },
    { type: 'PHONE_CHANGE', by: 'AGENCY', newPhone: '99887766' },
  ];

  it.each(ALL)('aucune action de l’agence ne mène à ACCEPTED (depuis %s)', (from) => {
    for (const command of agencyCommands) {
      const decision = decideConsent(state(from, { requestId: 'req-1', requestExpiresAt: EXPIRES }), command, NOW);
      if (decision.kind === 'changed') expect(decision.next).not.toBe('ACCEPTED');
    }
  });

  it.each(agencyCommands.map((c) => [c.type, c] as const))('aucune action de l’agence ne sort de STOPPED (%s)', (_, command) => {
    const decision = decideConsent(state('STOPPED'), command, NOW);
    if (decision.kind === 'changed') expect(decision.next).toBe('STOPPED');
  });

  it('l’heure du dernier changement ne recule jamais', () => {
    const decision = decideConsent(state('NOT_ASKED', { changedAt: LATER }), { type: 'AGENCY_REQUEST' }, NOW);
    expect(decision).toMatchObject({ kind: 'changed', changedAt: LATER });
  });
});
