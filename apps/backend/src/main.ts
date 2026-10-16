import './instrument';

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { forwardedForDiagnostic } from './common/middleware/forwarded-for-diagnostic';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import * as bodyParser from 'body-parser';
import { AppModule } from './app.module';
import { buildSwaggerConfig } from './swagger.config';
import { parseAllowedOrigins } from './common/utils/parse-allowed-origins';
import { MulterExceptionFilter } from './common/filters/multer-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false, // On gère le body parser manuellement pour contrôler les limites
  });

  // Adresse IP cliente derrière le proxy Railway (limites de débit, unité 43) :
  // nombre EXACT de proxys de confiance, jamais `true` — Express retient alors
  // l'adresse ajoutée par le dernier proxy de confiance, et un X-Forwarded-For
  // forgé par le client reste ignoré. 0 par défaut (local, sûr).
  const config = app.get(ConfigService);
  const trustProxyHops = config.get<number>('TRUST_PROXY_HOPS') ?? 0;
  if (trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
  }
  if (config.get<boolean>('TRUST_PROXY_DIAGNOSTIC') === true) {
    app.use(forwardedForDiagnostic(trustProxyHops));
  }

  // Graceful shutdown — gère le SIGTERM Railway proprement
  app.enableShutdownHooks();

  // Logger Pino (remplace le logger NestJS par défaut)
  app.useLogger(app.get(PinoLogger));

  // Headers de sécurité HTTP
  app.use(helmet());

  // Compression gzip — réduit les payloads JSON de ~70%
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call
  app.use(require('compression')());

  // Body parser avec limite à 1 MB (évite les attaques par payload volumineux)
  app.use(bodyParser.json({ limit: '1mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

  // Préfixe global /api — exclu pour les health checks (Railway sonde ces URLs directement)
  app.setGlobalPrefix('api', {
    exclude: ['health/live', 'health/ready'],
  });

  // Messages d'erreur Multer (taille/nombre de fichiers) traduits en
  // français — sans ça, un dépassement de limite remonte un message brut
  // en anglais directement au client (voir /architect messages d'erreur en
  // français, 2026-10-01).
  app.useGlobalFilters(new MulterExceptionFilter());

  // Validation globale des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS — maxAge fait mettre en cache la réponse au préflight OPTIONS côté
  // navigateur (24h) : sans lui, chaque appel API authentifié (Authorization
  // + Content-Type déclenchent tous deux un préflight) paie un aller-retour
  // réseau OPTIONS en plus de la vraie requête, à chaque fois. Trouvé en
  // diagnostiquant la lenteur ressentie en production (2026-08-13).
  const allowedOrigins = parseAllowedOrigins(process.env['ALLOWED_ORIGINS']);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86_400,
  });

  // Swagger — désactivé en production
  if (process.env['NODE_ENV'] !== 'production') {
    const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
    SwaggerModule.setup('api/docs', app, document);
    Logger.log('Swagger disponible sur /api/docs', 'Bootstrap');
  }

  const port = Number.parseInt(process.env['PORT'] ?? '3000', 10);
  await app.listen(port, '0.0.0.0');

  Logger.log(`Application démarrée sur le port ${port} (${process.env['NODE_ENV']})`, 'Bootstrap');
}

bootstrap().catch((err) => {
  console.error('Erreur fatale au démarrage:', err);
  process.exit(1);
});
