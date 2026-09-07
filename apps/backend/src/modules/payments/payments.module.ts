import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaydunyaWebhookController } from './paydunya-webhook.controller';
import { PaymentsService } from './payments.service';
import { PaydunyaService } from './paydunya.service';
import { ReceiptsModule } from '../receipts/receipts.module';

@Module({
  imports: [ReceiptsModule],
  controllers: [PaymentsController, PaydunyaWebhookController],
  providers: [PaymentsService, PaydunyaService],
  exports: [PaymentsService, PaydunyaService],
})
export class PaymentsModule {}
