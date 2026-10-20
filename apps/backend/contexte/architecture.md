# Architecture Context — WARAH Backend

Ce document décrit l'architecture du backend WARAH — la plateforme de gestion locative immobilière pour le marché togolais. Il fixe les frontières des modules, le modèle de stockage, le modèle d'authentification et les invariants non négociables que l'ensemble du code doit respecter.

Périmètre : backend uniquement (API REST consommée par un frontend Next.js, `apps/frontend/`, dans le même dépôt). Hébergement Railway. Périmètre métier strictement Togo en V1 (FCFA, français, fuseau `Africa/Lome`).

---

## Stack

| Layer              | Technology                          | Role                                                                                             |
| ------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| Framework          | NestJS 10+ + TypeScript strict      | Structure modulaire, controllers, services, DTOs, guards, interceptors, pipes, decorators        |
| ORM                | Prisma                              | Accès base de données type-safe, migrations versionnées, génération du client typé               |
| Database           | PostgreSQL (via Supabase)           | Persistance de toutes les données métier et techniques                                           |
| Auth               | Interne (NestJS + bcrypt + JWT)     | Inscription, connexion, gestion des mots de passe, émission/rotation des JWT (depuis 2026-08-11) |
| File Storage       | Supabase Storage                    | Photos de biens, documents administratifs, pièces d'identité, justificatifs                      |
| Email              | Resend                              | Envoi transactionnel (auth, OTP, quittances, rappels, alertes, rapports)                         |
| Push Notifications | `web-push` (VAPID)                  | Notifications push web vers les navigateurs des utilisateurs ayant consenti                      |
| Mobile Money       | PayDunya                            | Encaissement T-Money (Togocom) et Flooz (Moov Africa) + webhook (IPN) de confirmation            |
| OCR                | Tesseract.js                        | Vérification automatique des cartes nationales d'identité togolaises                             |
| PDF                | PDFKit                              | Génération à la volée des quittances, rapports mensuels, exports, factures                       |
| XLSX               | ExcelJS                             | Export des paiements en format tableur, en streaming                                             |
| Image processing   | sharp                               | Compression et conversion des photos uploadées vers WebP                                         |
| Validation         | class-validator + class-transformer | Validation des DTOs via `ValidationPipe` global et des variables d'environnement                 |
| Cron Jobs          | `@nestjs/schedule`                  | Rappels d'échéance, alertes d'impayés, blocage d'inactivité, rapports mensuels, prélèvements     |
| Events             | `@nestjs/event-emitter`             | Événements internes asynchrones (`payment.confirmed`, etc.)                                      |
| HTTP Client        | axios + p-retry                     | Appels sortants PayDunya (timeout, retry borné réservé aux opérations idempotentes)              |
| Logging            | nestjs-pino + pino                  | Logging structuré JSON avec correlation ID et redaction des données sensibles                    |
| Monitoring         | `@sentry/node`                      | Capture des exceptions non gérées et erreurs 5xx en production                                   |
| API Docs           | `@nestjs/swagger`                   | Documentation OpenAPI accessible sur `/api/docs` en dev                                          |
| Health Checks      | `@nestjs/terminus`                  | Endpoints `/health/live` et `/health/ready` pour Railway                                         |
| Rate Limiting      | `@nestjs/throttler`                 | Quotas globaux et endpoint-spécifiques (anti-spam, anti-replay)                                  |
| Security Headers   | helmet                              | Headers HTTP de sécurité (HSTS, X-Frame-Options, etc.)                                           |
| Date Handling      | date-fns + date-fns-tz              | Manipulation des dates et conversion UTC ↔ Lomé                                                  |
| Hosting            | Railway                             | Conteneur Docker avec auto-deploy depuis Git, cron Railway, monitoring de base                   |

---

## System Boundaries

Structure du projet, en respectant strictement la modularité NestJS.

- `src/main.ts` — bootstrap de l'application, configuration des middlewares globaux (helmet, body parser limit 1 Mo, ValidationPipe, Swagger en dev, Sentry, `enableShutdownHooks`)
- `src/app.module.ts` — module racine, enregistre les modules transverses (`PrismaModule`, `ConfigModule`, `LoggerModule`, `EventEmitterModule`, `ScheduleModule`, `ThrottlerModule`) et tous les modules métier
- `src/common/` — éléments transverses utilisables par tous les modules
  - `guards/` — `JwtAuthGuard`, `RolesGuard`
  - `interceptors/` — `AuditLogInterceptor` (logging structuré des actions critiques)
  - `pipes/` — pipes de validation personnalisés si nécessaire
  - `decorators/` — `@CurrentUser()`, `@Roles()`, `@Public()`
  - `permissions/` — `canActOnProperty()` et autres helpers d'autorisation
  - `constants.ts` — constantes métier (forfaits, quotas, OTP, durées, expressions cron)
  - `filters/` — `AllExceptionsFilter` global
- `src/config/` — validation et chargement des variables d'environnement via `class-validator`
- `src/prisma/` — `PrismaService` (injectable, singleton via module global) et `PrismaModule`
- `src/modules/auth/` — inscription propriétaire/locataire/gestionnaire, login, OTP reset password, gestion des invitations
- `src/modules/identity/` — vérification automatique de la CNI togolaise via Tesseract.js
- `src/modules/users/` — gestion du profil utilisateur (modification infos, photo, préférences de notification, suppression RGPD)
- `src/modules/properties/` — CRUD biens immobiliers, statuts, photos et documents associés
- `src/modules/tenants/` — blocage locataire↔bien (`TenantPropertyBlock`), historiques baux par bien et par locataire (la création/invitation du locataire reste dans `src/modules/auth/`, voir unité 14)
- `src/modules/leases/` — création et résiliation des baux, génération du calendrier d'échéances (`POST /api/leases`, `POST /api/leases/:id/terminate`)
- `src/modules/payments/` — initialisation PayDunya, webhook PayDunya, saisie manuelle propriétaire/gestionnaire, déclaration locataire, historique, export
- `src/modules/receipts/` — génération à la volée des quittances PDF (jamais stockées)
- `src/modules/listings/` — publication d'annonces, page publique, contact candidat, modération
- `src/modules/mandates/` — création/révocation des mandats gestionnaire ↔ propriétaire ↔ bien, transfert des droits opérationnels
- `src/modules/manager-reports/` — génération à la volée des rapports mensuels gestionnaire
- `src/modules/subscriptions/` — forfaits Starter/Pro/Premium, quotas, prélèvements mensuels, période bêta, factures
- `src/modules/admin/` — endpoints d'administration (supervision, suspension, file de modération, gestion des litiges)
- `src/modules/dashboard/` — endpoints d'agrégats pour les tableaux de bord propriétaire, locataire, gestionnaire, administrateur
- `src/modules/notify/` — `NotifyService.notifyUser()` — point d'entrée unique de toute notification métier (routage push/email)
- `src/modules/email/` — `EmailService` + templates Resend (auth + métier)
- `src/modules/push/` — `WebPushService` + gestion des `PushSubscription`
- `src/modules/storage/` — `StorageService` wrappant Supabase Storage, compression sharp à l'upload
- `src/modules/supabase/` — `SupabaseAdminService` (client Supabase Admin partagé entre Auth Guard et Storage)
- `src/modules/scheduling/` — tâches planifiées (`reminders.task.ts`, `overdue.task.ts`, `inactivity.task.ts`, `monthly-reports.task.ts`, `subscription-billing.task.ts`, `listing-suspension.task.ts`)
- `src/modules/health/` — endpoints `/health/live` et `/health/ready`
- `prisma/` — `schema.prisma` et `migrations/` (versionnées en Git)

Aucune logique métier ne vit hors d'un module dédié. `app.module.ts` ne fait que composer.

---

## Storage Model

Trois zones de stockage distinctes, chacune avec un rôle unique.

### PostgreSQL (via Prisma)

Source de vérité pour toutes les données métier et techniques :

- Utilisateurs et profils (`User`, `OwnerProfile`, `TenantProfile`, `ManagerProfile`, `AdminProfile`) avec leur `accountStatus`
- Biens immobiliers (`Property`) et leurs statuts
- Métadonnées des fichiers uploadés (`PropertyPhoto`, `PropertyDocument` — la donnée binaire vit dans Supabase Storage)
- Baux (`Lease`) et calendrier d'échéances (`PaymentScheduleEntry`) générés à la création du bail
- Paiements (`Payment`) avec leur `source` (`CASHPAY_API` / `MANUAL_OWNER` / `TENANT_DECLARATION`) et leur statut
- Déclarations de paiement par le locataire (`PaymentDeclaration`)
- Annonces (`Listing`)
- Mandats gestionnaire ↔ propriétaire (`Mandate`)
- Avis sur les gestionnaires (`ManagerReview`)
- Abonnements (`Subscription`) et historique des factures (`SubscriptionInvoice`)
- Vérifications CNI (`IdentityVerification`) avec le texte OCR brut conservé pour ajustement futur
- Abonnements push web (`PushSubscription`)
- Journal d'audit (`AuditLog`) pour la traçabilité légale des transactions financières

### Supabase Storage (6 buckets privés)

Stockage des fichiers binaires uploadés par les utilisateurs. Tous les buckets sont privés — accès uniquement via URL signée (expiration 15 minutes max).

| Bucket               | Contenu                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `property-photos`    | Photos uploadées par le propriétaire/gestionnaire, compressées via sharp (WebP, max 1920px)                                       |
| `property-documents` | États des lieux, titres, contrats d'assurance, documents administratifs du bien                                                   |
| `id-documents`       | Cartes nationales d'identité uploadées pour vérification OCR (qualité préservée, non compressée)                                  |
| `manager-documents`  | Références professionnelles des gestionnaires                                                                                     |
| `payment-proofs`     | Photos justificatives uploadées soit par le locataire (déclaration) soit par le propriétaire/gestionnaire (confirmation manuelle) |
| `profile-photos`     | Photo de profil de l'utilisateur (tous rôles) — ajouté à l'étape 10, compressée via sharp comme `property-photos`                 |

### Authentification interne (depuis le 2026-08-11)

Supabase Auth a été entièrement retiré (voir invariant #8) — source de
vérité désormais 100% côté Prisma/NestJS (`modules/auth/token.service.ts`) :

- Email + mot de passe haché en bcrypt (`User.passwordHash`)
- Access token JWT (15 min) + refresh token opaque stocké hashé (SHA-256) dans `Session`, rotation à chaque `/auth/refresh`
- Codes OTP de réinitialisation de mot de passe (table `PasswordResetOtp`), mot de passe mis à jour directement côté Prisma
- `User.supabaseId` conservé nullable comme vestige — plus jamais renseigné pour un nouveau compte

### Ce qui n'est jamais stocké

| Document                           | Raison                                                                |
| ---------------------------------- | --------------------------------------------------------------------- |
| Quittances PDF                     | Toutes les données sont déjà en base ; générées à la volée par PDFKit |
| Rapports mensuels gestionnaire PDF | Idem                                                                  |
| Factures d'abonnement PDF          | Idem                                                                  |
| Exports de paiements PDF/XLSX      | Streamés directement vers la `Response` HTTP, jamais persistés        |

Aucun modèle Prisma `Receipt`, `MonthlyReport` ou `Invoice` ne stocke un binaire PDF. Aucun bucket Storage ne contient ces fichiers.

---

## Auth and Access Model

### Inscription et vérification

- Inscription (`POST /api/auth/signup/owner` ou `/signup/manager` ou `/signup/tenant?token=...`) — mot de passe hashé en bcrypt puis `User` (avec `phone`/`city` obligatoires pour owner/manager) et profil correspondant créés dans la même transaction Prisma
- Le rôle de l'utilisateur (`OWNER`, `TENANT`, `MANAGER`, `ADMIN`) est figé à l'inscription et stocké côté Prisma
- Pièce d'identité **facultative pour tous les rôles** (révisé le 2026-07-16, voir /architect — initialement obligatoire pour propriétaire/gestionnaire) : peut être fournie à l'inscription ou plus tard via `POST /api/identity/verify`
- Vérification CNI automatique via Tesseract.js (étape 07) — décision `VERIFIED` ou `REJECTED` en moins de 10 secondes, aucune validation humaine
- **Le verrou fonctionnel n'est plus l'inscription mais la création de bien** : `PropertiesService.create()` refuse tant que `idVerificationStatus !== VERIFIED` (`assertIdentityVerified()`, `src/common/permissions/identity-verified.ts`) — seul point de blocage dans tout le produit, aucune autre action n'en dépend
- Le statut de compte (`accountStatus`) est suivi côté Prisma : `ACTIVE`, `SUSPENDED_INACTIVITY`, `SUSPENDED_ADMIN`, `SUSPENDED_PAYMENT`

### Connexion

- Connexion par email + mot de passe (bcrypt.compare local) — émission directe d'un access token JWT + refresh token, sans étape supplémentaire
- Pas de 2FA à la connexion (décision projet pour la V1)
- OTP par email à 6 chiffres utilisé uniquement pour la réinitialisation de mot de passe (cas « mot de passe oublié »), expiration 10 minutes, usage unique
- Blocage temporaire de 15 minutes après 5 tentatives de connexion échouées

### Validation des requêtes

- Tout endpoint authentifié est protégé par `JwtAuthGuard` (vérification locale du JWT signé par `TokenService` + lookup `User` Prisma par `sub` + injection dans `request.user`, cache 30s)
- Les endpoints qui exigent un rôle sont annotés `@Roles(UserRole.OWNER)` et protégés par `RolesGuard`
- L'objet `request.user` est directement l'`User` Prisma
- Les comptes `SUSPENDED_ADMIN` voient leur JWT rejeté avec `401`. Les comptes `SUSPENDED_INACTIVITY` ou `SUSPENDED_PAYMENT` peuvent se connecter mais reçoivent `403 ACCOUNT_SUSPENDED` sur tout endpoint de mutation — **sauf** ceux annotés `@AllowWhileSuspended()`, réservés aux actions dont le but est justement de débloquer le compte (ex. `POST /properties`, voir build-plan.md unité 11/12)

### Autorisation par bien — `canActOnProperty()`

Le helper `canActOnProperty(user, propertyId)` dans `src/common/permissions/` est l'**autorité unique** pour décider qui peut agir sur un bien. Aucune vérification inline `if (property.ownerId === user.id)` n'est tolérée dans les services métier.

| Cas                                                |   `canRead`   | `canMutate` | Remarques                                                                                                     |
| -------------------------------------------------- | :-----------: | :---------: | ------------------------------------------------------------------------------------------------------------- |
| Propriétaire d'un bien **sans mandat actif**       |       ✓       |      ✓      | Tous les droits opérationnels                                                                                 |
| Propriétaire d'un bien **avec mandat actif**       |       ✓       |      ✗      | Lecture seule — voit les chiffres, reçoit les rapports mensuels                                               |
| Gestionnaire **mandataire** sur le bien            |       ✓       |      ✓      | Tous les droits opérationnels (création bail, saisie paiement, confirmation déclaration, publication annonce) |
| Gestionnaire **propriétaire** de ses propres biens |       ✓       |      ✓      | Comme un propriétaire classique                                                                               |
| Locataire actif sur le bien                        | ✓ (restreint) |      ✗      | Accès à son propre bail et ses propres paiements uniquement                                                   |
| Admin                                              |       ✓       |      ✓      | Accès complet                                                                                                 |
| Tout autre utilisateur                             |       ✗       |      ✗      | Refus systématique                                                                                            |

### Spécificité du locataire

- Un `TenantProfile` ne peut avoir qu'un seul `Lease` en statut `ACTIVE` à un instant donné — contrainte unique partielle au niveau de la base de données
- Le locataire ne peut consulter que son propre bail actif et ses propres paiements (`tenantUserId === user.id`)
- L'historique des baux passés et des paiements associés est conservé intégralement même quand le locataire change de bien — accessible via `GET /api/tenants/:id/leases/history`
- **Blocage locataire↔bien** (unité 14) : un propriétaire/gestionnaire peut bloquer un locataire pour **un bien précis**, avec justification obligatoire (`TenantPropertyBlock`) — jamais global au compte, jamais à l'échelle du propriétaire. Le même locataire reste invitable par ce même propriétaire pour un autre bien, ou par n'importe quel autre propriétaire. Vérifié à la fois dans `POST /api/auth/invite/tenant` (unité 09) et `POST /api/leases` (unité 15) via `assertTenantNotBlocked()` (`src/common/permissions/tenant-block.ts`), autorité unique — jamais de vérification inline ailleurs. Un blocage est refusé si un bail actif existe encore entre ce locataire et ce bien (résiliation d'abord requise).
- **Cycle de vie d'un bail** (unité 15) : `POST /api/leases` crée le bail, génère immédiatement tout le calendrier d'échéances connu (durée fixe ou 12 mois glissants pour un bail ouvert — pas de cron dédié, prolongation à la demande à l'unité 16) et fait passer le bien à `OCCUPIED`, en une seule transaction. `POST /api/leases/:id/terminate` libère le bien (`VACANT`) et purge les échéances futures jamais touchées par un paiement — les échéances passées ou en cours (même partiellement payées) restent intactes.
- **Accès à l'historique d'un locataire** (`GET /api/tenants/:id/leases/history`) : le locataire lui-même et un admin voient tous ses baux ; tout autre propriétaire/gestionnaire doit avoir eu au moins un bail (actif ou passé) avec ce locataire pour accéder à l'endpoint, mais ne voit alors que **ses propres baux avec lui**, jamais ceux liés à un propriétaire tiers — la relation est un filtre appliqué à la requête elle-même (même principe que `propertyVisibilityWhere()`), jamais une simple porte d'entrée tout-ou-rien (voir /review unité 14, fuite de confidentialité corrigée).

### Spécificité du gestionnaire

- Le rôle `MANAGER` est en réalité un super-`OWNER` : il peut posséder ses propres biens (avec tous les droits d'un propriétaire dessus) ET être mandataire de biens d'autres propriétaires
- Le quota d'abonnement du gestionnaire ne porte que sur ses biens propres — les biens sous mandat entrent dans le quota du propriétaire mandant

### Endpoints publics

Quelques endpoints sont volontairement non authentifiés et marqués `@Public()` :

- `POST /api/payments/webhooks/paydunya` — IPN PayDunya (pas de signature — vérité toujours revérifiée auprès de PayDunya, voir section PayDunya ci-dessous)
- `GET /api/pay-links/:token` et `POST /api/pay-links/:token/initiate` — lien de paiement public sans connexion (unité 43) : le jeton signé de l'URL est la seule autorisation, portier à deux niveaux (voir section « Lien de paiement public »)
- `GET /api/webhooks/whatsapp` (poignée de main, jeton `WHATSAPP_VERIFY_TOKEN`) et `POST /api/webhooks/whatsapp` (signature `X-Hub-Signature-256` sur le corps brut) — webhook Meta (unité 44) : hors limite de débit et hors table d'audit (`@SkipAuditLog()`), voir section « WhatsApp Cloud API (Meta) »
- `GET /api/public/listings` et `/api/public/listings/:slug` — annonces publiques
- `POST /api/public/listings/:id/contact` — formulaire de contact candidat (rate limité strictement)
- `GET /api/public/managers` et `/api/public/managers/:id` — annuaire des gestionnaires
- `GET /health/live` et `/health/ready` — sondes Railway

---

## External Integrations

### Supabase

Service pour Storage + Database uniquement depuis le 2026-08-11 (Auth
retiré, voir invariant #8). Le client `SupabaseAdminService` est utilisé par :

- `StorageService` (upload, URLs signées, suppression)
- `AdminService`/`ProfileService` (nettoyage best-effort d'éventuels comptes Auth legacy — `if (user.supabaseId)`)
- `PrismaService` (ping HTTP de réveil du projet gratuit via `SUPABASE_ANON_KEY`)

`SUPABASE_SERVICE_ROLE_KEY` reste strictement côté serveur — jamais exposée au client, jamais loggée.

### Resend

Service email transactionnel utilisé via `EmailService`. Deux modes d'appel :

- **Direct** (`EmailService.sendEmail()`) — réservé aux emails d'authentification (`signup-confirmation`, `password-reset-otp`). Ne passe jamais par `NotifyService`.
- **Routé** (via `NotifyService.notifyUser()`) — tous les emails métier (quittance, rappel, alerte, rapport mensuel, etc.) passent par le routeur qui choisit push ou email selon les préférences de l'utilisateur.

Les templates HTML sont fournis par le client et stockés dans `src/modules/email/templates/`.

### web-push (VAPID)

Notifications push web vers les navigateurs ayant consenti. Une `PushSubscription` qui retourne `410 Gone` ou `404` est supprimée immédiatement. Le `WebPushService` est appelé exclusivement par `NotifyService` — jamais directement depuis un controller ou un service métier.

### PayDunya

**Construit le 2026-09-07** (`/architect` le même jour) — agrégateur mobile money togolais (T-Money, Moov/Flooz). Remplace Cashpay dans le build-plan original (jamais réellement engagé, le client a finalement choisi PayDunya). Deux flux :

- **Hôtes distincts par mode** — `https://app.paydunya.com/sandbox-api/v1` (test) vs `https://app.paydunya.com/api/v1` (live), voir `PaydunyaService`. Bug réel trouvé le 2026-09-11 (doc officielle transmise par le N+1 du développeur) : le code tapait toujours sur l'hôte production, avec des clés test — corrigé. **En-têtes** : seuls `PAYDUNYA-MASTER-KEY`/`PAYDUNYA-PRIVATE-KEY`/`PAYDUNYA-TOKEN` sont requis pour créer/confirmer une facture (`PAYDUNYA-PUBLIC-KEY` n'est jamais envoyée — non nécessaire pour ces deux endpoints).
- **Sortant — Initialisation** (`PaydunyaService.createInvoice()`) : `POST /checkout-invoice/create` avec axios (timeout 15s, **volontairement sans retry — opération non idempotente**, un retry après un timeout dont la réponse s'est perdue créerait une seconde facture orpheline chez PayDunya). Crée une facture et renvoie au locataire une `checkoutUrl` hébergée par PayDunya (choix de l'opérateur mobile money sur leur page, pas imposable côté WARAH — voir `PaydunyaService.operatorCodeFor()`, actuellement non appelé).
- **Entrant — Webhook (IPN)** : PayDunya appelle `POST /api/payments/webhooks/paydunya?paymentId=...` à la confirmation. **Pas de signature vérifiable** (contrairement à ce qui était anticipé pour Cashpay — doc PayDunya reçue confirme un simple POST sans HMAC) : le `paymentId` vient du `callback_url` que WARAH construit lui-même à l'initiation, jamais du corps de la requête ; la vérité du statut est **toujours revérifiée** auprès de PayDunya (`GET /checkout-invoice/confirm/:token`, avec nos propres clés) avant toute écriture — le payload entrant ne sert qu'à savoir _quand_ revérifier. Réponse 2xx systématique (le webhook ne doit jamais échouer visiblement pour PayDunya).
- **Idempotence réelle** (pas seulement applicative, voir invariant #3) : chaque transition d'état passe par un `updateMany({ where: { id, status: 'PENDING' } })` plutôt qu'un `findUnique` + `update` séparés — un seul appel concurrent (webhook ou cron) peut faire gagner la course, Postgres verrouillant la ligne le temps de l'`UPDATE`.
- **Filet de sécurité** : `PaydunyaReconciliationTask` (cron, `*/15 * * * *`) revérifie tout `Payment` `PAYDUNYA_API`/`PENDING` resté bloqué >15 min (webhook jamais reçu), bascule en `REJECTED` après 24h sans confirmation.

L'événement `payment.confirmed` est émis après mise à jour réussie et déclenche en aval la génération de quittance et les notifications.

Pas de prélèvement automatique (unité 36 explicitement abandonnée, décision du développeur) — seuls des rappels email sont envoyés, le locataire paie de son propre chef via `POST /api/payments/initiate`.

### Lien de paiement public — depuis 2026-10-09 (phase 12, unité 43)

Paiement d'un loyer sans connexion, à partir d'un lien `FRONTEND_URL/payer/<jeton>` (pages Next.js publiques `/payer/[token]` et `/merci`).

- **Jeton** : `signed-token.ts`, usage `pay-link`, contient uniquement l'identifiant de l'échéance ; expire à l'échéance + 30 jours (`PAY_LINK_VALID_DAYS_AFTER_DUE`). Signé avec `PAY_LINK_SECRET` (obligatoire, distinct d'`INVITATION_TOKEN_SECRET`). Fabriqué par `PayLinksService.createPayLink()` (rappels et robot WhatsApp, unités 46-47).
- **Règles du paiement non dupliquées** : `PaymentsService.initiateForEntry()` / `quoteEntry()` partagés avec le paiement de l'espace locataire (solde restant, frais, numéro de reversement, un seul paiement PayDunya en cours par échéance). Retour PayDunya vers les pages publiques, jamais vers l'espace locataire.
- **Affichage minimal** (`PayLinkView`) : prénom, type de bien et immeuble, quartier et ville, période, montants, état. Jamais nom de famille, téléphone, adresse précise, propriétaire ni autres paiements — le lien peut avoir été transféré. Une échéance supprimée répond « Lien invalide », comme un jeton falsifié.
- **Portier à deux niveaux** (`common/throttle/pay-link-throttlers.ts`, throttlers nommés ignorés hors des routes `@PayLinkThrottled()`) : ouverture de page 60/min par adresse et 10/min par adresse + lien ; lancement du paiement 20/min et 5/min. La clé « par lien » n'utilise que `tokenFingerprint()`. La limite générale `default` (100/min) reste active. Stockage en mémoire : valable tant qu'il n'y a qu'un conteneur ; plusieurs instances exigeraient un stockage partagé (Redis).
- **Adresse IP cliente** : `req.ip`, calculée par Express selon `TRUST_PROXY_HOPS` (nombre exact de proxys, jamais `true` ; 0 par défaut). Un `X-Forwarded-For` forgé par le client est ignoré. Valeur Railway à confirmer en staging avec `TRUST_PROXY_DIAGNOSTIC=true` (journalise le nombre d'adresses, jamais les adresses), puis remettre à false.
- **Jetons hors des journaux** : URL masquée dans le sérialiseur Pino et dans Sentry backend et frontend (`maskSensitiveUrl`, `scrubSentryEvent` : erreurs, traces, fil d'Ariane), jetons d'invitation compris. `Referrer-Policy: no-referrer` sur `/payer/*` (`next.config.ts`) pour que le jeton ne parte pas chez PayDunya via l'en-tête Referer. Limite acceptée : les journaux du proxy Railway, hors de notre contrôle (le jeton n'ouvre qu'un loyer et expire).
- **Hors du code** : la protection contre les attaques distribuées relève de l'infrastructure (Railway, éventuellement un CDN type Cloudflare), pas d'un compteur NestJS.

### WhatsApp Cloud API (Meta) — fondations depuis 2026-10-08 (phase 12)

Canal de notification et futur chatbot locataire. **Seul le module `whatsapp-channel` appelle l'API Graph** (`WhatsappCloudClient`, axios, non exporté) ; les services métier passent par `WhatsappService`.

- **Invariant d'appels** : `send()` fait au plus **un** appel à Meta, `sendDocument()` au plus **deux** (téléversement puis envoi). Aucun appel Meta n'est répété automatiquement dans la même requête — Meta n'offre pas de clé d'idempotence, un second appel après une réponse perdue enverrait le message deux fois.
- **Droit d'envoyer** : `WhatsappAccessService.canUseWhatsapp()` est la seule autorité — interrupteur `WHATSAPP_ENABLED`, consentement `ACCEPTED`, numéro exploitable (`whatsappPhone` sinon `phone`), **numéro vérifié** (`whatsappVerifiedPhone` = ce numéro, unité 45), forfait du responsable du bien (`resolveResponsibleUserId()`) présent dans `PlatformSettings.whatsappEnabledTiers`. Un refus ne crée aucune ligne `WhatsappMessage` et ne bloque jamais l'email/push.
- **Statuts** (`WhatsappMessageStatus`), classés selon ce que l'on sait du message : `QUEUED` (intention enregistrée, appel en cours), `SENT` (2xx + `wamid`), `FAILED` (refus déterministe de Meta, rien n'est parti), `UNKNOWN` (timeout, coupure, erreur générique, 2xx sans `wamid` : on ne sait pas). Le caractère réessayable est une colonne distincte (`retryable`). **Un `UNKNOWN`, ou un `QUEUED` de plus de 10 minutes, n'est jamais renvoyé automatiquement.**
- **Classification** : `classifyMetaError({ httpStatus, errorCode, errorSubcode })` d'après la grille déclarée en données `meta-error-grid.ts` (source : grille officielle Meta) — tout code absent de la grille donne `UNKNOWN` non réessayable + alerte Sentry.
- **Document** : un téléversement incertain donne `FAILED` réessayable (`errorCode = MEDIA_UPLOAD_UNCERTAIN`) — le locataire n'a rien reçu ; un envoi incertain après téléversement donne `UNKNOWN`. Les PDF ne sont jamais stockés chez WARAH (invariant #5) ; Meta garde le média téléversé 30 jours.
- **`biz_opaque_callback_data`** = id de la ligne `WhatsappMessage`, renvoyé par Meta dans les webhooks de statut : c'est lui qui rattache un accusé à sa ligne (même restée sans `wamid`) et lève le doute d'un `UNKNOWN` (unité 44).
- **Webhook (unité 44, /architect 2026-10-13)** — module `whatsapp-webhook`, ordre imposé : signature vérifiée sur le corps brut (`main.ts` le garde pour cette seule route), **enregistrement**, réponse 200, traitement en arrière-plan. Réponses : signature fausse → 401 ; clé secrète absente → 503 ; erreur de base → 500 (Meta renvoie, le `wamid` unique évite les doublons) ; contenu inconnu ou autre `phone_number_id` → 200 sans effet. Le webhook reste ouvert même interrupteur `WHATSAPP_ENABLED` éteint (un STOP reçu pendant une coupure est enregistré).
- **Accusés de livraison** : `deliveredAt` / `readAt` à l'heure fournie par Meta, statut d'envoi inchangé dans son sens. Règles centralisées dans `applyStatusEvent()` (`status-transition.ts`) : jamais de retour en arrière, « lu » remplit « livré » s'il manque, un accusé positif sort un `QUEUED`/`UNKNOWN` vers `SENT`, un échec après « envoyé » est enregistré mais un échec après « livré »/« lu » (ou l'inverse) est incohérent et ignoré. Chaque accusé = **une seule écriture conditionnée à l'état lu** (compare-and-swap, recalculée si elle perd la course). Pas de « lu » ≠ pas lu (confirmations de lecture désactivables).
- **Messages reçus** : ligne `INBOUND` / statut `RECEIVED`, `recipientPhone` = numéro de l'expéditeur. Locataire connu (par `whatsappPhone`, sinon `phone`, **sous toutes ses formes enregistrables** — `storedPhoneVariants()`, car `phone` est stocké tel que saisi) : texte gardé dans le champ effaçable `body` ; choix de menu = identifiant + libellé ; média = référence Meta + type + légende (nom de fichier jamais gardé, média récupéré par l'unité 39 — Meta ne le garde qu'environ 30 jours) ; autres types = type seul. **Numéro inconnu : ni texte ni contenu.** Jamais de texte dans les journaux, Sentry (`scrubSentryEvent` retire le corps de cette route) ni `AuditLog`. Lecture du contenu réservée au propriétaire / gestionnaire mandaté (`canActOnProperty`, unité 48), jamais au super-administrateur.
- **Mots-clés STOP / OUI / REPRENDRE** (`consent-keyword.ts`) : le message ENTIER doit être le mot (minuscules, sans accents, espaces ni ponctuation finale) — `stop`/`arret`/`arreter`, `oui` ou la phrase pré-remplie du lien « Écrire à WARAH », `reprendre`. Le changement passe par `applyConsentCommand` **dans la transaction du message**, après la vérification du numéro. Une réponse n'est demandée que si l'état a réellement changé : confirmation de STOP via `sendStopConfirmation()` (seule exception à `canUseWhatsapp`, contrôlée par `canSendStopConfirmation` : interrupteur + numéro exploitable ET vérifié), bienvenue et confirmation de reprise via `WhatsappService.reply()`. L'arrêt ne dépend jamais de la confirmation.
- **Liste de travail durable** : un message reçu qui attend un traitement porte `inboundAction` (`STOP_CONFIRMATION`, `CONSENT_WELCOME`, `RESUME_CONFIRMATION`, demain le robot de l'unité 47), enregistré dans la même écriture que le message. Le signal `whatsapp.inbound` déclenche le traitement immédiat ; `whatsapp-inbound-recovery.task.ts` reprend ce qu'un redémarrage a interrompu. Chaque traitement « réserve » d'abord le message par une écriture conditionnelle ; 3 échecs → mis de côté + alerte Sentry.
- **Conservation** : à l'anonymisation du compte (`ProfileService.anonymize`), les messages WhatsApp perdent texte, contenu et numéro (`recipientPhone = "[anonymisé]"`), `whatsappPhone` et le numéro vérifié sont retirés, les 2 chiffres gardés dans l'historique effacés, et le canal arrêté (source `SYSTEM`, via `applyConsentCommand`). Les sauvegardes Supabase étant en rotation sur 30 jours, un texte effacé n'existe plus nulle part au-delà. Durée de conservation automatique (piste : 12 mois) à décider plus tard — le champ dédié la rend possible sans supprimer les lignes.
- **Données** : `payload` ne contient que les paramètres de rendu du modèle (champs choisis un par un, jamais un objet libre) — aucun secret, jeton ni code locataire. `recipientPhone` garde le numéro réellement utilisé (8 chiffres). Consentement historisé dans `WhatsappConsentEvent` ; après un STOP, seul le locataire peut réactiver.
- **Code locataire** (unité 45) : tiré au hasard par WARAH quand le locataire le demande dans son espace (`POST /api/me/whatsapp-pin`), **affiché une seule fois**, jamais trop simple (`isTrivialPin` : 000000, 123456, 121212, 123123…). Stocké sur `TenantProfile` en `bcrypt(HMAC-SHA256(WHATSAPP_PIN_PEPPER, code))` : la clé reste hors de la base (obligatoire au démarrage quand WhatsApp est allumé, 32 caractères minimum). Un nouveau code, un changement de numéro ou une réinitialisation par l'agence (qui ne le voit jamais) effacent l'ancien et remettent compteur et blocage à zéro. 5 essais puis blocage 1 h comptés par locataire (jamais par IP : tout arrive des serveurs Meta), appliqués par le robot (unité 47) ; alerte Sentry prévue à l'unité 47 si les échecs montent sur beaucoup de comptes. Jamais journalisé (ni le code, ni le HMAC, ni la clé ; masquage Pino `pin`).

### Consentement WhatsApp (unité 45, /architect 2026-10-16)

**Règle stricte : aucun message WhatsApp ne part tant que l'accord n'est pas valide ET le numéro vérifié.** Trois états distincts : numéro enregistré, numéro vérifié, accord.

- **États** (`WhatsappConsent`) : `NOT_ASKED`, `PENDING` (l'agence a déclaré l'accord, en attente du « OUI » du locataire), `ACCEPTED`, `STOPPED`. **Seul le locataire fait passer à `ACCEPTED`** (« OUI » à une demande valable, espace locataire, « REPRENDRE ») ; seul le locataire sort de `STOPPED`. L'agence peut seulement demander (→ `PENDING`, avec attestation et façon de recueillir l'accord : en personne / téléphone / écrit) ou noter un refus (→ `STOPPED`).
- **Une seule définition des transitions** : `decideConsent()` (`whatsapp-consent/consent-transition.ts`, fonction pure) ; **un seul point d'écriture** : `applyConsentCommand()` (`consent-writer.ts`), qui écrit l'état ET la ligne `WhatsappConsentEvent` dans la transaction fournie, par compare-and-swap (recalcul si une autre écriture est passée entre-temps). Utilisé par l'agence, l'espace locataire, le webhook et l'anonymisation — jamais d'écriture directe de `whatsappConsent`.
- **Demande d'accord** : une seule à la fois par locataire (une nouvelle remplace l'ancienne), liée au numéro, valable 7 jours (`WHATSAPP_CONSENT_REQUEST_TTL_MS`). Un « OUI » ne vaut accord que s'il répond à la demande en cours, depuis ce numéro, avant l'expiration ; sinon il vérifie seulement le numéro.
- **Ordre des messages** : `whatsappConsentChangedAt` = heure du dernier changement d'état ou de numéro (ne recule jamais). Un « OUI » / « REPRENDRE » dont l'heure Meta n'est pas strictement postérieure est ignoré (même seconde = ambigu = pas de réactivation). **Un STOP s'applique toujours**, même en retard (côté sûr).
- **Numéro vérifié** : tout message reçu d'un compte connu remplit `whatsappVerifiedPhone` (le numéro lui-même, pas seulement une date) — Meta authentifie l'expéditeur. Si le numéro utilisé change, par n'importe quel écran, il n'est plus vérifié. La vérification ne donne jamais d'accord. Si elle rend actif un accord déjà donné dans l'espace locataire, la bienvenue part en réponse (sinon le locataire n'aurait aucun retour).
- **Numéro principal changé depuis le profil** : pour un locataire sans numéro WhatsApp dédié (comptes d'avant l'unité 45), `ProfileService.updateProfile` applique le même changement de numéro (`newPhone: null`) dans la transaction de la mise à jour.
- **Badge de la liste « Locataires »** : la liste est en cache 15 s par utilisateur ; tout changement (agence, locataire, webhook) appelle `WhatsappConsentService.refreshAgencyLists()` qui vide le cache du propriétaire, du gestionnaire mandaté et de l'auteur de l'invitation (`CacheService.invalidateUser`).
- **Textes d'accord** : seule source dans `constants.ts` (`WHATSAPP_AGENCY_ATTESTATION_TEXT`, `WHATSAPP_TENANT_NOTICE_TEXT`), renvoyés par l'API avec leur version (`notice`) — le frontend ne les recopie jamais.
- **Changement de numéro** : remet à zéro l'accord (`NOT_ASKED`), la vérification et le code. Après un arrêt, l'agence ne peut pas changer le numéro ; le locataire le peut, l'arrêt reste. Historique : seulement les 2 derniers chiffres (`phoneLast2`). Un numéro ne désigne qu'un compte (toutes formes enregistrables vérifiées), refus au message neutre.
- **Preuve** (`WhatsappConsentEvent`) : nature (accord / changement de numéro), états avant/après, source, acteur, version du texte (`noticeVersion` = `WHATSAPP_CONSENT_NOTICE_VERSION`, `consentement-v1`, à incrémenter à chaque changement de texte), façon de recueillir l'accord, demande à laquelle répond un « OUI », heure Meta du message.
- **Fenêtre de 24 h** : toute réponse libre (sans modèle Meta) vérifie au moment de l'envoi que le message du locataire date de moins de 24 h (marge de 5 min, `isWithinReplyWindow`). « Sans modèle » ne veut pas dire gratuit : tarification Meta du compte à vérifier avant la production. Le modèle `bienvenue_locataire` est supprimé : la bienvenue est la réponse au « OUI ».
- **Revérification à l'envoi** : la bienvenue et la confirmation de reprise partent de la liste de travail et refont tous les contrôles (`canUseWhatsapp` + fenêtre) au moment de l'envoi — un STOP ou un changement de numéro arrivé entre-temps l'emporte. Un échec d'envoi ne touche jamais au consentement. Limite connue : un STOP arrivé pendant la seconde où Meta envoie déjà ne peut pas annuler ce message.
- **Jamais de publicité** : un seul accord couvre les messages de service (rappels, quittances, relances, assistance).
- **Routes** : agence (`OWNER`/`MANAGER`, `canActOnProperty` sur le bien du bail actif — lecture `canRead`, modification `canMutate`) `GET /api/tenants/:id/whatsapp`, `PATCH .../whatsapp-consent`, `POST .../whatsapp-consent/refusal`, `PATCH .../whatsapp-phone`, `POST .../whatsapp-pin/reset` ; locataire (compte connecté uniquement) `GET /api/me/whatsapp`, `PATCH /api/me/whatsapp-consent`, `PATCH /api/me/whatsapp-phone`, `POST /api/me/whatsapp-pin`. Le lien « Écrire à WARAH » (`contactLink`, QR code côté agence) vient de `WHATSAPP_BUSINESS_NUMBER`.
- **Retour arrière** : l'ancien code ne connaît pas `PENDING` — avant de le redéployer, `UPDATE "users" SET "whatsappConsent" = 'NOT_ASKED' WHERE "whatsappConsent" = 'PENDING';` (voir la migration `20261016090000_add_whatsapp_consent_verification`).
- **Bloquant production** : textes d'accord (attestation, espace locataire, phrase pré-remplie) à faire valider juridiquement ; configuration et tarification Meta à vérifier.

### Sentry

Monitoring d'erreurs en production. Capture les exceptions non gérées et les promesses rejetées. `tracesSampleRate: 0.1` maximum. Les exceptions 4xx attendues (`UnauthorizedException`, `BadRequestException`) sont filtrées dans `beforeSend`.

### Railway

Hébergement et CI/CD. Auto-deploy depuis Git. Variables d'environnement gérées dans le dashboard Railway. Les sondes `/health/live` et `/health/ready` permettent à Railway de décider si un conteneur doit recevoir du trafic.

---

## Background Jobs

Tous les jobs cron utilisent `@nestjs/schedule` et tournent dans le même conteneur NestJS. Les expressions cron sont centralisées dans `src/common/constants.ts`.

| Job                                                                | Fréquence               | Verrou Postgres | Rôle                                                                                                                                                                             |
| ------------------------------------------------------------------ | ----------------------- | :-------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reminders.task.ts`                                                | Toutes les heures       |     **oui**     | Envoyer les rappels d'échéance aux locataires selon `reminderDaysBefore` configuré par chaque propriétaire                                                                       |
| `overdue.task.ts`                                                  | Toutes les heures       |     **oui**     | Détecter les échéances en retard, mettre à jour le statut `OVERDUE`, notifier le propriétaire/gestionnaire                                                                       |
| `payment-declaration-reminders.task.ts` **(construit 2026-07-25)** | Tous les jours à 8h UTC |     **oui**     | Rappeler au propriétaire/gestionnaire les déclarations de paiement en attente depuis ≥ 3 jours puis ≥ 7 jours                                                                    |
| `inactivity.task.ts`                                               | Tous les jours à 7h UTC |     **oui**     | Détecter et suspendre les comptes sans bien depuis 60 jours, envoyer les rappels J-30/J-7/J-1                                                                                    |
| `listing-suspension.task.ts`                                       | Tous les jours          |       non       | Suspendre les annonces actives depuis 90 jours sans contact                                                                                                                      |
| `monthly-reports.task.ts`                                          | Le 1er du mois à 8h UTC |     **oui**     | Générer et envoyer les rapports mensuels aux propriétaires mandants                                                                                                              |
| `subscription-billing.task.ts`                                     | —                       |        —        | **Jamais construit — unité 36 explicitement abandonnée** (décision développeur, 2026-09-07) : pas de prélèvement à l'initiative du marchand, seuls des rappels email sont prévus |
| `paydunya-reconciliation.task.ts` **(construit 2026-09-07)**       | Toutes les 15 min       |     **oui**     | Revérifier auprès de PayDunya tout `Payment` `PAYDUNYA_API`/`PENDING` resté bloqué (webhook jamais reçu), basculer en `REJECTED` après 24h                                       |
| `whatsapp-inbound-recovery.task.ts` **(construit 2026-10-13)**     | Toutes les minutes      |     **oui**     | Reprendre les messages WhatsApp reçus dont le traitement a été interrompu (> 2 min sans fin), 3 essais au plus puis mise de côté + alerte Sentry                                 |

Les jobs marqués « verrou Postgres » utilisent `pg_try_advisory_lock` pour éviter la double exécution si plusieurs instances NestJS tournent en parallèle. Toute itération à l'intérieur d'une boucle est isolée dans son propre try/catch.

Toutes les expressions cron sont en UTC. Le Togo est en `Africa/Lome` (UTC+0, sans DST), donc une expression `0 8 * * *` correspond bien à 8h à Lomé.

---

## Production Topology

### Conteneur Railway

Un seul conteneur Docker exécutant NestJS. Pas d'architecture microservices en V1.

- `npx prisma migrate deploy` exécuté au démarrage du conteneur — les migrations rétrocompatibles sont appliquées automatiquement
- `app.enableShutdownHooks()` actif — gestion propre du `SIGTERM` envoyé par Railway au redéploiement
- `PrismaService` ferme proprement les connexions DB via `OnModuleDestroy`
- Le serveur HTTP attend jusqu'à 30 secondes la fin des requêtes en cours avant d'arrêter

### Variables d'environnement obligatoires

Validées au démarrage via `class-validator` dans `src/config/env.validation.ts` — crash immédiat si l'une manque, avec message clair. Liste complète documentée dans `code-standards.md`.

### Monitoring et alerting

- **Sentry** capture les erreurs 5xx et les exceptions non gérées en production
- **Logs structurés Pino** ingérés par Railway (et exportables si nécessaire vers un service externe)
- **Health checks** sondés par Railway en continu
- **Alertes** configurées sur les seuils critiques (taux 5xx > 1 % sur 5 min, webhooks PayDunya en échec > 3 consécutifs, jobs cron qui n'ont pas tourné à l'heure prévue, latence p95 > 1s)

### Sauvegardes

- Sauvegardes Supabase automatiques activées (quotidiennes, chiffrées, rétention 30 jours)
- Restauration testée périodiquement
- Conservation légale des transactions financières sur 5 ans (obligation togolaise) — assurée par la non-suppression des `Payment`, `AuditLog` et `Lease` en base, même après suppression du compte utilisateur (anonymisation seulement)

---

## Invariants

Règles que le codebase ne doit **jamais** violer. Une violation est un bug critique à corriger immédiatement.

1. **Aucune logique métier dans les controllers.** Le controller valide la requête via DTO, appelle le service, formate la réponse. Toute condition métier vit dans le service.

2. **Toute action sur un bien passe par `canActOnProperty()`.** Aucune vérification d'autorisation inline (`if (property.ownerId === user.id)`) n'est tolérée dans les services métier.

3. **Le webhook PayDunya est strictement idempotent.** Chaque transition d'état (`PaymentsService.reconcilePaydunyaPayment()`) passe par un `updateMany({ where: { id, status: 'PENDING' } })`, jamais un `findUnique` + `update` séparés — l'idempotence repose sur cette écriture conditionnelle atomique côté DB, jamais sur une vérification applicative seule. Le crédit de l'échéance associée utilise `paidAmount: { increment }` (jamais un `SET` sur une valeur lue avant l'appel réseau à PayDunya). Un seul `Payment` `PAYDUNYA_API` `PENDING` par échéance à la fois — index unique partiel `payments_schedule_entry_paydunya_pending_unique`, P2002 remappé en 409 dans `initiate()`. (Deux bugs de cette famille trouvés et corrigés en `/review` les 2026-09-07 et 2026-09-10.)

4. **Un paiement `source = PAYDUNYA_API` ne peut jamais être re-confirmé ni rejeté manuellement.** Le webhook/la réconciliation sont la source de vérité unique pour ces paiements. Les endpoints de confirmation manuelle rejettent toute action sur eux.

5. **Les quittances, rapports mensuels et factures d'abonnement ne sont jamais stockés.** Aucun modèle Prisma `Receipt`, `MonthlyReport`, `Invoice` ne stocke un PDF. Aucun bucket Storage ne les contient. Génération à la volée systématique.

6. **`NotifyService.notifyUser()` est le seul point d'entrée pour notifier un utilisateur d'un événement métier.** Aucun appel direct à `EmailService.sendEmail()` ni à `WebPushService.sendToUser()` depuis un service métier ou un cron. *Exception (phase 12, /review unité 44) :* les **réponses** WhatsApp à un message reçu — confirmation de STOP (`WhatsappService.sendStopConfirmation()`), puis réponses du robot (unité 47) — passent directement par `WhatsappService` : ce ne sont pas des notifications d'événement métier mais des réponses conversationnelles, envoyées dans la fenêtre de 24 h ouverte par le locataire.

7. **Les emails d'authentification ne passent jamais par `NotifyService`.** Confirmation d'inscription et OTP de réinitialisation appellent directement `EmailService` — ils doivent fonctionner même sans abonnement push.

8. **Authentification entièrement interne depuis le 2026-08-11 (revirement assumé de l'invariant précédent).** Mots de passe hashés en bcrypt (`User.passwordHash`), jamais en clair ni ailleurs. Sessions via access token JWT (15 min) + refresh token opaque stocké hashé (SHA-256) dans `Session`, avec rotation à chaque `/auth/refresh`. Tout ce cycle vit exclusivement dans `modules/auth/token.service.ts` — jamais de `bcrypt`/`jwt` utilisé directement ailleurs ; le code locataire à 6 chiffres du robot WhatsApp (bcrypt, `generatePin`/`hashPin`/`verifyPin`) y vit aussi. **Précision du 2026-10-08 (unité 42)** : les jetons HMAC autoporteurs (signature + expiration, vérifiés sans base) vivent dans `src/common/utils/` — `invitation-token.ts` (déjà en place depuis l'unité 09), `signed-token.ts` (générique, usage obligatoire dans la charge signée, sert au lien de paiement public) et `meta-signature.ts` (vérification `X-Hub-Signature-256` des webhooks Meta). Toute comparaison de signature s'y fait en temps constant (`timingSafeEqual`). `signed-token.ts` fournit aussi `tokenFingerprint()` (empreinte SHA-256 tronquée, non réversible) pour utiliser un jeton comme clé de limite de débit ou le masquer dans les journaux sans jamais le garder en clair (unité 43). Aucune autre primitive `crypto` hors de ces fichiers et de `token.service.ts`. Supabase ne sert plus que Postgres + Storage (voir `SupabaseAdminService`, conservé uniquement pour le nettoyage best-effort d'éventuels comptes legacy et l'API Storage).

9. **Connexion par email + mot de passe directe, sans 2FA.** Aucun code OTP envoyé lors d'une connexion réussie.

10. **Toutes les dates en base sont en UTC** (`@db.Timestamptz`). La conversion en heure de Lomé se fait uniquement à l'affichage (PDFs, emails).

11. **Pagination obligatoire sur tout `findMany`.** `take` explicite avec plafond dur de 100 par page.

12. **Aucun N+1 toléré.** Toute boucle sur un résultat de `findMany` qui déclenche une nouvelle requête Prisma à chaque itération est un bug à corriger via `include` ou requête agrégée.

13. **Un `TenantProfile` ne peut avoir qu'un seul `Lease` en statut `ACTIVE` à un instant donné.** Contrainte unique partielle au niveau base de données. L'historique des baux précédents est conservé intégralement.

14. **Aucune commission n'est prélevée sur les loyers.** 100 % du **loyer** revient au bénéficiaire (gestionnaire du mandat actif, sinon propriétaire — `resolveResponsibleUserId()`), sans aucun calcul de répartition par WARAH : gestionnaire et propriétaire règlent leur commission entre eux. Les frais PayDunya (encaissement + reversement) sont payés par le locataire EN PLUS du loyer (`Payment.feeAmount`, réglé par `TENANT_FEE_PERCENT`/`TENANT_FEE_FIXED_FCFA` au coût réel, jamais avec une marge — un frais supérieur au coût serait une commission déguisée) ; seul le loyer (`Payment.paidAmount`) est crédité à l'échéance, porté sur la quittance et reversé. La seule source de revenu de la plateforme est l'abonnement mensuel.

15. **Les request handlers ne lancent jamais de travail long bloquant.** Toute opération longue (génération PDF lourde, OCR, prélèvements) est soit asynchrone (événement + écouteur), soit dans un cron, soit dans un endpoint dédié qui répond rapidement avec un statut `PROCESSING`.

16. **Les migrations Prisma sont rétrocompatibles.** Jamais `DROP COLUMN` ou `RENAME COLUMN` dans la même release qu'un changement de code. Toujours en deux temps : déprécier l'usage côté code, puis supprimer la colonne au cycle suivant.

17. **Les variables d'environnement sont validées au démarrage.** Si une variable obligatoire manque, l'application crashe immédiatement avec un message clair — jamais de démarrage silencieux suivi d'un échec à la première requête.

18. **Aucun PDF, rapport ou export n'est généré côté client.** Tout passe par le backend qui stream directement dans la `Response` HTTP. Le frontend ne fait que déclencher le téléchargement.

19. **Aucune URL publique permanente pour un fichier privé.** Toute URL servie au client est signée avec expiration 15 minutes maximum.

20. **Un reversement de loyer ne part jamais deux fois.** (`PayoutsService`, /architect reversement 2026-09-25.) Un seul `Payout` par `Payment` (`paymentId` unique). Toute transition est un `updateMany` gardé par le statut attendu (`PENDING → SENDING → SUCCESS|FAILED`). Le jeton PayDunya est enregistré AVANT `submit-invoice`, et `submit-invoice` n'est appelé que si `check-status` affirme que le jeton est encore `created` — la doc PayDunya ne garantit pas que `disburse_id` dédoublonne. Une erreur ambiguë au moment de `submit` (timeout, réseau) laisse le `Payout` en `SENDING` : on vérifie son statut, on ne rejoue JAMAIS à l'aveugle. Le callback PayDunya n'est jamais cru (statut revérifié par `check-status`). Un paiement sans `beneficiaryUserId` (antérieur à la fonctionnalité) n'est jamais reversé rétroactivement. `POST /payments/initiate` refuse (409) tant que le bénéficiaire n'a pas de numéro et d'opérateur mobile money complets (`User.phone`/`User.payoutOperator`, révisé le 2026-09-28 : plus de numéro de réception séparé, c'est le même numéro que le compte, demandé à l'inscription) — on n'encaisse jamais un loyer qu'on ne saurait pas reverser.

21. **Aucun déploiement en production sans tests d'intégration passants sur les flows critiques** : webhook PayDunya (idempotence), déclaration locataire → confirmation, auth interne, mandats, calcul des échéances, blocage 2 mois, `canActOnProperty()`. _(Note : à ce jour, seuls des tests unitaires avec Prisma mocké couvrent le webhook PayDunya — aucun test e2e contre une vraie transaction concurrente. Le mock ne peut pas révéler une course comme celle trouvée en `/review` 2026-09-07.)_
