import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { WhatsappConsentService } from './whatsapp-consent.service';

type FakeUser = {
  id: string;
  phone: string | null;
  whatsappPhone: string | null;
  whatsappConsent: 'NOT_ASKED' | 'PENDING' | 'ACCEPTED' | 'STOPPED';
  whatsappConsentAt: Date | null;
  whatsappConsentById: string | null;
  whatsappStoppedAt: Date | null;
  whatsappConsentChangedAt: Date | null;
  whatsappConsentRequestId: string | null;
  whatsappConsentRequestExpiresAt: Date | null;
  whatsappVerifiedPhone: string | null;
  whatsappPhoneVerifiedAt: Date | null;
  tenantProfile: { whatsappPinHash: string | null; pinFailedAttempts: number; pinLockedUntil: Date | null } | null;
};

type PhoneCondition = { phone?: { in: string[] }; whatsappPhone?: { in: string[] } | null };

// Petite base en mémoire : le service et le vrai rédacteur
// (applyConsentCommand) tournent dessus, sans simuler chaque appel.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- type déduit du faux client
function fakePrisma(users: FakeUser[]) {
  const byId = (id: string): FakeUser | null => users.find((u) => u.id === id) ?? null;
  const matches = (u: FakeUser, where: Record<string, unknown>): boolean =>
    Object.entries(where).every(([key, expected]) => {
      const actual = (u as unknown as Record<string, unknown>)[key];
      if (expected instanceof Date) return actual instanceof Date && actual.getTime() === expected.getTime();
      return actual === expected;
    });

  const events: Record<string, unknown>[] = [];
  const prisma = {
    events,
    lease: { findFirst: jest.fn() },
    mandate: { findFirst: jest.fn().mockResolvedValue(null) },
    user: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) => Promise.resolve(byId(where.id))),
      findUniqueOrThrow: jest.fn(({ where }: { where: { id: string } }) => {
        const user = byId(where.id);
        return user ? Promise.resolve(user) : Promise.reject(new Error('not found'));
      }),
      findFirst: jest.fn(({ where }: { where: { id: { not: string }; OR: PhoneCondition[] } }) => {
        const found = users.find((u) => {
          if (u.id === where.id.not) return false;
          return where.OR.some((cond) => {
            if (cond.phone) {
              return u.whatsappPhone === null && u.phone !== null && cond.phone.in.includes(u.phone);
            }
            const variants = cond.whatsappPhone?.in ?? [];
            return u.whatsappPhone !== null && variants.includes(u.whatsappPhone);
          });
        });
        return Promise.resolve(found ? { id: found.id } : null);
      }),
      update: jest.fn(({ where, data }: { where: { id: string }; data: Partial<FakeUser> }) => {
        const user = byId(where.id);
        if (!user) return Promise.reject(new Error('not found'));
        if (data.whatsappPhone && users.some((u) => u.id !== user.id && u.whatsappPhone === data.whatsappPhone)) {
          return Promise.reject(new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' }));
        }
        Object.assign(user, data);
        return Promise.resolve(user);
      }),
      updateMany: jest.fn(({ where, data }: { where: Record<string, unknown>; data: Partial<FakeUser> }) => {
        const user = users.find((u) => matches(u, where));
        if (!user) return Promise.resolve({ count: 0 });
        Object.assign(user, data);
        return Promise.resolve({ count: 1 });
      }),
    },
    whatsappConsentEvent: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        events.push(data);
        return Promise.resolve(data);
      }),
    },
    whatsappConversation: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    whatsappThread: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    tenantProfile: {
      findUnique: jest.fn().mockResolvedValue({ invitedByUserId: 'owner-1' }),
      updateMany: jest.fn(
        ({ where, data }: { where: { userId: string }; data: Partial<NonNullable<FakeUser['tenantProfile']>> }) => {
          const profile = byId(where.userId)?.tenantProfile;
          if (profile) Object.assign(profile, data);
          return Promise.resolve({ count: profile ? 1 : 0 });
        },
      ),
    },
  };
  return Object.assign(prisma, {
    $transaction: jest.fn((work: (tx: unknown) => Promise<unknown>) => work(prisma)),
  });
}

function tenantRow(extra: Partial<FakeUser> = {}): FakeUser {
  return {
    id: 'tenant-1',
    phone: '+22890112233',
    whatsappPhone: null,
    whatsappConsent: 'NOT_ASKED',
    whatsappConsentAt: null,
    whatsappConsentById: null,
    whatsappStoppedAt: null,
    whatsappConsentChangedAt: null,
    whatsappConsentRequestId: null,
    whatsappConsentRequestExpiresAt: null,
    whatsappVerifiedPhone: null,
    whatsappPhoneVerifiedAt: null,
    tenantProfile: { whatsappPinHash: null, pinFailedAttempts: 0, pinLockedUntil: null },
    ...extra,
  };
}

const owner = { id: 'owner-1', role: 'OWNER' } as AuthenticatedUser;
const manager = { id: 'manager-1', role: 'MANAGER' } as AuthenticatedUser;
const stranger = { id: 'owner-2', role: 'OWNER' } as AuthenticatedUser;
const tenantUser = { id: 'tenant-1', role: 'TENANT' } as AuthenticatedUser;
const property = { id: 'prop-1', ownerId: 'owner-1', mandates: [] as { managerId: string }[] };

const request = { whatsappPhone: '90112233', collectionMethod: 'IN_PERSON' as const, attestation: true };

describe('WhatsappConsentService', () => {
  let tenant: FakeUser;
  let other: FakeUser;
  let prisma: ReturnType<typeof fakePrisma>;
  let tokens: { generatePin: jest.Mock; hashPin: jest.Mock };
  let cache: { invalidateUser: jest.Mock };
  let service: WhatsappConsentService;

  beforeEach(() => {
    tokens = { generatePin: jest.fn().mockReturnValue('048213'), hashPin: jest.fn().mockResolvedValue('$2b$12$hash') };
    tenant = tenantRow();
    other = tenantRow({ id: 'tenant-2', phone: '91000000' });
    prisma = fakePrisma([tenant, other]);
    prisma.lease.findFirst.mockResolvedValue({ id: 'lease-1', property });
    cache = { invalidateUser: jest.fn() };
    service = new WhatsappConsentService(
      prisma as never,
      tokens as never,
      { get: (key: string) => (key === 'WHATSAPP_BUSINESS_NUMBER' ? '22890000000' : undefined) } as never,
      cache as never,
    );
  });

  describe('autorisations de l’agence', () => {
    it('refuse un propriétaire qui n’a aucun lien avec le bien du bail actif', async () => {
      await expect(service.requestByAgency(stranger, 'tenant-1', request)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.events).toHaveLength(0);
    });

    it('bien sous mandat actif : le propriétaire voit l’état mais ne le modifie pas', async () => {
      prisma.mandate.findFirst.mockResolvedValue({ managerId: 'manager-1', status: 'ACTIVE' });
      await expect(service.getForAgency(owner, 'tenant-1')).resolves.toMatchObject({ consent: 'NOT_ASKED' });
      await expect(service.requestByAgency(owner, 'tenant-1', request)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('bien sous mandat actif : le gestionnaire mandaté peut agir', async () => {
      prisma.mandate.findFirst.mockResolvedValue({ managerId: 'manager-1', status: 'ACTIVE' });
      await expect(service.requestByAgency(manager, 'tenant-1', request)).resolves.toMatchObject({ consent: 'PENDING' });
    });

    it('locataire sans bail actif (ou anonymisé) : 404', async () => {
      prisma.lease.findFirst.mockResolvedValue(null);
      await expect(service.getForAgency(owner, 'tenant-1')).rejects.toBeInstanceOf(NotFoundException);
      const [args] = prisma.lease.findFirst.mock.calls[0] as [{ where: object }];
      expect(args.where).toEqual({ tenantUserId: 'tenant-1', status: 'ACTIVE', tenant: { role: 'TENANT', anonymizedAt: null } });
    });
  });

  describe('demande d’accord par l’agence', () => {
    it('met « en attente », jamais « accepté », avec la preuve complète', async () => {
      const view = await service.requestByAgency(owner, 'tenant-1', request);

      expect(view).toMatchObject({ consent: 'PENDING', whatsappPhone: '90112233', phoneVerified: false, requestExpired: false });
      expect(view.requestExpiresAt).toBeInstanceOf(Date);
      expect(prisma.events).toEqual([
        expect.objectContaining({
          kind: 'CONSENT',
          newConsent: 'PENDING',
          source: 'AGENCY',
          actorUserId: 'owner-1',
          noticeVersion: 'consentement-v1',
          collectionMethod: 'IN_PERSON',
          phoneLast2: '33',
        }),
      ]);
      // Numéro figé comme numéro WhatsApp : une modification du numéro
      // principal (profil) ne déplacera pas le canal.
      expect(tenant.whatsappPhone).toBe('90112233');
    });

    it('relancer une demande remplace l’ancienne (une seule valable)', async () => {
      await service.requestByAgency(owner, 'tenant-1', request);
      const first = tenant.whatsappConsentRequestId;
      await service.requestByAgency(owner, 'tenant-1', request);
      expect(tenant.whatsappConsentRequestId).not.toBe(first);
      expect(prisma.events).toHaveLength(2);
    });

    it('avec un autre numéro : changement de numéro (remise à zéro) puis demande', async () => {
      Object.assign(tenant, { whatsappPhone: '90112233', whatsappVerifiedPhone: '90112233', tenantProfile: { whatsappPinHash: 'hash', pinFailedAttempts: 2, pinLockedUntil: null } });
      await service.requestByAgency(owner, 'tenant-1', { ...request, whatsappPhone: '99887766' });

      expect(prisma.events.map((e: Record<string, unknown>) => [e['kind'], e['newConsent']])).toEqual([
        ['PHONE_CHANGE', 'NOT_ASKED'],
        ['CONSENT', 'PENDING'],
      ]);
      expect(tenant).toMatchObject({
        whatsappPhone: '99887766',
        whatsappVerifiedPhone: null,
        tenantProfile: { whatsappPinHash: null, pinFailedAttempts: 0 },
      });
    });

    it('après un arrêt : 409, rien n’est modifié (ni numéro, ni état)', async () => {
      Object.assign(tenant, { whatsappConsent: 'STOPPED' });
      await expect(service.requestByAgency(owner, 'tenant-1', { ...request, whatsappPhone: '99887766' })).rejects.toBeInstanceOf(
        ConflictException,
      );
      await expect(service.requestByAgency(owner, 'tenant-1', request)).rejects.toBeInstanceOf(ConflictException);
      expect(tenant.whatsappPhone).toBeNull();
      expect(tenant.whatsappConsent).toBe('STOPPED');
      expect(prisma.events).toHaveLength(0);
    });

    it('locataire déjà actif, même numéro : rien ne change (double clic)', async () => {
      Object.assign(tenant, { whatsappPhone: '90112233', whatsappConsent: 'ACCEPTED' });
      await expect(service.requestByAgency(owner, 'tenant-1', request)).resolves.toMatchObject({ consent: 'ACCEPTED' });
      expect(prisma.events).toHaveLength(0);
    });

    it('numéro déjà utilisé par un autre compte : 409 au message neutre', async () => {
      await expect(service.requestByAgency(owner, 'tenant-1', { ...request, whatsappPhone: '91000000' })).rejects.toThrow(
        'Ce numéro ne peut pas être utilisé pour WhatsApp',
      );
      expect(prisma.events).toHaveLength(0);
    });

    it('numéro pris entre la vérification et l’écriture (contrainte unique) : 409 neutre', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);
      Object.assign(other, { whatsappPhone: '90112233' });
      await expect(service.requestByAgency(owner, 'tenant-1', request)).rejects.toThrow('Ce numéro ne peut pas être utilisé pour WhatsApp');
    });
  });

  describe('refus noté par l’agence', () => {
    it('arrête le canal ; seul le locataire pourra le réactiver', async () => {
      Object.assign(tenant, { whatsappConsent: 'PENDING', whatsappConsentRequestId: 'req-1' });
      await expect(service.refusalByAgency(owner, 'tenant-1', { collectionMethod: 'PHONE' })).resolves.toMatchObject({
        consent: 'STOPPED',
        requestExpiresAt: null,
      });
      expect(prisma.events).toEqual([expect.objectContaining({ newConsent: 'STOPPED', source: 'AGENCY', collectionMethod: 'PHONE' })]);
      await expect(service.requestByAgency(owner, 'tenant-1', request)).rejects.toBeInstanceOf(ConflictException);
      await expect(service.setConsentByTenant(tenantUser, { action: 'ACCEPT' })).resolves.toMatchObject({ consent: 'ACCEPTED' });
    });
  });

  describe('changement de numéro par l’agence', () => {
    it('remet tout à zéro', async () => {
      Object.assign(tenant, { whatsappPhone: '90112233', whatsappConsent: 'ACCEPTED', whatsappVerifiedPhone: '90112233' });
      await expect(service.changePhoneByAgency(owner, 'tenant-1', '99887766')).resolves.toMatchObject({
        consent: 'NOT_ASKED',
        whatsappPhone: '99887766',
        phoneVerified: false,
      });
    });

    it('refusé après un arrêt', async () => {
      Object.assign(tenant, { whatsappConsent: 'STOPPED' });
      await expect(service.changePhoneByAgency(owner, 'tenant-1', '99887766')).rejects.toBeInstanceOf(ConflictException);
    });

    it('même numéro : rien ne change', async () => {
      Object.assign(tenant, { whatsappPhone: '90112233', whatsappConsent: 'ACCEPTED' });
      await service.changePhoneByAgency(owner, 'tenant-1', '90112233');
      expect(prisma.events).toHaveLength(0);
      expect(tenant.whatsappConsent).toBe('ACCEPTED');
    });
  });

  describe('espace locataire', () => {
    it('le locataire active lui-même ; accord enregistré mais numéro pas encore vérifié', async () => {
      await expect(service.setConsentByTenant(tenantUser, { action: 'ACCEPT' })).resolves.toMatchObject({
        consent: 'ACCEPTED',
        whatsappPhone: '90112233',
        phoneVerified: false,
      });
      expect(prisma.events).toEqual([
        expect.objectContaining({ source: 'TENANT_PORTAL', actorUserId: 'tenant-1', noticeVersion: 'consentement-v1' }),
      ]);
    });

    it('numéro déjà vérifié : l’état le montre', async () => {
      Object.assign(tenant, { whatsappVerifiedPhone: '90112233' });
      await expect(service.setConsentByTenant(tenantUser, { action: 'ACCEPT' })).resolves.toMatchObject({ phoneVerified: true });
    });

    it('sans aucun numéro exploitable : 400', async () => {
      Object.assign(tenant, { phone: null });
      await expect(service.setConsentByTenant(tenantUser, { action: 'ACCEPT' })).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.events).toHaveLength(0);
    });

    it('le locataire retire son accord', async () => {
      Object.assign(tenant, { whatsappConsent: 'ACCEPTED' });
      await expect(service.setConsentByTenant(tenantUser, { action: 'WITHDRAW' })).resolves.toMatchObject({ consent: 'STOPPED' });
    });

    it('le locataire réactive après un arrêt (et c’est le seul à le pouvoir)', async () => {
      Object.assign(tenant, { whatsappConsent: 'STOPPED' });
      await expect(service.setConsentByTenant(tenantUser, { action: 'ACCEPT' })).resolves.toMatchObject({ consent: 'ACCEPTED' });
    });

    it('le locataire change de numéro après un arrêt : autorisé, l’arrêt reste', async () => {
      Object.assign(tenant, { whatsappConsent: 'STOPPED' });
      await expect(service.changePhoneByTenant(tenantUser, '99887766')).resolves.toMatchObject({
        consent: 'STOPPED',
        whatsappPhone: '99887766',
      });
    });

    it('agit toujours sur le compte connecté', async () => {
      await service.setConsentByTenant(tenantUser, { action: 'WITHDRAW' });
      expect(tenant.whatsappConsent).toBe('STOPPED');
      expect(other.whatsappConsent).toBe('NOT_ASKED');
    });
  });

  describe('code locataire (unité 45, décision 2)', () => {
    it('le locataire génère son code : affiché une seule fois, stocké haché, compteurs remis à zéro', async () => {
      Object.assign(tenant, {
        tenantProfile: { whatsappPinHash: 'ancien', pinFailedAttempts: 4, pinLockedUntil: new Date() },
      });
      await expect(service.generatePinForTenant(tenantUser)).resolves.toEqual({ pin: '048213' });
      expect(tokens.hashPin).toHaveBeenCalledWith('048213');
      expect(tenant.tenantProfile).toEqual({
        whatsappPinHash: '$2b$12$hash',
        pinFailedAttempts: 0,
        pinLockedUntil: null,
        pinVerifiedAt: null,
        pinVerifiedPhone: null,
      });
      // Jamais réaffiché ensuite : l'état ne dit que « un code existe ».
      const view = await service.getForTenant(tenantUser);
      expect(view.pinSet).toBe(true);
      expect(JSON.stringify(view)).not.toContain('048213');
    });

    it('sans profil locataire : 404, aucun code renvoyé', async () => {
      Object.assign(tenant, { tenantProfile: null });
      await expect(service.generatePinForTenant(tenantUser)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('l’agence réinitialise le code sans jamais le voir', async () => {
      Object.assign(tenant, {
        tenantProfile: { whatsappPinHash: '$2b$12$hash', pinFailedAttempts: 5, pinLockedUntil: new Date() },
      });
      const view = await service.resetPinByAgency(owner, 'tenant-1');
      expect(view.pinSet).toBe(false);
      expect(JSON.stringify(view)).not.toContain('hash');
      expect(tenant.tenantProfile).toEqual({
        whatsappPinHash: null,
        pinFailedAttempts: 0,
        pinLockedUntil: null,
        pinVerifiedAt: null,
        pinVerifiedPhone: null,
      });
    });

    it('réinitialisation refusée à une agence sans droit sur le bien', async () => {
      Object.assign(tenant, { tenantProfile: { whatsappPinHash: '$2b$12$hash', pinFailedAttempts: 0, pinLockedUntil: null } });
      await expect(service.resetPinByAgency(stranger, 'tenant-1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(tenant.tenantProfile?.whatsappPinHash).toBe('$2b$12$hash');
    });
  });

  describe('listes de l’agence (/review unité 45)', () => {
    it('un changement fait par le locataire vide le cache de tous ceux qui le voient', async () => {
      prisma.lease.findFirst.mockResolvedValue({
        id: 'lease-1',
        property: { ...property, mandates: [{ managerId: 'manager-1' }] },
      });
      prisma.tenantProfile.findUnique.mockResolvedValue({ invitedByUserId: 'owner-9' });
      await service.setConsentByTenant(tenantUser, { action: 'WITHDRAW' });
      expect(cache.invalidateUser.mock.calls.map(([id]: [string]) => id).sort()).toEqual(['manager-1', 'owner-1', 'owner-9']);
    });

    it('sans bail actif ni auteur d’invitation : rien à vider, sans erreur', async () => {
      prisma.lease.findFirst.mockResolvedValue(null);
      prisma.tenantProfile.findUnique.mockResolvedValue(null);
      await expect(service.refreshAgencyLists('tenant-1')).resolves.toBeUndefined();
      expect(cache.invalidateUser).not.toHaveBeenCalled();
    });
  });

  describe('état affiché', () => {
    it('renvoie les textes d’accord avec leur version (seule source, /review unité 45)', async () => {
      const view = await service.getForTenant(tenantUser);
      expect(view.notice.version).toBe('consentement-v1');
      expect(view.notice.agencyAttestation).toContain('J’atteste'.replace('’', "'"));
      expect(view.notice.tenantNotice).toContain('Jamais de publicité');
    });

    it('donne le lien « Écrire à WARAH » avec la phrase d’accord pré-remplie', async () => {
      const view = await service.getForTenant(tenantUser);
      expect(view.contactLink).toBe(
        'https://wa.me/22890000000?text=' + encodeURIComponent("OUI, j'accepte de recevoir les messages de service WARAH sur WhatsApp"),
      );
    });

    it('signale une demande expirée', async () => {
      Object.assign(tenant, {
        whatsappConsent: 'PENDING',
        whatsappConsentRequestId: 'req-1',
        whatsappConsentRequestExpiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.getForTenant(tenantUser)).resolves.toMatchObject({ consent: 'PENDING', requestExpired: true });
    });

    it('n’expose jamais le code, seulement s’il existe', async () => {
      Object.assign(tenant, { tenantProfile: { whatsappPinHash: '$2b$12$secret', pinFailedAttempts: 0, pinLockedUntil: null } });
      const view = await service.getForTenant(tenantUser);
      expect(view.pinSet).toBe(true);
      expect(JSON.stringify(view)).not.toContain('secret');
    });
  });
});
