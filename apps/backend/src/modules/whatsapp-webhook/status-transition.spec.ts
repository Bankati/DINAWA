import { DeliveryState, StatusEvent, applyStatusEvent } from './status-transition';

const T1 = new Date('2026-10-13T09:00:00Z');
const T2 = new Date('2026-10-13T09:01:00Z');
const T3 = new Date('2026-10-13T09:30:00Z');

function state(overrides: Partial<DeliveryState> = {}): DeliveryState {
  return { status: 'SENT', sentAt: T1, deliveredAt: null, readAt: null, ...overrides };
}

function event(status: StatusEvent['status'], at: Date, failure?: StatusEvent['failure']): StatusEvent {
  return failure ? { status, at, failure } : { status, at };
}

describe('applyStatusEvent', () => {
  describe('progression normale', () => {
    it('« livré » remplit la date de livraison', () => {
      expect(applyStatusEvent(state(), event('delivered', T2))).toEqual({
        kind: 'update',
        patch: { deliveredAt: T2 },
      });
    });

    it('« lu » remplit la date de lecture', () => {
      expect(applyStatusEvent(state({ deliveredAt: T2 }), event('read', T3))).toEqual({
        kind: 'update',
        patch: { readAt: T3 },
      });
    });

    it('« lu » sans « livré » remplit aussi la livraison avec l’heure de lecture', () => {
      expect(applyStatusEvent(state(), event('read', T3))).toEqual({
        kind: 'update',
        patch: { deliveredAt: T3, readAt: T3 },
      });
    });

    it('« envoyé » sur un message déjà SENT ne change rien', () => {
      expect(applyStatusEvent(state(), event('sent', T1))).toEqual({ kind: 'unchanged' });
    });
  });

  describe('accusés répétés ou dans le désordre', () => {
    it('un « livré » répété ne change pas la première date', () => {
      expect(applyStatusEvent(state({ deliveredAt: T2 }), event('delivered', T3))).toEqual({ kind: 'unchanged' });
    });

    it('un « livré » tardif après « lu » ne fait rien reculer', () => {
      expect(applyStatusEvent(state({ deliveredAt: T3, readAt: T3 }), event('delivered', T2))).toEqual({
        kind: 'unchanged',
      });
    });

    it('un « envoyé » tardif après « livré » ne change rien', () => {
      expect(applyStatusEvent(state({ deliveredAt: T2 }), event('sent', T1))).toEqual({ kind: 'unchanged' });
    });
  });

  describe('levée du doute (message incertain de l’unité 42)', () => {
    it.each(['QUEUED', 'UNKNOWN'] as const)('« envoyé » fait passer %s à SENT', (status) => {
      expect(applyStatusEvent(state({ status, sentAt: null }), event('sent', T1))).toEqual({
        kind: 'update',
        patch: { status: 'SENT', sentAt: T1 },
      });
    });

    it('« livré » sur un UNKNOWN : SENT + dates', () => {
      expect(applyStatusEvent(state({ status: 'UNKNOWN', sentAt: null }), event('delivered', T2))).toEqual({
        kind: 'update',
        patch: { status: 'SENT', sentAt: T2, deliveredAt: T2 },
      });
    });
  });

  describe('échecs', () => {
    const failure = { errorCode: '131026', retryable: false };

    it('un échec après « envoyé » est enregistré (envoyé ne prouve pas l’arrivée)', () => {
      expect(applyStatusEvent(state(), event('failed', T2, failure))).toEqual({
        kind: 'update',
        patch: { status: 'FAILED', failedAt: T2, errorCode: '131026', retryable: false },
      });
    });

    it('un échec sur un UNKNOWN est enregistré, avec le caractère réessayable de la grille', () => {
      expect(
        applyStatusEvent(state({ status: 'UNKNOWN', sentAt: null }), event('failed', T2, { errorCode: '130429', retryable: true })),
      ).toEqual({
        kind: 'update',
        patch: { status: 'FAILED', failedAt: T2, errorCode: '130429', retryable: true },
      });
    });

    it('un échec sans code est enregistré comme non précisé et non réessayable', () => {
      expect(applyStatusEvent(state(), event('failed', T2))).toEqual({
        kind: 'update',
        patch: { status: 'FAILED', failedAt: T2, errorCode: 'UNSPECIFIED', retryable: false },
      });
    });

    it('un échec répété ne change rien', () => {
      expect(applyStatusEvent(state({ status: 'FAILED' }), event('failed', T3, failure))).toEqual({
        kind: 'unchanged',
      });
    });

    it('un échec après « livré » est incohérent : rien ne change', () => {
      expect(applyStatusEvent(state({ deliveredAt: T2 }), event('failed', T3, failure)).kind).toBe('incoherent');
    });

    it.each(['delivered', 'read'] as const)('« %s » après un échec confirmé est incohérent', (status) => {
      expect(applyStatusEvent(state({ status: 'FAILED' }), event(status, T3)).kind).toBe('incoherent');
    });

    it('« envoyé » après un échec confirmé ne change rien', () => {
      expect(applyStatusEvent(state({ status: 'FAILED' }), event('sent', T1))).toEqual({ kind: 'unchanged' });
    });
  });

  it('un accusé visant un message reçu est incohérent', () => {
    expect(applyStatusEvent(state({ status: 'RECEIVED' }), event('delivered', T2)).kind).toBe('incoherent');
  });
});
