import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import { APP_GUARD } from '@nestjs/core';
import { validate } from './config/env.validation';
import { pinoConfig } from './config/logger.config';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './modules/supabase/supabase.module';
import { StorageModule } from './modules/storage/storage.module';
import { EmailModule } from './modules/email/email.module';
import { PushModule } from './modules/push/push.module';
import { NotifyModule } from './modules/notify/notify.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { IdentityModule } from './modules/identity/identity.module';
import { ProfileModule } from './modules/profile/profile.module';
import { AccountModule } from './modules/account/account.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { LeasesModule } from './modules/leases/leases.module';
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    // Validation des variables d'environnement au démarrage — crash immédiat si invalide
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),

    // Logging structuré avec redaction des champs sensibles
    LoggerModule.forRoot(pinoConfig),

    // Rate limiting global (sauf routes décorées @SkipThrottle)
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),

    // Cron jobs (fuseau Africa/Lomé = UTC+0, pas de DST)
    ScheduleModule.forRoot(),

    // Événements internes découplés
    EventEmitterModule.forRoot({ wildcard: false }),

    // Prisma disponible globalement via @Global()
    PrismaModule,

    // Client Supabase Admin disponible globalement via @Global()
    SupabaseModule,

    // Wrapper Supabase Storage disponible globalement via @Global()
    StorageModule,

    // EmailService (Resend) disponible globalement via @Global()
    EmailModule,

    // WebPushService + endpoints /api/push/* disponibles globalement via @Global()
    PushModule,

    // NotifyService.notifyUser() — point d'entrée unique notifications, disponible globalement
    NotifyModule,

    // Health checks Railway
    HealthModule,

    // Authentification et profil courant
    AuthModule,

    // Vérification automatique CNI togolaise (OCR Tesseract.js)
    IdentityModule,

    // Gestion du profil (infos personnelles, photo, préférences, anonymisation)
    ProfileModule,

    // Statut de compte + réactivation (voir build-plan.md unité 11)
    AccountModule,

    // Cron d'inactivité — suspension/réactivation automatique
    SchedulingModule,

    // CRUD biens immobiliers (voir build-plan.md unité 12)
    PropertiesModule,

    // Blocage locataire par bien + historiques baux (voir build-plan.md unité 14)
    TenantsModule,

    // Création/résiliation des baux, génération du calendrier d'échéances (voir build-plan.md unité 15)
    LeasesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Authentifie chaque requête (sauf @Public()) et injecte request.user
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    // Vérifie @Roles(...) après authentification
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
