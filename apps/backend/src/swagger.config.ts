import { DocumentBuilder } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';

// Config Swagger partagée entre `main.ts` (montée sur /api/docs en dev) et
// `scripts/generate-openapi.ts` (génère openapi.json pour `types:sync`,
// jamais de duplication entre les deux usages).
export function buildSwaggerConfig(): Omit<OpenAPIObject, 'paths'> {
  return new DocumentBuilder()
    .setTitle('WARAH API')
    .setDescription('API de gestion locative WARAH — marché togolais')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addTag('Health', 'Sondes de disponibilité Railway')
    .addTag('Auth', 'Authentification Supabase')
    .addTag('Properties', 'Gestion des biens immobiliers')
    .addTag('Leases', 'Contrats de location')
    .addTag('Payments', 'Paiements mobile money')
    .addTag('Receipts', 'Génération de quittances')
    .addTag('Admin', 'Supervision des comptes (accès administrateur)')
    .addTag('Contact', 'Formulaire de contact public')
    .build();
}
