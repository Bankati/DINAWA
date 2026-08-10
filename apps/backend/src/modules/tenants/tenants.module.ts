import { Module } from '@nestjs/common';
import { PropertyTenantsController } from './property-tenants.controller';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  controllers: [PropertyTenantsController, TenantsController],
  providers: [TenantsService],
})
export class TenantsModule {}
