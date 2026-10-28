import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { WhatsappAccessService } from './whatsapp-access.service';
import { WhatsappCloudClient } from './whatsapp-cloud.client';
import { WhatsappService } from './whatsapp.service';

// Canal WhatsApp (phase 12, unité 42) — seul module autorisé à parler à
// l'API Meta. Coupé du futur module du robot (whatsapp-bot, unité 47) pour
// éviter une dépendance circulaire : NotifyModule importera ce module pour
// envoyer, et le robot importera NotifyModule pour prévenir l'agence.
// WhatsappCloudClient n'est volontairement PAS exporté : tout envoi passe par
// WhatsappService, qui contrôle l'accès, trace et classe chaque tentative.
@Module({
  imports: [PrismaModule, PlatformSettingsModule],
  providers: [WhatsappCloudClient, WhatsappAccessService, WhatsappService],
  exports: [WhatsappService, WhatsappAccessService],
})
export class WhatsappChannelModule {}
