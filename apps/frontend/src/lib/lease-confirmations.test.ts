import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from './api';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn() } };
});

import { api } from './api';
import {
  badgeFor,
  classifyAnswerError,
  confirmationView,
  firstNameOf,
  formatDayMonth,
  formatFullDate,
  invitationUrlFrom,
  leaseConfirmationsApi,
  propertyShortLabel,
  que,
  visibleConfirmations,
  type LeaseConfirmation,
} from './lease-confirmations';

function confirmation(overrides: Partial<LeaseConfirmation> = {}): LeaseConfirmation {
  return {
    id: 'c1',
    status: 'PENDING',
    tenantDisplayName: 'Awa Mensah',
    phone: '90123456',
    email: 'awa@exemple.com',
    lease: {
      id: 'l1',
      monthlyRent: 50000,
      startDate: '2026-12-01T00:00:00.000Z',
      property: { id: 'p1', address: 'Villa rue 12', neighborhood: 'Adidogomé', city: 'Lomé' },
    },
    sentAt: '2026-11-09T14:33:00.000Z',
    remindersSentAt: [],
    nextReminderAt: '2026-11-11T14:33:00.000Z',
    expiresAt: '2026-11-16T14:33:00.000Z',
    respondedAt: null,
    refusalCount: 0,
    canResend: true,
    ...overrides,
  };
}

describe('textes sans genre supposé', () => {
  it('élide « que » devant une voyelle ou un h', () => {
    expect(que('Awa')).toBe("qu'Awa");
    expect(que('Esi')).toBe("qu'Esi");
    expect(que('Élom')).toBe("qu'Élom");
    expect(que('Habib')).toBe("qu'Habib");
  });

  it('garde « que » devant une consonne', () => {
    expect(que('Kossi')).toBe('que Kossi');
  });

  it('prend le premier mot du nom tapé comme prénom', () => {
    expect(firstNameOf('  Awa   Mensah ')).toBe('Awa');
    expect(firstNameOf('Kossi')).toBe('Kossi');
  });
});

describe('dates et lieux', () => {
  it("formate les dates à l'heure de Lomé", () => {
    expect(formatDayMonth('2026-11-09T23:30:00.000Z')).toBe('09/11');
    expect(formatFullDate('2026-12-01T00:00:00.000Z')).toBe('01/12/2026');
  });

  it("n'écrit pas deux fois le quartier quand il n'y a pas d'adresse", () => {
    expect(propertyShortLabel({ address: 'Villa rue 12', neighborhood: 'Adidogomé', city: 'Lomé' })).toBe('Villa rue 12, Adidogomé');
    expect(propertyShortLabel({ address: null, neighborhood: 'Agoè', city: 'Lomé' })).toBe('Agoè, Lomé');
  });
});

describe('états côté propriétaire', () => {
  it('donne les 4 états affichés et masque acceptée / annulée', () => {
    expect(confirmationView({ status: 'PENDING', canResend: true })).toBe('pending');
    expect(confirmationView({ status: 'REFUSED', canResend: true })).toBe('refused');
    expect(confirmationView({ status: 'EXPIRED', canResend: true })).toBe('expired');
    expect(confirmationView({ status: 'REFUSED', canResend: false })).toBe('blocked');
    expect(confirmationView({ status: 'EXPIRED', canResend: false })).toBe('blocked');
    expect(confirmationView({ status: 'ACCEPTED', canResend: false })).toBeNull();
    expect(confirmationView({ status: 'CANCELLED', canResend: false })).toBeNull();
  });

  it('écrit « Refusé 3 fois » quand le blocage vient des 3 refus', () => {
    expect(badgeFor(confirmation({ status: 'REFUSED', canResend: false, refusalCount: 3 }))).toEqual({ label: 'Refusé 3 fois', tone: 'error' });
    expect(badgeFor(confirmation({ status: 'REFUSED', canResend: true, refusalCount: 1 }))).toEqual({ label: 'Refusé', tone: 'error' });
    expect(badgeFor(confirmation())).toEqual({ label: 'En attente de confirmation', tone: 'warning' });
  });

  it('trie les demandes à traiter en premier et retire les acceptées', () => {
    const list = visibleConfirmations([
      confirmation({ id: 'pending' }),
      confirmation({ id: 'accepted', status: 'ACCEPTED' }),
      confirmation({ id: 'blocked', status: 'REFUSED', canResend: false, refusalCount: 3 }),
      confirmation({ id: 'refused', status: 'REFUSED', refusalCount: 1 }),
      confirmation({ id: 'expired', status: 'EXPIRED' }),
    ]);
    expect(list.map((c) => c.id)).toEqual(['refused', 'expired', 'pending', 'blocked']);
  });
});

describe('erreurs du locataire', () => {
  it('reconnaît le bail actif ailleurs (409 ACTIVE_LEASE_EXISTS)', () => {
    expect(classifyAnswerError(new ApiError(409, { code: 'ACTIVE_LEASE_EXISTS' }))).toBe('active-lease');
  });

  it('reconnaît la demande expirée (410)', () => {
    expect(classifyAnswerError(new ApiError(410, { message: 'Gone' }))).toBe('expired');
  });

  it('traite un autre 409 ou un 404 comme « déjà répondu »', () => {
    expect(classifyAnswerError(new ApiError(409, { code: 'OTHER' }))).toBe('already-answered');
    expect(classifyAnswerError(new ApiError(404, null))).toBe('already-answered');
  });

  it("traite le reste comme un problème d'envoi", () => {
    expect(classifyAnswerError(new TypeError('Failed to fetch'))).toBe('network');
    expect(classifyAnswerError(new ApiError(500, null))).toBe('network');
  });
});

describe('invitationUrlFrom', () => {
  it("lit un lien d'invitation classique s'il est présent", () => {
    expect(invitationUrlFrom({ invitationUrl: 'https://warah.tg/auth/activate?t=1' })).toBe('https://warah.tg/auth/activate?t=1');
    expect(invitationUrlFrom({ invitationUrl: null })).toBeNull();
    expect(invitationUrlFrom(null)).toBeNull();
  });
});

describe('leaseConfirmationsApi', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset().mockResolvedValue([]);
    vi.mocked(api.post).mockReset().mockResolvedValue({});
  });

  it('appelle les routes du contrat', async () => {
    await leaseConfirmationsApi.list();
    await leaseConfirmationsApi.mine();
    await leaseConfirmationsApi.resend('c1', { phone: '91001122' });
    await leaseConfirmationsApi.cancel('c1');
    await leaseConfirmationsApi.accept('c1');
    await leaseConfirmationsApi.refuse('c1');

    expect(api.get).toHaveBeenCalledWith('/lease-confirmations');
    expect(api.get).toHaveBeenCalledWith('/me/lease-confirmations');
    expect(api.post).toHaveBeenCalledWith('/lease-confirmations/c1/resend', { phone: '91001122' });
    expect(api.post).toHaveBeenCalledWith('/lease-confirmations/c1/cancel', {});
    expect(api.post).toHaveBeenCalledWith('/me/lease-confirmations/c1/accept', {});
    expect(api.post).toHaveBeenCalledWith('/me/lease-confirmations/c1/refuse', {});
  });
});
