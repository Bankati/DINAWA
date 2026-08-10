import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { MandatesController } from './mandates.controller';
import { ManagerController } from './manager.controller';
import { ManagersController } from './managers.controller';
import { MandatesService } from './mandates.service';

@Module({
  imports: [AccountModule],
  controllers: [MandatesController, ManagerController, ManagersController],
  providers: [MandatesService],
})
export class MandatesModule {}
