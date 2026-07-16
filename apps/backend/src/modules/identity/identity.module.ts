import { Module } from '@nestjs/common';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { IdentityVerificationService } from './identity-verification.service';
import { IdentityVerificationListener } from './identity-verification.listener';

@Module({
  controllers: [IdentityController],
  providers: [IdentityService, IdentityVerificationService, IdentityVerificationListener],
  exports: [IdentityService],
})
export class IdentityModule {}
