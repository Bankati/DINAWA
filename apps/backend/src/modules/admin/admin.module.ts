import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ManagerReviewsModule } from '../manager-reviews/manager-reviews.module';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';

@Module({
  imports: [PrismaModule, ManagerReviewsModule, PlatformSettingsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
