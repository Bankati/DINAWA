# Référence des variables d'environnement — WARAH

Liste exhaustive de toutes les variables d'environnement utilisées dans le projet,
organisée par couche de déploiement.

---

## Table des matières

1. [Backend — `.env` local / Railway](#1-backend--env-local--railway)
2. [Frontend — Variables Vercel (`NEXT_PUBLIC_*`)](#2-frontend--variables-vercel-next_public_)
3. [GitHub Actions — Secrets et Variables](#3-github-actions--secrets-et-variables)
4. [Comment générer les secrets](#4-comment-générer-les-secrets)

---

## 1. Backend — `.env` local / Railway

Ces variables sont définies dans `apps/backend/.env` en développement et dans
Railway → Service → Variables en production.

La validation au démarrage (via `class-validator`) crashe immédiatement si une variable
obligatoire manque ou a une valeur invalide.

### Application

| Variable   | Obligatoire | Valeur en prod      | Description                                               |
| ---------- | ----------- | ------------------- | --------------------------------------------------------- |
| `NODE_ENV` | ✅          | `production`        | Environnement d'exécution. Contrôle Swagger, logs, Sentry |
| `PORT`     | ✅          | Injecté par Railway | Port d'écoute du serveur HTTP                             |

### Base de données — Supabase PostgreSQL

| Variable       | Obligatoire | Description                                                                                                                                                                                                                                                                                                             |
| -------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | ✅          | URL PostgreSQL avec transaction pooler (port 6543). Format : `postgresql://postgres.[ref]:[mdp]@aws-0-[region].pooler.supabase.com:6543/postgres`                                                                                                                                                                       |
| `DIRECT_URL`   | ✅          | Connexion directe (port **5432**), même hôte/identifiants que `DATABASE_URL`. Lue par Prisma (`directUrl` dans `schema.prisma`) pour `prisma migrate deploy`, exécuté **avant** le démarrage du serveur. Si elle manque, le conteneur s'arrête net et Railway affiche « service unavailable » (incident du 2026-09-21). |

### Supabase

| Variable                    | Obligatoire | Où trouver                    | Description                                                          |
| --------------------------- | ----------- | ----------------------------- | -------------------------------------------------------------------- |
| `SUPABASE_URL`              | ✅          | Settings → API → Project URL  | URL du projet Supabase                                               |
| `SUPABASE_ANON_KEY`         | ✅          | Settings → API → anon public  | Utilisée uniquement pour le ping de réveil du projet (PrismaService) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅          | Settings → API → service_role | Storage (photos, documents) — JAMAIS exposée côté frontend           |

Depuis le 2026-08-11, Supabase n'héberge plus que Postgres et le Storage —
l'authentification (mots de passe, sessions) est gérée entièrement côté
NestJS.

### Authentification interne

| Variable     | Obligatoire | Comment générer                                                            | Description                                                      |
| ------------ | ----------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `JWT_SECRET` | ✅          | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | Signature des access tokens (voir modules/auth/token.service.ts) |

### Resend (emails)

| Variable                  | Obligatoire | Description                                              |
| ------------------------- | ----------- | -------------------------------------------------------- |
| `RESEND_API_KEY`          | ✅          | Clé API Resend (préfixe `re_`)                           |
| `RESEND_FROM_EMAIL`       | ✅          | Adresse expéditrice (domaine vérifié dans Resend requis) |
| `RESEND_FROM_NAME`        | ➖          | Nom affiché. Défaut : `WARAH`                            |
| `CONTACT_RECIPIENT_EMAIL` | ✅          | Adresse qui reçoit les messages du formulaire `/contact` |

### Frontend et invitations

| Variable                  | Obligatoire | Description                                                                                                                                                              |
| ------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FRONTEND_URL`            | ✅          | URL publique du frontend, sans `/` final (ex. `https://www.warahcontact.com`). Sert aux liens d'activation par email **et** à l'URL de retour après un paiement PayDunya |
| `INVITATION_TOKEN_SECRET` | ✅          | Secret HMAC signant les tokens d'invitation locataire. Générer avec la même commande que `JWT_SECRET` (section 4)                                                        |

### Web Push — VAPID

| Variable            | Obligatoire | Comment générer                    | Description                                                        |
| ------------------- | ----------- | ---------------------------------- | ------------------------------------------------------------------ |
| `VAPID_PUBLIC_KEY`  | ✅          | `npx web-push generate-vapid-keys` | Clé publique VAPID (partagée avec le frontend)                     |
| `VAPID_PRIVATE_KEY` | ✅          | Idem                               | Clé privée VAPID — JAMAIS exposée                                  |
| `VAPID_SUBJECT`     | ✅          | —                                  | Contact pour les serveurs push. Format : `mailto:contact@warah.tg` |

### PayDunya (mobile money — T-Money & Moov/Flooz Togo)

Ces variables sont optionnelles tant que le compte marchand n'est pas configuré.
Sans elles, `POST /api/payments/initiate` retourne `503 Service Unavailable`.
Master key commune aux deux modes ; jeu de 3 clés distinct par mode (`test` =
bac à sable PayDunya, aucun vrai argent ; `live` = production réelle).

| Variable                    | Obligatoire | Description                                                                                                                                                      |
| --------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PAYDUNYA_MODE`             | ➖          | `test` ou `live`. Défaut : `test`                                                                                                                                |
| `PAYDUNYA_MASTER_KEY`       | ➖          | Master key du compte marchand — identique en test et en production                                                                                               |
| `PAYDUNYA_TEST_PUBLIC_KEY`  | ➖          | Clé publique du mode Test                                                                                                                                        |
| `PAYDUNYA_TEST_PRIVATE_KEY` | ➖          | Clé privée du mode Test                                                                                                                                          |
| `PAYDUNYA_TEST_TOKEN`       | ➖          | Token d'API du mode Test                                                                                                                                         |
| `PAYDUNYA_LIVE_PUBLIC_KEY`  | ➖          | Clé publique du mode Live                                                                                                                                        |
| `PAYDUNYA_LIVE_PRIVATE_KEY` | ➖          | Clé privée du mode Live                                                                                                                                          |
| `PAYDUNYA_LIVE_TOKEN`       | ➖          | Token d'API du mode Live                                                                                                                                         |
| `API_BASE_URL`              | ➖          | URL publique de ce backend avec /api (ex. https://warah-api.up.railway.app/api) — sert à construire le callback_url PayDunya. Défaut : http://localhost:3001/api |

### Sentry (monitoring)

| Variable     | Obligatoire | Description                                                                                                                                               |
| ------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SENTRY_DSN` | ➖          | DSN backend dans Sentry (org `athena-ju`), câblé via `@sentry/nestjs` (`src/instrument.ts`). Si absent, Sentry est désactivé (comportement normal en dev) |

### CORS

| Variable          | Obligatoire | Description                                                                                                                                                                                                                                                                             |
| ----------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ALLOWED_ORIGINS` | ➖          | Origines autorisées séparées par des virgules, ex. `https://www.warahcontact.com,https://warahcontact.com`. Espaces et `/` final ignorés. **Doit contenir chaque domaine depuis lequel le site est servi**, sinon le navigateur bloque les appels API. Défaut : `http://localhost:4300` |

---

## 2. Frontend — Variables Vercel (`NEXT_PUBLIC_*`)

Ces variables sont injectées **au moment de la compilation** par Next.js — seules celles préfixées
`NEXT_PUBLIC_` sont exposées au navigateur (convention Next.js, pas de choix arbitraire).
Elles doivent être configurées dans Vercel → Project → Settings → Environment Variables.

Un redéploiement est nécessaire pour changer leur valeur (embarquées dans le bundle au build, pas lues à l'exécution).

| Variable Vercel       | Utilisée dans    | Description                                                                                    |
| --------------------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | `src/lib/api.ts` | URL complète de l'API backend Railway avec `/api`. Ex : `https://warah-api.up.railway.app/api` |

D'autres variables (Sentry, VAPID) seront à ajouter ici si/quand ces intégrations sont câblées côté frontend — non utilisées actuellement.

---

## 3. GitHub Actions — Secrets et Variables

À configurer dans GitHub → Repository → Settings → Secrets and variables → Actions.

### Secrets (chiffrés)

| Secret          | Description                                      | Comment obtenir                            |
| --------------- | ------------------------------------------------ | ------------------------------------------ |
| `RAILWAY_TOKEN` | Token de service Railway pour le déploiement CLI | Railway → Settings → Tokens → Create Token |

### Variables (non chiffrées)

| Variable               | Description                           | Exemple         |
| ---------------------- | ------------------------------------- | --------------- |
| `RAILWAY_SERVICE_NAME` | Nom du service dans le projet Railway | `warah-backend` |

---

## 4. Comment générer les secrets

### Clés VAPID

```bash
# Nécessite web-push installé globalement ou via npx
npx web-push generate-vapid-keys

# Sortie :
# Public Key: BI0...
# Private Key: ...
```

Stocker `Public Key` dans `VAPID_PUBLIC_KEY` (Railway). Non utilisée côté frontend actuellement (voir note §2).
Stocker `Private Key` dans `VAPID_PRIVATE_KEY` (Railway uniquement).

### Clés PayDunya

Générées depuis le dashboard PayDunya (Intégrer notre API → Applications) —
voir docs/DEPLOYMENT.md. Rien à générer soi-même côté WARAH, contrairement
aux clés VAPID ou au secret d'invitation.

---

## Récapitulatif — Où configurer quoi

| Service                | Variables à configurer                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **`.env` local** (dev) | Toutes les variables backend (copier `.env.example`)                                                                         |
| **Railway**            | `NODE_ENV`, `DATABASE_URL`, `SUPABASE_*`, `JWT_SECRET`, `RESEND_*`, `VAPID_*`, `PAYDUNYA_*`, `SENTRY_DSN`, `ALLOWED_ORIGINS` |
| **Vercel**             | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SENTRY_DSN`                                                                              |
| **GitHub Secrets**     | `RAILWAY_TOKEN`                                                                                                              |
| **GitHub Variables**   | `RAILWAY_SERVICE_NAME`                                                                                                       |
