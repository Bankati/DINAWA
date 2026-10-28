import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthService } from './auth.service';
import { SignupOwnerDto } from './dto/signup-owner.dto';
import { SignupManagerDto } from './dto/signup-manager.dto';
import { InviteTenantDto } from './dto/invite-tenant.dto';
import {
  createInvitationToken,
  passwordFingerprint,
  verifyInvitationTokenPayload,
} from '../../common/utils/invitation-token';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    $transaction: jest.Mock;
    user: {
      findUniqueOrThrow: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    session: { count: jest.Mock };
    property: { findUnique: jest.Mock };
    mandate: { findFirst: jest.Mock };
    tenantPropertyBlock: { findUnique: jest.Mock };
    passwordResetOtp: {
      updateMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
  };
  let tx: {
    user: { create: jest.Mock };
    ownerProfile: { create: jest.Mock };
    managerProfile: { create: jest.Mock };
    tenantProfile: { create: jest.Mock };
    subscription: { create: jest.Mock };
    lease: { create: jest.Mock };
    paymentScheduleEntry: { createMany: jest.Mock };
    property: { update: jest.Mock };
  };
  let config: { getOrThrow: jest.Mock };
  let tokens: {
    hashPassword: jest.Mock;
    comparePassword: jest.Mock;
    issueTokenPair: jest.Mock;
    rotateRefreshToken: jest.Mock;
    revokeAllSessions: jest.Mock;
  };
  let emailService: { sendEmail: jest.Mock };
  let notify: { notifyUser: jest.Mock };
  let listings: { deactivateForProperty: jest.Mock };

  const CONFIG_VALUES: Record<string, string> = {
    FRONTEND_URL: 'http://localhost:4300',
    INVITATION_TOKEN_SECRET: 'test-secret',
  };

  const ownerDto: SignupOwnerDto = {
    email: 'jean.dupont@warah.tg',
    password: 'password123',
    firstName: 'Jean',
    lastName: 'Dupont',
    phone: '90330557',
    payoutOperator: 'TMONEY',
    city: 'Lomé',
    residenceCountry: 'TG',
  };
  const managerDto: SignupManagerDto = {
    email: 'gerant@warah.tg',
    password: 'password123',
    firstName: 'Awa',
    lastName: 'Gerant',
    phone: '91445566',
    payoutOperator: 'FLOOZ',
    city: 'Kara',
    companyName: 'Immo Kara SARL',
  };
  const createdUser = { id: 'user-1', email: ownerDto.email, role: 'OWNER' };
  const createdLease = { id: 'lease-1', propertyId: 'property-1', tenantUserId: 'tenant-1' };

  beforeEach(() => {
    tx = {
      user: { create: jest.fn().mockResolvedValue(createdUser) },
      ownerProfile: { create: jest.fn().mockResolvedValue({}) },
      managerProfile: { create: jest.fn().mockResolvedValue({}) },
      tenantProfile: { create: jest.fn().mockResolvedValue({}) },
      subscription: { create: jest.fn().mockResolvedValue({}) },
      lease: { create: jest.fn().mockResolvedValue(createdLease) },
      paymentScheduleEntry: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      property: { update: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      // Deux formes de $transaction : fonction interactive, ou tableau de requêtes.
      $transaction: jest.fn((arg: ((tx: unknown) => unknown) | Promise<unknown>[]) =>
        Array.isArray(arg) ? Promise.all(arg) : arg(tx),
      ),
      user: {
        findUniqueOrThrow: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      session: { count: jest.fn().mockResolvedValue(0) },
      property: { findUnique: jest.fn() },
      mandate: { findFirst: jest.fn().mockResolvedValue(null) },
      tenantPropertyBlock: { findUnique: jest.fn().mockResolvedValue(null) },
      passwordResetOtp: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    config = { getOrThrow: jest.fn((key: string) => CONFIG_VALUES[key]) };
    tokens = {
      hashPassword: jest.fn().mockResolvedValue('hashed-password'),
      comparePassword: jest.fn().mockResolvedValue(false),
      issueTokenPair: jest
        .fn()
        .mockResolvedValue({ accessToken: 'access-1', refreshToken: 'refresh-1' }),
      rotateRefreshToken: jest
        .fn()
        .mockResolvedValue({ accessToken: 'access-2', refreshToken: 'refresh-2' }),
      revokeAllSessions: jest.fn().mockResolvedValue(undefined),
    };
    emailService = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };
    listings = { deactivateForProperty: jest.fn().mockResolvedValue(undefined) };

    service = new AuthService(
      prisma as never,
      config as never,
      tokens as never,
      emailService as never,
      notify as never,
      listings as never,
    );
  });

  describe('login', () => {
    const loginDto = { email: 'jean.dupont@warah.tg', password: 'password123' };
    const activeUser = {
      id: 'user-1',
      email: loginDto.email,
      passwordHash: 'stored-hash',
      accountStatus: 'ACTIVE',
      failedLoginAttempts: 0,
      lockedUntil: null,
    };

    it("renvoie les tokens en cas de succès et remet le compteur à zéro (réponse à jour, pas l'instantané pré-connexion)", async () => {
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, failedLoginAttempts: 3 });
      prisma.user.update.mockResolvedValue({ ...activeUser, failedLoginAttempts: 0 });
      tokens.comparePassword.mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(tokens.comparePassword).toHaveBeenCalledWith(loginDto.password, 'stored-hash');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
      expect(tokens.issueTokenPair).toHaveBeenCalledWith({ ...activeUser, failedLoginAttempts: 0 });
      // passwordHash ne doit jamais apparaître dans la réponse, même si
      // `resetUser` le porte encore en interne (voir omit: { passwordHash:
      // false } sur la requête de login) — trouvé et corrigé pendant un
      // test en conditions réelles (fuite du hash bcrypt dans la réponse).
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _omitted, ...activeUserWithoutHash } = activeUser;
      expect(result).toEqual({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        user: { ...activeUserWithoutHash, failedLoginAttempts: 0 },
      });
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it("incrémente le compteur d'échecs et rejette avec 401 générique", async () => {
      prisma.user.findUnique.mockResolvedValue(activeUser);
      tokens.comparePassword.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { failedLoginAttempts: 1, lockedUntil: null },
      });
    });

    it('bloque le compte 15 minutes après 5 échecs', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, failedLoginAttempts: 4 });
      tokens.comparePassword.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);

      const [updateArgs] = prisma.user.update.mock.calls[0] as [
        { data: { failedLoginAttempts: number; lockedUntil: Date | null } },
      ];
      expect(updateArgs.data.failedLoginAttempts).toBe(5);
      expect(updateArgs.data.lockedUntil).toBeInstanceOf(Date);
    });

    it('rejette avec 403 si le compte est déjà bloqué, sans comparer le mot de passe', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...activeUser,
        lockedUntil: new Date(Date.now() + 5 * 60_000),
      });

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
      expect(tokens.comparePassword).not.toHaveBeenCalled();
    });

    it("rejette avec 401 générique si l'email est inconnu — compare quand même un hash factice (protection timing attack)", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(tokens.comparePassword).toHaveBeenCalledWith(
        loginDto.password,
        expect.stringMatching(/^\$2b\$12\$/),
      );
    });

    it('rejette un compte SUSPENDED_ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, accountStatus: 'SUSPENDED_ADMIN' });
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshSession', () => {
    it('délègue la rotation à TokenService', async () => {
      const result = await service.refreshSession('old-refresh-token');

      expect(tokens.rotateRefreshToken).toHaveBeenCalledWith('old-refresh-token');
      expect(result).toEqual({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    });
  });

  describe('requestPasswordReset', () => {
    it("invalide les anciens codes, en crée un nouveau et envoie l'email", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'jean.dupont@warah.tg' });

      const result = await service.requestPasswordReset({ email: 'jean.dupont@warah.tg' });

      const [updateManyArgs] = prisma.passwordResetOtp.updateMany.mock.calls[0] as [
        { where: { userId: string; usedAt: null }; data: { usedAt: Date } },
      ];
      expect(updateManyArgs.where).toEqual({ userId: 'user-1', usedAt: null });
      expect(updateManyArgs.data.usedAt).toBeInstanceOf(Date);
      expect(prisma.passwordResetOtp.create).toHaveBeenCalled();
      const [emailArgs] = emailService.sendEmail.mock.calls[0] as [
        { to: string; template: string; variables: { code: string } },
      ];
      expect(emailArgs.to).toBe('jean.dupont@warah.tg');
      expect(emailArgs.template).toBe('password-reset-otp');
      expect(emailArgs.variables.code).toMatch(/^\d{6}$/);
      expect(result.message).toContain('Si un compte existe');
    });

    it.each([
      ['3 codes dans la dernière heure', 3, 3],
      ['10 codes dans la journée', 0, 10],
    ])(
      'plafond par compte atteint (%s) : même message, mais ni nouveau code ni email',
      async (_cas, parHeure, parJour) => {
        prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'jean.dupont@warah.tg' });
        prisma.passwordResetOtp.count
          .mockResolvedValueOnce(parHeure)
          .mockResolvedValueOnce(parJour);

        const result = await service.requestPasswordReset({ email: 'jean.dupont@warah.tg' });

        expect(result.message).toContain('Si un compte existe');
        expect(prisma.passwordResetOtp.create).not.toHaveBeenCalled();
        // Le dernier code envoyé reste valable pour le vrai titulaire.
        expect(prisma.passwordResetOtp.updateMany).not.toHaveBeenCalled();
        expect(emailService.sendEmail).not.toHaveBeenCalled();
      },
    );

    it("renvoie le même message générique si aucun compte ne correspond, sans envoyer d'email", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.requestPasswordReset({ email: 'inconnu@warah.tg' });

      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(result.message).toContain('Si un compte existe');
    });
  });

  describe('confirmPasswordReset', () => {
    const confirmDto = { email: 'jean.dupont@warah.tg', code: '123456', newPassword: 'newpass123' };
    const MESSAGE = 'Code invalide ou expiré. Après 5 essais, demandez un nouveau code.';
    const otp = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
      id: 'otp-1',
      code: '123456',
      attempts: 0,
      usedAt: null,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      ...over,
    });

    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.passwordResetOtp.updateMany.mockResolvedValue({ count: 1 });
    });

    it('réserve un essai, consomme le code une seule fois, pose le mot de passe et coupe toutes les sessions dans une même transaction', async () => {
      prisma.passwordResetOtp.findFirst.mockResolvedValue(otp());
      tokens.hashPassword.mockResolvedValue('new-hashed-password');

      const result = await service.confirmPasswordReset(confirmDto);

      const calls = prisma.passwordResetOtp.updateMany.mock.calls as [
        { where: Record<string, unknown>; data: Record<string, unknown> },
      ][];
      // 1) réservation de l'essai, plafonnée en base ; 2) consommation unique.
      expect(calls[0][0]).toEqual({
        where: { id: 'otp-1', usedAt: null, attempts: { lt: 5 } },
        data: { attempts: { increment: 1 } },
      });
      expect(calls[1][0].where).toEqual({ id: 'otp-1', usedAt: null });
      expect(calls[1][0].data['usedAt']).toBeInstanceOf(Date);
      expect(tokens.hashPassword).toHaveBeenCalledWith(confirmDto.newPassword);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: 'new-hashed-password' },
      });
      expect(tokens.revokeAllSessions).toHaveBeenCalledWith('user-1');
      const [operations] = prisma.$transaction.mock.calls[0] as [unknown[]];
      expect(operations).toHaveLength(2);
      expect(result.message).toContain('mis à jour');
    });

    it('ne regarde que le DERNIER code créé, quel que soit son état, sans filtrer sur le code saisi', async () => {
      prisma.passwordResetOtp.findFirst.mockResolvedValue(null);

      await expect(service.confirmPasswordReset(confirmDto)).rejects.toThrow(MESSAGE);

      const [findArgs] = prisma.passwordResetOtp.findFirst.mock.calls[0] as [
        { where: Record<string, unknown>; orderBy: unknown },
      ];
      expect(findArgs.where).toEqual({ userId: 'user-1' });
      expect(findArgs.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
      expect(tokens.hashPassword).not.toHaveBeenCalled();
    });

    it("dernier code brûlé : refus, même si un code plus ancien est encore valable (demandes simultanées, relecture Viviane G1)", async () => {
      prisma.passwordResetOtp.findFirst.mockResolvedValue(otp({ usedAt: new Date(), attempts: 5 }));

      await expect(service.confirmPasswordReset(confirmDto)).rejects.toThrow(MESSAGE);
      expect(prisma.passwordResetOtp.updateMany).not.toHaveBeenCalled();
      expect(tokens.hashPassword).not.toHaveBeenCalled();
    });

    it('dernier code expiré : refus sans compter d’essai', async () => {
      prisma.passwordResetOtp.findFirst.mockResolvedValue(otp({ expiresAt: new Date(Date.now() - 1000) }));

      await expect(service.confirmPasswordReset(confirmDto)).rejects.toThrow(MESSAGE);
      expect(prisma.passwordResetOtp.updateMany).not.toHaveBeenCalled();
    });

    it('mauvais code : 400, essai compté, brûlage seulement si le plafond est atteint en base, mot de passe inchangé', async () => {
      prisma.passwordResetOtp.findFirst.mockResolvedValue(otp({ code: '999999', attempts: 1 }));

      await expect(service.confirmPasswordReset(confirmDto)).rejects.toThrow(MESSAGE);

      const [, [burnArgs]] = prisma.passwordResetOtp.updateMany.mock.calls as [
        unknown,
        [{ where: Record<string, unknown>; data: { usedAt: Date } }],
      ];
      // Condition évaluée par la base, pas sur le compteur lu plus haut (M2).
      expect(burnArgs.where).toEqual({ id: 'otp-1', usedAt: null, attempts: { gte: 5 } });
      expect(burnArgs.data.usedAt).toBeInstanceOf(Date);
      expect(tokens.hashPassword).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("plus d'essai disponible (réservation refusée en base) : refus même avec le BON code, même message", async () => {
      prisma.passwordResetOtp.findFirst.mockResolvedValue(otp({ attempts: 5 }));
      prisma.passwordResetOtp.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.confirmPasswordReset(confirmDto)).rejects.toThrow(MESSAGE);
      expect(tokens.hashPassword).not.toHaveBeenCalled();
    });

    it('deux confirmations simultanées avec le bon code : la seconde est refusée', async () => {
      prisma.passwordResetOtp.findFirst.mockResolvedValue(otp());
      // Réservation acceptée, mais le code a été consommé entre-temps par l'autre requête.
      prisma.passwordResetOtp.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      await expect(service.confirmPasswordReset(confirmDto)).rejects.toThrow(BadRequestException);
      expect(tokens.hashPassword).not.toHaveBeenCalled();
      expect(tokens.revokeAllSessions).not.toHaveBeenCalled();
    });

    it("échec de la transaction (mot de passe + sessions) : l'erreur remonte, rien n'est annoncé comme réussi", async () => {
      prisma.passwordResetOtp.findFirst.mockResolvedValue(otp());
      prisma.$transaction.mockRejectedValueOnce(new Error('DB down'));

      await expect(service.confirmPasswordReset(confirmDto)).rejects.toThrow('DB down');
    });

    it('aucun compte pour cet email : même message que pour un mauvais code (pas de fuite)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.confirmPasswordReset(confirmDto)).rejects.toThrow(MESSAGE);
    });
  });

  describe('signupOwner', () => {
    it("hash le mot de passe, crée le User+OwnerProfile (avec phone/city), envoie l'email de confirmation", async () => {
      tokens.hashPassword.mockResolvedValue('hashed-owner-password');

      const result = await service.signupOwner(ownerDto);

      expect(tokens.hashPassword).toHaveBeenCalledWith(ownerDto.password);
      expect(tx.user.create).toHaveBeenCalledWith({
        data: {
          passwordHash: 'hashed-owner-password',
          email: ownerDto.email,
          role: 'OWNER',
          firstName: ownerDto.firstName,
          lastName: ownerDto.lastName,
          phone: ownerDto.phone,
          payoutOperator: ownerDto.payoutOperator,
          city: ownerDto.city,
        },
      });
      expect(tx.ownerProfile.create).toHaveBeenCalledWith({
        data: { userId: createdUser.id, residenceCountry: ownerDto.residenceCountry },
      });
      // Abonnement créé systématiquement à l'inscription (voir /architect
      // unité 35) — Starter + bêta gratuite immédiate.
      const [subscriptionArgs] = tx.subscription.create.mock.calls[0] as [
        { data: { userId: string; tier: string; betaUntil: Date } },
      ];
      expect(subscriptionArgs.data.userId).toBe(createdUser.id);
      expect(subscriptionArgs.data.tier).toBe('STARTER');
      expect(subscriptionArgs.data.betaUntil).toBeInstanceOf(Date);
      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: ownerDto.email,
        template: 'signup-confirmation',
        variables: {
          firstName: ownerDto.firstName,
          confirmationUrl: 'http://localhost:4300/auth/login',
        },
      });
      expect(result).toEqual({ user: createdUser });
    });

    it('convertit un conflit Prisma (P2002 email) en 409', async () => {
      prisma.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
          meta: { target: ['email'] },
        }),
      );
      await expect(service.signupOwner(ownerDto)).rejects.toThrow(ConflictException);
    });

    it("relance l'erreur telle quelle si la transaction échoue pour une autre raison", async () => {
      prisma.$transaction.mockRejectedValue(new Error('DB down'));
      await expect(service.signupOwner(ownerDto)).rejects.toThrow('DB down');
    });
  });

  describe('signupManager', () => {
    it('crée le compte (User avec phone/city, ManagerProfile)', async () => {
      const result = await service.signupManager(managerDto);

      expect(tx.user.create).toHaveBeenCalledWith({
        data: {
          passwordHash: 'hashed-password',
          email: managerDto.email,
          role: 'MANAGER',
          firstName: managerDto.firstName,
          lastName: managerDto.lastName,
          phone: managerDto.phone,
          payoutOperator: managerDto.payoutOperator,
          city: managerDto.city,
        },
      });
      expect(tx.managerProfile.create).toHaveBeenCalledWith({
        data: { userId: createdUser.id, companyName: managerDto.companyName },
      });
      expect(result).toEqual({ user: createdUser });
    });

    it('crée le ManagerProfile sans companyName quand il est omis (champ facultatif)', async () => {
      const dtoWithoutCompany: SignupManagerDto = { ...managerDto, companyName: undefined };
      await service.signupManager(dtoWithoutCompany);

      expect(tx.managerProfile.create).toHaveBeenCalledWith({
        data: { userId: createdUser.id, companyName: undefined },
      });
    });
  });

  describe('inviteTenant', () => {
    const property = { id: 'property-1', ownerId: 'owner-1', address: '12 rue de Lomé' };
    const owner = { id: 'owner-1', role: 'OWNER', firstName: 'Jean', lastName: 'Dupont' };
    const inviteDto: InviteTenantDto = {
      propertyId: 'property-1',
      email: 'locataire@warah.tg',
      phone: '90330557',
      firstName: 'Ama',
      lastName: 'Kodjo',
      monthlyRent: 50000,
      monthlyCharges: 5000,
      paymentFrequency: 'MONTHLY',
      startDate: '2026-01-01',
      securityDeposit: 100000,
    };

    beforeEach(() => {
      prisma.property.findUnique.mockResolvedValue(property);
      tx.user.create.mockResolvedValue({ id: 'tenant-1', role: 'TENANT' });
      tx.lease.create.mockResolvedValue({
        id: 'lease-1',
        propertyId: 'property-1',
        tenantUserId: 'tenant-1',
      });
    });

    it("crée le compte locataire avec un mot de passe placeholder, l'associe à l'inviteur, crée le bail et l'échéancier, envoie l'email avec l'adresse du bien", async () => {
      tokens.hashPassword.mockResolvedValue('placeholder-hash');

      const result = await service.inviteTenant(owner as never, inviteDto);

      // Placeholder haché comme un vrai mot de passe (voir TIMING_SAFE_DUMMY_HASH
      // pour le même principe) — jamais communiqué, remplacé à l'activation.
      expect(tokens.hashPassword).toHaveBeenCalledWith(expect.stringMatching(/^[0-9a-f]{64}$/));
      expect(tx.user.create).toHaveBeenCalledWith({
        data: {
          passwordHash: 'placeholder-hash',
          email: inviteDto.email,
          phone: inviteDto.phone,
          role: 'TENANT',
          firstName: inviteDto.firstName,
          lastName: inviteDto.lastName,
        },
      });
      expect(tx.tenantProfile.create).toHaveBeenCalledWith({
        data: { userId: 'tenant-1', invitedByUserId: owner.id },
      });

      const [leaseCreateArgs] = tx.lease.create.mock.calls[0] as [
        { data: { ownerId: string; tenantUserId: string; monthlyRent: number } },
      ];
      expect(leaseCreateArgs.data.ownerId).toBe('owner-1');
      expect(leaseCreateArgs.data.tenantUserId).toBe('tenant-1');
      expect(leaseCreateArgs.data.monthlyRent).toBe(50000);

      expect(tx.paymentScheduleEntry.createMany).toHaveBeenCalled();
      expect(tx.property.update).toHaveBeenCalledWith({
        where: { id: 'property-1' },
        data: { status: 'OCCUPIED' },
      });
      // Bien passé OCCUPIED — annonce désactivée dans la même transaction
      // (voir /architect module Annonces, 2026-07-28).
      expect(listings.deactivateForProperty).toHaveBeenCalledWith(tx, 'property-1');

      // Un seul email lease-created, avec invitationUrl inclus pour un
      // nouveau locataire (fusionné avec l'ancien événement tenant-invitation
      // séparé — voir /recover fusion auth.service.ts).
      expect(result.invitationUrl).toContain('/auth/activate?token=');
      expect(result.lease).toEqual({
        id: 'lease-1',
        propertyId: 'property-1',
        tenantUserId: 'tenant-1',
      });

      expect(notify.notifyUser).toHaveBeenCalledWith({
        userId: 'tenant-1',
        event: 'lease-created',
        variables: {
          propertyAddress: property.address,
          ownerName: 'Jean Dupont',
          startDate: '01/01/2026',
          monthlyAmount: 55000,
          invitationUrl: result.invitationUrl,
        },
      });
    });

    it("le lien porte l'empreinte du mot de passe provisoire, même si Prisma ne renvoie pas le hash (audit sécurité E2)", async () => {
      tokens.hashPassword.mockResolvedValue('placeholder-hash');
      // Comme le vrai PrismaService : `create` ne renvoie jamais passwordHash.
      tx.user.create.mockResolvedValue({ id: 'tenant-1', role: 'TENANT' });

      const result = await service.inviteTenant(owner as never, inviteDto);

      const token = new URL(result.invitationUrl as string).searchParams.get('token');
      const payload = verifyInvitationTokenPayload(token as string, 'test-secret');
      expect(payload.userId).toBe('tenant-1');
      expect(payload.pwd).toBe(passwordFingerprint('placeholder-hash'));
    });

    it('ne fait pas échouer la création si la notification lease-created échoue', async () => {
      notify.notifyUser.mockRejectedValueOnce(new Error('push down'));
      await expect(service.inviteTenant(owner as never, inviteDto)).resolves.toBeDefined();
    });

    it('rejette avec 404 si le bien est introuvable', async () => {
      prisma.property.findUnique.mockResolvedValue(null);
      await expect(service.inviteTenant(owner as never, inviteDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(tx.user.create).not.toHaveBeenCalled();
    });

    it("rejette avec 403 si l'appelant n'est ni propriétaire ni gestionnaire mandaté sur ce bien", async () => {
      const stranger = { id: 'stranger-1', role: 'OWNER', firstName: 'X', lastName: 'Y' };
      await expect(service.inviteTenant(stranger as never, inviteDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(tx.user.create).not.toHaveBeenCalled();
    });

    it('autorise le gestionnaire avec un mandat actif sur le bien', async () => {
      const manager = { id: 'manager-1', role: 'MANAGER', firstName: 'M', lastName: 'N' };
      prisma.mandate.findFirst.mockResolvedValue({ managerId: 'manager-1', status: 'ACTIVE' });

      await expect(service.inviteTenant(manager as never, inviteDto)).resolves.toBeDefined();
    });

    it('distingue conflit email vs téléphone (P2002) au moment de la création', async () => {
      prisma.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
          meta: { target: ['phone'] },
        }),
      );
      await expect(service.inviteTenant(owner as never, inviteDto)).rejects.toThrow(
        'Ce numéro de téléphone est déjà utilisé(e)',
      );
    });

    // Voir /architect unité 14 : le blocage locataire↔bien est vérifié dès
    // l'invitation, pas seulement à la création du bail (unité 15).
    describe('blocage locataire↔bien (unité 14)', () => {
      it('rejette avec 403 et le motif si le locataire (email ou téléphone déjà connu) est bloqué sur ce bien', async () => {
        prisma.user.findFirst.mockResolvedValueOnce({ id: 'existing-tenant-1', role: 'TENANT' });
        prisma.tenantPropertyBlock.findUnique.mockResolvedValueOnce({
          id: 'block-1',
          reason: 'Dégâts constatés',
        });

        await expect(service.inviteTenant(owner as never, inviteDto)).rejects.toThrow(
          ForbiddenException,
        );
        expect(tx.user.create).not.toHaveBeenCalled();
      });

      it("recherche l'utilisateur existant par email OU téléphone, tous rôles confondus (email/phone uniques globalement)", async () => {
        prisma.user.findFirst.mockResolvedValueOnce(null);
        await service.inviteTenant(owner as never, inviteDto);

        const [findFirstArgs] = prisma.user.findFirst.mock.calls[0] as [
          { where: { OR: [{ email: string }, { phone: string }] } },
        ];
        expect(findFirstArgs.where).not.toHaveProperty('role');
        expect(findFirstArgs.where.OR).toEqual([
          { email: inviteDto.email },
          { phone: inviteDto.phone },
        ]);
      });

      it("n'appelle jamais le blocage si aucun utilisateur existant ne correspond — invitation normale", async () => {
        prisma.user.findFirst.mockResolvedValueOnce(null);
        await expect(service.inviteTenant(owner as never, inviteDto)).resolves.toBeDefined();
        expect(prisma.tenantPropertyBlock.findUnique).not.toHaveBeenCalled();
      });

      it("laisse passer normalement un utilisateur existant qui n'est pas bloqué sur ce bien", async () => {
        prisma.user.findFirst.mockResolvedValueOnce({ id: 'existing-tenant-1', role: 'TENANT' });
        prisma.tenantPropertyBlock.findUnique.mockResolvedValueOnce(null);
        await expect(service.inviteTenant(owner as never, inviteDto)).resolves.toBeDefined();
      });

      // Bug réel corrigé le 2026-08-09 : l'ancienne recherche filtrait
      // `role: 'TENANT'`, donc un email déjà pris par un compte
      // OWNER/MANAGER/ADMIN n'était jamais détecté ici.
      it("rejette avec 409 explicite si l'email appartient déjà à un compte non-TENANT (ex: OWNER)", async () => {
        prisma.user.findFirst.mockResolvedValueOnce({
          id: 'owner-9',
          role: 'OWNER',
          email: inviteDto.email,
          phone: 'autre-numero',
        });
        await expect(service.inviteTenant(owner as never, inviteDto)).rejects.toThrow(
          ConflictException,
        );
        expect(tx.user.create).not.toHaveBeenCalled();
      });

      it('rejette avec 409 explicite si le téléphone appartient déjà à un compte non-TENANT', async () => {
        prisma.user.findFirst.mockResolvedValueOnce({
          id: 'manager-9',
          role: 'MANAGER',
          email: 'autre-email@example.com',
          phone: inviteDto.phone,
        });
        await expect(service.inviteTenant(owner as never, inviteDto)).rejects.toThrow(
          'Ce numéro de téléphone est déjà utilisé par un autre compte WARAH',
        );
      });
    });

    // Voir /architect révision paiements, 2026-07-25 : un locataire déjà
    // connu de la plateforme (ex. bail précédent résilié, nouveau bien) est
    // rattaché à un nouveau bail sans nouveau compte ni ré-invitation.
    describe('locataire déjà existant sur la plateforme', () => {
      const existingTenant = {
        id: 'existing-tenant-1',
        role: 'TENANT',
        email: inviteDto.email,
        phone: inviteDto.phone,
      };

      beforeEach(() => {
        prisma.user.findFirst.mockResolvedValueOnce(existingTenant);
        prisma.tenantPropertyBlock.findUnique.mockResolvedValueOnce(null);
        tx.lease.create.mockResolvedValue({
          id: 'lease-2',
          propertyId: 'property-1',
          tenantUserId: 'existing-tenant-1',
        });
      });

      it('ne crée ni compte ni email d’invitation — réutilise le locataire existant', async () => {
        const result = await service.inviteTenant(owner as never, inviteDto);

        expect(tx.user.create).not.toHaveBeenCalled();
        expect(tx.tenantProfile.create).not.toHaveBeenCalled();
        expect(emailService.sendEmail).not.toHaveBeenCalled();
        expect(result.invitationUrl).toBeNull();
        expect(result.user).toBe(existingTenant);
      });

      it('crée le bail et l’échéancier rattachés au locataire existant, et le notifie', async () => {
        await service.inviteTenant(owner as never, inviteDto);

        const [leaseCreateArgs] = tx.lease.create.mock.calls[0] as [
          { data: { tenantUserId: string; ownerId: string } },
        ];
        expect(leaseCreateArgs.data.tenantUserId).toBe('existing-tenant-1');
        expect(leaseCreateArgs.data.ownerId).toBe('owner-1');
        expect(tx.property.update).toHaveBeenCalledWith({
          where: { id: 'property-1' },
          data: { status: 'OCCUPIED' },
        });
        expect(notify.notifyUser).toHaveBeenCalledWith(
          expect.objectContaining({ userId: 'existing-tenant-1', event: 'lease-created' }),
        );
      });
    });

    it('mappe la contrainte leases_tenant_active_unique en 409 avec un message dédié (locataire déjà en bail actif)', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ id: 'existing-tenant-1', role: 'TENANT' });
      prisma.tenantPropertyBlock.findUnique.mockResolvedValueOnce(null);
      prisma.$transaction.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed on the constraint: `leases_tenant_active_unique`',
          { code: 'P2002', clientVersion: '5.22.0' },
        ),
      );

      await expect(service.inviteTenant(owner as never, inviteDto)).rejects.toThrow(
        'Ce locataire a déjà un bail actif',
      );
    });
  });

  describe('completeTenantSignup', () => {
    const tenant = { id: 'tenant-1', role: 'TENANT', passwordHash: 'placeholder-hash', anonymizedAt: null };

    it('hash et pose le mot de passe du compte déjà créé, par une écriture conditionnelle', async () => {
      const token = createInvitationToken('tenant-1', 'test-secret', 'placeholder-hash');
      prisma.user.findUnique.mockResolvedValue(tenant);
      tokens.hashPassword.mockResolvedValue('hashed-tenant-password');

      const result = await service.completeTenantSignup(token, { password: 'newpassword123' });

      // PrismaService omet passwordHash partout : la lecture doit le réactiver.
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        omit: { passwordHash: false },
      });
      expect(tokens.hashPassword).toHaveBeenCalledWith('newpassword123');
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'tenant-1', passwordHash: 'placeholder-hash' },
        data: { passwordHash: 'hashed-tenant-password' },
      });
      expect(result).toEqual({ userId: 'tenant-1' });
    });

    it('lien déjà utilisé (mot de passe provisoire déjà remplacé) : refusé', async () => {
      const token = createInvitationToken('tenant-1', 'test-secret', 'placeholder-hash');
      prisma.user.findUnique.mockResolvedValue({ ...tenant, passwordHash: 'vrai-mot-de-passe-hash' });

      await expect(
        service.completeTenantSignup(token, { password: 'autre-mot-de-passe' }),
      ).rejects.toThrow('déjà été utilisé');
      expect(tokens.hashPassword).not.toHaveBeenCalled();
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('deux activations simultanées avec le même lien : la seconde est refusée', async () => {
      const token = createInvitationToken('tenant-1', 'test-secret', 'placeholder-hash');
      prisma.user.findUnique.mockResolvedValue(tenant);
      prisma.user.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.completeTenantSignup(token, { password: 'newpassword123' }),
      ).rejects.toThrow('déjà été utilisé');
    });

    it("ancien lien sans empreinte (émis avant le correctif) : accepté si le locataire ne s'est jamais connecté", async () => {
      const token = createInvitationToken('tenant-1', 'test-secret');
      prisma.user.findUnique.mockResolvedValue(tenant);
      prisma.session.count.mockResolvedValue(0);

      await expect(
        service.completeTenantSignup(token, { password: 'newpassword123' }),
      ).resolves.toEqual({ userId: 'tenant-1' });
    });

    it("ancien lien sans empreinte : refusé si le locataire s'est déjà connecté", async () => {
      const token = createInvitationToken('tenant-1', 'test-secret');
      prisma.user.findUnique.mockResolvedValue(tenant);
      prisma.session.count.mockResolvedValue(2);

      await expect(
        service.completeTenantSignup(token, { password: 'newpassword123' }),
      ).rejects.toThrow('déjà été utilisé');
      expect(tokens.hashPassword).not.toHaveBeenCalled();
    });

    it('mot de passe illisible (champ omis par Prisma) : refus par défaut, jamais une acceptation', async () => {
      const token = createInvitationToken('tenant-1', 'test-secret', 'placeholder-hash');
      prisma.user.findUnique.mockResolvedValue({ id: 'tenant-1', role: 'TENANT', anonymizedAt: null });

      await expect(
        service.completeTenantSignup(token, { password: 'newpassword123' }),
      ).rejects.toThrow("Lien d'invitation invalide");
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('compte supprimé ou anonymisé : lien invalide', async () => {
      const token = createInvitationToken('tenant-1', 'test-secret', 'placeholder-hash');
      prisma.user.findUnique.mockResolvedValue({ ...tenant, anonymizedAt: new Date() });

      await expect(
        service.completeTenantSignup(token, { password: 'newpassword123' }),
      ).rejects.toThrow("Lien d'invitation invalide");
    });

    it('rejette avec 400 si le token est invalide', async () => {
      await expect(
        service.completeTenantSignup('token-invalide', { password: 'newpassword123' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("rejette avec 400 si l'utilisateur n'existe pas ou n'est pas TENANT", async () => {
      const token = createInvitationToken('user-x', 'test-secret');
      prisma.user.findUnique.mockResolvedValue({ id: 'user-x', role: 'OWNER' });

      await expect(
        service.completeTenantSignup(token, { password: 'newpassword123' }),
      ).rejects.toThrow(BadRequestException);
      expect(tokens.hashPassword).not.toHaveBeenCalled();
    });
  });

  describe('getMe', () => {
    it("renvoie l'utilisateur avec son profil de rôle", async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        email: ownerDto.email,
        ownerProfile: { id: 'profile-1' },
        tenantProfile: null,
        managerProfile: null,
        adminProfile: null,
      });

      const result = await service.getMe(createdUser as never);

      expect(result.profile).toEqual({ id: 'profile-1' });
    });
  });
});
