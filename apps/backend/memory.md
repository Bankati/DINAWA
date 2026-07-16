# Mémoire — Backend WARAH (révision inscription terminée, vérification passeport en discussion)

Dernière mise à jour : 2026-07-16

## Historique condensé (avant cette session)

Phases 1-2 (unités 01-11) terminées début juillet. Phase 3 — unités 12-13 (CRUD biens, photos/documents) puis 14-15 (locataires : blocage locataire↔bien + historiques, sans nouveau `POST /api/tenants` — le flux d'invitation de l'unité 09 reste l'unique chemin ; baux V1 : `POST /api/leases`, `POST /api/leases/:id/terminate`) terminées le 2026-07-09/10. Campagne de nettoyage lint/type-safety sur ~50 fichiers frontend menée en parallèle (hors périmètre backend).

## Ce qui a été fait (cette session)

**1. Push vers `origin/dev` — découverte d'un travail parallèle du compagnon.** En préparant un simple `git push`, découverte que le compagnon (même repo, email git différent) avait poussé 4+ commits en parallèle : un **backend concurrent en routes françaises** (`/api/biens`, `/api/locataires`, `/api/paiements`, `/api/proprietaires`) avec un modèle de données plus simple (pas de `Lease` dédié, création de locataire sans compte Supabase), plus 7 modules nets-nouveaux (`admin`, `dashboard`, `gestionnaire`, `listings`, `notifications`, `payments`, `proprietaires`) qui n'existaient pas du tout côté moi. Le frontend réel (déjà présent avant cette session) appelle déjà ces routes françaises — mon backend unités 12-15 n'a **jamais été relié à aucun écran réel**.

- Décision prise avec le développeur : **garder mon backend tel quel** (properties/tenants/leases/auth, testé, suit le build-plan), **prendre le frontend du compagnon tel quel** (déjà testé contre son backend), et reporter la réconciliation frontend↔mon-backend à plus tard. Les 7 modules nets-nouveaux du compagnon ne sont **pas** intégrés.
- Deux commits de merge (`cf19fc8`, `ff95ce1`) créés et poussés — le remote avait bougé deux fois pendant la résolution.
- Hook pre-commit bypassé (`--no-verify`, accord explicite) sur les commits de merge : ~1017 erreurs de lint pré-existantes dans le code frontend du compagnon (repris tel quel), à traiter comme chantier séparé plus tard.
- Deux vrais bugs trouvés et corrigés au passage : alias TS `@env/*` manquant (cassait le build frontend), `@types/jasmine` manquant (cassait la résolution de types dans les `*.spec.ts` frontend).
- **Bug latent découvert ensuite** : `apps/backend/tsconfig.json` n'avait aucune restriction `types` → `@types/jasmine` (hoisté en racine par les workspaces npm) polluait la compilation backend, 130 erreurs sans rapport. Corrigé par `"types": ["node", "jest", "express", "multer", "supertest", "web-push", "pdfkit"]`.

**2. `/architect` puis implémentation — révision inscription owner/manager (2026-07-16).** Suite à des questions du développeur sur le formulaire d'inscription (téléphone manquant, utilité du PDF gestionnaire, pertinence de la CNI obligatoire) :

- `phone` et `city` ajoutés sur `User` (pas par profil), obligatoires pour owner et manager.
- CNI redevenue **facultative à l'inscription** pour tous les rôles — `assertCniFiles()` supprimé. Nouveau verrou fonctionnel unique : `PropertiesService.create()` refuse via `assertIdentityVerified()` (`src/common/permissions/identity-verified.ts`) tant que `idVerificationStatus !== VERIFIED`.
- Document PDF de référence gestionnaire (`referenceDocuments`, `ManagerProfile.referenceDocumentPaths`) **retiré entièrement** — jugé non indispensable, jamais consommé (Phase 8 marketplace non construite).
- `GET /api/auth/me` renvoie `identityVerifiedAt` (badge de vérification, visible par l'utilisateur lui-même uniquement pour l'instant).
- Migration `20260716090000_user_city_and_manager_reference_removal`.
- 211 tests unitaires (17 suites), testé en conditions réelles (Supabase) de bout en bout.
- `build-plan.md`, `architecture.md`, `progress-tracker.md` mis à jour.

**3. En cours (interrompu par `/remember save`) — `/architect` vérification par passeport.** Nouvelle demande : ajouter une deuxième méthode de preuve d'identité (passeport), en particulier pour les propriétaires diaspora sans CNI togolaise. Recherche faite : la librairie `mrz` (déjà en dépendance, v5.0.2) supporte nativement TD1/TD2/**TD3** (passeport) — pas de nouvelle dépendance nécessaire. Mais `checkMrzChecksum()` actuel est calé sur TD1 (3 lignes, 25-35 caractères) et ne détecterait pas une MRZ TD3 (2 lignes, 44 caractères). Tension architecturale identifiée : pour la CNI, les marqueurs texte sont l'autorité principale et la MRZ un signal secondaire ; pour un passeport, il n'y a pas d'équivalent texte fiable universel (varie par pays émetteur) — la MRZ (standardisée ICAO 9303, vrai checksum) deviendrait probablement l'autorité principale à la place. Questions posées au développeur, **pas encore répondues** :

1.  « Nouvel évènement » = événement de domaine distinct (`PASSPORT_VERIFICATION_REQUESTED`) ou événement existant enrichi d'un type de document ?
2.  Confirmation que la vérification passeport cible surtout les propriétaires diaspora.

## Décisions prises

- **Mon backend (unités 11-15) reste la référence** ; le backend concurrent du compagnon (routes françaises) n'est pas intégré — reste un chantier de réconciliation frontend↔backend à planifier avec lui.
- `phone`/`city` sur `User` (partagé par tous les rôles), jamais par profil — aucune logique métier attachée à la ville (contrairement à `residenceCountry` qui pilote la distinction local/diaspora).
- La vérification CNI ne bloque plus jamais l'inscription — seul point de blocage dans tout le produit : `PropertiesService.create()`.
- Mandats (unité 31, future) : accepter un mandat ne nécessitera pas de vérification d'identité propre au gestionnaire — la confiance transite par le propriétaire déjà vérifié.
- `apps/backend/tsconfig.json` doit garder un `types` explicite — ne jamais le retirer, sous peine de re-souffrir de la pollution cross-workspace npm.

## Problèmes résolus

- Push rejeté deux fois (remote bougé pendant la résolution) → cycles fetch/merge/résolution/commit séquentiels, deux commits de merge.
- ~1017 erreurs de lint pré-existantes bloquant le hook pre-commit sur le code frontend repris du compagnon → bypass `--no-verify` explicitement autorisé, chantier reporté.
- `@types/jasmine` polluait la compilation backend via le hoisting des workspaces npm → `types` explicite dans `apps/backend/tsconfig.json`.
- `identityService.verify()` levait une exception si les fichiers étaient incomplets ; appelé maintenant seulement si `files.image` est présent, sans casser la validation existante sur soumission partielle.

## État actuel

- Backend : build clean, lint clean, 211 tests unitaires (17 suites) passent.
- Inscription owner/manager sans CNI testée de bout en bout en conditions réelles (Supabase) : signup → création de bien refusée → vérification simulée → création acceptée → badge visible sur `/auth/me`.
- **Écart connu non résolu** : le frontend actuellement déployé (celui du compagnon) n'appelle **aucune** route de mon backend (`/api/properties`, `/api/tenants`, `/api/leases`, `/api/auth/signup/*`) — il appelle des routes françaises que mon backend n'expose pas. Réconciliation explicitement reportée, sans date.
- Vérification passeport : discussion `/architect` commencée, vocabulaire pas encore aligné, aucun code écrit.

## La prochaine session commencera par

`/remember restore` puis reprendre la discussion `/architect` sur la vérification passeport, en repartant des deux questions posées et non répondues (voir section 3 ci-dessus). Une fois le vocabulaire aligné, décisions à trancher : ajout d'un champ type de document sur `IdentityVerification` (migration), MRZ comme autorité principale (pas secondaire) pour les passeports, gestion d'une seule image (pas de verso passeport), adaptation de `checkMrzChecksum()` pour détecter TD3 en plus de TD1.

## Questions en suspens

- Réconciliation frontend (routes françaises du compagnon) ↔ mon backend (routes anglaises) — reportée sans date, décision à prendre avec le compagnon.
- Nettoyage lint du frontend repris tel quel (~1017 erreurs pré-existantes) — chantier séparé, pas planifié.
- Domaine `warah.tg` toujours pas vérifié sur Resend (hérité, toujours vrai).
- Vérification passeport — architecture pas encore tranchée avec le développeur.
