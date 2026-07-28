import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { ListingsModule } from '../listings/listings.module';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  imports: [AccountModule, ListingsModule],
  controllers: [PropertiesController],
  providers: [PropertiesService],
})
export class PropertiesModule {}
