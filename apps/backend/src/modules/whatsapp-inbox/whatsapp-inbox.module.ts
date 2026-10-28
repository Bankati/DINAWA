import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WhatsappChannelModule } from '../whatsapp-channel/whatsapp-channel.module';
import { WhatsappInboxController } from './whatsapp-inbox.controller';
import { WhatsappInboxService } from './whatsapp-inbox.service';
import { WhatsappThreadService } from './whatsapp-thread.service';

// Messagerie avec le responsable du bien (phase 12, unité 48). Exporte
// WhatsappThreadService pour le robot (WhatsappBotModule) ; NotifyModule est
// global. Ne dépend pas du robot : pas de dépendance circulaire.
@Module({
  imports: [PrismaModule, WhatsappChannelModule],
  controllers: [WhatsappInboxController],
  providers: [WhatsappInboxService, WhatsappThreadService],
  exports: [WhatsappThreadService],
})
export class WhatsappInboxModule {}
