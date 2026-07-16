# Architecture Context — WARAH Backend

Ce document décrit l'architecture du backend WARAH — la plateforme de gestion locative immobilière pour le marché togolais. Il fixe les frontières des modules, le modèle de stockage, le modèle d'authentification et les invariants non négociables que l'ensemble du code doit respecter.

Périmètre : backend uniquement (API REST consommée par un frontend Angular géré dans un dépôt séparé). Hébergement Railway. Périmètre métier strictement Togo en V1 (FCFA, français, fuseau `Africa/Lome`).

---

## Stack

| Layer              | Technology                          | Role                                                                                         |
| ------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| Framework          | NestJS 10+ + TypeScript strict      | Structure modulaire, controllers, services, DTOs, guards, interceptors, pipes, decorators    |
| ORM                | Prisma                              | Accès base de données type-safe, migrations versionnées, génération du client typé           |
| Database           | PostgreSQL (via Supabase)           | Persistance de toutes les données métier et techniques                                       |
| Auth               | Supabase Auth                       | Inscription, connexion, gestion des mots de passe, émission des JWT                          |
| File Storage       | Supabase Storage                    | Photos de biens, documents administratifs, pièces d'identité, justificatifs                  |
| Email              | Resend                              | Envoi transactionnel (auth, OTP, quittances, rappels, alertes, rapports)                     |
| Push Notifications | `web-push` (VAPID)                  | Notifications push web vers les navigateurs des utilisateurs ayant consenti                  |
| Mobile Money       | Cashpay (Semoa)                     | Encaissement T-Money (Togocom) et Flooz (Moov Africa) + webhook de confirmation              |
| OCR                | Tesseract.js                        | Vérification automatique des cartes nationales d'identité togolaises                         |
| PDF                | PDFKit                              | Génération à la volée des quittances, rapports mensuels, exports, factures                   |
| XLSX               | ExcelJS                             | Export des paiements en format tableur, en streaming                                         |
| Image processing   | sharp                               | Compression et conversion des photos uploadées vers WebP                                     |
| Validation         | class-validator + class-transformer | Validation des DTOs via `ValidationPipe` global et des variables d'environnement             |
| Cron Jobs          | `@nestjs/schedule`                  | Rappels d'échéance, alertes d'impayés, blocage d'inactivité, rapports mensuels, prélèvements |
| Events             | `@nestjs/event-emitter`             | Événements internes asynchrones (`payment.confirmed`, etc.)                                  |
| HTTP Client        | axios + p-retry                     | Appels sortants Cashpay avec timeouts et retry borné                                         |
| Logging            | nestjs-pino + pino                  | Logging structuré JSON avec correlation ID et redaction des données sensibles                |
| Monitoring         | `@sentry/node`                      | Capture des exceptions non gérées et erreurs 5xx en production                               |
| API Docs           | `@nestjs/swagger`                   | Documentation OpenAPI accessible sur `/api/docs` en dev                                      |
| Health Checks      | `@nestjs/terminus`                  | Endpoints `/health/live` et `/health/ready` pour Railway                                     |
| Rate Limiting      | `@nestjs/throttler`                 | Quotas globaux et endpoint-spécifiques (anti-spam, anti-replay)                              |
| Security Headers   | helmet                              | Headers HTTP de sécurité (HSTS, X-Frame-Options, etc.)                                       |
| Date Handling      | date-fns + date-fns-tz              | Manipulation des dates et conversion UTC ↔ Lomé                                              |
| Hosting            | Railway                             | Conteneur Docker avec auto-deploy depuis Git, cron Railway, monitoring de base               |

---

## System Boundaries

Structure du projet, en respectant strictement la modularité NestJS.

- `src/main.ts` — bootstrap de l'application, configuration des middlewares globaux (helmet, body parser limit 1 Mo, ValidationPipe, Swagger en dev, Sentry, `enableShutdownHooks`)
- `src/app.module.ts` — module racine, enregistre les modules transverses (`PrismaModule`, `ConfigModule`, `LoggerModule`, `EventEmitterModule`, `ScheduleModule`, `ThrottlerModule`) et tous les modules métier
- `src/common/` — éléments transverses utilisables par tous les modules
  - `guards/` — `SupabaseAuthGuard`, `RolesGuard`
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
- `src/modules/payments/` — initialisation Cashpay, webhook Cashpay, saisie manuelle propriétaire/gestionnaire, déclaration locataire, historique, export
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
- Annonces (`Listing`) et demandes de contact (`ListingContact`)
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

### Supabase Auth

Source de vérité pour les credentials et les sessions :

- Email + mot de passe haché (jamais côté NestJS)
- Sessions JWT émises et signées par Supabase
- État de confirmation d'email
- Codes OTP de réinitialisation de mot de passe (table `PasswordResetOtp` côté Prisma, mais le mot de passe est mis à jour via l'API Supabase Admin)

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

- Inscription via Supabase Auth (`POST /api/auth/signup/owner` ou `/signup/manager` ou `/signup/tenant?token=...`) — création parallèle du `User` (avec `phone`/`city` obligatoires pour owner/manager) côté Prisma et du profil correspondant en une transaction
- Le rôle de l'utilisateur (`OWNER`, `TENANT`, `MANAGER`, `ADMIN`) est figé à l'inscription et stocké côté Prisma
- Pièce d'identité **facultative pour tous les rôles** (révisé le 2026-07-16, voir /architect — initialement obligatoire pour propriétaire/gestionnaire) : peut être fournie à l'inscription ou plus tard via `POST /api/identity/verify`
- Vérification CNI automatique via Tesseract.js (étape 07) — décision `VERIFIED` ou `REJECTED` en moins de 10 secondes, aucune validation humaine
- **Le verrou fonctionnel n'est plus l'inscription mais la création de bien** : `PropertiesService.create()` refuse tant que `idVerificationStatus !== VERIFIED` (`assertIdentityVerified()`, `src/common/permissions/identity-verified.ts`) — seul point de blocage dans tout le produit, aucune autre action n'en dépend
- Le statut de compte (`accountStatus`) est suivi côté Prisma : `ACTIVE`, `SUSPENDED_INACTIVITY`, `SUSPENDED_ADMIN`, `SUSPENDED_PAYMENT`

### Connexion

- Connexion par email + mot de passe via Supabase Auth — ouverture d'une session JWT directement, sans étape supplémentaire
- Pas de 2FA à la connexion (décision projet pour la V1)
- OTP par email à 6 chiffres utilisé uniquement pour la réinitialisation de mot de passe (cas « mot de passe oublié »), expiration 10 minutes, usage unique
- Blocage temporaire de 15 minutes après 5 tentatives de connexion échouées

### Validation des requêtes

- Tout endpoint authentifié est protégé par `SupabaseAuthGuard` (validation du JWT Supabase + synchronisation avec l'`User` Prisma + injection dans `request.user`)
- Les endpoints qui exigent un rôle sont annotés `@Roles(UserRole.OWNER)` et protégés par `RolesGuard`
- L'objet `request.user` est l'`User` Prisma — jamais l'`User` Supabase brut
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

- `POST /api/webhooks/cashpay` — webhook Cashpay (protégé par signature HMAC)
- `GET /api/public/listings` et `/api/public/listings/:slug` — annonces publiques
- `POST /api/public/listings/:id/contact` — formulaire de contact candidat (rate limité strictement)
- `GET /api/public/managers` et `/api/public/managers/:id` — annuaire des gestionnaires
- `GET /health/live` et `/health/ready` — sondes Railway

---

## External Integrations

### Supabase

Service unique pour Auth + Storage + Database. Le client `SupabaseAdminService` est partagé entre :

- `SupabaseAuthGuard` (validation des JWT)
- `StorageService` (upload, URLs signées, suppression)
- `AuthService` (création / suppression de comptes via l'API Admin)

`SUPABASE_SERVICE_ROLE_KEY` reste strictement côté serveur — jamais exposée au client, jamais loggée.

### Resend

Service email transactionnel utilisé via `EmailService`. Deux modes d'appel :

- **Direct** (`EmailService.sendEmail()`) — réservé aux emails d'authentification (`signup-confirmation`, `password-reset-otp`). Ne passe jamais par `NotifyService`.
- **Routé** (via `NotifyService.notifyUser()`) — tous les emails métier (quittance, rappel, alerte, rapport mensuel, etc.) passent par le routeur qui choisit push ou email selon les préférences de l'utilisateur.

Les templates HTML sont fournis par le client et stockés dans `src/modules/email/templates/`.

### web-push (VAPID)

Notifications push web vers les navigateurs ayant consenti. Une `PushSubscription` qui retourne `410 Gone` ou `404` est supprimée immédiatement. Le `WebPushService` est appelé exclusivement par `NotifyService` — jamais directement depuis un controller ou un service métier.

### Cashpay

Agrégateur de paiement mobile money. Deux flux :

- **Sortant — Initialisation** : `POST` vers l'API Cashpay avec axios (timeout 10s, pas de retry — opération non idempotente). Crée une transaction et renvoie au locataire les instructions de paiement.
- **Entrant — Webhook** : Cashpay appelle `POST /api/webhooks/cashpay` à la confirmation du paiement. Signature HMAC vérifiée avant tout traitement. Idempotence stricte via contrainte unique sur `transactionId`. Réponse 2xx systématique quand la signature est valide.

L'événement `payment.confirmed` est émis après mise à jour réussie et déclenche en aval la génération de quittance et les notifications.

### Sentry

Monitoring d'erreurs en production. Capture les exceptions non gérées et les promesses rejetées. `tracesSampleRate: 0.1` maximum. Les exceptions 4xx attendues (`UnauthorizedException`, `BadRequestException`) sont filtrées dans `beforeSend`.

### Railway

Hébergement et CI/CD. Auto-deploy depuis Git. Variables d'environnement gérées dans le dashboard Railway. Les sondes `/health/live` et `/health/ready` permettent à Railway de décider si un conteneur doit recevoir du trafic.

---

## Background Jobs

Tous les jobs cron utilisent `@nestjs/schedule` et tournent dans le même conteneur NestJS. Les expressions cron sont centralisées dans `src/common/constants.ts`.

| Job                            | Fréquence               | Verrou Postgres | Rôle                                                                                                          |
| ------------------------------ | ----------------------- | :-------------: | ------------------------------------------------------------------------------------------------------------- |
| `reminders.task.ts`            | Toutes les heures       |       non       | Envoyer les rappels d'échéance aux locataires selon `reminderDaysBefore` configuré par chaque propriétaire    |
| `overdue.task.ts`              | Toutes les heures       |       non       | Détecter les échéances en retard, mettre à jour le statut `OVERDUE`, notifier le propriétaire/gestionnaire    |
| `pending-declaration.task.ts`  | Tous les jours à 8h UTC |       non       | Rappeler au propriétaire/gestionnaire les déclarations de paiement en attente depuis ≥ 3 jours puis ≥ 7 jours |
| `inactivity.task.ts`           | Tous les jours à 7h UTC |     **oui**     | Détecter et suspendre les comptes sans bien depuis 60 jours, envoyer les rappels J-30/J-7/J-1                 |
| `listing-suspension.task.ts`   | Tous les jours          |       non       | Suspendre les annonces actives depuis 90 jours sans contact                                                   |
| `monthly-reports.task.ts`      | Le 1er du mois à 8h UTC |     **oui**     | Générer et envoyer les rapports mensuels aux propriétaires mandants                                           |
| `subscription-billing.task.ts` | Le 1er du mois à 6h UTC |     **oui**     | Prélever les abonnements actifs via Cashpay, gérer les retries et suspensions                                 |

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
- **Alertes** configurées sur les seuils critiques (taux 5xx > 1 % sur 5 min, webhooks Cashpay en échec > 3 consécutifs, jobs cron qui n'ont pas tourné à l'heure prévue, latence p95 > 1s)

### Sauvegardes

- Sauvegardes Supabase automatiques activées (quotidiennes, chiffrées, rétention 30 jours)
- Restauration testée périodiquement
- Conservation légale des transactions financières sur 5 ans (obligation togolaise) — assurée par la non-suppression des `Payment`, `AuditLog` et `Lease` en base, même après suppression du compte utilisateur (anonymisation seulement)

---

## Invariants

Règles que le codebase ne doit **jamais** violer. Une violation est un bug critique à corriger immédiatement.

1. **Aucune logique métier dans les controllers.** Le controller valide la requête via DTO, appelle le service, formate la réponse. Toute condition métier vit dans le service.

2. **Toute action sur un bien passe par `canActOnProperty()`.** Aucune vérification d'autorisation inline (`if (property.ownerId === user.id)`) n'est tolérée dans les services métier.

3. **Le webhook Cashpay est strictement idempotent.** L'idempotence repose sur la contrainte unique côté DB sur `transactionId` — jamais sur une vérification applicative seule.

4. **Un paiement `source = CASHPAY_API` ne peut jamais être re-confirmé ni rejeté manuellement.** Le webhook est la source de vérité unique pour ces paiements. Les endpoints de confirmation manuelle rejettent toute action sur eux.

5. **Les quittances, rapports mensuels et factures d'abonnement ne sont jamais stockés.** Aucun modèle Prisma `Receipt`, `MonthlyReport`, `Invoice` ne stocke un PDF. Aucun bucket Storage ne les contient. Génération à la volée systématique.

6. **`NotifyService.notifyUser()` est le seul point d'entrée pour notifier un utilisateur d'un événement métier.** Aucun appel direct à `EmailService.sendEmail()` ni à `WebPushService.sendToUser()` depuis un service métier ou un cron.

7. **Les emails d'authentification ne passent jamais par `NotifyService`.** Confirmation d'inscription et OTP de réinitialisation appellent directement `EmailService` — ils doivent fonctionner même sans abonnement push.

8. **Jamais de hashage de mot de passe côté NestJS.** Pas de bcrypt, pas de table `password` locale. Supabase Auth gère l'intégralité du cycle de vie des credentials.

9. **Connexion par email + mot de passe directe, sans 2FA.** Aucun code OTP envoyé lors d'une connexion réussie.

10. **Toutes les dates en base sont en UTC** (`@db.Timestamptz`). La conversion en heure de Lomé se fait uniquement à l'affichage (PDFs, emails).

11. **Pagination obligatoire sur tout `findMany`.** `take` explicite avec plafond dur de 100 par page.

12. **Aucun N+1 toléré.** Toute boucle sur un résultat de `findMany` qui déclenche une nouvelle requête Prisma à chaque itération est un bug à corriger via `include` ou requête agrégée.

13. **Un `TenantProfile` ne peut avoir qu'un seul `Lease` en statut `ACTIVE` à un instant donné.** Contrainte unique partielle au niveau base de données. L'historique des baux précédents est conservé intégralement.

14. **Aucune commission n'est prélevée sur les loyers.** 100 % du montant payé par le locataire revient au propriétaire. La seule source de revenu de la plateforme est l'abonnement mensuel.

15. **Les request handlers ne lancent jamais de travail long bloquant.** Toute opération longue (génération PDF lourde, OCR, prélèvements) est soit asynchrone (événement + écouteur), soit dans un cron, soit dans un endpoint dédié qui répond rapidement avec un statut `PROCESSING`.

16. **Les migrations Prisma sont rétrocompatibles.** Jamais `DROP COLUMN` ou `RENAME COLUMN` dans la même release qu'un changement de code. Toujours en deux temps : déprécier l'usage côté code, puis supprimer la colonne au cycle suivant.

17. **Les variables d'environnement sont validées au démarrage.** Si une variable obligatoire manque, l'application crashe immédiatement avec un message clair — jamais de démarrage silencieux suivi d'un échec à la première requête.

18. **Aucun PDF, rapport ou export n'est généré côté client.** Tout passe par le backend qui stream directement dans la `Response` HTTP. Le frontend ne fait que déclencher le téléchargement.

19. **Aucune URL publique permanente pour un fichier privé.** Toute URL servie au client est signée avec expiration 15 minutes maximum.

20. **Aucun déploiement en production sans tests d'intégration passants sur les flows critiques** : webhook Cashpay (idempotence), déclaration locataire → confirmation, auth Supabase, mandats, calcul des échéances, blocage 2 mois, `canActOnProperty()`.
