import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ListingsModule } from '../listings/listings.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

@Module({
  // register({}) sans secret module-wide — TokenService passe le secret
  // explicitement à chaque sign()/verify() (voir token.service.ts).
  imports: [ListingsModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, TokenService],
  // TokenService exporté pour JwtAuthGuard (common/guards/), enregistré
  // globalement au niveau AppModule — même schéma que SupabaseAdminService
  // auparavant.
  exports: [AuthService, TokenService],
})
export class AuthModule {}
