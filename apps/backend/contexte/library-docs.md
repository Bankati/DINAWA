# Library Docs — WARAH

Patterns d'utilisation spécifiques au projet pour chaque librairie tierce. Ce fichier couvre uniquement comment nous utilisons chaque librairie dans le backend WARAH — règles, patterns et contraintes propres à ce projet précis.

Lire la section pertinente avant d'implémenter toute fonctionnalité qui touche ces librairies.

---

## Avant d'Utiliser une Librairie

Avant d'implémenter une fonctionnalité utilisant une librairie tierce :

1. **Vérifier AGENTS.md** à la racine du projet — il liste chaque skill installé et comment l'utiliser. Les skills contiennent une documentation API à jour, des patterns d'utilisation et les bonnes pratiques propres à cette base de code.

2. **Vérifier si un serveur MCP est configuré** pour cette librairie. Certains outils ont des serveurs MCP donnant à l'agent IA un accès direct à la documentation, aux logs et aux outils de débogage. Si un serveur MCP est disponible — l'utiliser avant de se reposer sur la connaissance générale.

3. **Lire ce fichier** pour les patterns spécifiques au projet qui prennent le pas sur la connaissance générale d'une librairie.

L'ordre d'autorité est :

```
Serveur MCP (docs temps réel) → Skills via AGENTS.md → Ce fichier (règles projet) → Connaissance générale d'entraînement
```

Ne jamais se reposer uniquement sur la connaissance générale d'entraînement pour les API d'une librairie — elles changent fréquemment et les données d'entraînement peuvent être obsolètes.

---

## Prisma

**Vérifier d'abord :** AGENTS.md pour un skill Prisma installé. Les APIs de migration et de query peuvent évoluer entre versions majeures.

### Service injectable

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

### Requêtes scopées par rôle et mandat

```typescript
// Locataire — uniquement son propre bail actif et ses propres paiements
const myPayments = await this.prisma.payment.findMany({
  where: { lease: { tenantUserId: user.id, status: 'ACTIVE' } },
  take: 100,
});

// Propriétaire — uniquement ses biens (auto-gérés ET sous mandat — il voit tout, mais ne mute que les auto-gérés)
const myProperties = await this.prisma.property.findMany({
  where: { ownerId: user.id, status: { not: 'ARCHIVED' } },
  include: { activeMandate: { include: { manager: true } } },
  take: 100,
});

// Gestionnaire — biens propres + biens sous mandat actif
const portfolio = await this.prisma.property.findMany({
  where: {
    OR: [{ ownerId: user.id }, { mandates: { some: { managerId: user.id, status: 'ACTIVE' } } }],
  },
  take: 100,
});

// Admin — accès complet, jamais de filtre obligatoire
const allPayments = await this.prisma.payment.findMany({ take: 100 });
```

### Transactions — Confirmation d'une déclaration de paiement locataire

```typescript
// La confirmation marque le paiement PAID ET met à jour l'échéance, en une seule opération atomique
await this.prisma.$transaction(async (tx) => {
  const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.source === 'CASHPAY_API') {
    throw new ConflictException('Un paiement Cashpay ne peut pas être confirmé manuellement');
  }
  if (payment.status !== 'PENDING_CONFIRMATION') {
    throw new ConflictException("Ce paiement n'est pas en attente de confirmation");
  }

  await tx.payment.update({
    where: { id: paymentId },
    data: { status: 'PAID', confirmedAt: new Date(), confirmedByUserId: user.id },
  });
  await tx.paymentScheduleEntry.update({
    where: { id: payment.scheduleEntryId },
    data: { paidAmount: { increment: payment.paidAmount } },
  });
});
```

### Transactions — Création d'un bail

```typescript
// Création du bail + génération des échéances + passage du bien à OCCUPIED
await this.prisma.$transaction(async (tx) => {
  // Une seule contrainte unique en DB : un tenant ne peut avoir qu'un Lease en status ACTIVE
  const lease = await tx.lease.create({ data: { ...dto, status: 'ACTIVE' } });
  await tx.paymentScheduleEntry.createMany({
    data: generateSchedule(lease, lease.endDate ?? addMonths(lease.startDate, 12)),
  });
  await tx.property.update({
    where: { id: dto.propertyId },
    data: { status: 'OCCUPIED' },
  });
  return lease;
});
```

### Migrations

```bash
# développement
npx prisma migrate dev --name add_payment_declaration

# production (au démarrage du conteneur Railway)
npx prisma migrate deploy

# régénérer le client après toute modification du schéma
npx prisma generate
```

**Règles :**

- `PrismaService` exposé via un `PrismaModule` global — jamais de `new PrismaClient()` ailleurs dans le code
- Toute requête sur `Property`, `Lease`, `Payment` doit être scopée selon le rôle de l'utilisateur courant — jamais une requête non filtrée hors contexte admin
- `take` explicite obligatoire sur tout `findMany` — plafond dur de 100 par page
- Toute opération multi-tables avec exigence d'atomicité (création bail + statut bien + échéances ; confirmation paiement + échéance ; transfert de droits mandat) passe par `prisma.$transaction`
- La concurrence sur les opérations critiques s'appuie sur les contraintes uniques DB (`transactionId` unique sur webhook Cashpay, partial unique index sur `tenantId` où `status = ACTIVE`) — jamais sur une vérification applicative seule
- `npx prisma generate` après toute modification du schéma, avant de continuer le développement
- Migrations rétrocompatibles obligatoires — jamais `DROP COLUMN` ou `RENAME COLUMN` dans la même release qu'un changement de code

---

## Supabase JS — Auth

**Vérifier d'abord :** AGENTS.md pour un skill Supabase installé. Les patterns d'auth peuvent différer entre v1 et v2 du SDK.

### Service admin

```typescript
// src/modules/supabase/supabase-admin.service.ts
import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseAdminService {
  public readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
}
```

### Guard de validation JWT

```typescript
// src/common/guards/supabase-auth.guard.ts
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly supabase: SupabaseAdminService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException('Token manquant');

    const { data, error } = await this.supabase.client.auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException('Token invalide');

    const user = await this.prisma.user.findUnique({
      where: { supabaseId: data.user.id },
    });
    if (!user || user.accountStatus === 'SUSPENDED_ADMIN') {
      throw new UnauthorizedException('Compte indisponible');
    }

    request.user = user;
    return true;
  }
}
```

### Création d'un compte propriétaire

```typescript
// src/modules/auth/auth.service.ts
async signupOwner(dto: SignupOwnerDto, idDocumentBuffer: Buffer) {
  const { data, error } = await this.supabase.client.auth.admin.createUser({
    email: dto.email,
    password: dto.password,
    email_confirm: false,
    user_metadata: { role: 'OWNER' },
  });
  if (error) throw new BadRequestException(error.message);

  return this.prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { supabaseId: data.user.id, email: dto.email, role: 'OWNER' },
    });
    await tx.ownerProfile.create({
      data: { userId: user.id, firstName: dto.firstName, lastName: dto.lastName, residenceCountry: dto.residenceCountry },
    });
    // Vérification CNI déclenchée en aval, voir Tesseract.js
    return user;
  });
}
```

**Règles :**

- Tout l'auth utilisateur passe par Supabase Auth — pas de hashage côté NestJS, pas de bcrypt, pas de table `password` locale
- `SUPABASE_SERVICE_ROLE_KEY` ne quitte jamais le serveur — jamais exposée au client, jamais loggée
- Connexion par email + mot de passe directe (pas de second facteur, pas d'OTP) — la session Supabase est ouverte côté client après authentification réussie
- L'OTP ne sert que pour le reset de mot de passe (cas mot de passe oublié) — voir section Resend
- Le `SupabaseAuthGuard` est appliqué sur tous les controllers métier — jamais `@Public()` sauf justification documentée (webhook Cashpay, endpoints publics d'annonces)
- L'objet `request.user` injecté par le guard est l'`User` Prisma, pas l'`User` Supabase brut — toujours travailler avec l'utilisateur métier

---

## Supabase JS — Storage

**Vérifier d'abord :** AGENTS.md pour un skill Supabase Storage installé.

### Service de stockage

```typescript
// src/modules/storage/storage.service.ts
import { Injectable } from '@nestjs/common';
import { SupabaseAdminService } from '../supabase/supabase-admin.service';

export type StorageBucket =
  | 'property-photos'
  | 'property-documents'
  | 'id-documents'
  | 'manager-documents'
  | 'payment-proofs';

@Injectable()
export class StorageService {
  constructor(private readonly supabase: SupabaseAdminService) {}

  async upload(
    bucket: StorageBucket,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<string> {
    const { error } = await this.supabase.client.storage
      .from(bucket)
      .upload(path, file, { contentType, upsert: false });
    if (error) throw new InternalServerErrorException(`Upload ${bucket} échoué: ${error.message}`);
    return path;
  }

  async getSignedUrl(bucket: StorageBucket, path: string, expiresIn = 900): Promise<string> {
    const { data, error } = await this.supabase.client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    if (error || !data) throw new InternalServerErrorException(`URL signée ${bucket} échouée`);
    return data.signedUrl;
  }

  async remove(bucket: StorageBucket, path: string): Promise<void> {
    await this.supabase.client.storage.from(bucket).remove([path]);
  }
}
```

### Upload d'une photo de bien (avec compression Sharp)

```typescript
async uploadPropertyPhoto(propertyId: string, file: Express.Multer.File) {
  if (file.size > MAX_PHOTO_BYTES) throw new BadRequestException('Photo trop volumineuse');

  const compressed = await sharp(file.buffer)
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const path = `${propertyId}/${nanoid()}.webp`;
  await this.storage.upload('property-photos', path, compressed, 'image/webp');

  return this.prisma.propertyPhoto.create({
    data: { propertyId, storagePath: path, bucket: 'property-photos' },
  });
}
```

**Chemins de stockage :**

| Bucket               | Pattern                                |
| -------------------- | -------------------------------------- |
| `property-photos`    | `{propertyId}/{nanoid}.webp`           |
| `property-documents` | `{propertyId}/{nanoid}-{originalName}` |
| `id-documents`       | `{userId}/{nanoid}.{ext}`              |
| `manager-documents`  | `{userId}/{nanoid}-{originalName}`     |
| `payment-proofs`     | `{paymentId}/{nanoid}.{ext}`           |

**Règles :**

- Tous les buckets sont **privés** — jamais d'URL publique permanente, toujours une URL signée à expiration 15 minutes maximum
- L'identifiant de fichier en base est le `path` Storage, jamais l'URL signée (elle expire)
- Jamais d'upload sans validation préalable du type MIME et de la taille — voir limites dans `src/common/constants.ts`
- Les images passent toujours par `sharp` avant upload (compression + conversion WebP) — jamais l'original brut
- Quand un enregistrement Prisma est supprimé, le fichier Storage correspondant est supprimé dans la même opération
- Aucun bucket pour les quittances, rapports mensuels, ou factures d'abonnement — ces PDFs sont générés à la volée (voir PDFKit)

---

## class-validator et class-transformer

**Vérifier d'abord :** AGENTS.md pour un skill class-validator installé.

### Configuration globale

```typescript
// src/main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
);
```

### DTO avec validations WARAH

```typescript
// src/modules/leases/dto/create-lease.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaymentFrequency } from '@prisma/client';

export class CreateLeaseDto {
  @ApiProperty()
  @IsUUID()
  propertyId!: string;

  @ApiProperty()
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ example: 50_000 })
  @IsInt()
  @Min(1)
  monthlyRent!: number;

  @ApiProperty({ example: 5_000 })
  @IsInt()
  @Min(0)
  monthlyCharges!: number;

  @ApiProperty({ enum: PaymentFrequency })
  @IsEnum(PaymentFrequency)
  paymentFrequency!: PaymentFrequency;

  @ApiProperty({ example: '2027-01-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: 100_000 })
  @IsInt()
  @Min(0)
  securityDeposit!: number;
}
```

### Validation des variables d'environnement au démarrage

```typescript
// src/config/env.validation.ts
import { plainToInstance } from 'class-transformer';
import { IsString, IsUrl, validateSync } from 'class-validator';

class EnvSchema {
  @IsUrl({ protocols: ['postgresql', 'postgres'], require_tld: false })
  DATABASE_URL!: string;

  @IsUrl()
  SUPABASE_URL!: string;

  @IsString()
  SUPABASE_SERVICE_ROLE_KEY!: string;

  @IsString()
  RESEND_API_KEY!: string;

  @IsString()
  CASHPAY_WEBHOOK_SECRET!: string;

  @IsString()
  VAPID_PRIVATE_KEY!: string;
  // ... autres
}

export function validateEnv(config: Record<string, unknown>) {
  const parsed = plainToInstance(EnvSchema, config, { enableImplicitConversion: true });
  const errors = validateSync(parsed, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Variables d'environnement invalides : ${errors.toString()}`);
  }
  return parsed;
}
```

**Règles :**

- `ValidationPipe` global avec `whitelist: true` et `forbidNonWhitelisted: true` — toute propriété non déclarée dans le DTO est rejetée
- Les enums proviennent de `@prisma/client` — jamais redéfinis dans le DTO
- Les montants FCFA sont des `@IsInt()` — pas de décimales, le FCFA n'a pas de centimes
- `@ApiProperty()` obligatoire sur chaque champ du DTO pour que Swagger génère une doc complète
- Pas de validation manuelle dans les services ou controllers — toujours via les décorateurs sur le DTO
- Les messages d'erreur custom sont en français et orientés utilisateur final
- `validateEnv()` est appelé au démarrage de l'application — si une variable manque ou est invalide, l'app crashe immédiatement avec un message clair

---

## Resend

**Vérifier d'abord :** AGENTS.md pour un skill Resend installé.

### Service email

```typescript
// src/modules/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

export type EmailTemplate =
  | 'signup-confirmation'
  | 'password-reset-otp'
  | 'tenant-invitation'
  | 'receipt'
  | 'payment-reminder'
  | 'overdue-alert'
  | 'payment-declaration-pending'
  | 'monthly-report'
  | 'inactivity-warning'
  | 'account-suspended';

@Injectable()
export class EmailService {
  private readonly resend = new Resend(process.env.RESEND_API_KEY!);
  private readonly logger = new Logger(EmailService.name);

  async sendEmail(params: {
    to: string;
    template: EmailTemplate;
    variables: Record<string, string | number>;
    attachments?: { filename: string; content: Buffer }[];
  }) {
    try {
      await this.resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: params.to,
        subject: subjectFor(params.template, params.variables),
        html: renderTemplate(params.template, params.variables),
        attachments: params.attachments,
      });
    } catch (error) {
      this.logger.error(`[email/${params.template}] to=${this.maskEmail(params.to)}`, error);
      // ne jamais relancer — un email qui échoue ne doit pas faire échouer l'action appelante
    }
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local[0]}***@${domain}`;
  }
}
```

### Flux mot de passe oublié (OTP)

```typescript
// src/modules/auth/password-reset.service.ts
async requestReset(email: string) {
  const user = await this.prisma.user.findUnique({ where: { email } });
  if (!user) return; // ne jamais révéler si l'email existe

  // Une seule demande active à la fois — invalide les codes précédents
  await this.prisma.passwordResetOtp.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  const code = generateOtp(OTP_LENGTH);
  await this.prisma.passwordResetOtp.create({
    data: {
      userId: user.id,
      code,
      expiresAt: addMinutes(new Date(), OTP_EXPIRATION_MINUTES),
    },
  });

  // EmailService directement, jamais via NotifyService
  await this.email.sendEmail({
    to: user.email,
    template: 'password-reset-otp',
    variables: { code, expirationMinutes: OTP_EXPIRATION_MINUTES },
  });
}
```

### Envoi de quittance avec PDF en pièce jointe

```typescript
// Écouteur d'événement payment.confirmed
@OnEvent('payment.confirmed')
async onPaymentConfirmed({ paymentId }: PaymentConfirmedEvent) {
  const buffer = await this.receiptPdf.renderToBuffer(paymentId);
  const payment = await this.prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: { lease: { include: { tenant: { include: { user: true } }, owner: true } } },
  });

  // Notify choisit push ou email selon les préférences
  await this.notify.notifyUser({
    userId: payment.lease.owner.userId,
    event: 'receipt',
    variables: { amount: payment.paidAmount, period: formatPeriod(payment) },
    emailAttachments: [{ filename: `quittance-${payment.id}.pdf`, content: buffer }],
  });
  await this.notify.notifyUser({
    userId: payment.lease.tenant.user.id,
    event: 'receipt',
    variables: { amount: payment.paidAmount, period: formatPeriod(payment) },
    emailAttachments: [{ filename: `quittance-${payment.id}.pdf`, content: buffer }],
  });
}
```

**Règles :**

- Tous les envois encapsulés dans try/catch — un échec d'envoi ne doit jamais faire planter une transaction métier ou un cron
- Templates fournis par le client, intégrés tels quels dans `src/modules/email/templates/` — jamais de HTML inline dans les services métier
- `from` toujours le domaine vérifié Resend (`RESEND_FROM_EMAIL`) — jamais une adresse non vérifiée
- Les emails de sécurité (`signup-confirmation`, `password-reset-otp`) appellent **directement** `EmailService` — jamais via `NotifyService`, jamais soumis au consentement push
- Les autres emails métier passent par `NotifyService.notifyUser()` qui choisit push ou email selon `User.notificationConsent`
- Les emails ne loggent jamais l'adresse en clair — masquage `a***@domain.com`

---

## web-push

**Vérifier d'abord :** AGENTS.md pour un skill web-push installé.

### Génération des clés VAPID (une seule fois)

```bash
npx web-push generate-vapid-keys
```

### Service push

```typescript
// src/modules/push/web-push.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);

  constructor(private readonly prisma: PrismaService) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
  }

  async sendToUser(userId: string, payload: { title: string; body: string; url: string }) {
    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        // 410 Gone ou 404 = subscription expirée → suppression définitive
        if (statusCode === 410 || statusCode === 404) {
          await this.prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          this.logger.error(`[push] sub=${sub.id}`, error);
        }
      }
    }
  }
}
```

### Service de routage Push / Email — `notifyUser()`

```typescript
// src/modules/notify/notify.service.ts
@Injectable()
export class NotifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: WebPushService,
    private readonly email: EmailService,
  ) {}

  async notifyUser(params: {
    userId: string;
    event: NotificationEvent;
    variables: Record<string, string | number>;
    emailAttachments?: { filename: string; content: Buffer }[];
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      include: { _count: { select: { pushSubscriptions: true } } },
    });
    if (!user) return;

    const canPush = user.notificationConsent === 'ACCEPTED' && user._count.pushSubscriptions > 0;

    if (canPush && !params.emailAttachments) {
      await this.push.sendToUser(user.id, buildPushPayload(params.event, params.variables));
      return;
    }

    await this.email.sendEmail({
      to: user.email,
      template: mapEventToTemplate(params.event),
      variables: params.variables,
      attachments: params.emailAttachments,
    });
  }
}
```

**Règles :**

- `notifyUser()` est le **seul** point d'entrée pour notifier un utilisateur d'un événement métier — jamais d'appel direct à `EmailService.sendEmail()` ou `WebPushService.sendToUser()` depuis un service métier ou un cron
- Une `PushSubscription` qui retourne `410 Gone` ou `404` est supprimée immédiatement — jamais réessayée
- Jamais d'envoi simultané sur les deux canaux pour le même événement
- Quand une pièce jointe PDF est nécessaire (quittance, rapport mensuel), forcer le canal email même si push est disponible — un push ne porte pas de PDF
- Les emails de sécurité (auth, OTP) **ne passent jamais** par `notifyUser()` — appel direct à `EmailService` pour qu'ils fonctionnent même sans abonnement push

---

## Cashpay (via axios + p-retry)

**Vérifier d'abord :** AGENTS.md pour un skill Cashpay installé. La documentation publique est limitée — toujours valider chaque endpoint avec leur support.

### Client axios

```typescript
// src/modules/payments/cashpay.client.ts
import axios, { AxiosInstance } from 'axios';

export function createCashpayClient(): AxiosInstance {
  return axios.create({
    baseURL: process.env.CASHPAY_API_URL!,
    timeout: 10_000,
    headers: {
      Authorization: `Bearer ${process.env.CASHPAY_API_KEY!}`,
      'Content-Type': 'application/json',
    },
  });
}
```

### Initialisation d'un paiement

```typescript
// src/modules/payments/cashpay.service.ts
@Injectable()
export class CashpayService {
  private readonly client = createCashpayClient();
  private readonly logger = new Logger(CashpayService.name);

  async initiatePayment(params: {
    scheduleEntryId: string;
    amount: number;
    phone: string;
    method: 'TMONEY' | 'FLOOZ';
  }) {
    try {
      // Jamais de retry — opération non idempotente, laisser le client réessayer
      const { data } = await this.client.post('/transactions', {
        amount: params.amount,
        phone: params.phone,
        method: params.method,
        callback_url: `${process.env.PUBLIC_URL}/api/webhooks/cashpay`,
        external_id: params.scheduleEntryId,
      });
      return { transactionId: data.transaction_id as string, instructions: data.instructions };
    } catch (error) {
      this.logger.error(`[cashpay/initiate] schedule=${params.scheduleEntryId}`, error);
      throw new BadGatewayException('Paiement Cashpay indisponible, réessayez');
    }
  }
}
```

### Webhook avec idempotence et HMAC

```typescript
// src/modules/payments/cashpay-webhook.controller.ts
@Controller('webhooks/cashpay')
export class CashpayWebhookController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly logger: Logger,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(@Body() body: CashpayWebhookDto, @Headers('x-cashpay-signature') signature: string) {
    // 1. Vérification HMAC avant tout traitement
    if (!verifyHmac(JSON.stringify(body), signature, process.env.CASHPAY_WEBHOOK_SECRET!)) {
      this.logger.warn(`[cashpay/webhook] signature invalide`);
      throw new UnauthorizedException();
    }

    // 2. Idempotence stricte via contrainte unique sur transactionId
    try {
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.payment.findFirst({
          where: { transactionId: body.transaction_id, source: 'CASHPAY_API' },
        });
        if (existing) return; // déjà traité, sortie silencieuse

        const entry = await tx.paymentScheduleEntry.findUniqueOrThrow({
          where: { id: body.external_id },
        });
        await tx.payment.create({
          data: {
            scheduleEntryId: entry.id,
            transactionId: body.transaction_id,
            paidAmount: body.amount,
            paidAt: new Date(body.timestamp),
            source: 'CASHPAY_API',
            status: 'PAID',
            paymentMethod: body.method,
          },
        });
      });

      this.events.emit('payment.confirmed', { transactionId: body.transaction_id });
    } catch (error) {
      // 2xx quand même — la réconciliation se fait via un cron séparé
      this.logger.error(`[cashpay/webhook] txn=${body.transaction_id}`, error);
    }

    return { received: true };
  }
}
```

**Règles :**

- Timeout explicite de 10 secondes sur tous les appels sortants Cashpay — jamais de requête sans timeout
- L'initialisation de paiement (`POST /transactions`) est **non idempotente** — jamais retentée automatiquement, le locataire réessaye depuis l'UI
- Le webhook est **strictement idempotent** : la contrainte unique sur `transactionId` côté DB est la source de vérité, jamais une vérification applicative seule
- La signature HMAC est vérifiée **avant** tout traitement — un webhook non signé ou mal signé est rejeté avec `401` et log de sécurité
- Le webhook répond **toujours 2xx** quand la signature est valide, même si le traitement métier échoue — la réconciliation se fait via un cron séparé
- L'événement `payment.confirmed` est émis dans tous les cas après mise à jour réussie — quittance et notifications sont déclenchées par cet événement
- Un paiement `CASHPAY_API` ne peut **jamais** être re-confirmé ni rejeté manuellement (voir code-standards.md, section Paiements)

---

## Tesseract.js — Vérification CNI togolaise

**Vérifier d'abord :** AGENTS.md pour un skill Tesseract installé.

### Service de vérification

```typescript
// src/modules/identity/identity-verification.service.ts
import { createWorker } from 'tesseract.js';

const REQUIRED_MARKERS = ['RÉPUBLIQUE TOGOLAISE', "CARTE NATIONALE D'IDENTITÉ"];
const CNI_NUMBER_PATTERN = /[A-Z0-9]{8,12}/; // à figer après réception de l'exemple

@Injectable()
export class IdentityVerificationService {
  async verify(
    imageBuffer: Buffer,
  ): Promise<{ status: 'VERIFIED' | 'REJECTED'; reason?: string; rawText: string }> {
    const worker = await createWorker('fra+eng');
    try {
      const { data } = await worker.recognize(imageBuffer);
      const text = data.text.toUpperCase();

      const missingMarkers = REQUIRED_MARKERS.filter((m) => !text.includes(m.toUpperCase()));
      if (missingMarkers.length > 0) {
        return {
          status: 'REJECTED',
          reason: `Marqueurs manquants: ${missingMarkers.join(', ')}`,
          rawText: data.text,
        };
      }

      if (!CNI_NUMBER_PATTERN.test(data.text)) {
        return {
          status: 'REJECTED',
          reason: 'Numéro de CNI introuvable ou format invalide',
          rawText: data.text,
        };
      }

      return { status: 'VERIFIED', rawText: data.text };
    } finally {
      await worker.terminate();
    }
  }
}
```

### Endpoint avec fallback asynchrone

```typescript
@Post('verify')
@UseInterceptors(FileInterceptor('image'))
async verify(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file: Express.Multer.File) {
  if (file.size > MAX_PHOTO_BYTES) throw new BadRequestException('Image trop volumineuse');

  // Stocker l'image dans id-documents d'abord (même si rejetée — utile pour debug et historique)
  const path = `${user.id}/${nanoid()}.${file.mimetype.split('/')[1]}`;
  await this.storage.upload('id-documents', path, file.buffer, file.mimetype);

  // OCR avec timeout — si > 10s, basculer en mode async (statut PROCESSING)
  const result = await Promise.race([
    this.verifyService.verify(file.buffer),
    timeoutAfter(ID_VERIFICATION_TIMEOUT_SECONDS * 1000),
  ]);

  return this.prisma.identityVerification.create({
    data: { userId: user.id, status: result.status, reason: result.reason, storagePath: path },
  });
}
```

**Règles :**

- Toujours `await worker.terminate()` dans un `finally` — un worker non terminé laisse des processus zombies en mémoire
- L'OCR Tesseract est **CPU-bound et lent** — jamais d'appel dans un endpoint qui doit répondre en < 500 ms
- Limite de 10 secondes maximum sur l'OCR ; au-delà, basculer en mode asynchrone et faire interroger l'état par le client
- Les marqueurs et le pattern du numéro CNI sont des constantes en haut du service — jamais inlinés dans la fonction métier ; à figer après réception de l'exemple officiel de CNI togolaise
- Le résultat brut de l'OCR est stocké dans `IdentityVerification.rawText` — utile pour ajuster les règles a posteriori si trop de faux rejets
- Toute vérification REJECTED permet à l'utilisateur de re-soumettre immédiatement — pas de file d'attente humaine, pas de validation admin
- Les `IdentityVerification` simultanées pour un même utilisateur sont sérialisées — un utilisateur ne peut pas lancer 10 OCR en parallèle

---

## PDFKit — Quittances et rapports à la volée

**Vérifier d'abord :** AGENTS.md pour un skill PDFKit installé. L'API PDFKit a peu changé mais les patterns d'usage diffèrent entre `pipe` et `Buffer`.

### Génération et streaming direct

```typescript
// src/modules/receipts/receipt-pdf.service.ts
import * as PDFDocument from 'pdfkit';
import type { Response } from 'express';

@Injectable()
export class ReceiptPdfService {
  constructor(private readonly prisma: PrismaService) {}

  async streamReceipt(paymentId: string, res: Response) {
    const payment = await this.loadPayment(paymentId);

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: { Title: `Quittance ${payment.id}` },
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="quittance-${payment.id}.pdf"`);
    doc.pipe(res);

    this.renderTemplate(doc, payment);

    doc.end();
  }

  async renderToBuffer(paymentId: string): Promise<Buffer> {
    const payment = await this.loadPayment(paymentId);
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      this.renderTemplate(doc, payment);
      doc.end();
    });
  }

  private renderTemplate(doc: PDFKit.PDFDocument, payment: PaymentWithRelations) {
    // Template strict fourni par le client — logo, en-tête, mentions légales
    doc.fontSize(16).text('QUITTANCE DE LOYER', { align: 'center' });
    doc.moveDown();
    doc.fontSize(11);
    doc.text(`Propriétaire : ${escapeForPdf(payment.lease.owner.fullName)}`);
    doc.text(`Locataire : ${escapeForPdf(payment.lease.tenant.fullName)}`);
    doc.text(`Bien : ${escapeForPdf(payment.lease.property.address)}`);
    doc.text(`Période du ${formatDate(payment.periodStart)} au ${formatDate(payment.periodEnd)}`);
    doc.text(`Montant perçu : ${formatFcfa(payment.paidAmount)} FCFA`);
    doc.text(`Mode de paiement : ${payment.paymentMethod}`);
    doc.text(`Transaction : ${payment.transactionId ?? payment.id}`);
    doc.text(`Date : ${formatDateTime(payment.paidAt!)}`);
  }
}
```

**Règles :**

- Quittances, rapports mensuels, factures d'abonnement, exports de paiements : **jamais stockés**. Toutes les données sont en base, donc génération à la volée et streaming direct
- Aucun modèle Prisma `Receipt`, `MonthlyReport`, `Invoice` ne stocke un PDF
- Aucun bucket Supabase Storage n'est utilisé pour ces PDFs
- Pour l'envoi par email, utiliser `renderToBuffer()` puis attacher au mail via Resend, puis libérer la référence
- Pour le téléchargement HTTP direct, utiliser `streamReceipt()` qui pipe vers la `Response` Express — pas d'accumulation en mémoire
- Toute valeur insérée dans le PDF qui provient d'un utilisateur (nom, adresse, note) passe par `escapeForPdf()` — jamais concaténée brute
- Polices custom (logo + en-tête fournis par le client) chargées une fois au boot, pas à chaque génération
- Cible de performance : génération en moins de 5 secondes pour une quittance simple

---

## ExcelJS — Export des paiements

**Vérifier d'abord :** AGENTS.md pour un skill ExcelJS installé.

### Streaming d'un export XLSX

```typescript
// src/modules/payments/exports/xlsx-export.service.ts
import { stream } from 'exceljs';
import type { Response } from 'express';

@Injectable()
export class XlsxExportService {
  constructor(private readonly prisma: PrismaService) {}

  async streamPayments(ownerId: string, from: Date, to: Date, res: Response) {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="paiements-${from.toISOString().slice(0, 10)}.xlsx"`,
    );

    const workbook = new stream.xlsx.WorkbookWriter({ stream: res });
    const sheet = workbook.addWorksheet('Paiements');
    sheet.columns = [
      { header: 'Date', key: 'paidAt', width: 12 },
      { header: 'Bien', key: 'property', width: 30 },
      { header: 'Locataire', key: 'tenant', width: 25 },
      { header: 'Période', key: 'period', width: 20 },
      { header: 'Montant FCFA', key: 'amount', width: 15 },
      { header: 'Source', key: 'source', width: 18 },
      { header: 'Méthode', key: 'method', width: 12 },
      { header: 'Transaction', key: 'transactionId', width: 30 },
    ];

    // Pagination pour éviter de charger 10 000 lignes en mémoire
    let cursor: string | undefined = undefined;
    do {
      const batch = await this.prisma.payment.findMany({
        where: { lease: { property: { ownerId } }, paidAt: { gte: from, lte: to }, status: 'PAID' },
        include: { lease: { include: { property: true, tenant: true } } },
        take: 500,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        orderBy: { paidAt: 'asc' },
      });
      for (const p of batch) {
        sheet
          .addRow({
            paidAt: p.paidAt,
            property: p.lease.property.address,
            tenant: p.lease.tenant.fullName,
            period: `${formatDate(p.periodStart)} → ${formatDate(p.periodEnd)}`,
            amount: p.paidAmount,
            source: p.source,
            method: p.paymentMethod,
            transactionId: p.transactionId ?? p.id,
          })
          .commit();
      }
      cursor = batch.length === 500 ? batch[batch.length - 1].id : undefined;
    } while (cursor);

    await workbook.commit();
  }
}
```

**Règles :**

- Toujours utiliser le **streaming writer** (`stream.xlsx.WorkbookWriter`) — jamais le writer en mémoire pour des exports > 1 000 lignes
- Pagination Prisma par lots de 500 — jamais un `findMany` non borné
- Toutes les sommes côté DB, jamais agrégées en mémoire en JavaScript
- Export limité à 2 ans glissants — refus explicite au-delà
- Pas de stockage du fichier généré — streamé directement vers `Response`
- Une colonne dédiée pour `source` permet à l'utilisateur de distinguer Cashpay API / saisie propriétaire / déclaration locataire confirmée

---

## @nestjs/schedule — Cron jobs

**Vérifier d'abord :** AGENTS.md pour un skill @nestjs/schedule installé.

### Cron avec verrouillage Postgres

```typescript
// src/modules/scheduling/monthly-reports.task.ts
@Injectable()
export class MonthlyReportsTask {
  private readonly logger = new Logger(MonthlyReportsTask.name);
  private readonly LOCK_KEY = 1001; // identifiant unique pour ce job

  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
    private readonly reportPdf: MonthlyReportPdfService,
  ) {}

  @Cron(CRON_MONTHLY_REPORTS) // '0 8 1 * *' — 1er du mois à 8h UTC
  async generateAndSend() {
    // Verrou Postgres pour éviter la double exécution si plusieurs instances tournent
    const [{ pg_try_advisory_lock: acquired }] = await this.prisma.$queryRaw<
      { pg_try_advisory_lock: boolean }[]
    >`SELECT pg_try_advisory_lock(${this.LOCK_KEY})`;

    if (!acquired) {
      this.logger.warn('[monthly-reports] lock non acquis, skip');
      return;
    }

    try {
      const mandates = await this.prisma.mandate.findMany({
        where: { status: 'ACTIVE' },
        include: { owner: { include: { user: true } } },
      });

      for (const mandate of mandates) {
        try {
          const buffer = await this.reportPdf.renderToBuffer(mandate.id, lastMonth());
          await this.notify.notifyUser({
            userId: mandate.owner.user.id,
            event: 'monthly-report',
            variables: { period: formatMonth(lastMonth()) },
            emailAttachments: [
              { filename: `rapport-${formatMonth(lastMonth())}.pdf`, content: buffer },
            ],
          });
        } catch (error) {
          this.logger.error(`[monthly-reports] mandate=${mandate.id}`, error);
        }
      }
    } finally {
      await this.prisma.$queryRaw`SELECT pg_advisory_unlock(${this.LOCK_KEY})`;
    }
  }
}
```

**Règles :**

- Toutes les expressions cron sont des constantes dans `src/common/constants.ts` — jamais inlinées dans le décorateur
- Les jobs dont la duplication est dangereuse (rapports mensuels, prélèvements abonnement, blocage d'inactivité) posent un `pg_try_advisory_lock` au début et le relâchent en `finally`
- Chaque itération dans une boucle a son propre try/catch — l'échec d'un envoi ne fait jamais échouer les autres
- Anti-doublon obligatoire pour les envois récurrents : colonne `*SentAt` mise à jour après l'envoi, vérifiée à l'itération suivante
- Aucun cron ne fait du travail synchrone long — au-delà de 30s par itération, découper en lots paginés
- Les expressions cron sont en UTC — réfléchir à l'heure réelle attendue à Lomé (UTC+0) avant de poser une expression

---

## @nestjs/throttler — Rate limiting

**Vérifier d'abord :** AGENTS.md pour un skill @nestjs/throttler installé.

### Configuration globale et endpoint spécifique

```typescript
// src/app.module.ts
ThrottlerModule.forRoot([
  { name: 'short', ttl: 1000, limit: 5 },   // 5 req/s par défaut
  { name: 'long',  ttl: 60_000, limit: 100 }, // 100 req/min par défaut
]),
```

```typescript
// Rate limit strict sur le formulaire de contact d'annonce (anti-spam)
@Post(':id/contact')
@Throttle({ default: { ttl: 60 * 60_000, limit: LISTING_CONTACT_RATE_LIMIT_PER_HOUR } })
async contactOwner(@Param('id') listingId: string, @Body() dto: ContactListingDto) {
  return this.listingsService.recordContact(listingId, dto);
}

// Rate limit strict sur le webhook Cashpay (anti-replay malicieux)
@Post()
@Throttle({ default: { ttl: 1000, limit: 50 } }) // 50 webhooks/seconde max
async handleWebhook(/* ... */) { /* ... */ }
```

**Règles :**

- Throttler enregistré globalement — toutes les routes sont protégées par défaut
- Endpoints publics non authentifiés (contact d'annonce, signalement, page publique d'annonces) ont des quotas plus stricts
- Le webhook Cashpay a un quota dédié — la signature HMAC est le filtre principal mais le throttle reste une seconde barrière
- L'identifiant de quota est l'IP par défaut ; pour les endpoints authentifiés, surcharger via `getTracker()` pour utiliser le `userId`

---

## @nestjs/swagger

**Vérifier d'abord :** AGENTS.md pour un skill @nestjs/swagger installé.

### Configuration

```typescript
// src/main.ts
if (process.env.NODE_ENV !== 'production') {
  const config = new DocumentBuilder()
    .setTitle('WARAH API')
    .setDescription('API backend de gestion locative immobilière')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}
```

**Règles :**

- Swagger activé uniquement en dev et staging — jamais en production publique (révèle la surface d'attaque)
- Tous les DTOs ont des `@ApiProperty()` avec exemples — sans cela, la doc est inutile pour le frontend
- Tous les controllers ont un `@ApiTags(...)` pour regrouper les endpoints
- Endpoints protégés annotés `@ApiBearerAuth()` pour permettre de tester depuis Swagger UI

---

## @nestjs/event-emitter

**Vérifier d'abord :** AGENTS.md pour un skill @nestjs/event-emitter installé.

### Événements métier WARAH

```typescript
// src/common/events/payment.events.ts
export class PaymentConfirmedEvent {
  constructor(public readonly paymentId: string) {}
}
export class PaymentRejectedEvent {
  constructor(
    public readonly paymentId: string,
    public readonly reason: string,
  ) {}
}
```

```typescript
// Émission depuis le webhook Cashpay
this.events.emit('payment.confirmed', new PaymentConfirmedEvent(payment.id));

// Écouteur — génération de quittance et notifications
@OnEvent('payment.confirmed', { async: true, promisify: true })
async handlePaymentConfirmed(event: PaymentConfirmedEvent) {
  try {
    const buffer = await this.receiptPdf.renderToBuffer(event.paymentId);
    // envoi via notifyUser, voir Resend
  } catch (error) {
    this.logger.error(`[event/payment.confirmed] payment=${event.paymentId}`, error);
  }
}
```

**Règles :**

- Les événements métier sont des classes dans `src/common/events/` — jamais des strings inline
- Les écouteurs sont `async: true, promisify: true` — sinon les erreurs sont silencieuses
- Chaque écouteur a son propre try/catch — un échec d'écouteur ne casse pas l'émetteur
- Les événements ne servent qu'à découpler post-traitements asynchrones (notifications, PDF, audit logs) — jamais à porter de la logique métier critique
- L'émission a lieu **après** la mutation Prisma réussie, jamais avant — sinon on notifie pour un état qui n'existe pas en base

---

## @nestjs/terminus — Health checks

**Vérifier d'abord :** AGENTS.md pour un skill @nestjs/terminus installé.

### Endpoints live et ready

```typescript
// src/modules/health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: PrismaHealthIndicator,
    private readonly http: HttpHealthIndicator,
  ) {}

  // Le conteneur tourne — utilisé par Railway pour vérifier si le process est vivant
  @Get('live')
  liveness() {
    return { status: 'ok' };
  }

  // Le conteneur peut servir du trafic — toutes les dépendances répondent
  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.http.pingCheck('supabase', `${process.env.SUPABASE_URL}/auth/v1/health`),
    ]);
  }
}
```

**Règles :**

- `/health/live` ne touche **aucune** dépendance externe — répond toujours 200 si le process tourne
- `/health/ready` vérifie Prisma + Supabase — répond 503 si l'une échoue, Railway arrête alors de router du trafic
- Les health checks sont publics (pas de `@UseGuards`) et exclus du throttler — Railway les sonde fréquemment
- Aucun log applicatif sur ces endpoints — sinon les logs sont noyés

---

## @sentry/node — Monitoring d'erreurs

**Vérifier d'abord :** AGENTS.md pour un skill Sentry installé.

### Initialisation

```typescript
// src/main.ts (avant l'instanciation de l'app)
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // Filtrer les erreurs déjà gérées (4xx attendues)
      if (event.exception?.values?.[0]?.value?.includes('UnauthorizedException')) return null;
      return event;
    },
  });
}
```

### Capture manuelle dans les contextes critiques

```typescript
// Webhook Cashpay — capturer mais répondre 2xx
try {
  // ... traitement métier
} catch (error) {
  Sentry.captureException(error, {
    tags: { module: 'cashpay-webhook', transactionId: body.transaction_id },
  });
  this.logger.error(`[cashpay/webhook] txn=${body.transaction_id}`, error);
  // pas de re-throw — le webhook doit répondre 2xx
}
```

**Règles :**

- Sentry obligatoire en production — sans `SENTRY_DSN`, l'initialisation est skippée silencieusement (utile en dev)
- `tracesSampleRate` à 0.1 maximum en production — au-delà, le quota Sentry explose
- Filtrer dans `beforeSend` les exceptions 4xx attendues (`UnauthorizedException`, `BadRequestException`) — Sentry doit refléter les vrais bugs, pas les erreurs utilisateur normales
- Pour les contextes critiques (webhook Cashpay, jobs cron de paiement, OCR), capture manuelle avec `tags` pour faciliter le filtrage
- Jamais d'envoi de données sensibles dans les tags ou le contexte Sentry (mots de passe, CNI, JWT)

---

## axios — Appels HTTP sortants

**Vérifier d'abord :** AGENTS.md pour un skill axios installé.

### Instances dédiées par service

```typescript
// Une instance par service externe, jamais un client global partagé
const cashpayClient = axios.create({
  baseURL: process.env.CASHPAY_API_URL,
  timeout: 10_000,
  headers: { Authorization: `Bearer ${process.env.CASHPAY_API_KEY}` },
});

// Pour les appels qui doivent passer dans Sentry
cashpayClient.interceptors.response.use(undefined, (error) => {
  if (axios.isAxiosError(error)) {
    Sentry.captureException(error, { tags: { service: 'cashpay', url: error.config?.url } });
  }
  return Promise.reject(error);
});
```

**Règles :**

- Une instance `axios.create()` dédiée par service externe — jamais d'appel `axios.get()` direct sans instance
- Timeout explicite **toujours** — par défaut 10s, plus court pour les chemins critiques (3s pour les opérations en aval du webhook)
- Pas de retry automatique sur axios — toujours via `p-retry` pour contrôler le backoff
- Interceptor de réponse pour capturer les erreurs dans Sentry avec les bons tags
- Jamais d'appel à un service externe sans gérer le cas d'erreur — `try/catch` autour de tout `await client.get()`

---

## p-retry — Retry avec backoff

**Vérifier d'abord :** AGENTS.md pour un skill p-retry installé.

### Retry sur appels idempotents uniquement

```typescript
import pRetry, { AbortError } from 'p-retry';

// Envoi push idempotent — retry borné
async function sendPushWithRetry(subscription: PushSubscription, payload: object) {
  return pRetry(
    async () => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        // 410/404 → subscription morte, ne pas retenter
        if (statusCode === 410 || statusCode === 404) {
          throw new AbortError('Subscription expirée');
        }
        throw error;
      }
    },
    { retries: 3, minTimeout: 1000, factor: 4, maxTimeout: 16_000 },
  );
}
```

**Règles :**

- **Jamais** de retry sur une opération non idempotente (initialisation de paiement Cashpay, création d'un bail, mutation Prisma)
- Toujours borner le retry : 3 tentatives maximum (configuration WARAH standard : `retries: 3, minTimeout: 1000, factor: 4`)
- Utiliser `AbortError` pour interrompre le retry quand l'erreur est permanente (404, 410, validation) — sinon p-retry retente bêtement
- Logger l'échec final après épuisement des retries — ne jamais ignorer silencieusement

---

## sharp — Compression d'images

**Vérifier d'abord :** AGENTS.md pour un skill sharp installé.

```typescript
// src/modules/storage/image-processor.ts
import sharp from 'sharp';

export async function compressPhoto(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate() // applique l'orientation EXIF puis la supprime
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}
```

**Règles :**

- Toute photo de bien, photo de profil, photo de justificatif de paiement passe par `compressPhoto()` — jamais l'original uploadé
- Format de sortie toujours WebP — meilleur ratio compression/qualité, supporté par tous les navigateurs modernes
- `rotate()` sans argument applique l'orientation EXIF avant de la supprimer — sans cela, les photos prises en portrait apparaissent en paysage
- Limite haute fixée à 1920×1920 px — `withoutEnlargement: true` évite d'agrandir les petites images
- Les CNI vont dans `id-documents` sans compression destructive — l'OCR a besoin du maximum de qualité

---

## nestjs-pino + pino — Logging structuré

**Vérifier d'abord :** AGENTS.md pour un skill pino installé.

### Configuration

```typescript
// src/app.module.ts
LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
    redact: {
      paths: ['req.headers.authorization', 'req.body.password', '*.cniNumber', '*.phone'],
      remove: true,
    },
    customProps: (req) => ({ correlationId: req.id }),
  },
}),
```

**Règles :**

- `pino-pretty` uniquement en dev — en production, logs JSON pour ingestion par Railway/Sentry
- `redact` configuré globalement pour masquer mots de passe, JWT, numéros CNI, téléphones complets
- `correlationId` propagé dans tous les logs d'une même requête — facilite le débogage
- Niveau `info` minimum en production — les `debug` et `trace` ne servent qu'en dev
- Les logs métier critiques (paiement confirmé, mandat créé, suspension de compte) ont aussi une entrée `AuditLog` en DB — les deux systèmes coexistent

---

## helmet — Headers de sécurité HTTP

**Vérifier d'abord :** AGENTS.md pour un skill helmet installé.

```typescript
// src/main.ts
import helmet from 'helmet';
app.use(
  helmet({
    contentSecurityPolicy: false, // API JSON, pas de HTML servi
    crossOriginEmbedderPolicy: false,
  }),
);
```

**Règles :**

- Helmet appliqué globalement dans `main.ts` — jamais désactivé pour un endpoint spécifique
- `Content-Security-Policy` désactivée par défaut (l'API ne sert pas de HTML) — réactiver uniquement si une route renvoie du HTML
- HSTS activé en production via la configuration par défaut — force HTTPS

---

## date-fns + date-fns-tz — Manipulation des dates

**Vérifier d'abord :** AGENTS.md pour un skill date-fns installé.

### Fuseaux horaires

```typescript
import { addDays, addMonths, format, startOfMonth, endOfMonth } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

const LOME_TZ = 'Africa/Lome'; // UTC+0, pas de DST — mais on reste explicite

// Affichage côté utilisateur (rare en backend — généralement dans les emails et PDFs)
export function formatForLome(date: Date): string {
  return format(utcToZonedTime(date, LOME_TZ), 'dd/MM/yyyy HH:mm');
}

// Conversion d'une date civile à Lomé en timestamp UTC pour stockage
export function startOfDayLomeAsUtc(date: Date): Date {
  return zonedTimeToUtc(format(date, 'yyyy-MM-dd 00:00:00'), LOME_TZ);
}

// Calcul d'échéance — toujours en UTC en base, conversion à l'affichage
export function nextDueDate(currentDue: Date, frequency: PaymentFrequency): Date {
  const monthsByFrequency = { MONTHLY: 1, QUARTERLY: 3, BIANNUAL: 6, ANNUAL: 12 };
  return addMonths(currentDue, monthsByFrequency[frequency]);
}
```

**Règles :**

- Toutes les dates en base sont en **UTC** (`@db.Timestamptz` Prisma) — jamais en heure locale
- La conversion en heure de Lomé se fait uniquement à l'affichage (emails, PDFs) — jamais en base
- `LOME_TZ = 'Africa/Lome'` (UTC+0, sans DST) — explicite plutôt que supposé
- Locale `fr` toujours importée pour tout formatage de date destiné à un humain
- Jamais de manipulation de date manuelle (concaténation de chaînes) — toujours via les fonctions date-fns

---

## nanoid — Tokens d'invitation et identifiants courts

**Vérifier d'abord :** AGENTS.md pour un skill nanoid installé.

```typescript
import { customAlphabet, nanoid } from 'nanoid';

// Token d'invitation locataire — 32 caractères URL-safe
export function generateInvitationToken(): string {
  return nanoid(32);
}

// Code OTP réinitialisation — 6 chiffres
const otpAlphabet = customAlphabet('0123456789', 6);
export function generateOtp(): string {
  return otpAlphabet();
}

// Identifiant de fichier court — 12 caractères sans ambiguïté
const fileIdAlphabet = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 12);
export function generateFileId(): string {
  return fileIdAlphabet();
}
```

**Règles :**

- `nanoid()` standard pour les tokens d'invitation (URL-safe, 32 caractères = entropie suffisante)
- `customAlphabet` pour les codes lisibles par un humain — alphabet sans `0/O/1/I/l` pour éviter les confusions
- Jamais `Math.random()` pour générer un token de sécurité — toujours `nanoid` ou `crypto.randomBytes`
- Les IDs Prisma sont des UUID (générés en DB) — `nanoid` ne sert que pour les tokens et identifiants utilisateur
