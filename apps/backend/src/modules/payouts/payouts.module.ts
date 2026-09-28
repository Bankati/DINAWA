import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { PayoutConfirmedListener } from './payout-confirmed.listener';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';
import { PayoutsWebhookController } from './payouts-webhook.controller';

@Module({
  // PaymentsModule exporte PaydunyaService (client API PayDunya partagé).
  imports: [PaymentsModule],
  controllers: [PayoutsController, PayoutsWebhookController],
  providers: [PayoutsService, PayoutConfirmedListener],
  exports: [PayoutsService],
})
export class PayoutsModule {}
