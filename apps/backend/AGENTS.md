---
description: Instructions for building WARAH backend
globs: *
alwaysApply: true
---

# WARAH Backend — Project Documentation Overview

## What is WARAH?

Plateforme de gestion locative immobilière pour le marché toogolais — propriétaires résidant au Togo ou dans la diaspora, gérant leurs biens à distance depuis un navigateur. Ce dépôt contient **uniquement le backend** (API REST NestJS consommée par un frontend Next.js hébergé séparément, `apps/frontend/`).

Périmètre géographique : Togo uniquement en V1 — devise FCFA, langue française, fuseau `Africa/Lome`. Fonctionnalités principales :

- **Biens immobiliers** — CRUD, photos, documents administratifs, statuts (occupé, vacant, en travaux, archivé)
- **Locataires et baux** — invitation par téléphone, un locataire actif sur un seul bien à la fois, historique conservé
- **Paiements** — encaissement mobile money via Cashpay (T-Money / Flooz), saisie manuelle propriétaire, déclaration de paiement par le locataire à confirmer, quittance PDF générée à la volée
- **Rappels et alertes** — cron horaires respectant la fréquence contractuelle (mensuelle, trimestrielle, semestrielle, annuelle)
- **Annonces** — publication publique des biens vacants, contact des candidats, désactivation automatique
- **Gestionnaires immobiliers** — mandats avec transfert des droits opérationnels, rapports mensuels automatiques
- **Abonnements** — trois forfaits (Starter / Pro / Premium), quotas de biens gérés, prélèvement mensuel via Cashpay
- **Notifications** — push web sur consentement (façon WhatsApp Web), repli automatique sur email
- **Vérification CNI togolaise** — OCR automatique via Tesseract.js, aucune validation humaine
- **Administration** — supervision, modération, litiges, KPIs plateforme

## Stack

| Couche                 | Outil                                                       |
| ---------------------- | ----------------------------------------------------------- |
| Framework              | NestJS 10+ (TypeScript strict)                              |
| Base de données        | PostgreSQL (via Supabase) + Prisma                          |
| Authentification       | Supabase Auth — session JWT validée par `SupabaseAuthGuard` |
| Stockage fichiers      | Supabase Storage (5 buckets privés)                         |
| Emails                 | Resend                                                      |
| Notifications push     | web-push (VAPID)                                            |
| Paiements mobile money | Cashpay (T-Money + Flooz)                                   |
| OCR CNI                | Tesseract.js                                                |
| Génération PDF         | PDFKit (à la volée, jamais stocké)                          |
| Export XLSX            | ExcelJS                                                     |
| Compression images     | sharp                                                       |
| Tâches planifiées      | `@nestjs/schedule` (cron dans le conteneur Railway)         |
| Événements internes    | `@nestjs/event-emitter`                                     |
| Rate limiting          | `@nestjs/throttler`                                         |
| Health checks          | `@nestjs/terminus`                                          |
| Documentation API      | `@nestjs/swagger`                                           |
| Logging                | nestjs-pino + pino                                          |
| Monitoring             | `@sentry/node`                                              |
| Validation             | class-validator + class-transformer                         |
| Dates et fuseaux       | date-fns + date-fns-tz                                      |
| Hébergement            | Railway (conteneur Docker)                                  |
| Langage                | TypeScript strict                                           |

Supabase joue le rôle de BaaS partiel (Auth + Storage + DB PostgreSQL) — Prisma reste le seul point d'entrée pour la base de données côté application. Aucun agent IA, aucun analytics produit sur ce projet.

---

## Installation

### 🚨 CRITICAL: Follow these steps in order

### Step 1: Read the Context Files

Avant d'écrire la première ligne de code, lire dans l'ordre : `context/architecture.md` (structure de dossiers + boundaries + invariants), `context/build-plan.md` (périmètre de l'unité en cours), `context/progress-tracker.md` (ce qui est déjà fait), `context/code-standards.md` (conventions, résilience production).

### Step 2: Install Dependencies

```bash
npm install
```

Toutes les dépendances approuvées sont listées dans `context/code-standards.md` section « Dépendances » — ne jamais en installer une qui n'y figure pas sans mettre à jour ce fichier d'abord.

### Step 3: Configure Environment Variables

```bash
cp .env.example .env.local
```

Renseigner `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CASHPAY_API_URL`, `CASHPAY_API_KEY`, `CASHPAY_WEBHOOK_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SENTRY_DSN`, `LOG_LEVEL`, `NODE_ENV`, `PORT` — liste complète dans `context/code-standards.md`. Les variables sont validées au démarrage via `class-validator` dans `src/config/env.validation.ts` — si l'une manque, l'application crashe immédiatement avec un message clair.

### Step 4: Run Database Migrations

```bash
npx prisma migrate dev
npx prisma generate
```

Le schéma complet est dans `prisma/schema.prisma`, sourcé depuis `context/architecture.md` et `context/build-plan.md` unité 02 — toute modification de schéma passe par une migration Prisma versionnée, jamais par un `ALTER TABLE` manuel. Les migrations doivent être rétrocompatibles (jamais `DROP COLUMN` ou `RENAME COLUMN` dans la même release qu'un changement de code).

En production sur Railway, les migrations sont appliquées automatiquement au démarrage du conteneur via `npx prisma migrate deploy` — jamais `migrate dev`.

---

## Getting Detailed Documentation

### 🚨 CRITICAL: Always Read Context Files Before Writing Code

Ce projet n'a pas de serveur de documentation MCP externe — tous les patterns d'implémentation sont capturés dans le dossier `context/`. Avant d'implémenter toute fonctionnalité :

1. Vérifier `context/build-plan.md` pour le périmètre exact de l'unité (livrables, endpoints, jobs)
2. Vérifier `context/architecture.md` pour savoir où le code doit vivre (module, dossier, table, invariant)
3. Vérifier `context/library-docs.md` pour le pattern d'usage exact de la librairie concernée
4. Vérifier `context/code-standards.md` pour le nommage, la gestion d'erreur, les règles de résilience production
5. Vérifier `context/progress-tracker.md` pour ne pas dupliquer ce qui a déjà été fait dans une session précédente

### Fichiers de contexte disponibles

- **architecture.md** — Stack, structure de modules NestJS, modèle de stockage, modèle d'autorisation, invariants (COMMENCER ICI)
- **build-plan.md** — 41 unités de fonctionnalités organisées en 11 phases, avec livrables par unité
- **progress-tracker.md** — Ce qui est fait, ce qui est en cours, décisions prises pendant le build, questions ouvertes
- **code-standards.md** — Conventions TypeScript, NestJS, Controllers / Services / DTOs / Guards, gestion Prisma, résilience et production (timeouts, retry, graceful shutdown, verrouillage Postgres, tests, migrations rétrocompatibles), dépendances approuvées
- **library-docs.md** — Patterns d'usage spécifiques au projet pour chaque librairie tierce : Prisma, Supabase Auth, Supabase Storage, Resend, web-push, Cashpay, Tesseract.js, PDFKit, ExcelJS, `@nestjs/schedule`, `@nestjs/throttler`, `@nestjs/swagger`, `@nestjs/event-emitter`, `@nestjs/terminus`, `@sentry/node`, axios, p-retry, sharp, nestjs-pino, helmet, date-fns, nanoid

Ne jamais se reposer uniquement sur la connaissance générale d'entraînement pour un pattern de librairie — toujours vérifier `library-docs.md` d'abord, il prend le pas sur tout le reste. La documentation Cashpay notamment est fermée publiquement — toujours valider avec leur support avant d'implémenter un endpoint.

---

## When to Use What

### Controllers pour recevoir les requêtes HTTP :

- Un fichier `*.controller.ts` par module, annoté `@Controller('routes')` et protégé par `@UseGuards(SupabaseAuthGuard)` sauf endpoint public marqué `@Public()`
- Validation systématique des entrées via un DTO avec `class-validator` — jamais `@Body() body: any`
- L'utilisateur courant récupéré via `@CurrentUser()`, jamais en lisant `request.user` directement
- Aucune logique métier — même une condition simple passe par le service
- Aucun appel Prisma direct — toujours via le service

### Services pour la logique métier :

- Un fichier `*.service.ts` par module, annoté `@Injectable()`
- Reçoit `PrismaService` et autres dépendances via le constructeur
- Vérifie l'autorisation en première ligne via `canActOnProperty(user, propertyId)` ou `@Roles()` — jamais de condition inline `if (property.ownerId === user.id)`
- Lève des exceptions HTTP typées (`NotFoundException`, `ForbiddenException`, `BadRequestException`, `ConflictException`) — jamais `throw new Error('...')` brut
- Émet les événements internes (`payment.confirmed`) via `EventEmitter2` après mutation Prisma réussie

### Cron jobs pour les tâches planifiées :

- Un fichier `*.task.ts` dans `src/modules/scheduling/` par tâche récurrente
- Rappels d'échéance, alertes d'impayés, blocage d'inactivité, rapports mensuels, prélèvements d'abonnements, suspension d'annonces sans contact
- Expression cron centralisée dans `src/common/constants.ts` — jamais inline dans le décorateur
- Verrou Postgres (`pg_try_advisory_lock`) obligatoire pour les jobs dont la duplication est dangereuse (rapports mensuels, prélèvements, blocage d'inactivité)
- Chaque itération dans une boucle a son propre try/catch — l'échec d'un envoi ne fait jamais échouer les autres

### Écouteurs d'événements pour les post-traitements asynchrones :

- Un `@OnEvent('payment.confirmed', { async: true, promisify: true })` pour la génération de quittance PDF, l'envoi de notifications, l'audit log
- Les événements ne portent jamais de logique métier critique — uniquement du découplage

### Prisma directement dans les services et les tâches planifiées uniquement :

- Jamais dans un controller, jamais dans un décorateur, jamais en dehors d'un module métier
- Toujours scopé selon le rôle et le mandat via `canActOnProperty()` — voir `code-standards.md` section « Contrôle d'Accès »
- `take` explicite obligatoire sur tout `findMany` — plafond dur de 100 par page
- Opérations multi-tables atomiques via `prisma.$transaction(...)` — jamais d'enchaînement de mutations sans transaction quand l'intégrité est en jeu

### NotifyService comme seul point d'entrée pour les notifications métier :

- `notifyUser({ userId, event, variables })` choisit push web si consentement + subscription active, sinon email — jamais d'appel direct à `EmailService` ou `WebPushService` depuis un controller, un service métier ou un cron
- **Exception** : les emails d'authentification (`signup-confirmation`, `password-reset-otp`) appellent directement `EmailService` — jamais via `NotifyService`, jamais soumis au consentement push

---

## Important Notes

- **EXTRA IMPORTANT** : trois sources de paiement (`CASHPAY_API`, `MANUAL_OWNER`, `TENANT_DECLARATION`) — un paiement `CASHPAY_API` ne peut **jamais** être re-confirmé ni rejeté manuellement, le webhook Cashpay est la source de vérité unique. Les endpoints de confirmation manuelle rejettent toute action sur ces paiements.
- **EXTRA IMPORTANT** : aucun PDF n'est jamais stocké (ni en base, ni dans Supabase Storage) — quittances, rapports mensuels gestionnaire, factures d'abonnement, exports paiements sont générés à la volée via PDFKit et streamés directement dans la réponse HTTP. Aucun modèle Prisma `Receipt`, `MonthlyReport`, `Invoice` ne stocke un PDF.
- **EXTRA IMPORTANT** : l'idempotence du webhook Cashpay repose sur la contrainte unique côté DB sur `transactionId` — jamais sur une vérification applicative seule. La signature HMAC est vérifiée avant tout traitement. Le webhook répond 2xx dans tous les cas où la signature est valide.
- Un utilisateur n'a qu'un seul rôle actif à la fois (`OWNER` / `TENANT` / `MANAGER` / `ADMIN`) et son rôle est figé à l'inscription
- Le rôle `MANAGER` est un super-`OWNER` : il peut posséder ses propres biens (avec tous les droits d'un propriétaire dessus) **et** être mandataire des biens d'autres propriétaires via le modèle `Mandate`
- `canActOnProperty(user, propertyId)` dans `src/common/permissions/` est l'**autorité unique** pour décider qui peut agir sur un bien — quand un mandat est `ACTIVE`, le gestionnaire mandataire récupère tous les droits opérationnels et le propriétaire passe en lecture seule
- Un `TenantProfile` ne peut avoir qu'un seul `Lease` en statut `ACTIVE` à un instant donné — contrainte unique partielle en base de données. L'historique des baux passés et des paiements associés est conservé intégralement quand le locataire change de bien
- Aucun hashage de mot de passe côté NestJS — pas de bcrypt, pas de table `password` locale. Supabase Auth gère l'intégralité du cycle de vie des credentials
- Connexion par email + mot de passe directe, sans 2FA — aucun code OTP envoyé lors d'une connexion réussie. L'OTP à 6 chiffres (expiration 10 minutes, usage unique) ne sert que pour la réinitialisation de mot de passe
- Vérification CNI togolaise entièrement automatique via Tesseract.js — aucune file d'attente humaine, aucune validation admin. Décision `VERIFIED` ou `REJECTED` en moins de 10 secondes, l'utilisateur peut re-soumettre immédiatement
- Notifications : push uniquement sur consentement explicite via `notificationConsent = ACCEPTED` et abonnement actif, jamais la popup navigateur sans contexte in-app ; toujours un repli sur email
- Les emails `signup-confirmation` et `password-reset-otp` sont des messages de sécurité — toujours envoyés par email direct via `EmailService`, jamais par push, quel que soit le consentement notification de l'utilisateur
- Blocage automatique des comptes inactifs après 60 jours sans activité (propriétaire sans bien enregistré, gestionnaire sans bien propre ni mandat actif). Rappels via `notifyUser()` à J-30, J-7 et J-1 avant la date butoir. Déblocage automatique et immédiat dès qu'un bien est créé ou qu'un mandat est accepté
- Aucune commission n'est prélevée sur les loyers — 100 % du montant payé par le locataire revient au propriétaire. La seule source de revenu de la plateforme est l'abonnement mensuel (Starter 2 000 FCFA / Pro 5 000 FCFA / Premium 10 000 FCFA)
- Toutes les dates en base sont en UTC (`@db.Timestamptz`) — la conversion en heure de Lomé (`Africa/Lome`, UTC+0 sans DST) se fait uniquement à l'affichage (PDFs, emails)
- Pagination obligatoire sur tout `findMany` — `take` explicite avec plafond dur de 100 par page. Interdiction stricte des N+1 (boucle sur un résultat `findMany` qui déclenche une requête à chaque itération)
- En production sur Railway : `app.enableShutdownHooks()` actif, health checks séparés (`/health/live` sans dépendance / `/health/ready` avec Prisma + Supabase), monitoring Sentry avec filtrage des 4xx attendues dans `beforeSend`
- Les migrations Prisma en production sont rétrocompatibles — jamais `DROP COLUMN` ou `RENAME COLUMN` dans la même release qu'un changement de code, toujours en deux temps (déprécier l'usage côté code dans une release, puis supprimer la colonne dans la release suivante)
