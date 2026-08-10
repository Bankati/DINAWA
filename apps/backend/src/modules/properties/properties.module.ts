import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { ListingsModule } from '../listings/listings.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  imports: [AccountModule, ListingsModule, SubscriptionsModule],
  controllers: [PropertiesController],
  providers: [PropertiesService],
})
export class PropertiesModule {}
