# Instructions projet — WARAH Frontend

Ce fichier est lu automatiquement au début de chaque session dans ce dossier.
Le respecter avant toute modification du projet.

## Langue

Toujours répondre et commenter en **français**. C'est une consigne permanente de l'utilisateur, pas seulement pour cette session.

## Stack technique

- Angular 20, composants **standalone** uniquement
- Tailwind CSS pour le styling (sauf landing page publique, voir plus bas)
- TypeScript strict, interfaces pour tous les modèles (`core/models/`)
- Reactive Forms pour les formulaires, RxJS pour l'état asynchrone
- Backend Next.js + PostgreSQL/Supabase — pas encore implémentés, ne pas supposer leur présence

## Structure

```
src/app/
├── core/         # guards, interceptors, services globaux, models/
├── shared/       # composants UI partagés (Lok*), pipes
├── features/     # modules métier (auth, dashboard, biens, locataires, paiements, annonces, public...)
└── layouts/      # shells (propriétaire, public, etc.)
```

`features/public/pages/landing/landing.component.ts` est la landing page marketing : template et styles **inline** dans le composant (pas de fichiers séparés), pas de Tailwind — tout en CSS custom avec variables.

## Palette de couleurs (source unique de vérité)

Toujours utiliser les variables CSS custom properties, jamais de valeurs hexadécimales codées en dur pour les couleurs de marque :

- `--color-primary` : bleu marine `#0F4C81` (logo WARAH)
- `--color-primary-50` / `--color-primary-dark` (`#0A2650`) / `--color-primary-900` (`#081E41`) : nuances dérivées
- `--color-accent` : or `#C9982E` (logo WARAH)
- `--color-text` / `--color-text-muted` / `--color-border`

Pour les sections avec fond sombre (navbar au scroll, stats, footer), le bleu foncé de référence est :
```css
linear-gradient(135deg, rgba(10,38,80,1) 0%, rgba(15,76,129,1) 60%, rgba(8,30,65,1) 100%)
```
(utilisé dans `.stats-overlay` et `.footer` — garder cohérent si on retouche l'un des deux ; ces teintes correspondent déjà à `--color-primary-dark`/`--color-primary`/`--color-primary-900`).

**Si l'utilisateur rejette une couleur précise** (ex: "la couleur de vert ne me plaît pas"), ne changer **que** cette propriété de couleur — conserver intégralement le reste du travail structurel/UX déjà fait. Demander via question à choix si la nouvelle couleur n'est pas évidente.

## Règles de développement (héritées du README)

- Composants standalone uniquement
- Commentaires en français dans le code, et seulement quand le POURQUOI n'est pas évident
- Loading states + empty states pour chaque liste (`LokSkeleton`, `LokEmptyState`)
- Zones cliquables ≥ 44px (accessibilité mobile)
- Composants partagés `Lok*` (BadgeStatut, BadgePaiement, MontantFcfa, CardBien, Alerte, Skeleton, EmptyState, ConfirmModal, Upload, TelephoneTogo) à réutiliser plutôt que recréer

## Vérification avant de considérer une tâche terminée

Après toute modification de code Angular, lancer un build pour vérifier l'absence d'erreurs :

```bash
npx ng build --configuration development
```

**Important** : utiliser l'outil Bash pour cette commande, **pas** PowerShell `Start-Process -FilePath "npx"` (échoue avec "n'est pas une application Win32 valide" dans cet environnement).

## Contraintes d'environnement (Windows / PowerShell + Git Bash)

- `python3` / `python` ne sont pas disponibles — ne pas s'appuyer dessus pour des scripts.
- Les heredocs PowerShell (`@'...'@`) cassent si le contenu contient des séquences `$(` (interprétées comme sous-expressions), même en littéral. Pour des CSS avec `rgba(...)`, etc., préférer l'outil `Edit` directement.
- Les heredocs Bash (`cat > file << 'EOF'`) et `node -e "..."` inline sont peu fiables pour du contenu multi-lignes volumineux avec guillemets imbriqués (erreurs "unexpected EOF").
- Pour insérer un gros bloc HTML/CSS généré : écrire le contenu dans un fichier via l'outil `Write` (pas de souci d'échappement shell), puis utiliser un petit script Node (écrit via l'outil `Write`, exécuté via Bash `node script.js`) qui repère des marqueurs dans le fichier cible et fait la substitution.
- Si édition directe via PowerShell `[System.IO.File]::WriteAllText` est nécessaire, toujours forcer l'encodage `[System.Text.UTF8Encoding]::new($false)` pour éviter le mojibake sur les caractères accentués français.

## Notes diverses

- `features/contrats/pages/contrat-bail/` est vide — composant PDF de contrat de bail à construire un jour, mais ne pas y toucher sans demande explicite.
- Le dossier n'est pas (encore) un dépôt Git (`git init` à proposer si l'utilisateur veut versionner). Pas de backend ni de DB pour l'instant — Next.js/PostgreSQL/Supabase listés au README sont "à implémenter".

## Bonnes pratiques logicielles de référence

Checklists condensées à appliquer selon ce qui est pertinent à l'état actuel du projet (frontend Angular seul, backend pas encore implémenté). Ne pas sur-ingénierer une partie qui n'existe pas encore — utiliser comme guide quand ces parties seront construites.

### Applicables dès maintenant (frontend)

**UI/UX & accessibilité**
- Hiérarchie visuelle claire, feedback visuel sur chaque action (loading/empty/error states via `LokSkeleton`/`LokEmptyState`/`LokAlerte`)
- WCAG AA : `alt` sur les images, contraste suffisant, navigation clavier, HTML sémantique (`header`, `nav`, `main`, `button` plutôt que `div` cliquable)
- Zones cliquables ≥ 44px (déjà dans les règles ci-dessus)
- Design system cohérent : réutiliser les variables CSS de couleur et les composants `Lok*` plutôt que recréer un style ad hoc à chaque page

**Code & architecture**
- SOLID quand on écrit des services/classes : responsabilité unique, dépendre d'interfaces/abstractions plutôt que d'implémentations concrètes
- Séparer clairement composants (présentation), services (logique), models (`core/models/`)
- Gestion d'erreurs cohérente : pas de `console.log` pour les erreurs utilisateur, passer par `LokAlerte` ou un service de notification
- Pas de `SELECT *` mental côté front non plus : ne récupérer/exposer que les données nécessaires aux composants

**Tests**
- Pas de suite de tests projet actuellement (seulement les `.spec.ts` par défaut d'Angular CLI dans `node_modules`) — à mettre en place avec Jasmine/Karma (déjà fourni par Angular) ou migrer vers Jest si demandé
- Quand des tests sont ajoutés : unitaires sur la logique des services/pipes en priorité, puis composants critiques (formulaires, calculs de montants FCFA)
- Ne jamais désactiver un test qui échoue pour "faire passer" la CI — corriger la cause

**Git (une fois le dépôt initialisé)**
- Workflow feature branch : une branche par fonctionnalité/correctif, PR avant fusion sur `main`
- Messages de commit clairs à l'impératif (« Ajoute… », « Corrige… »), jamais de commit vide ni de `--no-verify`/`--amend` sauf demande explicite (déjà couvert par les règles système)

### À appliquer quand le backend sera construit

**Base de données**
- Schéma normalisé (1NF-3NF), une table = une entité métier ; dé-normaliser seulement si un besoin de perf concret l'exige
- Index sur les colonnes utilisées en `WHERE`/`JOIN` ; éviter le sur-indexage qui ralentit les écritures
- Toujours des requêtes paramétrées (jamais de concaténation de l'input utilisateur) — protection injection SQL
- Transactions explicites `BEGIN…COMMIT/ROLLBACK` pour toute opération multi-étapes critique (ex. paiement + mise à jour solde)
- Migrations versionnées avec le code (Flyway/Liquibase ou équivalent JS/TS comme TypeORM/Prisma migrations), jamais de modification d'un script déjà exécuté en prod
- Sauvegardes automatisées + test de restauration périodique (règle 3-2-1)
- Principe du moindre privilège pour l'utilisateur DB de l'application

**API & sécurité**
- REST : ressources nommées au pluriel, verbes HTTP sémantiques, versionnement (`/v1/...`), codes HTTP corrects, doc OpenAPI/Swagger
- Auth : JWT ou sessions, mots de passe hashés (bcrypt/Argon2), HTTPS obligatoire, RBAC pour les rôles (Propriétaire/Gestionnaire/Locataire déjà distincts dans ce projet)
- Protection XSS/CSRF/CORS, validation stricte des entrées (surtout les uploads — taille, type MIME)
- Cache (Redis) pour les données fréquentes et peu volatiles, avec TTL et invalidation explicite

**CI/CD**
- Pipeline minimal : lint + build + tests unitaires à chaque push/PR, déploiement staging automatique, prod après validation
- GitHub Actions si le repo est sur GitHub (cohérent avec l'écosystème actuel), sinon GitLab CI

**Observabilité**
- Logs structurés avec niveaux (ERROR/WARN/INFO/DEBUG), pas de données sensibles dans les logs
- Métriques de base (latence, taux d'erreur) dès que des endpoints réels existent
