import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { PayLinksController } from './pay-links.controller';
import { PayLinksService } from './pay-links.service';

// Lien de paiement public (phase 12, unité 43). PayLinksService est exporté
// pour les rappels (unité 46) et le robot WhatsApp (unité 47).
@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [PayLinksController],
  providers: [PayLinksService],
  exports: [PayLinksService],
})
export class PayLinksModule {}
