import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountActivationService } from './account-activation.service';

@Module({
  controllers: [AccountController],
  providers: [AccountActivationService],
  exports: [AccountActivationService],
})
export class AccountModule {}
