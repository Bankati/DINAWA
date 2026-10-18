import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WhatsappChannelModule } from '../whatsapp-channel/whatsapp-channel.module';
import { PayLinksModule } from '../pay-links/pay-links.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { AuthModule } from '../auth/auth.module';
import { BotIdentityService } from './bot-identity.service';
import { WhatsappBotService } from './whatsapp-bot.service';

// Robot à menu WhatsApp (phase 12, unité 47). Appelé par la liste de travail
// des messages reçus (WhatsappInboundProcessor, module whatsapp-webhook) —
// ce module ne dépend pas du webhook, pas de dépendance circulaire.
@Module({
  imports: [PrismaModule, WhatsappChannelModule, PayLinksModule, ReceiptsModule, AuthModule],
  providers: [WhatsappBotService, BotIdentityService],
  exports: [WhatsappBotService],
})
export class WhatsappBotModule {}
