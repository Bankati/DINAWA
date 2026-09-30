import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaydunyaWebhookController } from './paydunya-webhook.controller';
import { PaymentsService } from './payments.service';
import { PaydunyaModule } from './paydunya.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  // SubscriptionsModule : le webhook PayDunya (PaydunyaWebhookController, ce
  // module) route aussi vers SubscriptionsService pour les factures
  // d'abonnement (voir /architect abonnements, 2026-09-30) — sens unique,
  // SubscriptionsModule n'importe jamais PaymentsModule en retour.
  imports: [ReceiptsModule, PaydunyaModule, SubscriptionsModule],
  controllers: [PaymentsController, PaydunyaWebhookController],
  providers: [PaymentsService],
  exports: [PaymentsService, PaydunyaModule],
})
export class PaymentsModule {}
