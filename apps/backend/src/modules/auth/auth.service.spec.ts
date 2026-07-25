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
import { IdentityVerificationFiles } from '../identity/identity.service';
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
    identityVerification: { findFirst: jest.Mock };
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
  };
  let emailService: { sendEmail: jest.Mock };
  let identityService: { verify: jest.Mock };

  const CONFIG_VALUES: Record<string, string> = {
    FRONTEND_URL: 'http://localhost:4200',
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
  const frontFile = {
    buffer: Buffer.from('front'),
    mimetype: 'image/jpeg',
    size: 1000,
  } as Express.Multer.File;
  const backFile = {
    buffer: Buffer.from('back'),
    mimetype: 'image/jpeg',
    size: 1000,
  } as Express.Multer.File;
  const files: IdentityVerificationFiles = { image: [frontFile], imageBack: [backFile] };
  const createdUser = { id: 'user-1', email: ownerDto.email, role: 'OWNER' };

  beforeEach(() => {
    tx = {
      user: { create: jest.fn().mockResolvedValue(createdUser) },
      ownerProfile: { create: jest.fn().mockResolvedValue({}) },
      managerProfile: { create: jest.fn().mockResolvedValue({}) },
      tenantProfile: { create: jest.fn().mockResolvedValue({}) },
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
      identityVerification: { findFirst: jest.fn().mockResolvedValue(null) },
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
    };
    emailService = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    identityService = { verify: jest.fn().mockResolvedValue({ id: 'verif-1', status: 'PENDING' }) };

    service = new AuthService(
      prisma as never,
      config as never,
      supabaseAdmin as never,
      emailService as never,
      identityService as never,
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

    it('rejette avec 403 sans appeler Supabase si le compte est déjà bloqué', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...activeUser,
        lockedUntil: new Date(Date.now() + 5 * 60_000),
      });

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
      expect(supabaseAdmin.anonAuth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("rejette avec 401 générique si Supabase réussit mais aucun User Prisma ne correspond (sans fuite d'info)", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('rejette un compte SUSPENDED_ADMIN sans appeler Supabase', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, accountStatus: 'SUSPENDED_ADMIN' });
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(supabaseAdmin.anonAuth.signInWithPassword).not.toHaveBeenCalled();
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
    it("crée le compte Supabase, le User+OwnerProfile (avec phone/city), envoie l'email de confirmation et déclenche la vérification CNI quand une image est fournie", async () => {
      const result = await service.signupOwner(ownerDto, files);

      expect(supabaseAdmin.auth.admin.generateLink).toHaveBeenCalledWith({
        type: 'signup',
        email: ownerDto.email,
        password: ownerDto.password,
        options: { data: { role: 'OWNER' }, redirectTo: 'http://localhost:4200' },
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
      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: ownerDto.email,
        template: 'signup-confirmation',
        variables: {
          firstName: ownerDto.firstName,
          confirmationUrl: 'https://supabase.example/auth/v1/verify?token=abc',
        },
      });
      expect(identityService.verify).toHaveBeenCalledWith(createdUser, files);
      expect(result).toEqual({
        user: createdUser,
        identityVerification: { id: 'verif-1', status: 'PENDING' },
      });
    });

    // CNI facultative à l'inscription (voir /architect révision inscription
    // owner/manager) — le compte se crée normalement sans aucune image, et
    // la vérification n'est jamais tentée.
    it('crée le compte sans aucune CNI fournie, sans appeler identityService.verify()', async () => {
      const result = await service.signupOwner(ownerDto, {});

      expect(supabaseAdmin.auth.admin.generateLink).toHaveBeenCalled();
      expect(identityService.verify).not.toHaveBeenCalled();
      expect(result).toEqual({ user: createdUser, identityVerification: null });
    });

    it('ne tente pas la vérification si seul le verso est fourni sans le recto', async () => {
      const result = await service.signupOwner(ownerDto, { imageBack: [backFile] });

      expect(identityService.verify).not.toHaveBeenCalled();
      expect(result.identityVerification).toBeNull();
    });

    it('convertit une erreur Supabase email_exists en 409, sans toucher à Prisma', async () => {
      supabaseAdmin.auth.admin.generateLink.mockResolvedValue({
        data: null,
        error: { code: 'email_exists', message: 'User already registered' },
      });
      await expect(service.signupOwner(ownerDto, files)).rejects.toThrow(ConflictException);
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
      await expect(service.signupOwner(ownerDto, files)).rejects.toThrow(ConflictException);
      expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('supabase-uid-1');
    });

    it("supprime le compte Supabase et relance l'erreur si la transaction échoue pour une autre raison", async () => {
      prisma.$transaction.mockRejectedValue(new Error('DB down'));
      await expect(service.signupOwner(ownerDto, files)).rejects.toThrow('DB down');
      expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('supabase-uid-1');
    });
  });

  describe('signupManager', () => {
    it('crée le compte (User avec phone/city, ManagerProfile) et déclenche la vérification CNI quand une image est fournie', async () => {
      const result = await service.signupManager(managerDto, files);

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
      expect(identityService.verify).toHaveBeenCalledWith(createdUser, files);
      expect(result).toEqual({
        user: createdUser,
        identityVerification: { id: 'verif-1', status: 'PENDING' },
      });
    });

    // Même mécanique que signupOwner — CNI facultative à l'inscription (voir
    // /architect révision inscription owner/manager). Le document de
    // référence professionnelle (PDF) a été retiré du flux, jugé non
    // indispensable — plus aucun test à son sujet.
    it('crée le compte sans aucune CNI fournie, sans appeler identityService.verify()', async () => {
      const result = await service.signupManager(managerDto, {});

      expect(identityService.verify).not.toHaveBeenCalled();
      expect(result).toEqual({ user: createdUser, identityVerification: null });
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
    };

    beforeEach(() => {
      prisma.property.findUnique.mockResolvedValue(property);
      tx.user.create.mockResolvedValue({ id: 'tenant-1', role: 'TENANT' });
    });

    it("crée le compte locataire (email confirmé), l'associe à l'inviteur et envoie l'email avec l'adresse du bien", async () => {
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
      type SendEmailArgs = {
        to: string;
        template: string;
        variables: { inviterName: string; propertyAddress: string; invitationUrl: string };
      };
      const [emailArgs] = emailService.sendEmail.mock.calls[0] as [SendEmailArgs];
      expect(emailArgs.to).toBe(inviteDto.email);
      expect(emailArgs.template).toBe('tenant-invitation');
      expect(emailArgs.variables.inviterName).toBe('Jean Dupont');
      expect(emailArgs.variables.propertyAddress).toBe(property.address);
      expect(emailArgs.variables.invitationUrl).toContain('/activate-account?token=');
      expect(result.invitationUrl).toContain('/activate-account?token=');
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
    it("renvoie l'utilisateur avec son profil de rôle et identityVerifiedAt à null tant qu'aucune vérification n'a abouti", async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        email: ownerDto.email,
        ownerProfile: { id: 'profile-1' },
        tenantProfile: null,
        managerProfile: null,
        adminProfile: null,
      });
      prisma.identityVerification.findFirst.mockResolvedValue(null);

      const result = await service.getMe(createdUser as never);

      expect(result.profile).toEqual({ id: 'profile-1' });
      expect(result.identityVerifiedAt).toBeNull();
    });

    // Badge de vérification (voir /architect révision inscription
    // owner/manager) — dérivé du updatedAt de la dernière IdentityVerification
    // VERIFIED, jamais stocké en double.
    it('renvoie identityVerifiedAt = updatedAt de la dernière IdentityVerification VERIFIED', async () => {
      const verifiedAt = new Date('2026-07-10T12:00:00Z');
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        email: ownerDto.email,
        ownerProfile: { id: 'profile-1' },
        tenantProfile: null,
        managerProfile: null,
        adminProfile: null,
      });
      prisma.identityVerification.findFirst.mockResolvedValue({
        id: 'verif-1',
        status: 'VERIFIED',
        updatedAt: verifiedAt,
      });

      const result = await service.getMe(createdUser as never);

      expect(prisma.identityVerification.findFirst).toHaveBeenCalledWith({
        where: { userId: createdUser.id, status: 'VERIFIED' },
        orderBy: { updatedAt: 'desc' },
      });
      expect(result.identityVerifiedAt).toBe(verifiedAt);
    });
  });
});
