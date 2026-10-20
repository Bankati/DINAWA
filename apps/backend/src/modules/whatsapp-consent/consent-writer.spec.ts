import { ConflictException, NotFoundException } from '@nestjs/common';
import { WHATSAPP_CONSENT_REQUEST_TTL_MS } from '../../common/constants';
import { applyConsentCommand, effectiveLocalPhone } from './consent-writer';

const NOW = new Date('2026-10-16T10:00:00.000Z');

function eventData(create: jest.Mock): Record<string, unknown> {
  const [args] = create.mock.calls[0] as [{ data: Record<string, unknown> }];
  return args.data;
}

describe('applyConsentCommand', () => {
  let tx: {
    user: { findUnique: jest.Mock; updateMany: jest.Mock };
    whatsappConsentEvent: { create: jest.Mock };
    tenantProfile: { updateMany: jest.Mock };
  };

  const baseUser = {
    phone: '+22890112233',
    whatsappPhone: null,
    whatsappConsent: 'NOT_ASKED',
    whatsappConsentChangedAt: null,
    whatsappConsentRequestId: null,
    whatsappConsentRequestExpiresAt: null,
  };

  beforeEach(() => {
    tx = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      whatsappConsentEvent: { create: jest.fn().mockResolvedValue({}) },
      tenantProfile: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
  });

  it('ouvre une demande d’accord : état, échéance de 7 jours et preuve dans l’historique', async () => {
    const result = await applyConsentCommand(
      tx as never,
      {
        userId: 'tenant-1',
        command: { type: 'AGENCY_REQUEST' },
        actorUserId: 'agent-1',
        noticeVersion: 'consentement-v1',
        collectionMethod: 'IN_PERSON',
      },
      NOW,
    );

    expect(result.decision).toMatchObject({ kind: 'changed', next: 'PENDING' });
    const [update] = tx.user.updateMany.mock.calls[0] as [{ where: object; data: Record<string, unknown> }];
    // Écriture conditionnée à l'état lu (compare-and-swap).
    expect(update.where).toEqual({
      id: 'tenant-1',
      whatsappConsent: 'NOT_ASKED',
      whatsappConsentChangedAt: null,
      whatsappConsentRequestId: null,
    });
    expect(update.data).toMatchObject({
      whatsappConsent: 'PENDING',
      whatsappConsentChangedAt: NOW,
      whatsappConsentRequestId: result.eventId,
      whatsappConsentRequestExpiresAt: new Date(NOW.getTime() + WHATSAPP_CONSENT_REQUEST_TTL_MS),
    });
    // L'agence ne fixe jamais l'acceptation.
    expect(update.data).not.toHaveProperty('whatsappConsentAt');

    expect(tx.whatsappConsentEvent.create).toHaveBeenCalledWith({
      data: {
        id: result.eventId,
        userId: 'tenant-1',
        kind: 'CONSENT',
        previousConsent: 'NOT_ASKED',
        newConsent: 'PENDING',
        source: 'AGENCY',
        actorUserId: 'agent-1',
        noticeVersion: 'consentement-v1',
        collectionMethod: 'IN_PERSON',
        phoneLast2: '33',
        requestId: null,
        sourceAt: null,
      },
    });
    expect(tx.tenantProfile.updateMany).not.toHaveBeenCalled();
  });

  it('un OUI valable : accepté par le locataire, référence de la demande et heure Meta gardées', async () => {
    tx.user.findUnique.mockResolvedValue({
      ...baseUser,
      whatsappPhone: '90112233',
      whatsappConsent: 'PENDING',
      whatsappConsentChangedAt: NOW,
      whatsappConsentRequestId: 'req-1',
      whatsappConsentRequestExpiresAt: new Date(NOW.getTime() + WHATSAPP_CONSENT_REQUEST_TTL_MS),
    });
    const sourceAt = new Date(NOW.getTime() + 60_000);

    await applyConsentCommand(tx as never, { userId: 'tenant-1', command: { type: 'BOT_CONFIRM', sourceAt }, actorUserId: 'tenant-1' }, sourceAt);

    const [update] = tx.user.updateMany.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(update.data).toMatchObject({
      whatsappConsent: 'ACCEPTED',
      whatsappConsentAt: sourceAt,
      whatsappConsentById: 'tenant-1',
      whatsappConsentRequestId: null,
      whatsappConsentRequestExpiresAt: null,
    });
    expect(eventData(tx.whatsappConsentEvent.create)).toMatchObject({ source: 'BOT', requestId: 'req-1', sourceAt, newConsent: 'ACCEPTED' });
  });

  it('changement de numéro : remise à zéro de l’accord, de la vérification et du code ; seulement 2 chiffres gardés', async () => {
    tx.user.findUnique.mockResolvedValue({ ...baseUser, whatsappPhone: '90112233', whatsappConsent: 'ACCEPTED' });

    await applyConsentCommand(
      tx as never,
      { userId: 'tenant-1', command: { type: 'PHONE_CHANGE', by: 'TENANT', newPhone: '99887766' }, actorUserId: 'tenant-1' },
      NOW,
    );

    const [update] = tx.user.updateMany.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(update.data).toMatchObject({
      whatsappConsent: 'NOT_ASKED',
      whatsappPhone: '99887766',
      whatsappVerifiedPhone: null,
      whatsappPhoneVerifiedAt: null,
    });
    expect(eventData(tx.whatsappConsentEvent.create)).toMatchObject({
      kind: 'PHONE_CHANGE',
      phoneLast2: '66',
      previousConsent: 'ACCEPTED',
      newConsent: 'NOT_ASKED',
    });
    expect(tx.tenantProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: 'tenant-1' },
      data: { whatsappPinHash: null, pinFailedAttempts: 0, pinLockedUntil: null },
    });
  });

  it('un arrêt fixe la date d’arrêt une seule fois', async () => {
    tx.user.findUnique.mockResolvedValue({ ...baseUser, whatsappConsent: 'ACCEPTED' });
    await applyConsentCommand(tx as never, { userId: 'tenant-1', command: { type: 'TENANT_WITHDRAW' }, actorUserId: 'tenant-1' }, NOW);
    const [update] = tx.user.updateMany.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(update.data).toMatchObject({ whatsappConsent: 'STOPPED', whatsappStoppedAt: NOW });
  });

  it('rien à faire : aucune écriture ni ligne d’historique', async () => {
    tx.user.findUnique.mockResolvedValue({ ...baseUser, whatsappConsent: 'ACCEPTED' });
    const result = await applyConsentCommand(tx as never, { userId: 'tenant-1', command: { type: 'TENANT_ACCEPT' }, actorUserId: 'tenant-1' }, NOW);
    expect(result).toEqual({ decision: { kind: 'unchanged', reason: 'ALREADY_IN_STATE' }, previous: 'ACCEPTED', eventId: null });
    expect(tx.user.updateMany).not.toHaveBeenCalled();
    expect(tx.whatsappConsentEvent.create).not.toHaveBeenCalled();
  });

  it('refus (agence après un arrêt) : aucune écriture', async () => {
    tx.user.findUnique.mockResolvedValue({ ...baseUser, whatsappConsent: 'STOPPED' });
    const result = await applyConsentCommand(tx as never, { userId: 'tenant-1', command: { type: 'AGENCY_REQUEST' }, actorUserId: 'agent-1' }, NOW);
    expect(result.decision).toEqual({ kind: 'refused', reason: 'STOPPED_BY_TENANT' });
    expect(tx.user.updateMany).not.toHaveBeenCalled();
  });

  it('écriture concurrente : relit et recalcule — un STOP arrivé entre-temps l’emporte sur la demande de l’agence', async () => {
    tx.user.findUnique
      .mockResolvedValueOnce(baseUser)
      .mockResolvedValueOnce({ ...baseUser, whatsappConsent: 'STOPPED', whatsappConsentChangedAt: NOW });
    tx.user.updateMany.mockResolvedValueOnce({ count: 0 });

    const result = await applyConsentCommand(tx as never, { userId: 'tenant-1', command: { type: 'AGENCY_REQUEST' }, actorUserId: 'agent-1' }, NOW);

    expect(result.decision).toEqual({ kind: 'refused', reason: 'STOPPED_BY_TENANT' });
    expect(tx.user.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.whatsappConsentEvent.create).not.toHaveBeenCalled();
  });

  it('abandonne avec un 409 après 3 courses perdues', async () => {
    tx.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      applyConsentCommand(tx as never, { userId: 'tenant-1', command: { type: 'TENANT_ACCEPT' }, actorUserId: 'tenant-1' }, NOW),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.user.updateMany).toHaveBeenCalledTimes(3);
    expect(tx.whatsappConsentEvent.create).not.toHaveBeenCalled();
  });

  it('utilisateur inconnu : 404', async () => {
    tx.user.findUnique.mockResolvedValue(null);
    await expect(
      applyConsentCommand(tx as never, { userId: 'ghost', command: { type: 'TENANT_ACCEPT' }, actorUserId: 'ghost' }, NOW),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('effectiveLocalPhone', () => {
  it('préfère le numéro WhatsApp dédié et ramène tout à 8 chiffres', () => {
    expect(effectiveLocalPhone({ phone: '+22890112233', whatsappPhone: null })).toBe('90112233');
    expect(effectiveLocalPhone({ phone: '90112233', whatsappPhone: '99887766' })).toBe('99887766');
    expect(effectiveLocalPhone({ phone: null, whatsappPhone: null })).toBeNull();
  });
});
