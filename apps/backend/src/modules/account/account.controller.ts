import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AccountActivationService, AccountStatusResponse } from './account-activation.service';

export type { AccountStatusResponse } from './account-activation.service';

@ApiTags('Account')
@ApiBearerAuth()
@Controller('account')
export class AccountController {
  constructor(private readonly accountActivation: AccountActivationService) {}

  @Get('status')
  @ApiOperation({ summary: 'Statut du compte courant — pour affichage du bandeau frontend' })
  getStatus(@CurrentUser() user: AuthenticatedUser): AccountStatusResponse {
    return this.accountActivation.resolveStatus(user);
  }
}
