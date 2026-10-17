import { Global, Module } from '@nestjs/common';
import { NotifyService } from './notify.service';
import { NotifyController } from './notify.controller';
import { WhatsappChannelModule } from '../whatsapp-channel/whatsapp-channel.module';

@Global()
@Module({
  // Canal WhatsApp (unité 46) : WhatsappService, seul module qui parle à Meta.
  imports: [WhatsappChannelModule],
  controllers: [NotifyController],
  providers: [NotifyService],
  exports: [NotifyService],
})
export class NotifyModule {}
