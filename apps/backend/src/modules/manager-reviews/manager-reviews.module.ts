import { Module } from '@nestjs/common';
import { ManagerReviewsController } from './manager-reviews.controller';
import { PublicManagersController } from './public-managers.controller';
import { ManagerReviewsService } from './manager-reviews.service';

@Module({
  controllers: [ManagerReviewsController, PublicManagersController],
  providers: [ManagerReviewsService],
  exports: [ManagerReviewsService],
})
export class ManagerReviewsModule {}
