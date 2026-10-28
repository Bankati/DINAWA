# Mémoire — Phase 12 WhatsApp et chatbot : cadrage + unité 42 (fondations)

Dernière mise à jour : 2026-10-08

## Ce qui a été créé

**Planification phase 12 (2026-10-07)** — commits `4068c4d`, `6e8d83b` :
- `contexte/build-plan.md` : nouvelle « Phase 12 — WhatsApp et chatbot locataire », unités 42 à 49 + **réactivation de l'unité 39** (signalements locataire via WhatsApp, qui lui donnent enfin une source d'entrée réelle).
- `contexte/progress-tracker.md` : statut courant, cases de la phase 12 avec leur jour prévu, décisions de cadrage, questions ouvertes.
- Documents de référence hors dépôt (Claude Docs, propriétaire ADOM) : « Plan d'implémentation WhatsApp et chatbot », « Architecture : intégration WhatsApp et chatbot », « Plan de travail (2 semaines) », « Ce que la direction doit faire » (compte Meta, puce, juridique).

**Unité 42 — Fondations WhatsApp (2026-10-08)** — commit `1c4a538`, branche `feat/whatsapp-42-fondations`, **PR #66 ouverte vers `dev`, pas encore fusionnée** :
- Migration `prisma/migrations/20261008090000_add_whatsapp_foundations/` (additive).
- `src/common/utils/phone.ts`, `signed-token.ts`, `meta-signature.ts` (+ specs).
- `TokenService.generatePin()/hashPin()/verifyPin()` (+ `token.service.spec.ts`, premier test de ce service).
- `src/modules/whatsapp-channel/` : `whatsapp-cloud.client.ts`, `meta-error.ts`, `meta-error-grid.ts`, `whatsapp-access.service.ts`, `whatsapp.service.ts`, `whatsapp-channel.module.ts` (+ specs). Importé dans `AppModule`, appelé par aucun service (branchement à l'unité 46).
- `PlatformSettings.whatsappEnabledTiers` + `UpdatePlatformSettingsDto` + `PlatformSettingsService.whatsappEnabledTiers()`.
- `env.validation.ts` (`WHATSAPP_*`, `PAY_LINK_SECRET`), `logger.config.ts` (masquage), `.env.example`, `architecture.md` (invariant #8 précisé + section « WhatsApp Cloud API (Meta) »).

## Décisions prises

Les règles techniques de l'unité 42 sont dans `architecture.md` (section WhatsApp) et `build-plan.md` (unité 42) — ne pas les redécouvrir. En plus :

- **Méthode de travail phase 12** : une branche par unité (`feat/whatsapp-<n>-<nom>`), cycle `/remember restore` → `/architect` (jusqu'au « Blueprint ready » + validation explicite) → code + tests → `tsc`/`eslint`/`jest` → `/review` → corrections → PR vers `dev` relue par le binôme → `/remember save`. Si l'unité dépend d'une PR non fusionnée, brancher depuis la branche de cette PR.
- **Le développeur fait relire chaque plan/revue par un tiers** et colle ses remarques : elles ont été justes à chaque fois (statut `UNKNOWN`, anti-force-brute du code, historique du consentement, `markSent` hors du `try`, 5xx = `UNKNOWN`). Les traiter sérieusement, point par point, avec un avis argumenté.
- **Une migration par unité** (pas une migration unique de phase).
- **Le développeur veut des explications en français simple**, avec exemples concrets, avant de valider une décision technique.
- Décisions de cadrage (2026-10-07) : société porteuse du compte Meta **pas encore créée** ; puce dédiée ; formules incluant WhatsApp **à définir plus tard** (d'où le réglage admin) ; fonctionnalité pour **tous** les locataires (sans gestionnaire, le propriétaire répond) ; délai annoncé « sous 24 h » ; lien de paiement valable jusqu'à l'échéance + 30 jours.

Décisions antérieures toujours valables (session du 2026-08-10) :
- Frontend : tout nouveau rôle/page passe par `AppShell` partagé (le panel admin n'a plus sa propre coquille).
- Types partagés backend↔frontend : à étendre endpoint par endpoint (`@ApiOkResponse` + DTO de réponse), jamais d'un coup.
- Tests e2e NestJS : `overrideGuard()` ne marche pas pour un guard enregistré via `APP_GUARD` — utiliser `overrideProvider()` sur la dépendance externe du guard.

## Problèmes résolus

- **`WHATSAPP_ENABLED=false` lu comme `true`** : avec `enableImplicitConversion`, `@Transform` reçoit `value` déjà converti (`Boolean("false") === true`). Lire la valeur brute via `({ obj, key }) => obj[key]`. Valable pour tout futur booléen de configuration.
- **Créer une migration sans base « shadow »** (Supabase) : `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<horodatage>_<nom>/migration.sql`, puis `npx prisma migrate deploy` et `npx prisma generate`. Après une modification de commentaire seulement, la même commande doit répondre « empty migration ».
- **Le backend ne démarre pas en local** sans `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CONTACT_RECIPIENT_EMAIL` (absents du `.env`, à demander au binôme). Pour vérifier un câblage de module malgré tout : script jetable `NestFactory.createApplicationContext(AppModule)` lancé avec des valeurs factices passées en variables de commande (jamais écrites dans `.env`), puis supprimé.
- **Jest est très lent sur ce dossier OneDrive** (3 à 6 min pour quelques fichiers, plus pour toute la suite) : lancer la suite complète en arrière-plan.
- **ESLint sur les specs** : accéder aux `mock.calls` via un helper typé (`as [{ data: ... }][]`), espionner `axios.create` avec `jest.spyOn` plutôt qu'un `jest.mock` (règle `unbound-method`).
- Toujours valables (2026-08-10) : ne jamais lancer `next build` pendant que `next dev` tourne sur le même dossier (cache Turbopack corrompu → `rm -rf .next` + relancer) ; import supertest par défaut (`import request from 'supertest'`).

## État actuel

- `dev` = `df1cd38` (dernier commit du binôme, 2026-10-07 : messages de contact pour le super-admin), aligné avec GitHub.
- Unité 42 terminée et vérifiée : **698 tests verts** (64 fichiers), `tsc`/`eslint` propres, démarrage vérifié. **PR #66 en attente de relecture par le binôme.** Après fusion, le binôme doit lancer `npx prisma generate`.
- ⚠️ **Migration `20261008090000_add_whatsapp_foundations` déjà appliquée sur la base Supabase du `.env`** (projet « ADOMGNOYAROU ») avant fusion — **ne plus jamais la modifier**, toute correction passe par une nouvelle migration.
- `PAY_LINK_SECRET` présent dans le `.env` local (généré), facultatif jusqu'à l'unité 43. `WHATSAPP_ENABLED` absent = éteint.
- Test réel Meta (`hello_world`) **non fait** : le compte développeur Meta n'existe pas encore.
- Synchro automatique `WARAH-sync-binome` (tâche planifiée Windows, toutes les 5 min, `C:\Users\adomg\warah-sync\sync.js`) : n'agit que sur la branche `dev`, en pause pendant le travail sur une branche d'unité.

## La prochaine session commencera par

1. `/remember restore`, puis vérifier si la PR #66 a été fusionnée (`gh pr view 66 --repo Bankati/DINAWA`).
2. Unité 43 « Lien de paiement public » : créer `feat/whatsapp-43-lien-paiement` depuis `dev` si #66 est fusionnée, sinon depuis `feat/whatsapp-42-fondations`, puis `/architect` sur l'unité 43. Elle rend `PAY_LINK_SECRET` **obligatoire** : le faire créer sur Railway (staging + production) et chez le binôme **avant** de fusionner la 43.

## Questions en suspens

- **La base Supabase du `.env` est-elle aussi celle de la production Railway ?** À demander au binôme. Si oui : séparer développement et production. (La migration 42 est additive : sans risque pour le code en production dans les deux cas.)
- Clés `RESEND_API_KEY` / `RESEND_FROM_EMAIL` (et `CONTACT_RECIPIENT_EMAIL`) à obtenir du binôme pour démarrer le backend en local.
- Compte Meta : société à créer, compte développeur + numéro de test à obtenir (voir document « Ce que la direction doit faire »).
- Durée de conservation de `WhatsappMessage` (décision direction).
- Exigence d'un bail actif dans `canUseWhatsapp` (quittance après résiliation) — à trancher au `/architect` de l'unité 46.
- Coût en requêtes de `canUseWhatsapp` dans les boucles des crons — à traiter à l'unité 46 (invariant #12).
- Validation juridique de la case de consentement + déclaration IPDCP (bloquant pour la production, hors code).
- `AGENTS.md` du backend est daté (parle encore de Supabase Auth et de Cashpay) — la référence à jour est `contexte/architecture.md`.
