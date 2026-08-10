/**
 * Génère openapi.json à partir des décorateurs Swagger réels du backend —
 * utilisé par `npm run types:sync` (racine) pour produire les types
 * frontend correspondants (voir apps/frontend/src/lib/api-types.generated.ts).
 * N'écrit un schéma de réponse fiable que pour les endpoints décorés avec
 * @ApiOkResponse (la plupart n'en ont pas encore — voir contexte/progress-tracker.md,
 * "types partagés" n'est démontré que sur GET /mandates pour l'instant).
 *
 * Usage : npm run swagger:generate
 */
import 'reflect-metadata';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { buildSwaggerConfig } from '../src/swagger.config';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  const outPath = join(__dirname, '..', 'openapi.json');
  writeFileSync(outPath, JSON.stringify(document, null, 2));
  console.log(`openapi.json généré (${outPath})`);
  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Échec de la génération openapi.json :', err);
  process.exit(1);
});
