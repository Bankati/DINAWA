# Mémoire — Backend WARAH (audit tracker + démarrage Mandats)

Dernière mise à jour : 2026-08-06

## Historique condensé (avant cette session)

Phases 1-3 (unités 01-15) terminées : auth, biens, locataires, baux. Phase 4 (paiements) : `POST /api/payments/manual`, déclarations locataire, confirmation/rejet, `GET /api/payments/:id/receipt.pdf`. Phase 5 (unités 24-25, rappels/impayés) et Phase 7 unité 28 (annonces) terminées. Frontend migré d'Angular vers Next.js.

**Session du 2026-08-04** : suppression complète du système de vérification CNI (module `identity`, modèle `IdentityVerification`, `assertIdentityVerified()`, deps `tesseract.js`/`mrz`) — décision du boss à l'époque : suppression totale, pas de vérification différée. Fix `receipt-pdf.service.ts` (PDFKit encode le texte en hex dans les content streams TJ ; `fcfa()` cassait sur l'espace fine U+202F de `toLocaleString('fr-FR')`, encodée en `/` par WinAnsiEncoding). 257 tests à l'issue de cette session.

## Ce qui a été fait (cette session — 2026-08-06)

**1. Audit de cohérence code ↔ `progress-tracker.md`** (le tracker n'avait pas été mis à jour depuis le 2026-07-28, alors que le code avait changé le 2026-08-04 dans une session dont la trace n'était que dans `memory.md`, jamais reportée dans le tracker).

Écarts trouvés et documentés dans `apps/backend/contexte/progress-tracker.md` :

- Unité 07 (CNI) décochée avec note de retrait complet (2026-08-04) — historique conservé en biffé, plus plusieurs notes "obsolète" ajoutées sous les unités 08/09 et dans la section Decisions (le paragraphe CNI y est toujours présent mais marqué comme annulé).
- `AdminModule` découvert non documenté (`src/modules/admin/` : `GET /admin/users`, `GET /admin/users/:id`, importé dans `app.module.ts`) — ajouté au Progress sous l'unité 37 (Phase 10) comme "partiel", avec ses lacunes listées (pas de tests, pas de DTO validé, 4 warnings ESLint).
- `GET /api/payments` et `GET /api/payments/:id/receipt.pdf` acceptent maintenant `TENANT` — noté dans Current Status.
- Vérifié en conditions réelles : `npx jest` → **25 suites, 257 tests, tous passants** ; `npx tsc --noEmit` propre ; `npx eslint src/` → **1 erreur réelle** (`account.controller.spec.ts:14`, `@typescript-eslint/no-unnecessary-type-assertion`) + 4 warnings (module admin). **Non corrigés** — audit seul, aucun code applicatif touché.

**2. Décisions produit actées avec le développeur (2026-08-06)**, questions ouvertes fermées dans le tracker :

- **CNI abandonnée définitivement.** Pas un oubli, un choix assumé — confirmé explicitement, aucune reconstruction prévue en V1.
- **Cashpay (unités 17-18) reste reporté** — les agréments mobile money (T-Money/Flooz) ne sont pas encore obtenus côté produit (bloquant indépendant du code, pas juste un problème de documentation API comme noté précédemment). Pas de date de reprise connue.
- **Direction retenue pour la suite : Phase 8 (Mandats et espace gestionnaire, unité 31)** plutôt que Cashpay ou la Phase 6 (déjà couverte côté frontend par composition client, voir `dashboard.service.ts`).

**3. `/architect` démarré sur l'unité 31 (Mandats)** — session interrompue par le développeur avant la fin, à reprendre. Voir "La prochaine session commencera par" ci-dessous pour l'état exact.

## Décisions prises

- CNI : abandon définitif, confirmé (voir ci-dessus).
- Cashpay : reporté sans date, bloqué par les agréments produit, pas par la technique.
- Prochain chantier backend : Phase 8, en commençant par l'unité 31 (Mandats).
- Vocabulaire validé pour l'unité 31 (voir section /architect ci-dessous) : « mandat actif » = `status = ACTIVE` uniquement (le statut `EXPIRED` du schéma reste non automatisé, comme pour les baux — aucun cron ne le déclenche, hypothèse implicite pas encore explicitement confirmée par le développeur au moment de l'interruption) ; « portefeuille » (`GET /api/manager/portfolio`) = uniquement les biens sous mandat actif, **distinct** de `GET /api/properties` qui montre déjà (via `propertyVisibilityWhere()`) biens propres + biens sous mandat mélangés.

## Problèmes résolus

Rien de nouveau cette session côté code — audit et documentation uniquement. Voir session du 2026-08-04 dans l'historique condensé pour les fixes PDFKit.

## État actuel

- Backend : build propre, lint quasi propre (1 erreur pré-existante non liée à cette session + 4 warnings sur le module admin), **257 tests unitaires (25 suites)** passent tous.
- `apps/backend/contexte/progress-tracker.md` est maintenant à jour et fiable (audité ligne par ligne contre le code réel le 2026-08-06) — s'y fier davantage qu'à ce fichier `memory.md` pour l'état détaillé unité par unité.
- Modules backend actifs : `account`, `admin` (partiel), `auth`, `email`, `health`, `leases`, `listings`, `notify`, `payment-declarations`, `payments`, `profile`, `properties`, `push`, `receipts`, `scheduling`, `storage`, `supabase`, `tenants`. Pas de module `identity` (retiré), pas de module `mandates` (à construire, unité 31 en cours de spec).
- `Mandate`/`ManagerReview` existent déjà dans `prisma/schema.prisma` (posés par anticipation depuis l'unité 02) et sont déjà lus (pas écrits) par `canActOnProperty()`/`propertyVisibilityWhere()`/`resolveResponsibleUserId()` (`src/common/permissions/property-access.ts`) et par `AccountActivationService.hasQualifyingActivity()`. Ce dernier a un commentaire qui anticipe littéralement l'appel à `reactivateIfEligible()` depuis `MandatesService.accept()` — dépendance prête à fermer.

## La prochaine session commencera par

`/remember restore`, puis **reprendre `/architect` sur l'unité 31 (Mandats) exactement où on s'est arrêté** : le vocabulaire est validé (« mandat actif », « portefeuille » — voir Décisions ci-dessus), mais **aucune décision d'implémentation n'a encore été posée**. Première question à poser au développeur (celle qui a le plus d'impact sur le reste) :

> Comment le propriétaire désigne-t-il le gestionnaire dans `POST /api/mandates` — par `managerId` direct (suppose que le frontend connaît déjà l'ID, via quel endpoint puisque l'unité 34 "annuaire public des gestionnaires" n'existe pas encore ?), ou par email/téléphone avec recherche côté serveur (même pattern que `AuthService.inviteTenant()` qui cherche `where: { role: 'TENANT', OR: [{email}, {phone}] }`) ?

Décisions suivantes déjà identifiées, à poser une par une après celle-ci (par ordre d'impact décroissant) :

1. Un `Mandate` porte sur **un seul** `propertyId` dans le schéma — le build-plan parle de « un ou plusieurs biens » au pluriel. `POST /api/mandates` doit-il accepter un tableau de biens (plusieurs lignes `Mandate` créées en transaction) ou un bien à la fois ?
2. Le gestionnaire peut-il **refuser** un mandat `PENDING` (pas seulement l'accepter) ? Le build-plan ne mentionne qu'accept/revoke — faut-il un état "declined" distinct, ou le refus passe par le même endpoint `revoke` depuis `PENDING` avec motif ?
3. `MandateStatus.EXPIRED` : construire une transition automatique (cron) sur `endDate` dépassée dans cette passe, ou hors périmètre comme pour `Lease` (résiliation manuelle uniquement) ?
4. Contrainte d'unicité : un bien peut-il avoir plusieurs mandats `ACTIVE` simultanés (avec des gestionnaires différents) ? `canActOnProperty()` fait un `findFirst` — ambigu si plusieurs mandats actifs coexistaient sur le même bien. Probablement à garder unique en garde applicative (pas de contrainte DB stricte a priori, sauf si le développeur préfère le pattern déjà utilisé pour `Lease` ACTIVE unique par tenant).
5. `feeType`/`feeValue` (tarif du mandat) : juste stocké/informatif dans cette passe, ou une logique de calcul est-elle attendue déjà (probablement non — les rapports mensuels, unité 33, qui en auraient besoin, ne sont pas construits) ?

Une fois ces décisions posées → "Blueprint ready." → plan d'implémentation → confirmation du développeur → code.

## Questions en suspens

- Décisions d'implémentation de l'unité 31 listées ci-dessus (5 points, pas encore posées au développeur).
- 1 erreur ESLint (`account.controller.spec.ts:14`) + 4 warnings (module `admin`) trouvés le 2026-08-06, non corrigés — à caser à l'occasion, pas bloquant.
- Périmètre définitif de l'`AdminModule` (unité 37) — construit de façon minimale sans passer par `/architect`. À aligner sur le build-plan ou à documenter comme réduit assumé.
- Domaine `warah.tg` toujours pas vérifié sur Resend (hérité, toujours vrai).
- `amountInWords()` dans `receipt-pdf.service.ts` reste une version simplifiée (hérité de la session du 04/08).
