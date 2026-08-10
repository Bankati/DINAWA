# Architecture — WARAH

Ce document est un résumé de haut niveau. Le document complet (`architecture.md`) sera fourni séparément.

---

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                        NAVIGATEUR                           │
│               Next.js 16 App Router (Vercel CDN)            │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / REST API
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Railway)                          │
│               NestJS 10 — TypeScript strict                 │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Auth    │  │Payments  │  │ Receipts │  │  Leases  │   │
│  │(Supabase)│  │(Cashpay) │  │(PDFKit)  │  │(Prisma)  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  /health/live  /health/ready  /api/webhooks/cashpay         │
└──────────────┬────────────────────────────────┬────────────┘
               │                                │
               ▼                                ▼
┌──────────────────────┐          ┌─────────────────────────┐
│    Supabase          │          │     Services tiers       │
│                      │          │                         │
│  • PostgreSQL (DB)   │          │  • Resend (emails)      │
│  • Auth (JWT)        │          │  • Cashpay (mobile $)   │
│  • Storage (fichiers)│          │  • Sentry (monitoring)  │
│    5 buckets privés  │          │  • Web Push (VAPID)     │
└──────────────────────┘          └─────────────────────────┘
```

---

## Règles d'architecture importantes

| Règle                                 | Détail                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| **Pas de PDF stocké**                 | Quittances et rapports générés à la volée (PDFKit), jamais en Supabase Storage |
| **Auth = Supabase uniquement**        | Pas de bcrypt côté NestJS, pas de table `password` en DB                       |
| **Dates = UTC**                       | Togo = UTC+0 sans DST, donc UTC ≡ Africa/Lomé partout                          |
| **Webhook Cashpay = hors rate limit** | `@SkipThrottle()` sur `POST /api/webhooks/cashpay`                             |
| **Migrations = deploy only**          | `prisma migrate deploy` en prod, jamais `migrate dev`                          |
| **Logs = sans données sensibles**     | Pino rédige passwords, tokens, CNI, numéros de téléphone                       |

---

## Rôles utilisateurs

| Rôle      | Permissions principales                                      |
| --------- | ------------------------------------------------------------ |
| `OWNER`   | Gère ses biens, voit ses locataires, encaisse les loyers     |
| `TENANT`  | Voit ses contrats, paye son loyer, télécharge ses quittances |
| `MANAGER` | Peut être mandataire OWNER + posséder ses propres biens      |
| `ADMIN`   | Accès total à la plateforme                                  |

---

## Stack résumé

| Couche           | Technologie                                     |
| ---------------- | ----------------------------------------------- |
| Frontend         | Next.js 16 (App Router) — TypeScript strict     |
| Backend          | NestJS 10 — TypeScript strict — Express adapter |
| ORM              | Prisma — migrations versionnées                 |
| Base de données  | PostgreSQL via Supabase                         |
| Auth             | Supabase Auth (JWT)                             |
| Fichiers         | Supabase Storage (5 buckets privés)             |
| Emails           | Resend                                          |
| Paiements        | Cashpay / Semoa (T-Money + Flooz)               |
| Notifications    | Web Push VAPID                                  |
| OCR              | Tesseract.js (vérification CNI togolaise)       |
| PDF              | PDFKit (génération à la volée)                  |
| Export           | ExcelJS                                         |
| Images           | sharp (compression à l'upload)                  |
| Logs             | nestjs-pino + pino                              |
| Monitoring       | Sentry (backend + frontend) + UptimeRobot       |
| Hosting backend  | Railway                                         |
| Hosting frontend | Vercel (CDN)                                    |
