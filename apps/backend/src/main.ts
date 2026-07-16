import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import * as bodyParser from 'body-parser';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // Sentry doit être initialisé avant tout — ne s'active que si SENTRY_DSN est présent
  if (process.env['SENTRY_DSN']) {
    Sentry.init({
      dsn: process.env['SENTRY_DSN'],
      environment: process.env['NODE_ENV'] ?? 'development',
      tracesSampleRate: 0.1,
      integrations: [Sentry.httpIntegration(), Sentry.expressIntegration()],
    });
  }

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false, // On gère le body parser manuellement pour contrôler les limites
  });

  // Graceful shutdown — gère le SIGTERM Railway proprement
  app.enableShutdownHooks();

  // Logger Pino (remplace le logger NestJS par défaut)
  app.useLogger(app.get(PinoLogger));

  // Headers de sécurité HTTP
  app.use(helmet());

  // Body parser avec limite à 1 MB (évite les attaques par payload volumineux)
  app.use(bodyParser.json({ limit: '1mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

  // Préfixe global /api — exclu pour les health checks (Railway sonde ces URLs directement)
  app.setGlobalPrefix('api', {
    exclude: ['health/live', 'health/ready'],
  });

  // Validation globale des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS
  const allowedOrigins = process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:4200'];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Swagger — désactivé en production
  if (process.env['NODE_ENV'] !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('WARAH API')
      .setDescription('API de gestion locative WARAH — marché togolais')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .addTag('Health', 'Sondes de disponibilité Railway')
      .addTag('Auth', 'Authentification Supabase')
      .addTag('Identity', 'Vérification automatique de la CNI togolaise')
      .addTag('Properties', 'Gestion des biens immobiliers')
      .addTag('Leases', 'Contrats de location')
      .addTag('Payments', 'Paiements mobile money')
      .addTag('Receipts', 'Génération de quittances')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    Logger.log('Swagger disponible sur /api/docs', 'Bootstrap');
  }

  const port = parseInt(process.env['PORT'] ?? '3000', 10);
  await app.listen(port, '0.0.0.0');

  Logger.log(`Application démarrée sur le port ${port} (${process.env['NODE_ENV']})`, 'Bootstrap');
}

bootstrap().catch((err) => {
  console.error('Erreur fatale au démarrage:', err);
  process.exit(1);
});
