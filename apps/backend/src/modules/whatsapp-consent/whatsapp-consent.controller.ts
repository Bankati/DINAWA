import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { THROTTLE_PROFILE_UPDATE } from '../../common/constants';
import { WhatsappConsentService, WhatsappStatusView } from './whatsapp-consent.service';
import {
  AgencyConsentRefusalDto,
  AgencyConsentRequestDto,
  TenantConsentDto,
  WhatsappPhoneDto,
} from './dto/whatsapp-consent.dto';

// Côté agence (unité 45) : propriétaire ou gestionnaire, contrôlés par
// canActOnProperty dans le service (bien du bail actif du locataire).
@ApiTags('WhatsApp')
@ApiBearerAuth()
@Controller('tenants/:tenantUserId')
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class TenantWhatsappController {
  constructor(private readonly consent: WhatsappConsentService) {}

  @Get('whatsapp')
  @ApiOperation({ summary: 'État WhatsApp du locataire (accord, numéro vérifié, code créé)' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('tenantUserId') tenantUserId: string): Promise<WhatsappStatusView> {
    return this.consent.getForAgency(user, tenantUserId);
  }

  @Patch('whatsapp-consent')
  @ApiOperation({
    summary: 'Déclare l’accord recueilli par l’agence (attestation)',
    description: 'Le canal passe « en attente » : seul le locataire l’active (réponse « OUI », espace locataire).',
  })
  request(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenantUserId') tenantUserId: string,
    @Body() dto: AgencyConsentRequestDto,
  ): Promise<WhatsappStatusView> {
    return this.consent.requestByAgency(user, tenantUserId, dto);
  }

  @Post('whatsapp-consent/refusal')
  @HttpCode(200)
  @ApiOperation({ summary: 'Note un refus ou un retrait exprimé par le locataire (seul lui pourra réactiver)' })
  refusal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenantUserId') tenantUserId: string,
    @Body() dto: AgencyConsentRefusalDto,
  ): Promise<WhatsappStatusView> {
    return this.consent.refusalByAgency(user, tenantUserId, dto);
  }

  @Patch('whatsapp-phone')
  @ApiOperation({ summary: 'Change le numéro WhatsApp (remet accord, vérification et code à zéro)' })
  changePhone(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenantUserId') tenantUserId: string,
    @Body() dto: WhatsappPhoneDto,
  ): Promise<WhatsappStatusView> {
    return this.consent.changePhoneByAgency(user, tenantUserId, dto.whatsappPhone);
  }

  @Post('whatsapp-pin/reset')
  @HttpCode(200)
  @ApiOperation({ summary: 'Réinitialise le code locataire sans le voir' })
  resetPin(@CurrentUser() user: AuthenticatedUser, @Param('tenantUserId') tenantUserId: string): Promise<WhatsappStatusView> {
    return this.consent.resetPinByAgency(user, tenantUserId);
  }
}

// Espace locataire (unité 45) : agit toujours sur le compte connecté.
@ApiTags('WhatsApp')
@ApiBearerAuth()
@Controller('me')
@Roles(UserRole.TENANT)
export class MyWhatsappController {
  constructor(private readonly consent: WhatsappConsentService) {}

  @Get('whatsapp')
  @ApiOperation({ summary: 'Mon état WhatsApp' })
  get(@CurrentUser() user: AuthenticatedUser): Promise<WhatsappStatusView> {
    return this.consent.getForTenant(user);
  }

  @Patch('whatsapp-consent')
  @ApiOperation({ summary: 'Active ou arrête les messages WhatsApp de service' })
  setConsent(@CurrentUser() user: AuthenticatedUser, @Body() dto: TenantConsentDto): Promise<WhatsappStatusView> {
    return this.consent.setConsentByTenant(user, dto);
  }

  @Patch('whatsapp-phone')
  @ApiOperation({ summary: 'Change mon numéro WhatsApp' })
  changePhone(@CurrentUser() user: AuthenticatedUser, @Body() dto: WhatsappPhoneDto): Promise<WhatsappStatusView> {
    return this.consent.changePhoneByTenant(user, dto.whatsappPhone);
  }

  // Code affiché UNE seule fois. Limité : chaque appel coûte un hachage
  // bcrypt, et rien ne justifie d'en générer des dizaines par heure.
  @Post('whatsapp-pin')
  @HttpCode(201)
  @Throttle(THROTTLE_PROFILE_UPDATE)
  @ApiOperation({ summary: 'Génère mon code WhatsApp (affiché une seule fois)' })
  generatePin(@CurrentUser() user: AuthenticatedUser): Promise<{ pin: string }> {
    return this.consent.generatePinForTenant(user);
  }
}
