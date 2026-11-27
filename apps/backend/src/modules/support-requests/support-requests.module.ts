import { Module } from '@nestjs/common';
import {
  AdminArtisanReviewsController,
  SupportRequestsController,
  TenantSupportRequestsController,
} from './support-requests.controller';
import { SupportRequestsService } from './support-requests.service';

// StorageService, NotifyService et PrismaService sont globaux.
@Module({
  controllers: [TenantSupportRequestsController, SupportRequestsController, AdminArtisanReviewsController],
  providers: [SupportRequestsService],
})
export class SupportRequestsModule {}
