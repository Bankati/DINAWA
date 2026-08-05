# WARAH

Plateforme de gestion locative immobilière pour le Togo.

## 🏠 À propos

WARAH est une SaaS B2B conçue spécifiquement pour le marché togolais, permettant aux propriétaires immobiliers (locaux et diaspora) de gérer leurs biens, encaisser les loyers et automatiser les quittances.

### Stack Technique

- **Frontend** (`apps/frontend/`) : Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4
- **Backend** (`apps/backend/`) : NestJS, Prisma, PostgreSQL (Supabase), Supabase Auth/Storage
- **Emails** : Resend — **Push web** : `web-push` (VAPID)
- **PDF** : PDFKit (quittances/rapports générés à la volée, jamais stockés)
- **Hébergement** : backend sur Railway (Docker), frontend sur Vercel

## 📦 Installation

Monorepo à deux applications indépendantes, chacune avec son propre `package.json`/lockfile.

```bash
# Backend
cd apps/backend
npm install
npm run dev          # nest start --watch, port 3001

# Frontend
cd apps/frontend
npm install
npm run dev           # next dev, port 4300 (voir package.json)
```

Voir `apps/backend/.env.example` pour les variables d'environnement requises côté backend (Supabase, Resend, VAPID, etc.).

## 🏗️ Structure du Projet

```
apps/
├── backend/
│   ├── src/modules/<feature>/   # controller, service, dto/ par module métier
│   ├── src/common/               # guards, decorators, permissions, constants
│   ├── prisma/                   # schema.prisma + migrations versionnées
│   └── contexte/                 # architecture.md, code-standards.md (référence du projet)
└── frontend/
    └── src/
        ├── app/            # routes App Router (page.tsx + page.css par route)
        ├── components/      # composants partagés (AppShell, RequireRole, navbar/footer)
        └── lib/             # client API, contexte auth, utilitaires de formatage
```

## 🎨 Palette de Couleurs

- **Primaire** : Bleu marine `#0F4C81` (`--color-primary`)
- **Primaire foncé** : `#0A2650` (`--color-primary-dark`)
- **Accent** : Or `#C9982E` (`--color-accent`)
- **Fond** : Blanc cassé `#F9FAFB`
- **Succès** : Vert `#10B981`
- **Erreur** : Rouge `#EF4444`
- **Avertissement** : Orange `#F59E0B`

Variables définies dans `apps/frontend/src/app/globals.css` — toujours les utiliser plutôt qu'une valeur hexadécimale codée en dur.

## 📝 Règles de Développement

- TypeScript strict partout, interfaces/DTOs explicites
- Commentaires en français dans le code, uniquement quand le pourquoi n'est pas évident
- Loading states et états d'erreur visibles pour chaque appel API
- Zones cliquables ≥ 44px (accessibilité mobile), éléments interactifs toujours de vrais `<button>`/`<a>`
- Côté backend : voir `apps/backend/contexte/code-standards.md` pour les conventions NestJS/Prisma détaillées

## 🚀 Scripts Disponibles

Backend (`apps/backend/`) :

```bash
npm run dev         # nest start --watch
npm run build       # nest build
npm run test        # jest
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```

Frontend (`apps/frontend/`) :

```bash
npm run dev         # next dev
npm run build       # next build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```

## 📄 Licence

Confidentiel - Usage interne WARAH

---

_WARAH — Gérez vos biens. Encaissez vos loyers. Dormez tranquille._
