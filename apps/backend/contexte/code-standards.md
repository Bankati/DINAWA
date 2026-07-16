# Code Standards — WARAH Backend

Règles d'implémentation et conventions pour l'ensemble du backend WARAH. L'agent IA doit les suivre dans chaque session sans exception. Ces règles évitent la dérive des patterns entre les sessions et garantissent qu'un module construit en semaine 1 ressemble exactement à un module construit en semaine 4.

---

## Mentalité d'Ingénierie

L'agent IA sur ce projet opère comme un ingénieur senior. Cela signifie :

- **Réfléchir avant d'implémenter** — comprendre ce qui est construit et pourquoi avant d'écrire une seule ligne
- **Lire le contexte d'abord** — ne jamais supposer, toujours vérifier par rapport à `architecture.md`, `build-plan.md` et au cahier des charges
- **Le périmètre est sacré** — ne construire que ce que l'unité du `build-plan` en cours exige. Ne jamais dépasser le périmètre même si cela semble utile
- **Chaque endpoint doit être testable** — si l'endpoint ne peut pas être vérifié immédiatement via Swagger ou Postman après implémentation, il est incomplet
- **Propre plutôt qu'astucieux** — un code simple et lisible qu'un développeur junior peut comprendre est toujours préféré à une abstraction clever
- **Une unité à la fois** — terminer complètement une unité du `build-plan` avant de toucher à la suivante
- **Les échecs sont attendus** — encapsuler les opérations sensibles (DB, Storage, Cashpay, emails, push, OCR) dans des try/catch, logger les échecs, ne jamais laisser un échec faire planter tout le reste

---

## TypeScript

- Mode strict activé dans `tsconfig.json` — aucune exception
- Ne jamais utiliser `any` — utiliser `unknown` et affiner le type
- Ne jamais utiliser d'assertions de type (`as SomeType`) sauf absolue nécessité, et commenter pourquoi
- Tous les paramètres de fonction et types de retour doivent être explicitement typés
- Utiliser `type` pour les formes d'objets et unions — `interface` uniquement pour ce qui doit être étendu (rare en backend)
- Toutes les fonctions async doivent avoir une gestion d'erreur propre — jamais de promesse non gérée
- Utiliser `const` par défaut — `let` uniquement si réassignation nécessaire
- Les enums Prisma générés sont la seule source de vérité pour les statuts et rôles — jamais redéfinir une union de chaînes en parallèle

---

## Conventions NestJS

- Toute fonctionnalité métier vit dans un **module** dédié (`src/modules/<feature>/`) — jamais de logique métier dans `app.module.ts`
- Chaque module a au minimum : un `*.module.ts`, un `*.controller.ts`, un `*.service.ts`, un dossier `dto/`
- Le **controller** ne contient aucune logique métier — il valide la requête, appelle le service, formate la réponse
- Le **service** contient la logique métier — il ne connaît rien d'HTTP (pas de `Request`, pas de `Response`, pas de codes de statut)
- Les **DTOs** définissent la forme des entrées et sorties HTTP — toujours validés par `class-validator` via le `ValidationPipe` global
- Les **guards** vivent dans `src/common/guards/` s'ils sont transverses, dans `src/modules/<feature>/guards/` s'ils sont spécifiques à un module
- Les **interceptors** transverses (logging, audit) vivent dans `src/common/interceptors/` et sont enregistrés globalement dans `app.module.ts`
- Aucune injection par chaîne de caractères (`@Inject('SOME_TOKEN')`) sauf nécessité — toujours injection par classe
- Toujours consulter la documentation NestJS et Prisma avant d'implémenter une fonctionnalité spécifique — les API peuvent différer des données d'entraînement

---

## Nommage des Fichiers et Dossiers

- Dossiers : kebab-case — `payment-declarations/`, `identity-verification/`, `monthly-reports/`
- Fichiers NestJS : kebab-case avec suffixe explicite — `properties.controller.ts`, `cashpay.service.ts`, `supabase-auth.guard.ts`, `audit-log.interceptor.ts`
- Fichiers DTO : kebab-case avec suffixe `.dto.ts` — `create-property.dto.ts`, `update-lease.dto.ts`
- Fichiers de tâches planifiées : kebab-case avec suffixe `.task.ts` — `reminders.task.ts`, `overdue.task.ts`, `monthly-reports.task.ts`, `inactivity.task.ts`
- Fichiers de constantes : `constants.ts` (dans `src/common/`)
- Classes : PascalCase — `PropertiesController`, `CashpayService`, `CreatePropertyDto`
- Méthodes et variables : camelCase — `findActiveLeaseByTenant`, `generateReceiptPdf`
- Un seul controller, service, ou guard par fichier — jamais plusieurs classes exportées d'un même fichier
- Pas de barrel exports (`index.ts`) — toujours importer le fichier direct

---

## Structure d'un Module

Chaque module suit cette organisation exacte :

```
src/modules/properties/
├── properties.module.ts
├── properties.controller.ts
├── properties.service.ts
├── dto/
│   ├── create-property.dto.ts
│   ├── update-property.dto.ts
│   └── property-response.dto.ts
└── guards/                    # uniquement si guards spécifiques au module
    └── property-owner.guard.ts
```

- Le module enregistre uniquement son controller et son service (`providers`) et n'exporte que ce qui est réellement consommé par d'autres modules
- Le service est marqué `@Injectable()` et reçoit `PrismaService` (et autres dépendances) via le constructeur — jamais d'instanciation manuelle

---

## Controllers

```typescript
// src/modules/properties/properties.controller.ts

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '@/common/guards/supabase-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';

@ApiTags('properties')
@Controller('properties')
@UseGuards(SupabaseAuthGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePropertyDto) {
    return this.propertiesService.create(user, dto);
  }
}
```

- Chaque controller est annoté `@ApiTags(...)` pour apparaître dans Swagger
- Chaque endpoint sensible est protégé par `@UseGuards(SupabaseAuthGuard)` et `@Roles(...)` quand applicable
- L'utilisateur courant est récupéré via `@CurrentUser()` — jamais en lisant `request.user` directement
- Les DTOs d'entrée sont typés et validés (jamais `@Body() body: any`)
- Le controller ne fait pas de try/catch — les erreurs métier sont levées par le service via les exceptions HTTP de NestJS et capturées par le filtre global
- Pas de logique métier dans le controller, même une condition simple — tout passe par le service
- Body parser limité à 1 Mo pour les requêtes JSON dans `main.ts` (`app.use(json({ limit: '1mb' }))`). Les uploads de fichiers passent par un endpoint multipart dédié avec sa propre limite de taille déclarée
- Tout endpoint qui accepte un fichier valide le `Content-Type` et la taille **avant** de lire le body complet — jamais charger 50 Mo en mémoire pour rejeter ensuite

---

## Services

```typescript
// src/modules/properties/properties.service.ts

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { canActOnProperty } from '@/common/permissions/property-access';
import { CreatePropertyDto } from './dto/create-property.dto';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(user: AuthenticatedUser, propertyId: string) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Bien introuvable');

    const accessor = await canActOnProperty(this.prisma, user, property);
    if (!accessor.canRead) throw new ForbiddenException('Accès refusé');

    return property;
  }
}
```

- Chaque service est `@Injectable()` et reçoit ses dépendances via le constructeur
- Toute action sensible vérifie l'autorisation via `canActOnProperty()` ou `requireRole()` en première ligne — jamais une condition inline `if (user.role === ...)`
- Les exceptions levées sont les exceptions HTTP de NestJS (`NotFoundException`, `ForbiddenException`, `BadRequestException`, `ConflictException`) — jamais `throw new Error('...')` brut
- Les messages d'erreur sont en français et compréhensibles par l'utilisateur final
- Pas de manipulation de `Request` ou `Response` dans un service — c'est le rôle du controller

---

## DTOs et Validation

```typescript
// src/modules/properties/dto/create-property.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsPositive, IsString, MaxLength, Min } from 'class-validator';
import { PropertyType } from '@prisma/client';

export class CreatePropertyDto {
  @ApiProperty({ example: 'Adidogomé, Lomé' })
  @IsString()
  @MaxLength(200)
  address!: string;

  @ApiProperty({ enum: PropertyType })
  @IsEnum(PropertyType)
  type!: PropertyType;

  @ApiProperty({ example: 80 })
  @IsInt()
  @IsPositive()
  surfaceM2!: number;

  @ApiProperty({ example: 50_000 })
  @IsInt()
  @Min(1)
  monthlyRent!: number;
}
```

- Tous les DTOs utilisent `class-validator` pour la validation — jamais de validation manuelle dans le service ou le controller
- `ValidationPipe` est enregistré globalement dans `main.ts` avec `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`
- Les champs sont annotés `@ApiProperty(...)` pour Swagger
- Les enums viennent du client Prisma — jamais redéfinis dans le DTO
- Les montants en FCFA sont des `@IsInt()` — le FCFA n'a pas de centimes, pas de décimales

---

## Accès à la Base de Données — Prisma

```typescript
// src/prisma/prisma.service.ts

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- `PrismaService` est exposé dans un `PrismaModule` global — jamais d'instanciation `new PrismaClient()` ailleurs dans le code
- Toujours utiliser `select` ou `include` explicites pour éviter de remonter des colonnes inutiles
- Les opérations multi-tables qui doivent être atomiques passent par `this.prisma.$transaction(...)` — jamais d'enchaînement de mutations sans transaction quand l'intégrité est en jeu (création d'un bail qui modifie aussi le statut du bien, confirmation d'un paiement qui modifie aussi l'échéance, etc.)
- Toujours filtrer côté DB, jamais en mémoire après un `findMany()` non filtré
- Pas de requête SQL brute (`$queryRaw`) sauf cas spécifique documenté en commentaire
- Les migrations sont versionnées dans `prisma/migrations/` et générées via `npx prisma migrate dev` — jamais d'édition manuelle d'une migration générée
- **Pagination obligatoire sur tout `findMany`** — `take` explicite, plafond dur de 100 par page côté serveur. Un endpoint qui retourne une liste sans pagination est un bug à corriger immédiatement.
- **Interdiction des N+1** — jamais une boucle `for` sur un résultat `findMany()` qui déclenche une nouvelle requête Prisma à chaque itération. Toujours précharger via `include` ou `select` agrégé, ou faire une seconde requête `findMany` avec `where: { id: { in: ids } }`
- Pool de connexions Prisma configuré explicitement via le paramètre `?connection_limit=10` dans `DATABASE_URL`, à ajuster selon la capacité Railway et le nombre d'instances déployées
- **Concurrence** — quand deux requêtes peuvent muter le même enregistrement en parallèle (webhook Cashpay + déclaration locataire en attente, deux webhooks identiques, deux locataires invités simultanément sur le même bien vacant), s'appuyer sur une contrainte unique en DB (`transactionId` unique, partial unique index sur `(tenantId)` où `status = ACTIVE`) plutôt que sur une vérification applicative. En cas de besoin de lecture-puis-écriture cohérente, utiliser `prisma.$transaction([...], { isolationLevel: 'Serializable' })`

---

## Authentification — Supabase

```typescript
// src/common/guards/supabase-auth.guard.ts

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractBearerToken(request);
    if (!token) throw new UnauthorizedException('Token manquant');

    const { data, error } = await this.supabaseAdmin.auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException('Token invalide');

    const user = await this.prisma.user.findUnique({ where: { supabaseId: data.user.id } });
    if (!user) throw new UnauthorizedException('Utilisateur inconnu');

    request.user = user;
    return true;
  }
}
```

- Tout l'auth utilisateur passe par Supabase Auth — pas de hashage de mot de passe côté NestJS, pas de bcrypt, pas de table `password` locale
- Le `SupabaseAuthGuard` valide le JWT à chaque requête authentifiée, charge l'`User` côté Prisma, et injecte dans `request.user`
- Une session est ouverte directement après connexion email + mot de passe valides — pas de second facteur, pas d'OTP à la connexion
- L'OTP n'est utilisé que pour la réinitialisation de mot de passe (cas « mot de passe oublié ») — code à 6 chiffres, expiration 10 minutes, usage unique, toute nouvelle demande invalide les codes précédents
- Les emails d'authentification (confirmation d'inscription, réinitialisation de mot de passe) appellent directement `EmailService` — jamais via `NotifyService`, jamais soumis au consentement de notification push de l'utilisateur

---

## Contrôle d'Accès — Rôles et Mandats

Le système gère quatre rôles fixes : `OWNER`, `TENANT`, `MANAGER`, `ADMIN`. Un utilisateur ne peut avoir qu'un seul rôle à la fois.

Le rôle `MANAGER` inclut tous les droits du rôle `OWNER` sur les biens dont il est lui-même propriétaire, plus la capacité d'être mandataire des biens d'autres propriétaires via le modèle `Mandate`.

```typescript
// src/common/permissions/property-access.ts

export type PropertyAccessor = {
  canRead: boolean;
  canMutate: boolean; // créer bail, saisir paiement, publier annonce
  isOwner: boolean;
  isMandatedManager: boolean;
};

export async function canActOnProperty(
  prisma: PrismaService,
  user: AuthenticatedUser,
  property: Property,
): Promise<PropertyAccessor> {
  if (user.role === 'ADMIN') {
    return { canRead: true, canMutate: true, isOwner: false, isMandatedManager: false };
  }

  const activeMandate = await prisma.mandate.findFirst({
    where: { propertyId: property.id, status: 'ACTIVE' },
  });

  const isOwner = property.ownerId === user.id;
  const isMandatedManager = activeMandate?.managerId === user.id;

  if (isMandatedManager) {
    return { canRead: true, canMutate: true, isOwner: false, isMandatedManager: true };
  }
  if (isOwner) {
    // Mandat actif → propriétaire en lecture seule
    return { canRead: true, canMutate: !activeMandate, isOwner: true, isMandatedManager: false };
  }
  return { canRead: false, canMutate: false, isOwner: false, isMandatedManager: false };
}
```

- `canActOnProperty()` est **l'autorité unique** pour décider qui peut agir sur un bien — jamais une vérification inline `if (property.ownerId === user.id)` dans un service métier
- Quand un mandat est `ACTIVE`, le gestionnaire mandataire récupère tous les droits opérationnels et le propriétaire passe en lecture seule sur ce bien
- À la révocation du mandat, le propriétaire retrouve immédiatement tous les droits — la fonction reflète cet état en temps réel à chaque appel
- Un `TENANT` ne peut accéder qu'à son propre `Lease` actif et à ses propres `Payment` — toute requête sur un autre bien est rejetée par le service
- Aucune décision d'affichage côté frontend ne doit dupliquer cette logique — le backend est la seule source de vérité ; l'API renvoie ce que l'utilisateur a le droit de voir et rien d'autre

---

## Cron Jobs et Tâches Planifiées

```typescript
// src/modules/scheduling/reminders.task.ts

@Injectable()
export class RemindersTask {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sendDueReminders() {
    const entries = await this.prisma.paymentScheduleEntry.findMany({
      where: this.buildDueWindow(),
    });

    for (const entry of entries) {
      try {
        await this.notify.notifyUser({
          userId: entry.lease.tenantUserId,
          event: 'payment-reminder',
          variables: {/* ... */},
        });
        await this.prisma.paymentScheduleEntry.update({
          where: { id: entry.id },
          data: { reminderSentAt: new Date() },
        });
      } catch (error) {
        this.logger.error(`[reminders] entry=${entry.id}`, error);
      }
    }
  }
}
```

- Tous les crons utilisent `@nestjs/schedule` via le décorateur `@Cron(...)` — jamais de cron externe
- Toute logique de déclenchement (qui doit recevoir quoi, quand) est dans la base de données, pas dans l'expression cron — le cron tourne à fréquence fixe (généralement horaire) et la DB décide
- Chaque envoi à l'intérieur de la boucle est isolé dans son propre try/catch — un échec individuel ne fait jamais échouer le batch
- Anti-doublon obligatoire pour tout envoi notifiable : colonne `*SentAt` mise à jour après l'envoi, vérifiée à l'itération suivante
- Logique de fréquence respectée : un locataire en bail trimestriel ne reçoit aucun rappel les mois sans échéance — le rappel suit la `PaymentScheduleEntry`, pas le calendrier mensuel
- Les crons importants ont une expression centralisée dans `lib/constants.ts` — jamais de chaîne cron en dur dans le décorateur
- **Aucun cron ne fait du travail synchrone long** — au-delà de 30 secondes par itération, le job est découpé en lots paginés avec sauvegarde de l'état d'avancement entre les lots
- **Verrou applicatif** — si plusieurs instances NestJS tournent en parallèle, un même `@Cron` se déclenchera sur chacune. Pour les tâches dont la duplication est dangereuse (rapports mensuels, prélèvements abonnement, blocage d'inactivité), poser un verrou Postgres (`SELECT pg_try_advisory_lock(...)`) en première ligne du job et le relâcher en `finally`
- Toute itération à l'intérieur d'une boucle de cron passe par un try/catch isolé qui logge l'erreur du record fautif sans interrompre les suivants
- Un job qui démarre alors que le précédent n'a pas terminé est ignoré silencieusement — jamais deux exécutions concurrentes de la même tâche

---

## Constantes Métier

Les règles de gestion du cahier des charges sont encodées une seule fois comme constantes, jamais répétées en dur dans le code.

```typescript
// src/common/constants.ts

// Forfaits d'abonnement (FCFA / quota de biens gérés)
export const SUBSCRIPTION_TIERS = {
  STARTER: { priceFcfa: 2_000, managedPropertiesQuota: 5 },
  PRO: { priceFcfa: 5_000, managedPropertiesQuota: 15 },
  PREMIUM: { priceFcfa: 10_000, managedPropertiesQuota: null }, // illimité
} as const;

// Période bêta — 3 mois gratuits à l'inscription pendant la phase de lancement
export const BETA_FREE_MONTHS = 3;
// Réduction de lancement — 50 % sur Starter pendant 3 mois payants
export const STARTER_LAUNCH_DISCOUNT = 0.5;
export const STARTER_LAUNCH_DISCOUNT_MONTHS = 3;

// Blocage des comptes inactifs — 2 mois sans bien enregistré (ni mandat actif pour un gestionnaire)
export const INACTIVITY_BLOCK_DAYS = 60;
export const INACTIVITY_REMINDER_DAYS_BEFORE = [30, 7, 1];

// Rappels et alertes paiement (défauts utilisateur, surchargeables)
export const DEFAULT_REMINDER_DAYS_BEFORE = 5;
export const DEFAULT_OVERDUE_GRACE_DAYS = 3;

// OTP réinitialisation de mot de passe
export const OTP_LENGTH = 6;
export const OTP_EXPIRATION_MINUTES = 10;

// Invitations
export const TENANT_INVITATION_EXPIRATION_DAYS = 7;

// Annonces
export const LISTING_AUTO_SUSPEND_DAYS_WITHOUT_CONTACT = 90;
export const LISTING_CONTACT_RATE_LIMIT_PER_HOUR = 5;
export const LISTING_MAX_PHOTOS = 8;

// Biens
export const PROPERTY_MAX_PHOTOS = 10;
export const PROPERTY_MAX_DOCUMENTS = 20;

// Uploads
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 Mo
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 Mo

// Déclarations de paiement par le locataire — rappels au propriétaire/gestionnaire
export const PAYMENT_DECLARATION_REMINDER_DAYS = [3, 7];

// CNI — délai max de l'OCR avant de basculer en mode asynchrone
export const ID_VERIFICATION_TIMEOUT_SECONDS = 10;

// Cron expressions
export const CRON_REMINDERS = CronExpression.EVERY_HOUR;
export const CRON_OVERDUE = CronExpression.EVERY_HOUR;
export const CRON_INACTIVITY = '0 7 * * *';
export const CRON_MONTHLY_REPORTS = '0 8 1 * *';
export const CRON_SUBSCRIPTION_BILLING = '0 6 1 * *';
```

- Toute règle de gestion du cahier des charges qui se traduit en logique (seuils, verrous, quotas, durées) doit avoir sa constante ici avant d'être utilisée ailleurs
- Ne jamais comparer une chaîne de statut, de rôle, de source de paiement en dur dans un controller ou un service — toujours importer depuis le client Prisma généré ou depuis `src/common/constants.ts`
- Les valeurs FCFA n'ont jamais de décimales et sont toujours en `number` entier

---

## Paiements — Sources et Idempotence

Trois sources de paiement existent et leur traitement diffère.

| Source               | Initié par                                 | Statut initial                 | Confirmation manuelle possible ?    |
| -------------------- | ------------------------------------------ | ------------------------------ | ----------------------------------- |
| `CASHPAY_API`        | Le locataire (paiement T-Money / Flooz)    | `PENDING` → `PAID` par webhook | **Jamais**                          |
| `MANUAL_OWNER`       | Le propriétaire ou le gestionnaire mandaté | `PAID` directement             | Sans objet                          |
| `TENANT_DECLARATION` | Le locataire (déclaration cash / virement) | `PENDING_CONFIRMATION`         | Oui (par propriétaire/gestionnaire) |

- Un `Payment` avec `source = CASHPAY_API` ne peut **jamais** être re-confirmé ni rejeté manuellement — le webhook est la source de vérité unique. Les endpoints `confirm` et `reject` rejettent toute action sur un paiement de cette source avec une exception explicite.
- L'idempotence du webhook Cashpay est obligatoire : avant toute mutation, vérifier que `transactionId` n'a jamais été traité. Si déjà traité, répondre 200 immédiatement sans effet de bord.
- La signature HMAC du webhook est vérifiée **avant** tout traitement — un webhook non signé ou mal signé est rejeté avec un log de sécurité, jamais traité.
- Les événements asynchrones post-paiement (génération de quittance, notifications) passent par `EventEmitter2` et l'événement `payment.confirmed` — jamais d'appel direct au PDF ou à la notification depuis le webhook handler.

---

## Notifications — Routage Push / Email

- `NotifyService.notifyUser({ userId, event, variables })` est le **seul point d'entrée** pour notifier un utilisateur d'un événement métier — jamais d'appel direct à `EmailService.sendEmail()` ou `WebPushService.sendPush()` depuis un controller, un service métier ou un cron
- Le choix du canal est entièrement déterminé par `User.notificationConsent` et la présence d'une `PushSubscription` active — jamais une préférence supposée ou codée en dur
- Jamais d'envoi simultané sur les deux canaux pour le même événement
- Une `PushSubscription` qui retourne `410 Gone` à l'envoi est supprimée immédiatement, jamais réessayée
- **Exception** : les emails d'authentification (confirmation d'inscription, réinitialisation de mot de passe par OTP) appellent directement `EmailService` — ils doivent fonctionner même sans abonnement push préalable et ne sont jamais soumis au consentement push de l'utilisateur

---

## Génération de PDF à la Volée

```typescript
// src/modules/receipts/receipt-pdf.service.ts

@Injectable()
export class ReceiptPdfService {
  constructor(private readonly prisma: PrismaService) {}

  async streamReceipt(paymentId: string, res: Response) {
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { lease: { include: { property: true, tenant: true, owner: true } } },
    });

    const doc = new PDFDocument({ size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="quittance-${payment.id}.pdf"`);
    doc.pipe(res);

    // ... rendu du template fourni
    doc.end();
  }
}
```

- Quittances, rapports mensuels, factures d'abonnement, exports de paiements : **jamais stockés**. Toutes les données nécessaires sont déjà en base, donc générer à la volée et streamer directement.
- Aucun modèle Prisma `Receipt`, `MonthlyReport`, `Invoice` ne doit exister pour stocker un PDF.
- Aucun bucket Supabase Storage n'est utilisé pour les PDFs générés.
- Pour l'envoi par email avec PDF en pièce jointe, générer le PDF en mémoire (Buffer), attacher au mail via Resend, puis libérer la référence.
- Cible de performance pour une quittance simple : moins de 5 secondes.

---

## Stockage de Fichiers — Supabase Storage

Buckets utilisés et leur seul rôle :

| Bucket               | Contenu                                                       | Stocké ? |
| -------------------- | ------------------------------------------------------------- | -------- |
| `property-photos`    | Photos uploadées par le propriétaire/gestionnaire             | Oui      |
| `property-documents` | États des lieux, titres, contrats (uploads)                   | Oui      |
| `id-documents`       | Cartes nationales d'identité pour vérification OCR            | Oui      |
| `manager-documents`  | Références professionnelles des gestionnaires                 | Oui      |
| `payment-proofs`     | Photos justificatives uploadées par locataire ou propriétaire | Oui      |

- Toute URL servie au client est une **URL signée** avec expiration courte (15 minutes par défaut) — jamais d'URL publique
- Les uploads passent par `StorageService.upload(bucket, path, file)` — jamais d'appel direct au SDK Supabase Storage depuis un service métier
- Les images sont compressées via `sharp` à l'upload (max 1920px, qualité 80, format WebP) — jamais l'image brute uploadée par l'utilisateur
- Quand un enregistrement Prisma est supprimé, le fichier correspondant côté Storage est supprimé dans la même opération

---

## Gestion des Erreurs

- Jamais de bloc catch vide — toujours logger ou traiter
- Les services lèvent des exceptions HTTP NestJS typées (`NotFoundException`, `ForbiddenException`, `BadRequestException`, `ConflictException`, `UnauthorizedException`) — jamais `throw new Error('...')`
- Les messages d'exception sont en français et compréhensibles par l'utilisateur final (« Bien introuvable », « Vous n'avez pas accès à ce bien »)
- Un filtre global d'exceptions (`AllExceptionsFilter`) formate la réponse en `{ statusCode, message, error }` et logge toute erreur 500 avec son contexte
- Les erreurs liées aux jobs planifiés (rappels, alertes, rapports) sont loggées avec un préfixe `[module/tâche]` mais ne doivent **jamais** faire échouer le cron entier — chaque envoi est isolé dans son propre try/catch
- Les erreurs côté webhook Cashpay (hors signature invalide) sont loggées mais répondent 2xx — la réconciliation se fait via un cron séparé, pas en faisant échouer le webhook
- Les erreurs renvoyées au client n'exposent jamais la stack ni un message Prisma brut

---

## Variables d'Environnement

Toutes les variables sont définies dans `.env` en développement et dans les variables Railway en production. Jamais de clé, URL ou secret en dur dans le code.

| Variable                    | Utilisée dans                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`              | `prisma/schema.prisma`, `PrismaService`                                                                   |
| `DIRECT_URL`                | `prisma/schema.prisma` (migrations Supabase)                                                              |
| `SUPABASE_URL`              | `SupabaseAdminService`                                                                                    |
| `SUPABASE_ANON_KEY`         | référence côté client (non utilisée côté NestJS)                                                          |
| `SUPABASE_SERVICE_ROLE_KEY` | `SupabaseAdminService` (validation des JWT, admin Storage)                                                |
| `SUPABASE_JWT_SECRET`       | Optionnelle — non requise, `SupabaseAuthGuard` valide les JWT via l'API Admin Supabase (`auth.getUser()`) |
| `RESEND_API_KEY`            | `EmailService`                                                                                            |
| `RESEND_FROM_EMAIL`         | `EmailService` (adresse expéditrice)                                                                      |
| `CASHPAY_API_URL`           | `CashpayService`                                                                                          |
| `CASHPAY_API_KEY`           | `CashpayService` (auth requêtes sortantes)                                                                |
| `CASHPAY_WEBHOOK_SECRET`    | `CashpayWebhookController` (vérification HMAC)                                                            |
| `VAPID_PUBLIC_KEY`          | `WebPushService`                                                                                          |
| `VAPID_PRIVATE_KEY`         | `WebPushService`                                                                                          |
| `VAPID_SUBJECT`             | `WebPushService` (format `mailto:contact@warah...`)                                                       |
| `LOG_LEVEL`                 | `LoggerModule` (`info` en prod, `debug` en dev)                                                           |
| `SENTRY_DSN`                | `main.ts` (initialisation Sentry, vide en dev pour désactiver)                                            |
| `NODE_ENV`                  | configuration globale                                                                                     |
| `PORT`                      | `main.ts`                                                                                                 |

Toutes les valeurs sensibles restent strictement côté serveur. NestJS étant un backend pur, aucune variable ne doit être exposée au navigateur.

---

## Alias d'Import

Toujours utiliser l'alias `@/` configuré dans `tsconfig.json` — jamais d'import relatif remontant de plus d'un niveau.

```typescript
// Correct
import { PrismaService } from '@/prisma/prisma.service';
import { SupabaseAuthGuard } from '@/common/guards/supabase-auth.guard';
import { SUBSCRIPTION_TIERS } from '@/common/constants';

// Jamais
import { PrismaService } from '../../../prisma/prisma.service';
```

---

## Logging

- Logger structuré (Pino via `nestjs-pino`) configuré globalement
- Toutes les requêtes loggées avec un `correlationId` unique propagé dans les logs métier
- Niveaux : `error` pour ce qui requiert une action, `warn` pour ce qui est anormal mais récupérable, `info` pour les événements métier importants (paiement confirmé, mandat créé), `debug` réservé au développement
- Les logs n'incluent **jamais** : mots de passe (même hashés), JWT, secrets Cashpay, contenu des CNI, numéros de téléphone complets (masquage `*****` des 5 derniers chiffres)
- Les logs d'audit métier (qui font partie de la traçabilité légale) vont dans la table `AuditLog`, pas dans les logs applicatifs — les deux systèmes coexistent
- **Monitoring d'erreurs en production obligatoire** — intégration Sentry (ou équivalent comme Highlight, Honeybadger) configurée dans `main.ts` avec capture automatique des exceptions non gérées, des promesses rejetées et des erreurs 5xx. Sans ce système, une erreur de production reste silencieuse jusqu'à ce qu'un utilisateur se plaigne
- Alerting configuré sur les seuils critiques : taux d'erreur 5xx > 1 % sur 5 minutes, webhooks Cashpay en échec > 3 consécutifs, jobs cron qui n'ont pas tourné à l'heure prévue, latence p95 > 1 seconde sur 10 minutes

---

## Commentaires

- Pas de commentaires expliquant ce que fait le code — le code doit être auto-explicite
- Commentaires uniquement pour le pourquoi — expliquer une décision non évidente
- Les fonctions touchant aux règles critiques (idempotence webhook, transfert de droits mandat, blocage d'inactivité, sources de paiement) peuvent avoir un bref commentaire renvoyant à la section concernée du cahier des charges
- Jamais de commentaire TODO laissé dans le code livré

---

## Résilience et Production

Le code livré doit survivre à la production. Cela signifie : ne jamais bloquer indéfiniment, ne jamais perdre une opération en cours, ne jamais répondre à un utilisateur après avoir laissé un état incohérent.

### Timeouts et retry sur les appels externes

- Tout appel sortant (Cashpay, Resend, Supabase, Tesseract en mode worker, `web-push`) a un **timeout explicite** — par défaut 10 secondes, plus court pour les chemins critiques (webhook handler 3 secondes max sur les opérations en aval)
- Tout appel sortant **non idempotent** (initialisation d'une transaction Cashpay) n'est jamais retenté automatiquement — laisser le client réessayer
- Tout appel sortant **idempotent** (envoi d'email, envoi de push, génération PDF) a un retry avec backoff exponentiel borné : 3 tentatives max, intervalles 1s / 4s / 16s, puis log d'échec et passage à la suite
- Aucune boucle `while (true)` ni retry infini — ils saturent le pool de connexions et tuent le service

### Graceful shutdown

- `app.enableShutdownHooks()` activé dans `main.ts` pour que NestJS reçoive `SIGTERM` proprement — Railway envoie `SIGTERM` avant `SIGKILL` à chaque redéploiement
- `PrismaService` implémente `OnModuleDestroy` et appelle `$disconnect()` — les connexions DB ne sont jamais coupées brutalement
- Les tâches cron en cours au moment du shutdown finissent leur itération courante avant d'arrêter — l'idempotence garantit qu'un redémarrage à mi-parcours ne corrompt rien
- Le serveur HTTP attend jusqu'à 30 secondes la fin des requêtes en cours avant d'arrêter — pas de réponse coupée en plein milieu

### Health checks

- Endpoint `GET /health/live` — répond `200 OK` tant que le process tourne, sans dépendance DB ni externe. C'est ce que Railway sonde pour décider si le conteneur est vivant
- Endpoint `GET /health/ready` — répond `200 OK` uniquement si Prisma répond, Supabase répond et Resend répond. C'est ce qui indique si le conteneur peut servir du trafic
- Un conteneur `live` mais `not ready` ne reçoit pas de requêtes — il vient probablement de démarrer ou perd temporairement une dépendance externe

### Concurrence et verrouillage

- Les opérations critiques (confirmation de paiement, création de bail, transition de statut de bien, prélèvement d'abonnement) sont protégées contre la concurrence par une combinaison **transaction Prisma + contrainte unique côté DB** — jamais uniquement par une vérification applicative
- Une déclaration de paiement en `PENDING_CONFIRMATION` qui se voit confirmer par le webhook Cashpay en même temps a un comportement défini : le webhook gagne, la déclaration manuelle est marquée comme superflue et le locataire est notifié
- Les `IdentityVerification` en cours pour un même utilisateur sont sérialisées — un utilisateur ne peut pas lancer 10 vérifications OCR en parallèle (consomme CPU et budget Tesseract pour rien)

### Sanitization des outputs

- Tout contenu utilisateur (nom, prénom, raison sociale, adresse, note libre, message de contact d'annonce) qui est rendu dans un PDF, un email HTML ou un payload JSON est **échappé** au moment du rendu — jamais concaténé brut dans un template HTML
- Les noms de fichiers générés depuis du contenu utilisateur (quittances, rapports) sont normalisés via une whitelist `[a-zA-Z0-9_-]` — jamais le nom brut, jamais de slash ni de point qui pourraient sortir du dossier prévu

### Fuseaux horaires

- Toutes les dates en base sont stockées en **UTC** (`@db.Timestamptz`) — jamais en heure locale
- La conversion en heure de Lomé se fait uniquement à l'affichage côté frontend, jamais en base
- Les expressions cron utilisent l'heure du conteneur (UTC sur Railway) — toujours réfléchir à l'heure réelle attendue à Lomé avant de poser une expression. `'0 8 * * *'` en UTC = 8h à Lomé puisque le Togo est en UTC+0
- `dueDate` d'une `PaymentScheduleEntry` est la date civile à Lomé (sans heure), enregistrée comme un timestamp UTC à 00:00. La comparaison `dueDate + overdueGraceDays < now()` doit tenir compte de ce choix de convention

### Mémoire et ressources

- Aucune fonction ne charge un blob complet en mémoire si elle peut streamer (génération PDF directement vers la réponse HTTP, lecture de fichier upload en stream)
- `process.memoryUsage().heapUsed` exporté en métrique — alerte si > 80 % de la mémoire conteneur Railway
- Pas de cache applicatif en mémoire (`Map`, `Set` globaux qui grossissent) sans politique d'éviction explicite — un cache qui ne libère jamais est une fuite mémoire à terme

---

## Tests

Aucun déploiement en production sans tests automatisés sur les flows critiques.

### Couverture minimale obligatoire

- **Tests d'intégration sur le webhook Cashpay** : signature invalide rejetée, signature valide acceptée, idempotence vérifiée (10 webhooks identiques → 1 seul paiement), erreur DB → 2xx quand même
- **Tests d'intégration sur le flow déclaration locataire → confirmation propriétaire** : création, modification tant que `PENDING_CONFIRMATION`, rejet, confirmation, et impossibilité de confirmer manuellement un paiement `CASHPAY_API`
- **Tests d'intégration sur l'auth Supabase** : JWT manquant, JWT invalide, JWT valide mais utilisateur inexistant côté Prisma, rôles
- **Tests d'intégration sur les mandats** : transfert de droits propriétaire → gestionnaire à l'activation, propriétaire en lecture seule, retour des droits à la révocation
- **Tests d'intégration sur le calcul des échéances** : mensuel, trimestriel, semestriel, annuel — montants et périodes corrects
- **Tests d'intégration sur le blocage 2 mois** : rappels J-30/J-7/J-1, suspension effective, déblocage automatique à la création d'un bien
- **Tests unitaires sur `canActOnProperty()`** : toutes les combinaisons rôle × mandat (propriétaire seul, propriétaire avec mandat, gestionnaire mandataire, gestionnaire non mandataire, locataire, admin)

### Outils et organisation

- `Jest` + `@nestjs/testing` pour le test runner
- `supertest` pour les tests HTTP end-to-end
- Base de données de test PostgreSQL via Docker en local et en CI — **jamais** de mock de Prisma pour les tests d'intégration métier
- Les tests E2E reset la base entre chaque test via `prisma migrate reset --skip-seed --force`
- Les services externes (Cashpay, Resend, Supabase Storage, Tesseract, `web-push`) sont mockés au niveau du service NestJS — jamais d'appel réel en CI

### Règle de blocage

- Un endpoint nouveau ou modifié sans test d'intégration n'est pas mergeable, le CI doit échouer
- Couverture cible : 70 % minimum sur les services métier (`src/modules/*/service.ts`), 100 % sur `canActOnProperty()` et sur le webhook Cashpay

---

## Déploiement et Migrations

Le déploiement en production ne doit jamais provoquer de downtime ni de perte de données.

### Migrations Prisma en production

- Toute migration est **rétrocompatible avec le code de la version précédente** — déployer le code AVANT la migration si nécessaire (ex. ajouter une colonne nullable, puis remplir, puis rendre non-nullable dans une migration ultérieure)
- Jamais de `DROP COLUMN` ou `RENAME COLUMN` dans une seule migration mise en prod — toujours en deux temps : déprécier l'usage côté code dans une release, puis supprimer la colonne dans la release suivante
- Les migrations sont appliquées via `npx prisma migrate deploy` au démarrage du conteneur en prod — jamais `migrate dev`
- Une migration qui prend plus de 30 secondes (création d'index sur grosse table) doit être lancée manuellement hors heures de pointe, jamais au démarrage du conteneur (Railway interromprait le déploiement)

### Validation de l'environnement au démarrage

- `main.ts` vérifie au démarrage que **toutes** les variables d'environnement obligatoires sont présentes — si l'une manque, l'application crashe immédiatement avec un message clair, plutôt que de démarrer puis échouer à la première requête utilisateur
- La liste des variables obligatoires est tenue à jour dans `src/config/env.validation.ts` avec validation via `class-validator`

### Rollback

- Tout déploiement doit pouvoir revenir à la version précédente sans perte de données
- Un changement de schéma DB qui empêche le rollback (suppression de colonne, contrainte ajoutée incompatible avec l'ancien code) est interdit dans la même release qu'un changement de code
- Procédure de rollback documentée dans `architecture.md`

---

## Dépendances

Ne jamais installer un nouveau package sans raison claire. Avant d'installer, vérifier :

1. NestJS propose-t-il déjà cette fonctionnalité (`@nestjs/*`) ?
2. Le client Prisma fournit-il déjà ce besoin ?
3. Existe-t-il une solution native Node plus simple ?

Dépendances approuvées pour ce projet :

- `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` — framework
- `@nestjs/swagger` — documentation OpenAPI
- `@nestjs/schedule` — cron jobs
- `@nestjs/throttler` — rate limiting
- `@nestjs/event-emitter` — événements asynchrones (`payment.confirmed`)
- `@nestjs/terminus` — health checks (`/health/live`, `/health/ready`)
- `@sentry/node` — monitoring d'erreurs en production
- `@prisma/client`, `prisma` — client et CLI base de données
- `@supabase/supabase-js` — Auth et Storage
- `class-validator`, `class-transformer` — validation des DTOs et des variables d'environnement
- `resend` — emails transactionnels
- `web-push` — notifications push web (VAPID)
- `tesseract.js` — OCR pour vérification CNI togolaise
- `mrz` — parsing et validation des check digits ICAO 9303 de la zone MRZ (verso CNI) — signal secondaire, jamais gate sur `VERIFIED`/`REJECTED`
- `pdfkit` — génération de PDFs à la volée (quittances, rapports, exports)
- `exceljs` — export XLSX des paiements
- `sharp` — compression d'images à l'upload et rotation des images CNI avant OCR
- `helmet` — headers de sécurité HTTP
- `axios` — client HTTP pour les appels sortants (Cashpay) avec timeouts explicites
- `p-retry` — retry avec backoff exponentiel borné pour les appels idempotents
- `nestjs-pino`, `pino`, `pino-pretty` — logging structuré
- `nanoid` — génération de tokens d'invitation et codes courts
- `date-fns`, `date-fns-tz` — manipulation des dates et conversion UTC ↔ Lomé

Aucun autre package ne doit être installé sans mise à jour préalable de cette liste.
