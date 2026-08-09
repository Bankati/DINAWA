import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Subscription, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { SubscriptionsService } from './subscriptions.service';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import { QuotaStatus } from './subscriptions.types';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscription')
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('quota')
  @ApiOperation({
    summary: 'État actuel du quota de biens facturables vs limite du forfait courant',
  })
  getQuota(@CurrentUser() user: AuthenticatedUser): Promise<QuotaStatus> {
    return this.subscriptions.getQuotaStatus(user);
  }

  @Post('upgrade')
  @ApiOperation({
    summary: 'Migration instantanée vers un forfait supérieur, sans frais ni pénalité',
  })
  upgrade(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpgradeSubscriptionDto,
  ): Promise<Subscription> {
    return this.subscriptions.upgrade(user, dto);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Annulation — effective à la fin de la période payée' })
  cancel(@CurrentUser() user: AuthenticatedUser): Promise<Subscription> {
    return this.subscriptions.cancel(user);
  }
}
