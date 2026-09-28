import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PayoutAccountsController } from './payout-accounts.controller';
import { PayoutAccountsService } from './payout-accounts.service';

@Module({
  imports: [AuthModule],
  controllers: [PayoutAccountsController],
  providers: [PayoutAccountsService],
})
export class PayoutAccountsModule {}
