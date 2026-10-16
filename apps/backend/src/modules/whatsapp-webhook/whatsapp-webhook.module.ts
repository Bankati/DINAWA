import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WhatsappChannelModule } from '../whatsapp-channel/whatsapp-channel.module';
import { WhatsappConsentModule } from '../whatsapp-consent/whatsapp-consent.module';
import { WhatsappInboundProcessor } from './whatsapp-inbound.processor';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

// Réception des notifications Meta (unité 44) : messages des locataires et
// accusés de livraison. Le robot (unité 47) se branchera sur la liste de
// travail des messages reçus (WhatsappInboundProcessor).
@Module({
  imports: [PrismaModule, WhatsappChannelModule, WhatsappConsentModule],
  controllers: [WhatsappWebhookController],
  providers: [WhatsappWebhookService, WhatsappInboundProcessor],
  exports: [WhatsappInboundProcessor],
})
export class WhatsappWebhookModule {}
