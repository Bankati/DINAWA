import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { MAX_PHOTO_BYTES } from '../../common/constants';
import { IdentityVerificationFiles } from '../identity/identity.service';
import {
  AuthService,
  AuthMeResponse,
  SignupOwnerResponse,
  SignupManagerResponse,
  InviteTenantResponse,
  LoginResponse,
} from './auth.service';
import { SignupOwnerDto } from './dto/signup-owner.dto';
import { SignupManagerDto } from './dto/signup-manager.dto';
import { InviteTenantDto } from './dto/invite-tenant.dto';
import { SetTenantPasswordDto } from './dto/set-tenant-password.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';

const CNI_FILE_FIELDS = [
  { name: 'image', maxCount: 1 },
  { name: 'imageBack', maxCount: 1 },
];

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup/owner')
  @Public()
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Inscription propriétaire',
    description:
      "Crée le compte Supabase Auth et le profil propriétaire, envoie l'email de confirmation " +
      "WARAH. La pièce d'identité (recto `image` + verso `imageBack`) est facultative à ce " +
      'stade — si fournie, la vérification CNI démarre immédiatement ; sinon elle peut être ' +
      'soumise plus tard via POST /api/identity/verify. Le compte peut se connecter dès que ' +
      "l'email est confirmé, mais la création de bien reste bloquée tant que idVerificationStatus " +
      "n'est pas VERIFIED (voir POST /api/properties).",
  })
  @UseInterceptors(
    FileFieldsInterceptor(CNI_FILE_FIELDS, { limits: { fileSize: MAX_PHOTO_BYTES } }),
  )
  async signupOwner(
    @Body() dto: SignupOwnerDto,
    @UploadedFiles() files: IdentityVerificationFiles = {},
  ): Promise<SignupOwnerResponse> {
    return this.authService.signupOwner(dto, files);
  }

  @Post('signup/manager')
  @Public()
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Inscription gestionnaire',
    description:
      "Même mécanique que l'inscription propriétaire (CNI facultative à l'inscription, " +
      'création de bien bloquée tant que non VERIFIED).',
  })
  @UseInterceptors(
    FileFieldsInterceptor(CNI_FILE_FIELDS, { limits: { fileSize: MAX_PHOTO_BYTES } }),
  )
  async signupManager(
    @Body() dto: SignupManagerDto,
    @UploadedFiles() files: IdentityVerificationFiles = {},
  ): Promise<SignupManagerResponse> {
    return this.authService.signupManager(dto, files);
  }

  @Post('invite/tenant')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Invite un locataire sur un bien',
    description:
      'Réservé au propriétaire du bien ou au gestionnaire mandaté (canActOnProperty). Crée ' +
      "immédiatement le compte locataire (email confirmé d'office) et envoie le lien " +
      "d'activation par email — le locataire n'aura plus qu'à poser un mot de passe.",
  })
  async inviteTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteTenantDto,
  ): Promise<InviteTenantResponse> {
    return this.authService.inviteTenant(user, dto);
  }

  @Post('signup/tenant')
  @Public()
  @ApiOperation({
    summary: "Active le compte locataire créé par l'invitation",
    description:
      'Vérifie le token signé reçu par email (paramètre `token`, expire après 7 jours) et pose ' +
      'le mot de passe du compte déjà créé — aucun autre champ à fournir.',
  })
  async signupTenant(
    @Query('token') token: string | undefined,
    @Body() dto: SetTenantPasswordDto,
  ): Promise<{ userId: string }> {
    return this.authService.completeTenantSignup(token, dto);
  }

  @Post('login')
  @Public()
  @ApiOperation({
    summary: 'Connexion par email et mot de passe',
    description:
      'Route la connexion via NestJS (plutôt que directement Supabase côté client) pour ' +
      'appliquer le blocage de 15 minutes après 5 tentatives échouées. Renvoie une session ' +
      'Supabase valide en cas de succès.',
  })
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  @Post('password-reset/request')
  @Public()
  @ApiOperation({
    summary: 'Demande un code de réinitialisation de mot de passe',
    description:
      'Envoie un code à 6 chiffres par email (expire après 10 minutes, usage unique). Toute ' +
      "nouvelle demande invalide les codes précédents. Réponse toujours générique, qu'un " +
      'compte existe ou non pour cet email.',
  })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto): Promise<{ message: string }> {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password-reset/confirm')
  @Public()
  @ApiOperation({ summary: 'Confirme la réinitialisation avec le code reçu par email' })
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto): Promise<{ message: string }> {
    return this.authService.confirmPasswordReset(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Profil de l'utilisateur courant",
    description:
      "Renvoie l'utilisateur courant avec son profil de rôle (Owner/Tenant/Manager/Admin), son statut de compte et ses préférences de notification.",
  })
  me(@CurrentUser() user: AuthenticatedUser): Promise<AuthMeResponse> {
    return this.authService.getMe(user);
  }
}
