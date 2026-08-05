# Instructions projet — WARAH

Ce fichier est lu automatiquement au début de chaque session dans ce dossier.
Le respecter avant toute modification du projet.

## Langue

Toujours répondre et commenter en **français**. C'est une consigne permanente de l'utilisateur, pas seulement pour cette session.

## Stack technique

- **Frontend** (`apps/frontend/`) : Next.js 16 (App Router, Turbopack), React, TypeScript strict, Tailwind CSS v4 (CSS-first, `@theme inline` dans `globals.css`). Lire `apps/frontend/AGENTS.md` avant toute modification — cette version de Next.js a des breaking changes par rapport aux données d'entraînement.
- **Backend** (`apps/backend/`) : NestJS + Prisma + PostgreSQL (Supabase) + Supabase Auth/Storage. Voir `apps/backend/contexte/architecture.md` et `code-standards.md` pour les invariants du projet — à lire avant toute modification backend.
- Aucun framework Angular dans ce projet — le frontend Angular historique a été entièrement retiré (voir historique git, commits "fin angular" / "remplace le frontend angular par un port nextjs").

## Structure

```
apps/
├── backend/            # NestJS — src/modules/<feature>/ (controller, service, dto/)
└── frontend/           # Next.js — App Router
    src/
    ├── app/            # routes (page.tsx + page.css par route), layout.tsx racine
    ├── components/      # composants partagés (AppShell, RequireRole, navbar/footer publics)
    └── lib/             # client API (api.ts), auth-context.tsx, format.ts (formatFcfa/initiales...), etc.
```

`apps/frontend/src/app/page.tsx` + `page.css` est la landing page marketing : CSS custom avec variables (pas de classes Tailwind), fichiers séparés (pas de style inline).

## Palette de couleurs (source unique de vérité)

Toujours utiliser les variables CSS custom properties (définies dans `apps/frontend/src/app/globals.css`), jamais de valeurs hexadécimales codées en dur pour les couleurs de marque :

- `--color-primary` : bleu marine `#0F4C81` (logo WARAH)
- `--color-primary-50` / `--color-primary-dark` (`#0A2650`) / `--color-primary-900` (`#081E41`) : nuances dérivées
- `--color-accent` : or `#C9982E` (logo WARAH)
- `--color-text` / `--color-text-muted` / `--color-border`

Pour les sections avec fond sombre (navbar au scroll, stats, footer), le bleu foncé de référence est :

```css
linear-gradient(135deg, rgba(10,38,80,1) 0%, rgba(15,76,129,1) 60%, rgba(8,30,65,1) 100%)
```

(ces teintes correspondent déjà à `--color-primary-dark`/`--color-primary`/`--color-primary-900`).

**Si l'utilisateur rejette une couleur précise** (ex: "la couleur de vert ne me plaît pas"), ne changer **que** cette propriété de couleur — conserver intégralement le reste du travail structurel/UX déjà fait. Demander via question à choix si la nouvelle couleur n'est pas évidente.

## Règles de développement

- Composants React fonctionnels avec hooks (`useState`/`useEffect`/`useMemo`) — pas de classes
- Commentaires en français dans le code, et seulement quand le POURQUOI n'est pas évident
- Loading states + états d'erreur visibles pour chaque appel API (jamais un échec avalé silencieusement — voir `lib/api.ts`/`ApiError`)
- Zones cliquables ≥ 44px, éléments interactifs toujours de vrais `<button>`/`<a>` (jamais un `<div onClick>` sans `role`/`tabIndex`/`onKeyDown`)
- Utilitaires partagés dans `lib/format.ts` (`formatFcfa`, `formatNumber`, `initiales`) à réutiliser plutôt que recréer une implémentation locale
- Côté backend : suivre strictement `apps/backend/contexte/code-standards.md` (DTOs validés, exceptions HTTP typées, `canActOnProperty()` comme autorité unique, pagination + anti-N+1, etc.)

## Vérification avant de considérer une tâche terminée

**Frontend** (`apps/frontend/`), après toute modification :

```bash
npx tsc --noEmit
npx next build
```

**Backend** (`apps/backend/`), après toute modification :

```bash
npx tsc --noEmit
npx eslint <fichiers modifiés> --config eslint.config.mjs
npx jest --silent
```

**Important** : utiliser l'outil Bash pour ces commandes, **pas** PowerShell `Start-Process -FilePath "npx"` (échoue avec "n'est pas une application Win32 valide" dans cet environnement).

## Contraintes d'environnement (Windows / PowerShell + Git Bash)

- `python3` / `python` ne sont pas disponibles — ne pas s'appuyer dessus pour des scripts.
- Les heredocs PowerShell (`@'...'@`) cassent si le contenu contient des séquences `$(` (interprétées comme sous-expressions), même en littéral. Pour des CSS avec `rgba(...)`, etc., préférer l'outil `Edit` directement.
- Les heredocs Bash (`cat > file << 'EOF'`) et `node -e "..."` inline sont peu fiables pour du contenu multi-lignes volumineux avec guillemets imbriqués (erreurs "unexpected EOF") — utiliser l'outil `Write` pour créer le fichier, puis un script Node exécuté via Bash si une substitution dans un fichier existant est nécessaire.
- Si édition directe via PowerShell `[System.IO.File]::WriteAllText` est nécessaire, toujours forcer l'encodage `[System.Text.UTF8Encoding]::new($false)` pour éviter le mojibake sur les caractères accentués français.
- Des remplacements de masse (ex. couleurs codées en dur → variables CSS) sur de nombreux fichiers/occurrences sont plus fiables via un petit script Node (écrit via `Write`, exécuté via Bash) qu'via des appels `Edit` répétés.

## Bonnes pratiques logicielles de référence

Checklists condensées à appliquer selon ce qui est pertinent. Ne pas sur-ingénierer une partie qui n'existe pas encore.

**UI/UX & accessibilité**

- Hiérarchie visuelle claire, feedback visuel sur chaque action (loading/empty/error states)
- WCAG AA : `alt` sur les images, contraste suffisant, navigation clavier, HTML sémantique (`header`, `nav`, `main`, `button` plutôt que `div` cliquable)
- Zones cliquables ≥ 44px (déjà dans les règles ci-dessus)
- Design system cohérent : réutiliser les variables CSS de couleur et les utilitaires `lib/format.ts` plutôt que recréer un style/formatage ad hoc à chaque page

**Code & architecture**

- SOLID quand on écrit des services/classes côté backend : responsabilité unique, dépendre d'interfaces/abstractions plutôt que d'implémentations concrètes
- Séparer clairement pages (présentation), `lib/*.ts` (logique/accès API), composants partagés
- Gestion d'erreurs cohérente : pas de `console.log` pour les erreurs utilisateur, un état d'erreur visible à la place
- Ne récupérer/exposer côté front que les données nécessaires aux composants

**Tests**

- Backend : suite Jest complète dans `apps/backend/` (voir `contexte/code-standards.md` pour la couverture minimale attendue) — ne jamais désactiver un test qui échoue pour "faire passer" la CI, corriger la cause
- Frontend : pas encore de suite de tests automatisés — vérification actuelle par `tsc`/`next build`/vérification visuelle manuelle ; à mettre en place (Jest + React Testing Library ou Vitest) si demandé

**Git**

- Workflow feature branch : une branche par fonctionnalité/correctif, PR avant fusion sur `dev`/`main`
- Messages de commit en Conventional Commits (`feat(scope): ...`, `fix(scope): ...`), voir `.commitlintrc.js` à la racine — jamais de commit vide ni de `--no-verify`/`--amend` sauf demande explicite (déjà couvert par les règles système)

**Base de données** (déjà en place côté backend, à respecter pour toute évolution)

- Schéma normalisé, migrations Prisma versionnées et rétrocompatibles (jamais `DROP`/`RENAME COLUMN` dans la même release qu'un changement de code)
- Toujours des requêtes paramétrées via Prisma (jamais de SQL brut concaténé)
- Transactions explicites (`prisma.$transaction`) pour toute opération multi-étapes critique

**API & sécurité**

- Auth via Supabase Auth (JWT), jamais de hashage de mot de passe côté NestJS
- RBAC pour les rôles (Propriétaire/Gestionnaire/Locataire/Admin)
- Validation stricte des entrées (`class-validator` sur tous les DTOs), uploads validés en type/taille avant lecture complète

**CI/CD**

- `.github/workflows/ci.yml` : jobs `backend-ci`/`frontend-ci` (lint + typecheck + build/test) à chaque PR vers `main`/`staging`/`dev`
- Déploiement : backend sur Railway (Docker), frontend sur Vercel (voir `vercel.json` à la racine, build pointé sur `apps/frontend`)

**Observabilité**

- Backend : logs structurés Pino avec niveaux, pas de données sensibles dans les logs (voir `contexte/code-standards.md`)
- Métriques de base (latence, taux d'erreur) sur les endpoints réels
