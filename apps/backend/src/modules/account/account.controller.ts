import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';

export type AccountStatusResponse = {
  accountStatus: AccountStatus;
  suspendedReason: string | null;
  unblockCondition: string | null;
};

@ApiTags('Account')
@ApiBearerAuth()
@Controller('account')
export class AccountController {
  @Get('status')
  @ApiOperation({ summary: 'Statut du compte courant — pour affichage du bandeau frontend' })
  getStatus(@CurrentUser() user: AuthenticatedUser): AccountStatusResponse {
    if (user.accountStatus === 'SUSPENDED_INACTIVITY') {
      return {
        accountStatus: user.accountStatus,
        suspendedReason:
          'Compte inactif depuis plus de 60 jours, sans bien enregistré ni mandat actif.',
        unblockCondition:
          user.role === 'MANAGER'
            ? 'Enregistrez un bien ou acceptez un mandat pour réactiver votre compte.'
            : 'Enregistrez un bien pour réactiver votre compte.',
      };
    }

    if (user.accountStatus === 'SUSPENDED_PAYMENT') {
      return {
        accountStatus: user.accountStatus,
        suspendedReason: 'Abonnement impayé.',
        unblockCondition: 'Régularisez votre abonnement pour réactiver votre compte.',
      };
    }

    return { accountStatus: user.accountStatus, suspendedReason: null, unblockCondition: null };
  }
}
