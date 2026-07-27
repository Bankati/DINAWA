import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { addMonths, format } from 'date-fns';
import { Lease, IdentityVerification, Prisma, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { canActOnProperty } from '../../common/permissions/property-access';
import { assertTenantNotBlocked } from '../../common/permissions/tenant-block';
import { createInvitationToken, verifyInvitationToken } from '../../common/utils/invitation-token';
import { SupabaseAdminService } from '../supabase/supabase-admin.service';
import { EmailService } from '../email/email.service';
import { IdentityService, IdentityVerificationFiles } from '../identity/identity.service';
import { NotifyService } from '../notify/notify.service';
import { ROLLING_WINDOW_MONTHS, buildScheduleEntries } from '../leases/schedule-builder';
import { SignupOwnerDto } from './dto/signup-owner.dto';
import { SignupManagerDto } from './dto/signup-manager.dto';
import { InviteTenantDto } from './dto/invite-tenant.dto';
import { SetTenantPasswordDto } from './dto/set-tenant-password.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';

// Blocage temporaire après échecs de connexion (voir build-plan.md unité 10).
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

// OTP de réinitialisation de mot de passe (voir build-plan.md unité 10).
const PASSWORD_RESET_OTP_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_OTP_TTL_MINUTES = 10;

type UserWithProfiles = Prisma.UserGetPayload<{
  include: {
    ownerProfile: true;
    tenantProfile: true;
    managerProfile: true;
    adminProfile: true;
  };
}>;

export type AuthMeResponse = Omit<
  UserWithProfiles,
  'ownerProfile' | 'tenantProfile' | 'managerProfile' | 'adminProfile'
> & {
  profile:
    | UserWithProfiles['ownerProfile']
    | UserWithProfiles['tenantProfile']
    | UserWithProfiles['managerProfile']
    | UserWithProfiles['adminProfile'];
  // Date à laquelle idVerificationStatus est passé à VERIFIED — dérivée de
  // IdentityVerification.updatedAt, jamais stockée en double (voir
  // /architect révision inscription owner/manager, "badge type LinkedIn").
  // null tant que le compte n'a jamais été vérifié.
  identityVerifiedAt: Date | null;
};

export type SignupOwnerResponse = {
  user: User;
  identityVerification: IdentityVerification | null;
};

export type SignupManagerResponse = {
  user: User;
  identityVerification: IdentityVerification | null;
};

export type InviteTenantResponse = {
  user: User;
  lease: Lease;
  // null quand le locataire existait déjà sur la plateforme (bail
  // précédent résilié, nouveau bail sur un autre bien) — pas de nouvelle
  // invitation Supabase dans ce cas, voir AuthService.inviteTenant().
  invitationUrl: string | null;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly emailService: EmailService,
    private readonly identityService: IdentityService,
    private readonly notify: NotifyService,
  ) {}

  async getMe(user: AuthenticatedUser): Promise<AuthMeResponse> {
    const { ownerProfile, tenantProfile, managerProfile, adminProfile, ...base } =
      await this.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          ownerProfile: true,
          tenantProfile: true,
          managerProfile: true,
          adminProfile: true,
        },
      });

    const lastVerified = await this.prisma.identityVerification.findFirst({
      where: { userId: user.id, status: 'VERIFIED' },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      ...base,
      profile: ownerProfile ?? tenantProfile ?? managerProfile ?? adminProfile ?? null,
      identityVerifiedAt: lastVerified?.updatedAt ?? null,
    };
  }

  // Connexion routée par NestJS (et non directement Supabase côté client)
  // — seul moyen de compter les échecs et appliquer le blocage de 15 minutes
  // après 5 tentatives (voir build-plan.md unité 10, décision prise avec le
  // développeur : renversement assumé du principe « le backend ne voit
  // jamais un mot de passe »). Utilise anonAuth (jamais service_role) pour
  // signInWithPassword — moindre privilège.
  async login(dto: LoginDto): Promise<LoginResponse> {
    // Parallélisation : DB lookup et auth Supabase lancés simultanément
    // → économise ~200 ms de latence Frankfurt pour les utilisateurs en
    // Afrique. Contrepartie assumée : Supabase est maintenant appelé même
    // pour un compte déjà bloqué/suspendu (avant, on le savait avant
    // d'appeler Supabase et on l'évitait) — la réponse reste correcte dans
    // tous les cas, seul un appel externe ponctuel devient inutile sur ce
    // cas rare plutôt que retarder le cas courant (connexion valide).
    const [user, { data, error }] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: dto.email } }),
      this.supabaseAdmin.withRetry(() =>
        this.supabaseAdmin.anonAuth.signInWithPassword({
          email: dto.email,
          password: dto.password,
        }),
      ),
    ]);

    if (user?.accountStatus === 'SUSPENDED_ADMIN') {
      throw new UnauthorizedException('Compte suspendu');
    }

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new ForbiddenException(
        `Trop de tentatives échouées — réessayez dans ${minutesLeft} minute(s)`,
      );
    }

    if (error || !data.session) {
      if (user) {
        await this.recordFailedLogin(user);
      }
      // Message générique — jamais de fuite sur l'existence d'un email.
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (!user) {
      throw new UnauthorizedException('Utilisateur inconnu');
    }

    // Renvoie l'utilisateur à jour (pas l'instantané pré-connexion) — sans
    // ça, le client recevrait un `failedLoginAttempts` déjà obsolète.
    const resetUser =
      user.failedLoginAttempts > 0 || user.lockedUntil
        ? await this.prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          })
        : user;

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: resetUser,
    };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto): Promise<{ message: string }> {
    const genericMessage = { message: 'Si un compte existe avec cet email, un code a été envoyé.' };

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      // Jamais de fuite sur l'existence d'un email — réponse identique dans
      // les deux cas.
      return genericMessage;
    }

    // Toute nouvelle demande invalide les codes précédents non utilisés
    // (voir build-plan.md unité 10).
    await this.prisma.passwordResetOtp.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const code = this.generateOtpCode();
    await this.prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        code,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MS),
      },
    });

    // Email d'authentification — toujours direct via EmailService, jamais
    // via NotifyService (voir architecture.md, invariant #7).
    await this.emailService.sendEmail({
      to: dto.email,
      template: 'password-reset-otp',
      variables: { code, expirationMinutes: PASSWORD_RESET_OTP_TTL_MINUTES },
    });

    return genericMessage;
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.supabaseId) {
      throw new BadRequestException('Code invalide ou expiré');
    }
    const supabaseId = user.supabaseId;

    const otp = await this.prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        code: dto.code,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) {
      throw new BadRequestException('Code invalide ou expiré');
    }

    await this.prisma.passwordResetOtp.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    const { error } = await this.supabaseAdmin.withRetry(() =>
      this.supabaseAdmin.auth.admin.updateUserById(supabaseId, {
        password: dto.newPassword,
      }),
    );
    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Mot de passe mis à jour' };
  }

  private async recordFailedLogin(user: User): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;
    const lockedUntil =
      attempts >= MAX_FAILED_LOGIN_ATTEMPTS ? new Date(Date.now() + LOGIN_LOCKOUT_MS) : null;
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: attempts, lockedUntil },
    });
  }

  // crypto.randomInt() plutôt que Math.random() — voir analyse SonarQube :
  // Math.random() n'est pas cryptographiquement sûr (état interne
  // reconstituable après observation de suffisamment de valeurs), inadapté
  // à un code de sécurité même à usage unique et expiration courte.
  private generateOtpCode(): string {
    return randomInt(100_000, 1_000_000).toString();
  }

  async signupOwner(
    dto: SignupOwnerDto,
    files: IdentityVerificationFiles,
  ): Promise<SignupOwnerResponse> {
    const { user, confirmationUrl } = await this.createConfirmedAccount({
      email: dto.email,
      password: dto.password,
      role: 'OWNER',
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      city: dto.city,
      createProfile: (tx, created) =>
        tx.ownerProfile.create({
          data: { userId: created.id, residenceCountry: dto.residenceCountry },
        }),
    });

    await this.emailService.sendEmail({
      to: dto.email,
      template: 'signup-confirmation',
      variables: { firstName: dto.firstName, confirmationUrl },
    });

    // La CNI est facultative à l'inscription (voir /architect révision
    // inscription owner/manager) — le compte se crée sans elle. Si une image
    // est fournie, on tente la vérification tout de suite ; sinon, elle
    // reste à faire plus tard via POST /api/identity/verify, et le compte
    // reste bloqué à la création de bien tant qu'elle n'est pas VERIFIED
    // (voir PropertiesService.create()).
    const identityVerification = files.image?.[0]
      ? await this.identityService.verify(user, files)
      : null;

    return { user, identityVerification };
  }

  async signupManager(
    dto: SignupManagerDto,
    files: IdentityVerificationFiles,
  ): Promise<SignupManagerResponse> {
    const { user, confirmationUrl } = await this.createConfirmedAccount({
      email: dto.email,
      password: dto.password,
      role: 'MANAGER',
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      city: dto.city,
      createProfile: (tx, created) => tx.managerProfile.create({ data: { userId: created.id } }),
    });

    await this.emailService.sendEmail({
      to: dto.email,
      template: 'signup-confirmation',
      variables: { firstName: dto.firstName, confirmationUrl },
    });

    // Même mécanique que signupOwner — CNI facultative à l'inscription.
    const identityVerification = files.image?.[0]
      ? await this.identityService.verify(user, files)
      : null;

    return { user, identityVerification };
  }

  // Fusionne l'invitation du locataire et la création du bail (voir
  // /architect révision paiements, 2026-07-25 — remplace le flux en deux
  // étapes invite puis POST /api/leases). Deux chemins selon que
  // l'email/téléphone correspond déjà à un locataire existant :
  //   - Nouveau locataire : crée le compte Supabase (email_confirm: true,
  //     voir signupOwner/signupManager) + User + TenantProfile + Lease +
  //     échéancier, envoie l'email d'invitation.
  //   - Locataire déjà connu de la plateforme (ex. bail précédent résilié,
  //     nouveau bien) : aucun nouveau compte, juste un nouveau Lease sur ce
  //     bien — notifié comme pour n'importe quel nouveau bail, pas
  //     ré-invité. Referme le gap qu'aurait laissé un retrait pur et simple
  //     de POST /api/leases : sans ce chemin, un locataire existant ne
  //     pourrait plus jamais être rattaché à un nouveau bien.
  async inviteTenant(
    inviter: AuthenticatedUser,
    dto: InviteTenantDto,
  ): Promise<InviteTenantResponse> {
    const property = await this.prisma.property.findUnique({ where: { id: dto.propertyId } });
    if (!property) {
      throw new NotFoundException('Bien introuvable');
    }

    const access = await canActOnProperty(this.prisma, inviter, property);
    if (!access.canMutate) {
      throw new ForbiddenException(
        "Vous n'avez pas les droits pour inviter un locataire sur ce bien",
      );
    }

    // Rejet immédiat et explicite si ce locataire a été bloqué sur CE bien
    // précis (voir build-plan.md unité 14, /architect) — vérifié dès
    // l'invitation plutôt qu'attendu à la création du bail (unité 15), pour
    // éviter au propriétaire de perdre du temps à réinviter quelqu'un qu'il
    // a explicitement écarté de ce bien. Recherche par email OU téléphone :
    // un locataire déjà connu de la plateforme ne doit pas pouvoir
    // contourner un blocage avec un email différent mais le même téléphone.
    const existingTenant = await this.prisma.user.findFirst({
      where: { role: 'TENANT', OR: [{ email: dto.email }, { phone: dto.phone }] },
    });
    if (existingTenant) {
      await assertTenantNotBlocked(this.prisma, dto.propertyId, existingTenant.id);
    }

    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    const scheduleEndDate = endDate ?? addMonths(startDate, ROLLING_WINDOW_MONTHS);

    let user: User;
    let lease: Lease;
    let invitationUrl: string | null = null;

    if (existingTenant) {
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          const createdLease = await this.createLeaseWithinTransaction(
            tx,
            property,
            existingTenant.id,
            dto,
            startDate,
            endDate,
            scheduleEndDate,
          );
          return { user: existingTenant, lease: createdLease };
        });
        user = result.user;
        lease = result.lease;
      } catch (dbError) {
        throw this.mapDuplicateError(dbError);
      }
    } else {
      // Le compte est créé à l'invitation, pas à l'activation — le locataire
      // n'a plus qu'à poser un mot de passe en cliquant le lien (voir
      // build-plan.md unité 09, décision prise avec le développeur).
      const { data, error } = await this.supabaseAdmin.withRetry(() =>
        this.supabaseAdmin.auth.admin.createUser({
          email: dto.email,
          email_confirm: true,
          user_metadata: { role: 'TENANT' },
        }),
      );

      if (error) {
        if (error.code === 'email_exists' || error.code === 'user_already_exists') {
          throw new ConflictException('Cette adresse email est déjà utilisée');
        }
        throw new BadRequestException(error.message);
      }

      const supabaseUserId = data.user.id;

      try {
        const result = await this.prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              supabaseId: supabaseUserId,
              email: dto.email,
              phone: dto.phone,
              role: 'TENANT',
              firstName: dto.firstName,
              lastName: dto.lastName,
            },
          });
          await tx.tenantProfile.create({
            data: { userId: created.id, invitedByUserId: inviter.id },
          });
          const createdLease = await this.createLeaseWithinTransaction(
            tx,
            property,
            created.id,
            dto,
            startDate,
            endDate,
            scheduleEndDate,
          );
          return { user: created, lease: createdLease };
        });
        user = result.user;
        lease = result.lease;
      } catch (dbError) {
        await this.supabaseAdmin.withRetry(() =>
          this.supabaseAdmin.auth.admin.deleteUser(supabaseUserId),
        );
        throw this.mapDuplicateError(dbError);
      }

      const secret = this.config.getOrThrow<string>('INVITATION_TOKEN_SECRET');
      const token = createInvitationToken(user.id, secret);
      invitationUrl = `${this.config.getOrThrow<string>('FRONTEND_URL')}/activate-account?token=${token}`;

      await this.emailService.sendEmail({
        to: dto.email,
        template: 'tenant-invitation',
        variables: {
          inviterName: `${inviter.firstName} ${inviter.lastName}`,
          propertyAddress: property.address,
          invitationUrl,
        },
      });
    }

    // Événement métier, jamais un email direct (voir architecture.md,
    // invariant #7). Une notification manquée ne doit jamais faire échouer
    // la création du bail elle-même — même réflexe que l'ancien
    // LeasesService.create() (voir /review unité 15).
    try {
      await this.notify.notifyUser({
        userId: user.id,
        event: 'lease-created',
        variables: {
          propertyAddress: property.address,
          ownerName: `${inviter.firstName} ${inviter.lastName}`,
          startDate: format(startDate, 'dd/MM/yyyy'),
          monthlyAmount: dto.monthlyRent + dto.monthlyCharges,
        },
      });
    } catch (notifyError) {
      this.logger.error(`[lease-created] notification échouée pour tenant=${user.id}`, notifyError);
    }

    return { user, lease, invitationUrl };
  }

  // Utilisé pour les deux chemins de inviteTenant() (nouveau locataire ou
  // locataire déjà existant) — toujours appelé à l'intérieur d'une
  // transaction Prisma déjà ouverte par l'appelant.
  private async createLeaseWithinTransaction(
    tx: Prisma.TransactionClient,
    property: { id: string; ownerId: string },
    tenantUserId: string,
    dto: InviteTenantDto,
    startDate: Date,
    endDate: Date | null,
    scheduleEndDate: Date,
  ): Promise<Lease> {
    const lease = await tx.lease.create({
      data: {
        propertyId: property.id,
        ownerId: property.ownerId,
        tenantUserId,
        monthlyRent: dto.monthlyRent,
        monthlyCharges: dto.monthlyCharges,
        paymentFrequency: dto.paymentFrequency,
        startDate,
        endDate,
        securityDeposit: dto.securityDeposit,
        depositReturnConditions: dto.depositReturnConditions,
        reminderDaysBefore: dto.reminderDaysBefore,
        overdueAlertWindowDays: dto.overdueAlertWindowDays,
      },
    });

    const entries = buildScheduleEntries(
      lease.id,
      startDate,
      scheduleEndDate,
      dto.paymentFrequency,
      dto.monthlyRent,
      dto.monthlyCharges,
    );
    if (entries.length > 0) {
      await tx.paymentScheduleEntry.createMany({ data: entries });
    }

    // Jamais via PropertiesService.update() — le passage à OCCUPIED est
    // exclusivement piloté par la création d'un bail, PATCH /properties le
    // refuse explicitement (voir assertValidTransition()).
    await tx.property.update({ where: { id: property.id }, data: { status: 'OCCUPIED' } });

    return lease;
  }

  async completeTenantSignup(
    token: string | undefined,
    dto: SetTenantPasswordDto,
  ): Promise<{ userId: string }> {
    const secret = this.config.getOrThrow<string>('INVITATION_TOKEN_SECRET');
    const userId = verifyInvitationToken(token, secret);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'TENANT' || !user.supabaseId) {
      throw new BadRequestException("Lien d'invitation invalide");
    }
    const supabaseId = user.supabaseId;

    const { error } = await this.supabaseAdmin.withRetry(() =>
      this.supabaseAdmin.auth.admin.updateUserById(supabaseId, {
        password: dto.password,
      }),
    );
    if (error) {
      throw new BadRequestException(error.message);
    }

    return { userId: user.id };
  }

  private async createConfirmedAccount(params: {
    email: string;
    password: string;
    role: 'OWNER' | 'MANAGER';
    firstName: string;
    lastName: string;
    phone: string;
    city: string;
    createProfile: (tx: Prisma.TransactionClient, user: User) => Promise<unknown>;
  }): Promise<{ user: User; confirmationUrl: string }> {
    // `generateLink({ type: 'signup' })` crée le compte Supabase Auth ET
    // renvoie le lien de confirmation en un seul appel — pas besoin d'un
    // `admin.createUser()` séparé (voir library-docs.md, section Supabase
    // Auth, et la doc du SDK : generateLink gère la création pour 'signup').
    const { data, error } = await this.supabaseAdmin.withRetry(() =>
      this.supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: params.email,
        password: params.password,
        options: {
          data: { role: params.role },
          redirectTo: this.config.getOrThrow<string>('FRONTEND_URL'),
        },
      }),
    );

    if (error) {
      if (error.code === 'email_exists' || error.code === 'user_already_exists') {
        throw new ConflictException('Cette adresse email est déjà utilisée');
      }
      throw new BadRequestException(error.message);
    }

    const supabaseUserId = data.user.id;

    let user: User;
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            supabaseId: supabaseUserId,
            email: params.email,
            role: params.role,
            firstName: params.firstName,
            lastName: params.lastName,
            phone: params.phone,
            city: params.city,
          },
        });
        await params.createProfile(tx, created);
        return created;
      });
    } catch (dbError) {
      // Évite un compte Supabase orphelin qui bloquerait toute nouvelle
      // tentative de signup avec le même email.
      await this.supabaseAdmin.withRetry(() =>
        this.supabaseAdmin.auth.admin.deleteUser(supabaseUserId),
      );
      throw this.mapDuplicateError(dbError);
    }

    return { user, confirmationUrl: data.properties.action_link };
  }

  private mapDuplicateError(dbError: unknown): unknown {
    if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2002') {
      // Index partiel créé en SQL brut (pas un `@@unique` du schéma) — Prisma
      // rapporte son nom directement dans le message, jamais dans
      // `meta.target` sous forme de colonnes. Vérifié avant le cas
      // email/phone générique (voir /architect révision paiements,
      // 2026-07-25 : la fusion bail↔locataire peut désormais heurter cette
      // contrainte, plus seulement LeasesService.create()).
      if (dbError.message.includes('leases_tenant_active_unique')) {
        return new ConflictException(
          "Ce locataire a déjà un bail actif — un locataire ne peut avoir qu'un seul bail actif à la fois",
        );
      }
      const rawTarget = dbError.meta?.['target'];
      const target = Array.isArray(rawTarget)
        ? rawTarget.join(',')
        : typeof rawTarget === 'string'
          ? rawTarget
          : '';
      const field = target.includes('phone') ? 'Ce numéro de téléphone' : 'Cette adresse email';
      return new ConflictException(`${field} est déjà utilisé(e)`);
    }
    return dbError;
  }
}
