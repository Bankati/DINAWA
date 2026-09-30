import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { PaydunyaModule } from '../payments/paydunya.module';

@Module({
  imports: [PlatformSettingsModule, PaydunyaModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
