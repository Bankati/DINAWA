import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ManagerReviewsModule } from '../manager-reviews/manager-reviews.module';

@Module({
  imports: [PrismaModule, ManagerReviewsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
