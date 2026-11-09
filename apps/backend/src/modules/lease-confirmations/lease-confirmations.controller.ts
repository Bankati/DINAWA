import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { InviteTenantResponse } from '../auth/auth.service';
import { InviteTenantResponseDto } from '../auth/dto/invite-tenant-response.dto';
import { InviterLeaseConfirmationView, LeaseConfirmationsService } from './lease-confirmations.service';
import { ResendLeaseConfirmationDto } from './dto/resend-lease-confirmation.dto';
import {
  CancelLeaseConfirmationResponseDto,
  InviterLeaseConfirmationDto,
  LeaseConfirmationErrorDto,
} from './dto/lease-confirmation-response.dto';

// Côté propriétaire ou gestionnaire (contrat d'API du 09/11/2026). Les
// droits sur chaque demande sont décidés par canActOnProperty() sur son bien.
@ApiTags('Lease confirmations')
@ApiBearerAuth()
@Controller('lease-confirmations')
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class LeaseConfirmationsController {
  constructor(private readonly confirmations: LeaseConfirmationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Mes demandes de confirmation de bail',
    description:
      "Demandes faites par l'appelant, ou sur ses biens (propriétaire, ou gestionnaire avec un mandat ACTIVE). " +
      'Le nom affiché est toujours celui tapé à l’invitation.',
  })
  @ApiOkResponse({ type: [InviterLeaseConfirmationDto] })
  list(@CurrentUser() user: AuthenticatedUser): Promise<InviterLeaseConfirmationView[]> {
    return this.confirmations.listForInviter(user);
  }

  @Post(':id/resend')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Renvoie une demande refusée ou expirée',
    description:
      'Corps facultatif pour corriger le numéro ou l’email. Si le contact ne correspond à aucun compte activé, ' +
      "c'est une invitation classique (bail actif tout de suite). Réponse identique à POST /auth/invite/tenant.",
  })
  @ApiCreatedResponse({ type: InviteTenantResponseDto })
  @ApiConflictResponse({ type: LeaseConfirmationErrorDto })
  resend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ResendLeaseConfirmationDto,
  ): Promise<InviteTenantResponse> {
    return this.confirmations.resend(user, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Annule une demande en attente (le bien et l’annonce sont rétablis)' })
  @ApiOkResponse({ type: CancelLeaseConfirmationResponseDto })
  @ApiConflictResponse({ type: LeaseConfirmationErrorDto })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<{ status: 'CANCELLED' }> {
    return this.confirmations.cancel(user, id);
  }
}
