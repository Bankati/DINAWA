import { Module } from '@nestjs/common';
import { ListingsModule } from '../listings/listings.module';
import { LeasesController } from './leases.controller';
import { LeasesService } from './leases.service';

@Module({
  imports: [ListingsModule],
  controllers: [LeasesController],
  providers: [LeasesService],
})
export class LeasesModule {}
