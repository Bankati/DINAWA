import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MyWhatsappController, TenantWhatsappController } from './whatsapp-consent.controller';
import { WhatsappConsentService } from './whatsapp-consent.service';

// Consentement WhatsApp, numéro et code locataire (phase 12, unité 45).
// Dépend de Prisma et de TokenService (code locataire) : le webhook (unité 44) et le profil
// (anonymisation) utilisent applyConsentCommand sans dépendance circulaire.
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TenantWhatsappController, MyWhatsappController],
  providers: [WhatsappConsentService],
  exports: [WhatsappConsentService],
})
export class WhatsappConsentModule {}
