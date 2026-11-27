import { Module } from '@nestjs/common';
import { ArtisansController } from './artisans.controller';
import { ArtisanConsentController, PublicArtisansController } from './public-artisans.controller';
import { AdminArtisansController } from './admin-artisans.controller';
import { ArtisansService } from './artisans.service';

@Module({
  controllers: [ArtisansController, PublicArtisansController, ArtisanConsentController, AdminArtisansController],
  providers: [ArtisansService],
  exports: [ArtisansService],
})
export class ArtisansModule {}
