import { randomBytes, randomInt } from 'node:crypto';
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
import { Lease, Prisma, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { canActOnProperty } from '../../common/permissions/property-access';
import { assertTenantNotBlocked } from '../../common/permissions/tenant-block';
import { createInvitationToken, verifyInvitationToken } from '../../common/utils/invitation-token';
import { TokenService } from './token.service';
import { EmailService } from '../email/email.service';
import { NotifyService } from '../notify/notify.service';
import { ROLLING_WINDOW_MONTHS, buildScheduleEntries } from '../leases/schedule-builder';
import { ListingsService } from '../listings/listings.service';
import { BETA_FREE_MONTHS } from '../../common/constants';
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

// Hash bcrypt fixe (valide, mais d'un secret jamais connu) utilisé quand
// aucun utilisateur ne correspond à l'email fourni — garantit un temps de
// réponse constant que le compte existe ou non. Sans ça, l'absence de
// comparaison bcrypt pour un email inconnu serait mesurablement plus rapide
// qu'un email existant, une fuite d'information classique (timing attack).
const TIMING_SAFE_DUMMY_HASH = '$2b$12$yCFsKe6MMnIIPVrHHkt8v.T8gJ2UapzKcX4ejzcEv3kq0gwXAlrte';

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
};

export type SignupOwnerResponse = {
  user: User;
};

export type SignupManagerResponse = {
  user: User;
};

export type InviteTenantResponse = {
  user: User;
  lease: Lease;
  // null quand le locataire existait déjà sur la plateforme (bail
  // précédent résilié, nouveau bail sur un autre bien) — pas de nouvelle
  // invitation dans ce cas, voir AuthService.inviteTenant().
  invitationUrl: string | null;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly tokens: TokenService,
    private readonly emailService: EmailService,
    private readonly notify: NotifyService,
    private readonly listings: ListingsService,
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

    return {
      ...base,
      profile: ownerProfile ?? tenantProfile ?? managerProfile ?? adminProfile ?? null,
    };
  }

  // Authentification interne depuis le 2026-08-11 (voir architecture.md) —
  // hash bcrypt comparé localement, plus d'appel réseau vers Supabase Auth.
  async login(dto: LoginDto): Promise<LoginResponse> {
    // omit: { passwordHash: false } réactive explicitement le champ omis
    // globalement par défaut (voir PrismaService) — seul endroit de tout le
    // code qui a besoin de le lire.
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      omit: { passwordHash: false },
    });

    if (user?.accountStatus === 'SUSPENDED_ADMIN') {
      throw new UnauthorizedException('Compte suspendu');
    }

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new ForbiddenException(
        `Trop de tentatives échouées — réessayez dans ${minutesLeft} minute(s)`,
      );
    }

    // Toujours comparer, même si `user` est absent (voir TIMING_SAFE_DUMMY_HASH).
    const passwordValid = await this.tokens.comparePassword(
      dto.password,
      user?.passwordHash ?? TIMING_SAFE_DUMMY_HASH,
    );

    if (!user || !passwordValid) {
      if (user) {
        await this.recordFailedLogin(user);
      }
      // Message générique — jamais de fuite sur l'existence d'un email.
      throw new UnauthorizedException('Email ou mot de passe incorrect');
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

    const { accessToken, refreshToken } = await this.tokens.issueTokenPair(resetUser);
    // `resetUser` peut encore porter passwordHash (branche sans reset de
    // compteur, voir omit: { passwordHash: false } plus haut) — jamais
    // renvoyé au client, même par ce chemin précis.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...safeUser } = resetUser;
    return { accessToken, refreshToken, user: safeUser as User };
  }

  async refreshSession(refreshToken: string): Promise<RefreshResponse> {
    return this.tokens.rotateRefreshToken(refreshToken);
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
    if (!user) {
      throw new BadRequestException('Code invalide ou expiré');
    }

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

    const passwordHash = await this.tokens.hashPassword(dto.newPassword);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

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

  async signupOwner(dto: SignupOwnerDto): Promise<SignupOwnerResponse> {
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

    // Fire-and-forget — ne bloque pas la réponse si l'email est lent ou échoue
    this.emailService
      .sendEmail({
        to: dto.email,
        template: 'signup-confirmation',
        variables: { firstName: dto.firstName, confirmationUrl },
      })
      .catch((err) => this.logger.error(`Email signup-confirmation échoué pour ${dto.email}`, err));

    return { user };
  }

  async signupManager(dto: SignupManagerDto): Promise<SignupManagerResponse> {
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

    // Fire-and-forget — ne bloque pas la réponse si l'email est lent ou échoue
    this.emailService
      .sendEmail({
        to: dto.email,
        template: 'signup-confirmation',
        variables: { firstName: dto.firstName, confirmationUrl },
      })
      .catch((err) => this.logger.error(`Email signup-confirmation échoué pour ${dto.email}`, err));

    return { user };
  }

  // Fusionne l'invitation du locataire et la création du bail (voir
  // /architect révision paiements, 2026-07-25 — remplace le flux en deux
  // étapes invite puis POST /api/leases). Deux chemins selon que
  // l'email/téléphone correspond déjà à un locataire existant :
  //   - Nouveau locataire : crée le User (mot de passe placeholder jamais
  //     communiqué, posé plus tard via completeTenantSignup) + TenantProfile
  //     + Lease + échéancier, envoie l'email d'invitation.
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

    // `email`/`phone` sont uniques globalement sur `User` (tous rôles
    // confondus, voir schema.prisma) — la recherche doit donc porter sur
    // n'importe quel rôle, pas seulement TENANT. Sinon un email déjà utilisé
    // par un compte OWNER/MANAGER/ADMIN n'est jamais détecté ici.
    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    });

    if (existingUser && existingUser.role !== 'TENANT') {
      throw new ConflictException(
        existingUser.email === dto.email
          ? 'Cette adresse email est déjà utilisée par un autre compte WARAH (non locataire)'
          : 'Ce numéro de téléphone est déjà utilisé par un autre compte WARAH (non locataire)',
      );
    }

    // Rejet immédiat et explicite si ce locataire a été bloqué sur CE bien
    // précis (voir build-plan.md unité 14, /architect) — vérifié dès
    // l'invitation plutôt qu'attendu à la création du bail (unité 15), pour
    // éviter au propriétaire de perdre du temps à réinviter quelqu'un qu'il
    // a explicitement écarté de ce bien. Recherche par email OU téléphone :
    // un locataire déjà connu de la plateforme ne doit pas pouvoir
    // contourner un blocage avec un email différent mais le même téléphone.
    const existingTenant = existingUser;
    if (existingTenant) {
      await assertTenantNotBlocked(this.prisma, dto.propertyId, existingTenant.id);
    }

    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (endDate && endDate <= startDate) {
      throw new BadRequestException('La date de fin doit être postérieure à la date de début');
    }
    const scheduleEndDate = endDate ?? addMonths(startDate, ROLLING_WINDOW_MONTHS);

    // Absent du DTO → reprend le loyer/charges actuels du bien, figés sur ce
    // bail au moment de la création (voir /architect : ne suit jamais un
    // changement ultérieur du prix affiché sur le bien).
    const effectiveMonthlyRent = dto.monthlyRent ?? property.monthlyRent;
    const effectiveMonthlyCharges = dto.monthlyCharges ?? property.monthlyCharges;

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
            effectiveMonthlyRent,
            effectiveMonthlyCharges,
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
      // build-plan.md unité 09). Mot de passe placeholder jamais communiqué
      // ni utilisable (voir TIMING_SAFE_DUMMY_HASH pour le même principe) —
      // remplacé par un vrai hash dès completeTenantSignup().
      const placeholderPasswordHash = await this.tokens.hashPassword(
        randomBytes(32).toString('hex'),
      );

      try {
        const result = await this.prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              passwordHash: placeholderPasswordHash,
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
            effectiveMonthlyRent,
            effectiveMonthlyCharges,
          );
          return { user: created, lease: createdLease };
        });
        user = result.user;
        lease = result.lease;
      } catch (dbError) {
        throw this.mapDuplicateError(dbError);
      }

      const secret = this.config.getOrThrow<string>('INVITATION_TOKEN_SECRET');
      const token = createInvitationToken(user.id, secret);
      invitationUrl = `${this.config.getOrThrow<string>('FRONTEND_URL')}/auth/activate?token=${token}`;
    }

    // Un seul email pour le nouveau locataire : infos du bail + lien d'activation
    // quand c'est une première invitation (invitationUrl != null). Pour un
    // locataire déjà connu (bail précédent), invitationUrl est null et le template
    // n'affiche pas de bouton "Créer mon compte".
    try {
      await this.notify.notifyUser({
        userId: user.id,
        event: 'lease-created',
        variables: {
          propertyAddress: property.address,
          ownerName: `${inviter.firstName} ${inviter.lastName}`,
          startDate: format(startDate, 'dd/MM/yyyy'),
          monthlyAmount: effectiveMonthlyRent + effectiveMonthlyCharges,
          ...(invitationUrl ? { invitationUrl } : {}),
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
    monthlyRent: number,
    monthlyCharges: number,
  ): Promise<Lease> {
    const lease = await tx.lease.create({
      data: {
        propertyId: property.id,
        ownerId: property.ownerId,
        tenantUserId,
        monthlyRent,
        monthlyCharges,
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
      monthlyRent,
      monthlyCharges,
    );
    if (entries.length > 0) {
      await tx.paymentScheduleEntry.createMany({ data: entries });
    }

    // Jamais via PropertiesService.update() — le passage à OCCUPIED est
    // exclusivement piloté par la création d'un bail, PATCH /properties le
    // refuse explicitement (voir assertValidTransition()).
    await tx.property.update({ where: { id: property.id }, data: { status: 'OCCUPIED' } });

    // Un bien OCCUPIED n'a plus lieu d'être annoncé publiquement (voir
    // /architect module Annonces, 2026-07-28) — même transaction, jamais un
    // bien loué visible sur la page publique même un court instant.
    await this.listings.deactivateForProperty(tx, property.id);

    return lease;
  }

  async completeTenantSignup(
    token: string | undefined,
    dto: SetTenantPasswordDto,
  ): Promise<{ userId: string }> {
    const secret = this.config.getOrThrow<string>('INVITATION_TOKEN_SECRET');
    const userId = verifyInvitationToken(token, secret);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'TENANT') {
      throw new BadRequestException("Lien d'invitation invalide");
    }

    const passwordHash = await this.tokens.hashPassword(dto.password);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

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
    const passwordHash = await this.tokens.hashPassword(params.password);
    // URL de connexion directe envoyée dans l'email de bienvenue — connexion
    // immédiate possible, pas de clic de confirmation requis (voir choix
    // assumé plus bas : fiabilité de la messagerie au Togo variable).
    const confirmationUrl = `${this.config.getOrThrow<string>('FRONTEND_URL')}/auth/login`;

    let user: User;
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            passwordHash,
            email: params.email,
            role: params.role,
            firstName: params.firstName,
            lastName: params.lastName,
            phone: params.phone,
            city: params.city,
          },
        });
        await params.createProfile(tx, created);
        // Abonnement créé systématiquement à l'inscription — jamais de cas
        // "pas d'abonnement" à gérer ailleurs (voir /architect unité 35).
        // Starter + bêta gratuite immédiate, pour OWNER et MANAGER.
        await tx.subscription.create({
          data: {
            userId: created.id,
            tier: 'STARTER',
            betaUntil: addMonths(new Date(), BETA_FREE_MONTHS),
          },
        });
        return created;
      });
    } catch (dbError) {
      throw this.mapDuplicateError(dbError);
    }

    return { user, confirmationUrl };
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
