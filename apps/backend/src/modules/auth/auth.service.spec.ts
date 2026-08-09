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
import { createInvitationToken } from '../../common/utils/invitation-token';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    $transaction: jest.Mock;
    user: {
      findUniqueOrThrow: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    property: { findUnique: jest.Mock };
    mandate: { findFirst: jest.Mock };
    tenantPropertyBlock: { findUnique: jest.Mock };
    passwordResetOtp: {
      updateMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
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
  let supabaseAdmin: {
    auth: {
      admin: {
        generateLink: jest.Mock;
        createUser: jest.Mock;
        deleteUser: jest.Mock;
        updateUserById: jest.Mock;
      };
    };
    anonAuth: { signInWithPassword: jest.Mock };
    withRetry: jest.Mock;
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
    city: 'Lomé',
    residenceCountry: 'TG',
  };
  const managerDto: SignupManagerDto = {
    email: 'gerant@warah.tg',
    password: 'password123',
    firstName: 'Awa',
    lastName: 'Gerant',
    phone: '91445566',
    city: 'Kara',
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
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(tx)),
      user: {
        findUniqueOrThrow: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      property: { findUnique: jest.fn() },
      mandate: { findFirst: jest.fn().mockResolvedValue(null) },
      tenantPropertyBlock: { findUnique: jest.fn().mockResolvedValue(null) },
      passwordResetOtp: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    config = { getOrThrow: jest.fn((key: string) => CONFIG_VALUES[key]) };
    supabaseAdmin = {
      auth: {
        admin: {
          generateLink: jest.fn().mockResolvedValue({
            data: {
              user: { id: 'supabase-uid-1' },
              properties: { action_link: 'https://supabase.example/auth/v1/verify?token=abc' },
            },
            error: null,
          }),
          createUser: jest
            .fn()
            .mockResolvedValue({ data: { user: { id: 'supabase-uid-tenant' } }, error: null }),
          deleteUser: jest.fn().mockResolvedValue({ error: null }),
          updateUserById: jest.fn().mockResolvedValue({ error: null }),
        },
      },
      anonAuth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: { session: { access_token: 'access-1', refresh_token: 'refresh-1' } },
          error: null,
        }),
      },
      withRetry: jest.fn((fn: () => unknown) => fn()),
    };
    emailService = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    notify = { notifyUser: jest.fn().mockResolvedValue(undefined) };
    listings = { deactivateForProperty: jest.fn().mockResolvedValue(undefined) };

    service = new AuthService(
      prisma as never,
      config as never,
      supabaseAdmin as never,
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
      accountStatus: 'ACTIVE',
      failedLoginAttempts: 0,
      lockedUntil: null,
    };

    it("renvoie la session Supabase en cas de succès et remet le compteur à zéro (réponse à jour, pas l'instantané pré-connexion)", async () => {
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, failedLoginAttempts: 3 });
      prisma.user.update.mockResolvedValue({ ...activeUser, failedLoginAttempts: 0 });

      const result = await service.login(loginDto);

      expect(supabaseAdmin.anonAuth.signInWithPassword).toHaveBeenCalledWith(loginDto);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
      expect(result).toEqual({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        user: { ...activeUser, failedLoginAttempts: 0 },
      });
    });

    it("incrémente le compteur d'échecs et rejette avec 401 générique", async () => {
      prisma.user.findUnique.mockResolvedValue(activeUser);
      supabaseAdmin.anonAuth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid credentials' },
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { failedLoginAttempts: 1, lockedUntil: null },
      });
    });

    it('bloque le compte 15 minutes après 5 échecs', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, failedLoginAttempts: 4 });
      supabaseAdmin.anonAuth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid credentials' },
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);

      const [updateArgs] = prisma.user.update.mock.calls[0] as [
        { data: { failedLoginAttempts: number; lockedUntil: Date | null } },
      ];
      expect(updateArgs.data.failedLoginAttempts).toBe(5);
      expect(updateArgs.data.lockedUntil).toBeInstanceOf(Date);
    });

    it('rejette avec 403 si le compte est déjà bloqué', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...activeUser,
        lockedUntil: new Date(Date.now() + 5 * 60_000),
      });

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    });

    it("rejette avec 401 générique si Supabase réussit mais aucun User Prisma ne correspond (sans fuite d'info)", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('rejette un compte SUSPENDED_ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, accountStatus: 'SUSPENDED_ADMIN' });
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
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

    it("renvoie le même message générique si aucun compte ne correspond, sans envoyer d'email", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.requestPasswordReset({ email: 'inconnu@warah.tg' });

      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(result.message).toContain('Si un compte existe');
    });
  });

  describe('confirmPasswordReset', () => {
    const confirmDto = { email: 'jean.dupont@warah.tg', code: '123456', newPassword: 'newpass123' };

    it('met à jour le mot de passe et marque le code comme utilisé', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', supabaseId: 'supabase-uid-1' });
      prisma.passwordResetOtp.findFirst.mockResolvedValue({ id: 'otp-1' });

      const result = await service.confirmPasswordReset(confirmDto);

      const [otpUpdateArgs] = prisma.passwordResetOtp.update.mock.calls[0] as [
        { where: { id: string }; data: { usedAt: Date } },
      ];
      expect(otpUpdateArgs.where).toEqual({ id: 'otp-1' });
      expect(otpUpdateArgs.data.usedAt).toBeInstanceOf(Date);
      expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith('supabase-uid-1', {
        password: confirmDto.newPassword,
      });
      expect(result.message).toContain('mis à jour');
    });

    it('rejette avec 400 si le code est invalide, expiré ou déjà utilisé', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', supabaseId: 'supabase-uid-1' });
      prisma.passwordResetOtp.findFirst.mockResolvedValue(null);

      await expect(service.confirmPasswordReset(confirmDto)).rejects.toThrow(BadRequestException);
      expect(supabaseAdmin.auth.admin.updateUserById).not.toHaveBeenCalled();
    });

    it('rejette avec 400 si aucun compte ne correspond à cet email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.confirmPasswordReset(confirmDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('signupOwner', () => {
    it("crée le compte Supabase, le User+OwnerProfile (avec phone/city), envoie l'email de confirmation", async () => {
      const result = await service.signupOwner(ownerDto);

      expect(supabaseAdmin.auth.admin.generateLink).toHaveBeenCalledWith({
        type: 'signup',
        email: ownerDto.email,
        password: ownerDto.password,
        options: { data: { role: 'OWNER' }, redirectTo: 'http://localhost:4300' },
      });
      expect(tx.user.create).toHaveBeenCalledWith({
        data: {
          supabaseId: 'supabase-uid-1',
          email: ownerDto.email,
          role: 'OWNER',
          firstName: ownerDto.firstName,
          lastName: ownerDto.lastName,
          phone: ownerDto.phone,
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
          confirmationUrl: 'https://supabase.example/auth/v1/verify?token=abc',
        },
      });
      expect(result).toEqual({ user: createdUser });
    });

    it('convertit une erreur Supabase email_exists en 409, sans toucher à Prisma', async () => {
      supabaseAdmin.auth.admin.generateLink.mockResolvedValue({
        data: null,
        error: { code: 'email_exists', message: 'User already registered' },
      });
      await expect(service.signupOwner(ownerDto)).rejects.toThrow(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('supprime le compte Supabase et convertit un conflit Prisma (P2002 email) en 409', async () => {
      prisma.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
          meta: { target: ['email'] },
        }),
      );
      await expect(service.signupOwner(ownerDto)).rejects.toThrow(ConflictException);
      expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('supabase-uid-1');
    });

    it("supprime le compte Supabase et relance l'erreur si la transaction échoue pour une autre raison", async () => {
      prisma.$transaction.mockRejectedValue(new Error('DB down'));
      await expect(service.signupOwner(ownerDto)).rejects.toThrow('DB down');
      expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('supabase-uid-1');
    });
  });

  describe('signupManager', () => {
    it('crée le compte (User avec phone/city, ManagerProfile)', async () => {
      const result = await service.signupManager(managerDto);

      expect(tx.user.create).toHaveBeenCalledWith({
        data: {
          supabaseId: 'supabase-uid-1',
          email: managerDto.email,
          role: 'MANAGER',
          firstName: managerDto.firstName,
          lastName: managerDto.lastName,
          phone: managerDto.phone,
          city: managerDto.city,
        },
      });
      expect(tx.managerProfile.create).toHaveBeenCalledWith({
        data: { userId: createdUser.id },
      });
      expect(result).toEqual({ user: createdUser });
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

    it("crée le compte locataire (email confirmé), l'associe à l'inviteur, crée le bail et l'échéancier, envoie l'email avec l'adresse du bien", async () => {
      const result = await service.inviteTenant(owner as never, inviteDto);

      expect(supabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
        email: inviteDto.email,
        email_confirm: true,
        user_metadata: { role: 'TENANT' },
      });
      expect(tx.user.create).toHaveBeenCalledWith({
        data: {
          supabaseId: 'supabase-uid-tenant',
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

      type NotifyTenantInvitationArgs = {
        userId: string;
        event: string;
        variables: { inviterName: string; propertyAddress: string; invitationUrl: string };
      };
      const [invitationArgs] = notify.notifyUser.mock.calls[0] as [NotifyTenantInvitationArgs];
      expect(invitationArgs.userId).toBe('tenant-1');
      expect(invitationArgs.event).toBe('tenant-invitation');
      expect(invitationArgs.variables.inviterName).toBe('Jean Dupont');
      expect(invitationArgs.variables.propertyAddress).toBe(property.address);
      expect(invitationArgs.variables.invitationUrl).toContain('/activate-account?token=');
      expect(result.invitationUrl).toContain('/activate-account?token=');
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
        },
      });
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
      expect(supabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
    });

    it("rejette avec 403 si l'appelant n'est ni propriétaire ni gestionnaire mandaté sur ce bien", async () => {
      const stranger = { id: 'stranger-1', role: 'OWNER', firstName: 'X', lastName: 'Y' };
      await expect(service.inviteTenant(stranger as never, inviteDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(supabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
    });

    it('autorise le gestionnaire avec un mandat actif sur le bien', async () => {
      const manager = { id: 'manager-1', role: 'MANAGER', firstName: 'M', lastName: 'N' };
      prisma.mandate.findFirst.mockResolvedValue({ managerId: 'manager-1', status: 'ACTIVE' });

      await expect(service.inviteTenant(manager as never, inviteDto)).resolves.toBeDefined();
    });

    it('convertit une erreur Supabase email_exists en 409', async () => {
      supabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: { code: 'email_exists', message: 'User already registered' },
      });
      await expect(service.inviteTenant(owner as never, inviteDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('supprime le compte Supabase et distingue conflit email vs téléphone (P2002)', async () => {
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
      expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('supabase-uid-tenant');
    });

    // Voir /architect unité 14 : le blocage locataire↔bien est vérifié dès
    // l'invitation, pas seulement à la création du bail (unité 15).
    describe('blocage locataire↔bien (unité 14)', () => {
      it('rejette avec 403 et le motif si le locataire (email ou téléphone déjà connu) est bloqué sur ce bien', async () => {
        prisma.user.findFirst.mockResolvedValueOnce({ id: 'existing-tenant-1' });
        prisma.tenantPropertyBlock.findUnique.mockResolvedValueOnce({
          id: 'block-1',
          reason: 'Dégâts constatés',
        });

        await expect(service.inviteTenant(owner as never, inviteDto)).rejects.toThrow(
          ForbiddenException,
        );
        expect(supabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
      });

      it("recherche l'utilisateur existant par email OU téléphone parmi les locataires uniquement", async () => {
        prisma.user.findFirst.mockResolvedValueOnce(null);
        await service.inviteTenant(owner as never, inviteDto);

        const [findFirstArgs] = prisma.user.findFirst.mock.calls[0] as [
          { where: { role: string; OR: [{ email: string }, { phone: string }] } },
        ];
        expect(findFirstArgs.where.role).toBe('TENANT');
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
        prisma.user.findFirst.mockResolvedValueOnce({ id: 'existing-tenant-1' });
        prisma.tenantPropertyBlock.findUnique.mockResolvedValueOnce(null);
        await expect(service.inviteTenant(owner as never, inviteDto)).resolves.toBeDefined();
      });
    });

    // Voir /architect révision paiements, 2026-07-25 : un locataire déjà
    // connu de la plateforme (ex. bail précédent résilié, nouveau bien) est
    // rattaché à un nouveau bail sans nouveau compte Supabase ni ré-invitation.
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

      it('ne crée ni compte Supabase ni User ni email d’invitation — réutilise le locataire existant', async () => {
        const result = await service.inviteTenant(owner as never, inviteDto);

        expect(supabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
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
      expect(supabaseAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
    });
  });

  describe('completeTenantSignup', () => {
    it('pose le mot de passe du compte déjà créé', async () => {
      const token = createInvitationToken('tenant-1', 'test-secret');
      prisma.user.findUnique.mockResolvedValue({
        id: 'tenant-1',
        role: 'TENANT',
        supabaseId: 'supabase-uid-tenant',
      });

      const result = await service.completeTenantSignup(token, { password: 'newpassword123' });

      expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith('supabase-uid-tenant', {
        password: 'newpassword123',
      });
      expect(result).toEqual({ userId: 'tenant-1' });
    });

    it('rejette avec 400 si le token est invalide', async () => {
      await expect(
        service.completeTenantSignup('token-invalide', { password: 'newpassword123' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("rejette avec 400 si l'utilisateur n'existe pas ou n'est pas TENANT", async () => {
      const token = createInvitationToken('user-x', 'test-secret');
      prisma.user.findUnique.mockResolvedValue({ id: 'user-x', role: 'OWNER', supabaseId: 'x' });

      await expect(
        service.completeTenantSignup(token, { password: 'newpassword123' }),
      ).rejects.toThrow(BadRequestException);
      expect(supabaseAdmin.auth.admin.updateUserById).not.toHaveBeenCalled();
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
