# Guide de contribution — WARAH

## Table des matières

1. [Prérequis](#prérequis)
2. [Nommage des branches](#nommage-des-branches)
3. [Conventions de commit](#conventions-de-commit)
4. [Processus de Pull Request](#processus-de-pull-request)
5. [Règles de qualité](#règles-de-qualité)

---

## Prérequis

```bash
nvm use          # utilise la version Node dans .nvmrc
npm install      # installe les dépendances + active les hooks git
```

Les hooks git (`pre-commit` et `commit-msg`) sont activés automatiquement via Husky lors du `npm install`.

---

## Nommage des branches

```
<type>/<ticket>-<description-courte>
```

**Types autorisés :**

| Type       | Usage                                       |
| ---------- | ------------------------------------------- |
| `feat`     | Nouvelle fonctionnalité                     |
| `fix`      | Correction de bug                           |
| `refactor` | Refactoring sans changement de comportement |
| `docs`     | Documentation uniquement                    |
| `test`     | Ajout ou modification de tests              |
| `chore`    | Maintenance, dépendances, config            |
| `ci`       | Pipeline CI/CD                              |
| `perf`     | Amélioration de performance                 |

**Exemples :**

```
feat/DIN-42-encaissement-mobile-money
fix/DIN-17-calcul-loyer-prorata
refactor/DIN-88-health-check-module
docs/DIN-5-guide-deploiement
```

---

## Conventions de commit

Ce projet utilise [Conventional Commits](https://www.conventionalcommits.org/).
Le format est validé automatiquement par commitlint au moment du commit.

### Format

```
<type>(<scope>): <description courte en minuscules>

[corps optionnel — explication du POURQUOI]

[footer optionnel — références de tickets, breaking changes]
```

### Types

`feat` · `fix` · `docs` · `style` · `refactor` · `perf` · `test` · `build` · `ci` · `chore` · `revert`

### Scopes

`backend` · `frontend` · `infra` · `ci` · `deps` · `auth` · `payments` · `tenants` · `leases` · `receipts`

### Exemples valides

```
feat(payments): intégrer cashpay pour paiements t-money et flooz

fix(tenants): corriger la validation du numéro de téléphone togolais

docs(infra): ajouter procédure de rollback railway

chore(deps): mettre à jour @nestjs/common vers 10.4.2

ci: ajouter cache npm dans le workflow backend
```

### Exemples invalides

```
# Pas de majuscule dans la description
feat(backend): Ajouter le module paiement

# Type invalide
update(frontend): nouvelle page dashboard

# Message trop vague
fix: corrections
```

---

## Processus de Pull Request

1. **Créer une branche** à partir de `main` selon le nommage ci-dessus
2. **Développer** en faisant des commits atomiques (une PR = une fonctionnalité/correction)
3. **Avant de push :**
   - `npm run typecheck` — aucune erreur TypeScript
   - `npm run lint` — aucune erreur ESLint
   - `npm run test` — tous les tests passent
4. **Ouvrir la PR** vers `main` avec :
   - Titre au format Conventional Commit
   - Description expliquant le POURQUOI (pas le QUOI, le code le dit)
   - Lien vers le ticket (ex. `Closes #42`)
5. **CI obligatoire :** la PR ne peut être mergée que si tous les jobs CI passent (lint, typecheck, tests, build)
6. **Review :** au moins 1 approbation requise
7. **Merge :** squash merge préféré pour garder un historique main propre

---

## Règles de qualité

- **TypeScript strict** — `noImplicitAny`, `strictNullChecks` activés dans tous les tsconfig
- **Pas de `any` explicite** sans commentaire justifiant pourquoi
- **Pas de console.log** en production — utiliser le logger Pino côté backend ; côté frontend, un état d'erreur visible plutôt qu'un `console.log`
- **Variables sensibles** — jamais en dur dans le code, toujours via variables d'environnement
- **PDFs** — jamais stockés (génération à la volée uniquement, c'est une contrainte projet)
- **Migrations Prisma** — rétrocompatibles (voir `docs/ROLLBACK.md`)
- **Tests** — tout nouveau service NestJS doit avoir au minimum des tests unitaires des cas nominaux

---

## Ressources

- Architecture : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Déploiement : [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- Variables d'environnement : [`docs/ENV.md`](docs/ENV.md)
