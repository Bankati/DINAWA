import { Module } from '@nestjs/common';
import { PaymentDeclarationsController } from './payment-declarations.controller';
import { PaymentDeclarationsService } from './payment-declarations.service';
import { PaymentDeclarationRemindersTask } from './payment-declaration-reminders.task';

@Module({
  controllers: [PaymentDeclarationsController],
  providers: [PaymentDeclarationsService, PaymentDeclarationRemindersTask],
})
export class PaymentDeclarationsModule {}
