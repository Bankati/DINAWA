import { ConflictException, ForbiddenException, GoneException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LeaseConfirmationsService } from './lease-confirmations.service';

// Accord du locataire déjà inscrit (registre des décisions et contrat d'API
// du 09/11/2026) : un test par règle du contrat.

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number): Date => new Date(Date.now() + days * DAY);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- fixture : le type est déduit
function makeConfirmation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'conf-1',
    leaseId: 'lease-1',
    propertyId: 'prop-1',
    tenantUserId: 'tenant-1',
    inviterUserId: 'owner-1',
    typedFirstName: 'Awa',
    typedLastName: 'Mensah',
    typedPhone: '90123456',
    typedEmail: 'awa@exemple.com',
    status: 'PENDING',
    sentAt: daysFromNow(-1),
    expiresAt: daysFromNow(6),
    reminder1SentAt: null as Date | null,
    reminder2SentAt: null as Date | null,
    whatsappSentAt: null as Date | null,
    respondedAt: null as Date | null,
    respondedVia: null,
    previousPropertyStatus: 'VACANT',
    listingWasActive: true,
    resentAt: null as Date | null,
    lease: {
      id: 'lease-1',
      monthlyRent: 50000,
      monthlyCharges: 0,
      paymentFrequency: 'MONTHLY',
      startDate: new Date('2027-01-01T00:00:00Z'),
      endDate: null as Date | null,
      securityDeposit: 100000,
      depositReturnConditions: null,
      reminderDaysBefore: null,
      overdueAlertWindowDays: null,
      status: 'PENDING_TENANT',
    },
    property: {
      id: 'prop-1',
      ownerId: 'owner-1',
      type: 'VILLA',
      status: 'OCCUPIED',
      address: 'Villa rue 12',
      neighborhood: 'Adidogomé',
      city: 'Lomé',
    },
    // Nom du COMPTE : ne doit jamais apparaître côté propriétaire.
    inviter: { firstName: 'Jean', lastName: 'Dupont' },
    tenant: { firstName: 'Compte-Prénom' },
    ...overrides,
  };
}

describe('LeaseConfirmationsService', () => {
  let service: LeaseConfirmationsService;
  let tx: {
    leaseConfirmation: { updateMany: jest.Mock };
    lease: { updateMany: jest.Mock };
    property: { updateMany: jest.Mock };
    paymentScheduleEntry: { createMany: jest.Mock };
  };
  let prisma: {
    $transaction: jest.Mock;
    leaseConfirmation: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      updateMany: jest.Mock;
      count: jest.Mock;
      groupBy: jest.Mock;
    };
    lease: { findFirst: jest.Mock };
    mandate: { findFirst: jest.Mock };
  };
  let notify: { notifyUser: jest.Mock; notifyUserWithOutcome: jest.Mock };
  let listings: { publishForProperty: jest.Mock };
  let auth: { inviteTenant: jest.Mock };

  const tenant = { id: 'tenant-1', role: 'TENANT' } as never;
  const owner = { id: 'owner-1', role: 'OWNER' } as never;

  beforeEach(() => {
    tx = {
      leaseConfirmation: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      lease: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      property: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      paymentScheduleEntry: { createMany: jest.fn().mockResolvedValue({ count: 12 }) },
    };
    prisma = {
      $transaction: jest.fn((fn: (client: unknown) => unknown) => fn(tx)),
      leaseConfirmation: {
        findUnique: jest.fn().mockResolvedValue(makeConfirmation()),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      lease: { findFirst: jest.fn().mockResolvedValue(null) },
      mandate: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    notify = {
      notifyUser: jest.fn().mockResolvedValue(undefined),
      notifyUserWithOutcome: jest.fn().mockResolvedValue({ whatsappSent: false }),
    };
    listings = { publishForProperty: jest.fn().mockResolvedValue({}) };
    auth = { inviteTenant: jest.fn().mockResolvedValue({ confirmationRequired: true }) };
    const config = { getOrThrow: jest.fn().mockReturnValue('https://warah.test') };
    service = new LeaseConfirmationsService(
      prisma as never,
      config as never,
      notify as never,
      listings as never,
      auth as never,
    );
  });

  const errorBody = async (promise: Promise<unknown>): Promise<Record<string, unknown>> => {
    try {
      await promise;
    } catch (error) {
      return (error as ConflictException).getResponse() as Record<string, unknown>;
    }
    throw new Error('aucune erreur levée');
  };

  describe('accept (« Oui, c’est mon logement »)', () => {
    it('active le bail, crée l’échéancier depuis la date de début et prévient l’inviteur avec le nom tapé', async () => {
      const result = await service.accept(tenant, 'conf-1');

      expect(result).toEqual({ status: 'ACCEPTED', leaseId: 'lease-1' });
      const [claim] = tx.leaseConfirmation.updateMany.mock.calls[0] as [{ where: Record<string, unknown>; data: Record<string, unknown> }];
      expect(claim.where).toEqual(expect.objectContaining({ id: 'conf-1', status: 'PENDING' }));
      expect(claim.where['expiresAt']).toEqual({ gt: expect.any(Date) as Date });
      expect(claim.data).toEqual(expect.objectContaining({ status: 'ACCEPTED', respondedVia: 'APP' }));
      expect(tx.lease.updateMany).toHaveBeenCalledWith({
        where: { id: 'lease-1', status: 'PENDING_TENANT' },
        data: { status: 'ACTIVE' },
      });
      const [{ data: entries }] = tx.paymentScheduleEntry.createMany.mock.calls[0] as [{ data: { dueDate: Date }[] }];
      expect(entries).toHaveLength(12);
      expect(entries[0].dueDate).toEqual(new Date('2027-01-01T00:00:00Z'));

      const [params] = notify.notifyUser.mock.calls[0] as [{ userId: string; event: string; variables: Record<string, unknown> }];
      expect(params.userId).toBe('owner-1');
      expect(params.event).toBe('lease-confirmation-accepted');
      expect(params.variables['tenantName']).toBe('Awa Mensah');
      expect(JSON.stringify(params)).not.toContain('Compte-Prénom');
    });

    it('une échéance tombée avant l’acceptation devient due le jour de l’acceptation (jamais « en retard » à cause de l’attente)', async () => {
      const startDate = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 2, 1));
      prisma.leaseConfirmation.findUnique.mockResolvedValueOnce(
        makeConfirmation({ lease: { ...makeConfirmation().lease, startDate } }),
      );

      await service.accept(tenant, 'conf-1');

      const now = new Date();
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const [{ data: entries }] = tx.paymentScheduleEntry.createMany.mock.calls[0] as [
        { data: { dueDate: Date; periodStart: Date }[] },
      ];
      for (const entry of entries) expect(entry.dueDate.getTime()).toBeGreaterThanOrEqual(today.getTime());
      // La période elle-même ne bouge pas.
      expect(entries[0].periodStart).toEqual(startDate);
      expect(entries[0].dueDate).toEqual(today);
    });

    it('idempotent : un deuxième appui renvoie le même résultat, sans rien réécrire ni notifier', async () => {
      prisma.leaseConfirmation.findUnique.mockResolvedValueOnce(makeConfirmation({ status: 'ACCEPTED' }));

      await expect(service.accept(tenant, 'conf-1')).resolves.toEqual({ status: 'ACCEPTED', leaseId: 'lease-1' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(notify.notifyUser).not.toHaveBeenCalled();
    });

    it('409 ACTIVE_LEASE_EXISTS si un bail actif existe ailleurs — l’ancien bail n’est jamais touché', async () => {
      prisma.lease.findFirst.mockResolvedValueOnce({ id: 'old-lease' });

      const body = await errorBody(service.accept(tenant, 'conf-1'));

      expect(body).toEqual(
        expect.objectContaining({
          statusCode: 409,
          code: 'ACTIVE_LEASE_EXISTS',
          message: 'Votre bail actuel doit d’abord être terminé par votre propriétaire.',
        }),
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(notify.notifyUser).not.toHaveBeenCalled();
    });

    it('course : un bail devenu actif entre-temps (index unique) donne aussi ACTIVE_LEASE_EXISTS', async () => {
      prisma.$transaction.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed on the constraint: `leases_tenant_active_unique`',
          { code: 'P2002', clientVersion: '5.22.0' },
        ),
      );

      const body = await errorBody(service.accept(tenant, 'conf-1'));
      expect(body['code']).toBe('ACTIVE_LEASE_EXISTS');
    });

    it('410 si la demande a expiré : elle est expirée sur-le-champ, bien et annonce rétablis', async () => {
      prisma.leaseConfirmation.findUnique.mockResolvedValueOnce(makeConfirmation({ expiresAt: daysFromNow(-0.01) }));

      await expect(service.accept(tenant, 'conf-1')).rejects.toThrow(GoneException);
      const [claim] = tx.leaseConfirmation.updateMany.mock.calls[0] as [{ data: { status: string } }];
      expect(claim.data.status).toBe('EXPIRED');
      expect(tx.lease.updateMany).toHaveBeenCalledWith({
        where: { id: 'lease-1', status: 'PENDING_TENANT' },
        data: { status: 'CANCELLED' },
      });
      expect(tx.paymentScheduleEntry.createMany).not.toHaveBeenCalled();
    });

    it('410 CONFIRMATION_EXPIRED pour une demande déjà expirée', async () => {
      prisma.leaseConfirmation.findUnique.mockResolvedValueOnce(makeConfirmation({ status: 'EXPIRED' }));
      const body = await errorBody(service.accept(tenant, 'conf-1'));
      expect(body).toEqual(expect.objectContaining({ statusCode: 410, code: 'CONFIRMATION_EXPIRED' }));
    });

    it('409 CONFIRMATION_CLOSED pour une demande refusée ou annulée', async () => {
      prisma.leaseConfirmation.findUnique.mockResolvedValueOnce(makeConfirmation({ status: 'CANCELLED' }));
      const body = await errorBody(service.accept(tenant, 'conf-1'));
      expect(body).toEqual(expect.objectContaining({ statusCode: 409, code: 'CONFIRMATION_CLOSED' }));
    });

    it('404 pour la demande d’un autre locataire (on ne confirme pas son existence)', async () => {
      prisma.leaseConfirmation.findUnique.mockResolvedValueOnce(makeConfirmation({ tenantUserId: 'other' }));
      await expect(service.accept(tenant, 'conf-1')).rejects.toThrow(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('deux appuis simultanés : le perdant relit l’état et répond pareil, sans seconde activation', async () => {
      tx.leaseConfirmation.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.leaseConfirmation.findUnique
        .mockResolvedValueOnce(makeConfirmation())
        .mockResolvedValueOnce(makeConfirmation({ status: 'ACCEPTED' }));

      await expect(service.accept(tenant, 'conf-1')).resolves.toEqual({ status: 'ACCEPTED', leaseId: 'lease-1' });
      expect(tx.lease.updateMany).not.toHaveBeenCalled();
      expect(tx.paymentScheduleEntry.createMany).not.toHaveBeenCalled();
      expect(notify.notifyUser).not.toHaveBeenCalled();
    });

    it('« Oui » perdu contre une annulation : 409, le bail annulé n’est jamais activé', async () => {
      tx.leaseConfirmation.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.leaseConfirmation.findUnique
        .mockResolvedValueOnce(makeConfirmation())
        .mockResolvedValueOnce(makeConfirmation({ status: 'CANCELLED' }));

      const body = await errorBody(service.accept(tenant, 'conf-1'));
      expect(body['code']).toBe('CONFIRMATION_CLOSED');
      expect(tx.lease.updateMany).not.toHaveBeenCalled();
    });

    it('bail qui n’est plus en attente : tout est annulé (aucune échéance créée)', async () => {
      tx.lease.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.accept(tenant, 'conf-1')).rejects.toThrow(ConflictException);
      expect(tx.paymentScheduleEntry.createMany).not.toHaveBeenCalled();
      expect(notify.notifyUser).not.toHaveBeenCalled();
    });
  });

  describe('refuse (« Ce n’est pas moi »)', () => {
    it('annule la demande et le bail, rétablit le bien et republie l’annonce, prévient l’inviteur', async () => {
      await expect(service.refuse(tenant, 'conf-1')).resolves.toEqual({ status: 'REFUSED' });

      const [claim] = tx.leaseConfirmation.updateMany.mock.calls[0] as [{ where: Record<string, unknown>; data: Record<string, unknown> }];
      expect(claim.where['expiresAt']).toEqual({ gt: expect.any(Date) as Date });
      expect(claim.data).toEqual(expect.objectContaining({ status: 'REFUSED', respondedVia: 'APP' }));
      expect(tx.lease.updateMany).toHaveBeenCalledWith({
        where: { id: 'lease-1', status: 'PENDING_TENANT' },
        data: { status: 'CANCELLED' },
      });
      expect(tx.property.updateMany).toHaveBeenCalledWith({
        where: { id: 'prop-1', status: 'OCCUPIED' },
        data: { status: 'VACANT' },
      });
      expect(listings.publishForProperty).toHaveBeenCalledWith(tx, expect.objectContaining({ id: 'prop-1' }), 'owner-1');
      const [params] = notify.notifyUser.mock.calls[0] as [{ event: string; variables: Record<string, unknown> }];
      expect(params.event).toBe('lease-confirmation-refused');
      expect(params.variables['tenantFirstName']).toBe('Awa');
    });

    it('n’ouvre pas d’annonce qui n’était pas en ligne avant', async () => {
      prisma.leaseConfirmation.findUnique.mockResolvedValueOnce(
        makeConfirmation({ listingWasActive: false, previousPropertyStatus: 'RENOVATION' }),
      );
      await service.refuse(tenant, 'conf-1');
      expect(tx.property.updateMany).toHaveBeenCalledWith({
        where: { id: 'prop-1', status: 'OCCUPIED' },
        data: { status: 'RENOVATION' },
      });
      expect(listings.publishForProperty).not.toHaveBeenCalled();
    });

    it('idempotent : un deuxième « Ce n’est pas moi » renvoie REFUSED sans rien refaire', async () => {
      prisma.leaseConfirmation.findUnique.mockResolvedValueOnce(makeConfirmation({ status: 'REFUSED' }));
      await expect(service.refuse(tenant, 'conf-1')).resolves.toEqual({ status: 'REFUSED' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('refuser une demande déjà acceptée : 409 CONFIRMATION_CLOSED', async () => {
      prisma.leaseConfirmation.findUnique.mockResolvedValueOnce(makeConfirmation({ status: 'ACCEPTED' }));
      const body = await errorBody(service.refuse(tenant, 'conf-1'));
      expect(body['code']).toBe('CONFIRMATION_CLOSED');
    });
  });

  describe('cancel (propriétaire ou gestionnaire)', () => {
    it('annule une demande en attente et rétablit le bien, sans notifier personne', async () => {
      await expect(service.cancel(owner, 'conf-1')).resolves.toEqual({ status: 'CANCELLED' });
      const [claim] = tx.leaseConfirmation.updateMany.mock.calls[0] as [{ data: { status: string } }];
      expect(claim.data.status).toBe('CANCELLED');
      expect(tx.property.updateMany).toHaveBeenCalled();
      expect(notify.notifyUser).not.toHaveBeenCalled();
    });

    it('propriétaire d’un bien sous mandat actif : lecture seule (403)', async () => {
      prisma.mandate.findFirst.mockResolvedValue({ managerId: 'manager-1', status: 'ACTIVE' });
      await expect(service.cancel(owner, 'conf-1')).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('gestionnaire mandaté : autorisé', async () => {
      prisma.mandate.findFirst.mockResolvedValue({ managerId: 'manager-1', status: 'ACTIVE' });
      await expect(service.cancel({ id: 'manager-1', role: 'MANAGER' } as never, 'conf-1')).resolves.toEqual({
        status: 'CANCELLED',
      });
    });

    it('un inconnu reçoit 404 (on ne confirme pas l’existence de la demande)', async () => {
      await expect(service.cancel({ id: 'x', role: 'OWNER' } as never, 'conf-1')).rejects.toThrow(NotFoundException);
    });

    it('une demande qui n’est plus en attente : 409 CONFIRMATION_NOT_PENDING', async () => {
      prisma.leaseConfirmation.findUnique.mockResolvedValueOnce(makeConfirmation({ status: 'ACCEPTED' }));
      const body = await errorBody(service.cancel(owner, 'conf-1'));
      expect(body['code']).toBe('CONFIRMATION_NOT_PENDING');
    });
  });

  describe('resend', () => {
    it('refait l’invitation avec les conditions du bail et le contact corrigé', async () => {
      prisma.leaseConfirmation.findUnique.mockResolvedValueOnce(makeConfirmation({ status: 'REFUSED' }));

      await service.resend(owner, 'conf-1', { phone: '91000000' });

      expect(prisma.leaseConfirmation.updateMany).toHaveBeenCalledWith({
        where: { id: 'conf-1', resentAt: null, status: { in: ['REFUSED', 'EXPIRED'] } },
        data: { resentAt: expect.any(Date) as Date },
      });
      expect(auth.inviteTenant).toHaveBeenCalledWith(
        owner,
        expect.objectContaining({
          propertyId: 'prop-1',
          phone: '91000000',
          email: 'awa@exemple.com',
          firstName: 'Awa',
          lastName: 'Mensah',
          monthlyRent: 50000,
          paymentFrequency: 'MONTHLY',
          startDate: '2027-01-01T00:00:00.000Z',
          securityDeposit: 100000,
        }),
      );
    });

    it('après 3 refus du même couple : 409 CONFIRMATION_BLOCKED, rien n’est renvoyé', async () => {
      prisma.leaseConfirmation.findUnique.mockResolvedValueOnce(makeConfirmation({ status: 'REFUSED' }));
      prisma.leaseConfirmation.count.mockResolvedValueOnce(3);

      const body = await errorBody(service.resend(owner, 'conf-1', {}));
      expect(body['code']).toBe('CONFIRMATION_BLOCKED');
      expect(auth.inviteTenant).not.toHaveBeenCalled();
    });

    it('une demande en attente ne se renvoie pas', async () => {
      const body = await errorBody(service.resend(owner, 'conf-1', {}));
      expect(body['code']).toBe('CONFIRMATION_NOT_RESENDABLE');
    });

    it('deux clics sur « Renvoyer » : un seul renvoi', async () => {
      prisma.leaseConfirmation.findUnique.mockResolvedValueOnce(makeConfirmation({ status: 'EXPIRED' }));
      prisma.leaseConfirmation.updateMany.mockResolvedValueOnce({ count: 0 });
      const body = await errorBody(service.resend(owner, 'conf-1', {}));
      expect(body['code']).toBe('CONFIRMATION_NOT_RESENDABLE');
      expect(auth.inviteTenant).not.toHaveBeenCalled();
    });

    it('si l’invitation échoue, la demande redevient renvoyable', async () => {
      prisma.leaseConfirmation.findUnique.mockResolvedValueOnce(makeConfirmation({ status: 'EXPIRED' }));
      auth.inviteTenant.mockRejectedValueOnce(new ConflictException('bien loué'));

      await expect(service.resend(owner, 'conf-1', {})).rejects.toThrow(ConflictException);
      expect(prisma.leaseConfirmation.updateMany).toHaveBeenLastCalledWith({
        where: { id: 'conf-1' },
        data: { resentAt: null },
      });
    });
  });

  describe('listes', () => {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- fixture
    const listRow = (overrides: Record<string, unknown> = {}) => ({
      ...makeConfirmation(overrides),
      lease: { id: 'lease-1', monthlyRent: 50000, startDate: new Date('2027-01-01T00:00:00Z') },
      property: { id: 'prop-1', ownerId: 'owner-1', address: 'Villa rue 12', neighborhood: 'Adidogomé', city: 'Lomé', mandates: [] },
    });

    it('propriétaire : ses demandes ou celles de ses biens, avec le nom tapé, les canaux et les rappels', async () => {
      const sentAt = new Date('2026-11-09T10:00:00Z');
      prisma.leaseConfirmation.findMany.mockResolvedValueOnce([
        listRow({ sentAt, expiresAt: new Date('2026-11-16T10:00:00Z'), whatsappSentAt: sentAt }),
      ]);

      const [view] = await service.listForInviter(owner);

      const [args] = prisma.leaseConfirmation.findMany.mock.calls[0] as [{ where: Record<string, unknown>; take: number }];
      expect(args.take).toBe(100);
      expect(args.where['resentAt']).toBeNull();
      expect(args.where['OR']).toEqual([
        { inviterUserId: 'owner-1' },
        { property: { OR: [{ ownerId: 'owner-1' }, { mandates: { some: { managerId: 'owner-1', status: 'ACTIVE' } } }] } },
      ]);
      expect(view.tenantDisplayName).toBe('Awa Mensah');
      expect(view.channels).toEqual(['EMAIL', 'IN_APP', 'WHATSAPP']);
      expect(view.reminderSchedule).toEqual([new Date('2026-11-11T10:00:00Z'), new Date('2026-11-14T10:00:00Z')]);
      expect(view.nextReminderAt).toEqual(new Date('2026-11-11T10:00:00Z'));
      expect(view.lease.property).toEqual({ id: 'prop-1', address: 'Villa rue 12', neighborhood: 'Adidogomé', city: 'Lomé' });
      expect(view.canResend).toBe(false);
    });

    it('canResend : vrai après un refus, faux au 3e refus ou pour un propriétaire en lecture seule', async () => {
      prisma.leaseConfirmation.findMany.mockResolvedValueOnce([
        listRow({ id: 'a', status: 'REFUSED' }),
        listRow({ id: 'b', status: 'EXPIRED', inviterUserId: 'owner-1', tenantUserId: 'tenant-2' }),
      ]);
      prisma.leaseConfirmation.groupBy.mockResolvedValueOnce([
        { inviterUserId: 'owner-1', tenantUserId: 'tenant-1', _count: { _all: 1 } },
        { inviterUserId: 'owner-1', tenantUserId: 'tenant-2', _count: { _all: 3 } },
      ]);

      const views = await service.listForInviter(owner);
      expect(views.map((view) => [view.refusalCount, view.canResend])).toEqual([
        [1, true],
        [3, false],
      ]);

      prisma.leaseConfirmation.findMany.mockResolvedValueOnce([
        { ...listRow({ status: 'REFUSED' }), property: { ...listRow().property, mandates: [{ managerId: 'manager-1' }] } },
      ]);
      prisma.leaseConfirmation.groupBy.mockResolvedValueOnce([]);
      const [readOnly] = await service.listForInviter(owner);
      expect(readOnly.canResend).toBe(false);
    });

    it('locataire : seulement SES demandes en attente et non expirées', async () => {
      prisma.leaseConfirmation.findMany.mockResolvedValueOnce([
        {
          id: 'conf-1',
          sentAt: new Date('2026-11-09T10:00:00Z'),
          expiresAt: new Date('2026-11-16T10:00:00Z'),
          inviter: { firstName: 'Jean', lastName: 'Dupont' },
          lease: { monthlyRent: 50000, startDate: new Date('2027-01-01T00:00:00Z') },
          property: { address: null, neighborhood: 'Adidogomé', city: 'Lomé' },
        },
      ]);

      const views = await service.listForTenant(tenant);

      const [args] = prisma.leaseConfirmation.findMany.mock.calls[0] as [{ where: Record<string, unknown> }];
      expect(args.where).toEqual({ tenantUserId: 'tenant-1', status: 'PENDING', expiresAt: { gt: expect.any(Date) as Date } });
      expect(views[0]).toEqual(
        expect.objectContaining({ id: 'conf-1', inviterDisplayName: 'Jean Dupont', sentAt: new Date('2026-11-09T10:00:00Z') }),
      );
    });
  });

  describe('tâche : expiration et rappels', () => {
    it('expire à 7 jours, rétablit bien et annonce, prévient l’inviteur', async () => {
      prisma.leaseConfirmation.findMany.mockResolvedValueOnce([makeConfirmation({ expiresAt: daysFromNow(-0.1) })]);

      await expect(service.expireDue(new Date())).resolves.toBe(1);

      const [claim] = tx.leaseConfirmation.updateMany.mock.calls[0] as [{ where: Record<string, unknown>; data: Record<string, unknown> }];
      expect(claim.where).toEqual({ id: 'conf-1', status: 'PENDING' });
      expect(claim.data).toEqual({ status: 'EXPIRED' });
      expect(listings.publishForProperty).toHaveBeenCalled();
      const [params] = notify.notifyUser.mock.calls[0] as [{ event: string; variables: Record<string, unknown> }];
      expect(params.event).toBe('lease-confirmation-expired');
      expect(params.variables['listingRepublished']).toBe(1);
    });

    it('une demande déjà acceptée entre-temps n’est pas expirée (écriture conditionnelle)', async () => {
      prisma.leaseConfirmation.findMany.mockResolvedValueOnce([makeConfirmation({ expiresAt: daysFromNow(-0.1) })]);
      tx.leaseConfirmation.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.expireDue(new Date())).resolves.toBe(0);
      expect(tx.lease.updateMany).not.toHaveBeenCalled();
      expect(notify.notifyUser).not.toHaveBeenCalled();
    });

    const at10h = new Date('2026-11-12T10:00:00Z');

    it('rappel à 2 jours : réservé puis envoyé par email + application (+ WhatsApp)', async () => {
      prisma.leaseConfirmation.findMany.mockResolvedValueOnce([
        makeConfirmation({ sentAt: new Date('2026-11-09T09:00:00Z'), expiresAt: new Date('2026-11-16T09:00:00Z') }),
      ]);
      notify.notifyUserWithOutcome.mockResolvedValueOnce({ whatsappSent: true });

      await expect(service.sendDueReminders(at10h)).resolves.toBe(1);

      expect(prisma.leaseConfirmation.updateMany).toHaveBeenNthCalledWith(1, {
        where: { id: 'conf-1', status: 'PENDING', reminder1SentAt: null },
        data: { reminder1SentAt: at10h },
      });
      const [params] = notify.notifyUserWithOutcome.mock.calls[0] as [
        { userId: string; event: string; forceEmail: boolean; variables: Record<string, unknown> },
      ];
      expect(params).toEqual(
        expect.objectContaining({ userId: 'tenant-1', event: 'lease-confirmation-request', forceEmail: true }),
      );
      expect(params.variables['isReminder']).toBe(1);
      expect(params.variables['acceptPayload']).toBe('LC_ACCEPT:conf-1');
      expect(params.variables['refusePayload']).toBe('LC_REFUSE:conf-1');
      // WhatsApp parti : noté pour les canaux affichés au propriétaire.
      expect(prisma.leaseConfirmation.updateMany).toHaveBeenNthCalledWith(2, {
        where: { id: 'conf-1', whatsappSentAt: null },
        data: { whatsappSentAt: at10h },
      });
    });

    it('après une coupure (6 jours, aucun rappel) : un seul rappel, le second', async () => {
      prisma.leaseConfirmation.findMany.mockResolvedValueOnce([
        makeConfirmation({ sentAt: new Date('2026-11-06T09:00:00Z'), expiresAt: new Date('2026-11-13T09:00:00Z') }),
      ]);

      await service.sendDueReminders(at10h);

      expect(prisma.leaseConfirmation.updateMany).toHaveBeenCalledWith({
        where: { id: 'conf-1', status: 'PENDING', reminder2SentAt: null },
        data: { reminder2SentAt: at10h, reminder1SentAt: at10h },
      });
      expect(notify.notifyUserWithOutcome).toHaveBeenCalledTimes(1);
    });

    it('hors de la plage 7 h – 21 h : aucun rappel (repris au passage suivant)', async () => {
      prisma.leaseConfirmation.findMany.mockResolvedValueOnce([makeConfirmation({ sentAt: new Date('2026-11-09T09:00:00Z') })]);
      await expect(service.sendDueReminders(new Date('2026-11-12T22:00:00Z'))).resolves.toBe(0);
      expect(prisma.leaseConfirmation.updateMany).not.toHaveBeenCalled();
    });

    it('rappel déjà pris par un autre passage : pas de doublon', async () => {
      prisma.leaseConfirmation.findMany.mockResolvedValueOnce([makeConfirmation({ sentAt: new Date('2026-11-09T09:00:00Z') })]);
      prisma.leaseConfirmation.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.sendDueReminders(at10h)).resolves.toBe(0);
      expect(notify.notifyUserWithOutcome).not.toHaveBeenCalled();
    });

    it('envoi en échec : la réservation est rendue', async () => {
      prisma.leaseConfirmation.findMany.mockResolvedValueOnce([makeConfirmation({ sentAt: new Date('2026-11-09T09:00:00Z') })]);
      notify.notifyUserWithOutcome.mockRejectedValueOnce(new Error('Resend en panne'));

      await expect(service.sendDueReminders(at10h)).resolves.toBe(0);
      expect(prisma.leaseConfirmation.updateMany).toHaveBeenLastCalledWith({
        where: { id: 'conf-1' },
        data: { reminder1SentAt: null },
      });
    });
  });

  describe('respondFromWhatsapp (boutons LC_ACCEPT / LC_REFUSE)', () => {
    it('mêmes règles que la route : « Oui » active le bail, réponse WHATSAPP enregistrée', async () => {
      const result = await service.respondFromWhatsapp('tenant-1', 'conf-1', 'ACCEPT');
      expect(result).toEqual(
        expect.objectContaining({ outcome: 'ACCEPTED', propertyId: 'prop-1', inviterName: 'Jean Dupont' }),
      );
      const [claim] = tx.leaseConfirmation.updateMany.mock.calls[0] as [{ data: Record<string, unknown> }];
      expect(claim.data['respondedVia']).toBe('WHATSAPP');
    });

    it('second appui : CLOSED (« n’est plus en cours »)', async () => {
      prisma.leaseConfirmation.findUnique.mockResolvedValueOnce(makeConfirmation({ status: 'ACCEPTED' }));
      const result = await service.respondFromWhatsapp('tenant-1', 'conf-1', 'ACCEPT');
      expect(result.outcome).toBe('CLOSED');
    });

    it('demande d’un autre numéro : UNKNOWN (silence), rien n’est modifié', async () => {
      prisma.leaseConfirmation.findUnique.mockResolvedValueOnce(makeConfirmation({ tenantUserId: 'other' }));
      const result = await service.respondFromWhatsapp('tenant-1', 'conf-1', 'REFUSE');
      expect(result).toEqual({ outcome: 'UNKNOWN' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});

