# Guide de déploiement — WARAH

Procédure de premier déploiement de la plateforme WARAH.

---

## Table des matières

1. [Prérequis et comptes existants](#1-prérequis-et-comptes-existants)
2. [Créer les comptes manquants](#2-créer-les-comptes-manquants)
3. [Configurer Supabase](#3-configurer-supabase)
4. [Configurer Railway (backend)](#4-configurer-railway-backend)
5. [Configurer Vercel (frontend)](#5-configurer-vercel-frontend)
6. [Configurer les GitHub Secrets](#6-configurer-les-github-secrets)
7. [Premier déploiement](#7-premier-déploiement)
8. [Vérification du déploiement](#8-vérification-du-déploiement)
9. [Configurer le monitoring](#9-configurer-le-monitoring)
10. [Liaison d'un domaine custom](#10-liaison-dun-domaine-custom)

---

## 1. Prérequis et comptes existants

Comptes déjà créés :

- [x] **GitHub** — dépôt du code source
- [x] **Railway** — hébergement du backend NestJS
- [x] **Vercel** — hébergement du frontend Next.js
- [x] **Supabase** — PostgreSQL + Auth + Storage
- [x] **Resend** — emails transactionnels

Comptes à créer (voir section 2) :

- [x] **Sentry** — monitoring d'erreurs (câblé et actif des deux côtés depuis le 2026-08-10, organisation `athena-ju` — backend via `@sentry/nestjs`, frontend projet `javascript-nextjs`, voir 2a)
- [ ] **Cashpay / Semoa** — paiements mobile money

---

## 2. Créer les comptes manquants

### 2a. Sentry — déjà fait (2026-08-10)

Organisation Sentry : `athena-ju`. Deux projets créés :

- Backend — `SENTRY_DSN` dans `apps/backend/.env` (câblé via `@sentry/nestjs`, voir `src/instrument.ts`)
- Frontend — projet `javascript-nextjs`, `NEXT_PUBLIC_SENTRY_DSN` dans `apps/frontend/.env.local` (câblé via `@sentry/nextjs`, voir `instrumentation-client.ts`/`instrumentation.ts`)

Les deux DSN sont à reporter dans Railway/Vercel lors du déploiement (section 4b/5b) — ne jamais les committer en clair ailleurs que dans les fichiers `.env*` locaux (gitignorés). Reste à faire : configurer les alertes recommandées (voir section 9a).

### 2b. Cashpay / Semoa (Mobile Money)

Cashpay est le service de paiement mobile money de Semoa pour le Togo (T-Money et Flooz).

**Démarche d'ouverture d'un compte marchand :**

1. Contacter Semoa Togo : [www.semoa.biz](https://www.semoa.biz)
2. Fournir les documents de l'entreprise (RCCM, pièce d'identité du gérant)
3. Signer la convention de prestation de services
4. Recevoir les credentials API :
   - `CASHPAY_API_URL` — URL de base de l'API fournie par Semoa
   - `CASHPAY_API_KEY` — Clé d'API pour l'authentification
   - `CASHPAY_WEBHOOK_SECRET` — Secret HMAC pour valider les notifications de paiement

**En attendant le compte marchand :**

- Laisser ces variables vides dans Railway
- Le module Cashpay ne s'initialisera pas et renverra des erreurs 503 sur les endpoints de paiement
- Les autres fonctionnalités de la plateforme restent opérationnelles

---

## 3. Configurer Supabase

### 3a. Créer le projet Supabase

1. Dashboard Supabase → New Project
2. Région recommandée : **EU West** (Dublin) ou **US East** — le plus proche de Railway
3. Choisir un mot de passe fort pour la base de données

### 3b. Récupérer les credentials

Dans Settings → API :

- `SUPABASE_URL` = Project URL (`https://xxx.supabase.co`)
- `SUPABASE_ANON_KEY` = `anon` `public`
- `SUPABASE_SERVICE_ROLE_KEY` = `service_role` (⚠️ garder secret)

Dans Settings → Database → Connection string → Transaction pooler :

- `DATABASE_URL` = Connection string avec port **6543** (transaction pooler recommandé pour Railway)

### 3c. Créer les buckets Supabase Storage

Dans Storage, créer les 5 buckets suivants en mode **privé** :

| Bucket              | Usage                               |
| ------------------- | ----------------------------------- |
| `cni-documents`     | Photos de CNI pour vérification OCR |
| `property-photos`   | Photos des biens immobiliers        |
| `lease-documents`   | Contrats de location signés         |
| `mandate-documents` | Documents de mandats de gestion     |
| `payment-proofs`    | Preuves de paiement mobile money    |

> **Rappel** : Aucun bucket ne doit contenir de PDFs générés (quittances, rapports). Ceux-ci sont générés à la volée.

> **Supabase Auth non utilisé** — l'authentification (mots de passe,
> sessions) est gérée entièrement côté NestJS depuis le 2026-08-11 (voir
> `JWT_SECRET` en section 4b). Supabase ne sert que Postgres + Storage.

### 3d. Sauvegardes

Décision explicite du développeur (2026-08-13, `/architect` Phase 11) : les sauvegardes de la base sont **entièrement déléguées à Supabase**, aucun mécanisme applicatif (export périodique, second stockage) n'est construit côté projet.

- **Plan Free actuel** — pas de sauvegardes automatiques garanties par Supabase sur ce plan. Restauration ponctuelle possible via export manuel (`pg_dump`) en cas de besoin, mais aucune politique de rétention automatique.
- **Migration prévue vers le plan Pro** — inclut les sauvegardes quotidiennes automatiques avec 7 jours de rétention (point-in-time recovery selon l'offre Supabase au moment de la migration, à reconfirmer dans le dashboard Supabase → Database → Backups au moment du changement de plan).
- **À refaire au moment de la migration Free → Pro** : vérifier dans le dashboard Supabase que les sauvegardes automatiques sont bien actives, et documenter ici la fréquence/rétention réelle observée.

---

## 4. Configurer Railway (backend)

### 4a. Créer le projet Railway

1. Dashboard Railway → New Project → Deploy from GitHub repo
2. Sélectionner le dépôt WARAH
3. Railway détectera automatiquement le `railway.json` à la racine

### 4b. Configurer les variables d'environnement Railway

Dans Railway → Service → Variables, ajouter toutes les variables listées dans [`ENV.md`](ENV.md) section "Backend".

Variables essentielles au démarrage :

```
NODE_ENV=production
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@warah.tg
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:contact@warah.tg
ALLOWED_ORIGINS=https://votre-app.vercel.app
```

### 4c. Générer les clés VAPID

```bash
# En local (une seule fois — stocker les résultats dans Railway)
npx web-push generate-vapid-keys
```

### 4d. Générer le secret HMAC Cashpay

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4e. Vérifier le health check Railway

Après le premier déploiement, Railway doit sonder `/health/ready`.
Si le health check échoue, le déploiement est marqué en erreur.

---

## 5. Configurer Vercel (frontend)

### 5a. Connecter le dépôt GitHub

1. Vercel Dashboard → Add New → Project → Import GitHub repo
2. Sélectionner le dépôt WARAH
3. **Framework Preset** : Next.js
4. **Root Directory** : laisser la racine du dépôt (ne **pas** mettre `apps/frontend`)

> Le `vercel.json` à la racine du dépôt gère lui-même le `cd apps/frontend` pour l'install/le build (monorepo sans workspaces npm) — `buildCommand`/`installCommand`/`outputDirectory` y sont déjà configurés, rien à répéter ici dans le dashboard.

### 5b. Variables d'environnement Vercel

Dans Vercel → Project → Settings → Environment Variables :

| Variable                 | Valeur                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`    | `https://votre-service.up.railway.app/api`                                                              |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN du projet Sentry `javascript-nextjs` (voir 2a, déjà créé) — optionnel, Sentry reste inactif si vide |

VAPID (notifications push) reste à ajouter ici si/quand cette clé devient nécessaire côté frontend — non utilisée actuellement (la clé publique est servie dynamiquement par le backend via `GET /push/vapid-public-key`).

**Sentry câblé et actif côté frontend** (`instrumentation-client.ts`, `instrumentation.ts`, `app/global-error.tsx`) — capture les erreurs client (React, navigation) et serveur (Server Components/Route Handlers), vérifié en conditions réelles le 2026-08-10 (événement de test capturé et transmis avec succès). Pas d'upload de source maps configuré (nécessiterait un `SENTRY_AUTH_TOKEN` et `withSentryConfig` dans `next.config.ts`, volontairement laissé de côté pour ne pas risquer de casser le build Turbopack — les stack traces resteront minifiées tant que ce n'est pas fait).

Ces variables sont injectées **à la compilation** par Next.js (préfixe `NEXT_PUBLIC_` obligatoire pour être exposées au navigateur).

### 5c. Déploiements automatiques

Vercel déploie automatiquement :

- **main** → environnement **Production**
- Toute autre branche → **Preview** (URL unique par déploiement)

Aucun workflow GitHub Actions n'est nécessaire pour le frontend.

---

## 6. Configurer les GitHub Secrets

Dans GitHub → Repository → Settings → Secrets and variables → Actions :

**Secrets** (valeurs sensibles) :

| Secret          | Description                                              |
| --------------- | -------------------------------------------------------- |
| `RAILWAY_TOKEN` | Token de service Railway (Settings → Tokens → New Token) |

**Variables** (valeurs non sensibles) :

| Variable               | Description                                  |
| ---------------------- | -------------------------------------------- |
| `RAILWAY_SERVICE_NAME` | Nom du service Railway (ex. `warah-backend`) |

---

## 7. Premier déploiement

### Option A — Via GitHub Actions (recommandé)

1. Committer et pusher sur `main`
2. GitHub Actions déclenche `ci.yml` (validations)
3. Puis `cd-backend.yml` (déploiement Railway)
4. Vercel déploie automatiquement le frontend

### Option B — Déploiement manuel Railway

```bash
# Installer la Railway CLI
npm install -g @railway/cli

# Se connecter
railway login

# Déployer depuis la racine du monorepo
railway up --service warah-backend
```

---

## 8. Vérification du déploiement

### Backend Railway

```bash
# Liveness (sans dépendances)
curl https://votre-service.up.railway.app/health/live
# Attendu : {"status":"ok","timestamp":"..."}

# Readiness (avec Prisma/PostgreSQL)
curl https://votre-service.up.railway.app/health/ready
# Attendu : {"status":"ok","info":{"database":{"status":"up"}},...}
```

### Frontend Vercel

Ouvrir l'URL Vercel et vérifier :

- La page se charge correctement
- La console n'affiche pas d'erreurs CORS
- Les requêtes réseau vers `/api` pointent bien vers Railway

---

## 9. Configurer le monitoring

### 9a. Sentry — Alertes recommandées

Pour chaque projet (backend + frontend), configurer dans Sentry → Alerts → Alert Rules :

**Alerte 1 — Taux d'erreurs 5xx**

- Condition : `event.type:error http.status_code:[500..599]`
- Seuil : > 1% des requêtes sur une fenêtre de 5 minutes
- Action : email + Slack (si configuré)

**Alerte 2 — Latence p95**

- Condition : `transaction.duration:>1000`
- Seuil : p95 > 1000ms sur 10 minutes
- Action : email

**Configuration du taux d'échantillonnage Sentry :**

- `tracesSampleRate: 0.1` (10% des transactions) — déjà configuré dans le code
- Ne pas dépasser 0.1 en production pour maîtriser les coûts

### 9b. UptimeRobot (monitoring gratuit)

1. Créer un compte sur [uptimerobot.com](https://uptimerobot.com)
2. New Monitor → HTTP(s)
3. URL : `https://votre-service.up.railway.app/health/ready`
4. Interval : **5 minutes**
5. Alertes : Email + SMS (si disponible dans le plan gratuit)
6. Répéter pour l'URL Vercel

---

## 10. Liaison d'un domaine custom

### Backend (Railway)

1. Railway → Service → Settings → Domains → Add Domain
2. Ajouter votre domaine (ex. `api.warah.tg`)
3. Configurer le CNAME chez votre registrar :
   ```
   api.warah.tg → votre-service.up.railway.app
   ```
4. Mettre à jour `ALLOWED_ORIGINS` dans Railway avec le nouveau domaine frontend

### Frontend (Vercel)

1. Vercel → Project → Settings → Domains → Add
2. Ajouter votre domaine (ex. `warah.tg` et `www.warah.tg`)
3. Configurer les DNS selon les instructions Vercel (CNAME ou A record)
4. Mettre à jour `NEXT_PUBLIC_API_URL` si l'URL Railway change aussi

> **Temporaire :** En attendant un domaine custom, utiliser les URLs générées :
>
> - Backend : `https://votre-service.up.railway.app`
> - Frontend : `https://votre-projet.vercel.app`
