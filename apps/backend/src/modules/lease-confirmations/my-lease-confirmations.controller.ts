import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiGoneResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { LeaseConfirmationsService, TenantLeaseConfirmationView } from './lease-confirmations.service';
import {
  AcceptLeaseConfirmationResponseDto,
  LeaseConfirmationErrorDto,
  RefuseLeaseConfirmationResponseDto,
  TenantLeaseConfirmationDto,
} from './dto/lease-confirmation-response.dto';

// Côté locataire connecté (contrat d'API du 09/11/2026). Le locataire ne
// voit et ne répond qu'à SES demandes : une autre demande répond 404.
@ApiTags('Lease confirmations')
@ApiBearerAuth()
@Controller('me/lease-confirmations')
@Roles(UserRole.TENANT)
export class MyLeaseConfirmationsController {
  constructor(private readonly confirmations: LeaseConfirmationsService) {}

  @Get()
  @ApiOperation({ summary: 'Mes demandes de confirmation en attente' })
  @ApiOkResponse({ type: [TenantLeaseConfirmationDto] })
  list(@CurrentUser() user: AuthenticatedUser): Promise<TenantLeaseConfirmationView[]> {
    return this.confirmations.listForTenant(user);
  }

  @Post(':id/accept')
  @HttpCode(200)
  @ApiOperation({
    summary: '« Oui, c’est mon logement »',
    description:
      'Idempotent. 409 ACTIVE_LEASE_EXISTS si un bail actif existe ailleurs (il n’est jamais terminé ' +
      'automatiquement), 410 CONFIRMATION_EXPIRED si la demande a expiré, 409 CONFIRMATION_CLOSED sinon.',
  })
  @ApiOkResponse({ type: AcceptLeaseConfirmationResponseDto })
  @ApiConflictResponse({ type: LeaseConfirmationErrorDto })
  @ApiGoneResponse({ type: LeaseConfirmationErrorDto })
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ status: 'ACCEPTED'; leaseId: string }> {
    return this.confirmations.accept(user, id);
  }

  @Post(':id/refuse')
  @HttpCode(200)
  @ApiOperation({ summary: '« Ce n’est pas moi »', description: 'Idempotent. Rien n’est ajouté au compte.' })
  @ApiOkResponse({ type: RefuseLeaseConfirmationResponseDto })
  @ApiConflictResponse({ type: LeaseConfirmationErrorDto })
  @ApiGoneResponse({ type: LeaseConfirmationErrorDto })
  refuse(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<{ status: 'REFUSED' }> {
    return this.confirmations.refuse(user, id);
  }
}
