import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PayoutAccount, UserRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { THROTTLE_PAYOUT_ACCOUNT } from '../../common/constants';
import { PayoutAccountsService } from './payout-accounts.service';
import { UpsertPayoutAccountDto } from './dto/upsert-payout-account.dto';

@ApiTags('Payout account')
@ApiBearerAuth()
@Roles(UserRole.OWNER, UserRole.MANAGER)
@Controller('payout-account')
export class PayoutAccountsController {
  constructor(private readonly payoutAccounts: PayoutAccountsService) {}

  @Get()
  @ApiOperation({
    summary: 'Numéro mobile money de réception des loyers (null tant que non renseigné)',
  })
  get(@CurrentUser() user: AuthenticatedUser): Promise<PayoutAccount | null> {
    return this.payoutAccounts.get(user);
  }

  @Put()
  @Throttle(THROTTLE_PAYOUT_ACCOUNT)
  @ApiOperation({
    summary: 'Enregistre ou modifie le numéro de réception des loyers',
    description:
      "Exige le mot de passe du compte. Envoie un email d'alerte et conserve un historique " +
      'des changements. Sans ce numéro, les locataires ne peuvent pas payer en ligne.',
  })
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertPayoutAccountDto,
  ): Promise<PayoutAccount> {
    return this.payoutAccounts.upsert(user, dto);
  }
}
