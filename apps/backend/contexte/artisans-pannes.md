# Artisans et pannes — proposition d'architecture

> **Statut : V1 construite le 2026-11-27** (unités 51 à 54, feu vert du boss jusqu'au déploiement). Voir « Ce qui est construit » juste en dessous : deux écarts avec la proposition initiale, choisis pour que tout marche sans dépendre du compte Meta.

## Ce qui est construit (V1) — écarts avec la proposition

| Sujet | Proposition | Construit en V1 | Pourquoi |
| --- | --- | --- | --- |
| Accord de l'artisan | Message « ARTISAN <code> » envoyé au robot, puis « OUI » | **Page web d'accord** `/artisans/accord/<jeton>` ouverte depuis le lien que le propriétaire transfère sur WhatsApp. Jeton signé HMAC (`signed-token.ts`, usage `artisan-consent`, clé `INVITATION_TOKEN_SECRET`), 7 jours, **usage unique** (`ArtisanInvitation.usedAt`, écriture conditionnelle). | Fonctionne même si WhatsApp Cloud n'est pas actif en production ; ne touche pas au webhook ni au robot. |
| Signalement par le robot | « Signaler un problème » dans le menu du robot | **Espace locataire web seulement** (`/locataire/pannes`). `SupportRequest.channel` prévoit déjà `WHATSAPP` pour plus tard. | Même raison ; le téléchargement des photos chez Meta reste à faire avec l'unité 39 « robot ». |
| Photos des pannes | Bucket `support-photos` | Bucket existant `property-photos`, dossier `support-requests/<id>/` | Aucun bucket à créer côté Supabase avant le déploiement. |
| Notifications WhatsApp | 2 modèles Meta | `null` dans `whatsapp-templates.ts` : push ou email seulement | Les modèles doivent d'abord être validés chez Meta. |

**Risque résiduel assumé (accord par lien)** : le lien prouve qu'on l'a reçu, pas que le numéro appartient à celui qui clique — un propriétaire pourrait ouvrir lui-même le lien. Garde-fous : numéro masqué sur la page, texte d'accord versionné et preuve gardée (`ArtisanConsentEvent`), retrait à tout moment par l'admin (`/admin/artisans`, motif obligatoire), badge « vérifié » réservé à l'admin. Passer à la vérification par le robot (proposition initiale) quand WhatsApp sera actif.

Modules : `src/modules/artisans/` (carnet, invitation, accord, annuaire, admin) et `src/modules/support-requests/` (pannes, avis, masquage admin). Migration additive `20261127120000_add_artisans_support_requests` (7 tables, 6 enums, aucune table existante modifiée). Pages : `/dashboard|gestionnaire/artisans`, `/dashboard|gestionnaire/pannes`, `/locataire/pannes`, `/artisans` (public), `/artisans/accord/[jeton]`, `/admin/artisans`, `/pannes` (redirection selon le rôle).

---

La proposition initiale suit, pour référence.

## Besoin

Un locataire signale une panne (fuite, électricité, serrure…). Le propriétaire ou le gestionnaire choisit un artisan de confiance. Le locataire et l'artisan sont prévenus. On suit l'intervention jusqu'à la fin, avec son coût, puis le propriétaire peut noter l'artisan.

## Décisions de cadrage (boss, 2026-11-27)

| Question | Décision |
| --- | --- |
| Qui inscrit les artisans ? | Le **propriétaire** (ou le gestionnaire). L'artisan n'a pas de compte au départ. |
| Visibilité | **Annuaire public dès le début**, mais seulement pour les artisans qui ont donné leur accord (voir plus bas). |
| Pannes | **Oui, dès la première version** : les artisans sont reliés aux signalements des locataires. |
| Argent | **Gratuit** pour l'instant. Cohérent avec l'invariant #14 (seule source de revenu : l'abonnement). Une commission plus tard demanderait de réviser cet invariant. |

## Les deux contraintes qui structurent tout

1. **Loi togolaise n° 2019-014** : on ne publie pas le numéro d'une personne sans son accord. Un artisan ajouté par un propriétaire reste dans le carnet privé de ce propriétaire tant qu'il n'a pas dit « OUI » lui-même.
2. **Règles de Meta** : WARAH ne peut pas écrire en premier, sur WhatsApp, à quelqu'un qui ne l'a pas accepté. Aujourd'hui, le robot (unité 47) ne connaît que les locataires et se tait pour un numéro inconnu.

D'où le parcours d'accord : **c'est l'artisan qui écrit en premier au robot**, à partir d'un lien d'invitation transféré par le propriétaire depuis son propre WhatsApp (même principe que le code locataire créé dans WhatsApp, unité 50).

## Parcours

### Ajout et accord de l'artisan

1. Le propriétaire ajoute un artisan : nom affiché, numéro, métiers, quartiers. L'artisan est **tout de suite utilisable dans son carnet privé**.
2. Si ce numéro existe déjà dans WARAH (un autre propriétaire l'a ajouté), **aucune nouvelle fiche** : l'artisan existant est ajouté au carnet. Le propriétaire ne voit pas qui d'autre l'a ajouté.
3. WARAH fournit un **lien d'invitation** `https://wa.me/<WHATSAPP_BUSINESS_NUMBER>?text=ARTISAN%20<code>` et un texte prêt à transférer. Le code (6 caractères, à usage unique, valable 7 jours) est lié à la fiche.
4. L'artisan clique : WhatsApp s'ouvre sur le robot avec « ARTISAN 4K8Q2B » déjà écrit. Il l'envoie (message entrant : fenêtre de 24 h ouverte, aucun modèle Meta nécessaire).
5. Le robot vérifie que le code est valable **et que le numéro qui écrit est celui de la fiche** (Meta authentifie l'expéditeur), puis demande l'accord : texte versionné (`artisan-annuaire-v1`), réponse « OUI » ou « NON ».
6. « OUI » → fiche `PUBLIC`, preuve enregistrée. « NON » → la fiche reste privée et ne peut plus être proposée à l'annuaire sans nouvelle invitation. « STOP » à tout moment → retrait immédiat de l'annuaire.

### Panne (signalement du locataire)

1. Le locataire signale une panne : **depuis le robot** (« Signaler un problème », déjà prévu à l'unité 39) **ou depuis son espace web**. Description, métier concerné (facultatif), urgence, photos.
2. Le responsable du bien (`resolveResponsibleUserId`) est prévenu.
3. Il choisit un artisan (son carnet ou l'annuaire) → statut `ASSIGNED`.
4. Prévenir l'artisan :
   - s'il a écrit au robot depuis moins de 24 h → message du robot (réponse libre) ;
   - sinon → le propriétaire reçoit un **lien wa.me prérempli** (adresse, description, contact du locataire) à envoyer lui-même depuis son WhatsApp. WARAH n'envoie pas de modèle Meta à l'artisan dans cette version.
5. Le locataire est prévenu (nom et numéro de l'artisan).
6. Le responsable passe la panne en `IN_PROGRESS`, puis `RESOLVED` avec le coût (facultatif) et qui le paie (propriétaire / locataire).
7. Après `RESOLVED`, le propriétaire (ou le gestionnaire) peut noter l'artisan, **une fois par panne**.

## Données (Prisma, migration additive uniquement — invariant #16)

### `Artisan`

| Champ | Rôle |
| --- | --- |
| `id` | cuid |
| `phone` | **unique**, format international normalisé (`+228…`), même normalisation que les numéros des comptes |
| `displayName` | nom affiché (« Kossi Plomberie ») |
| `trades` | `ArtisanTrade[]` (enum ci-dessous) |
| `zones` | `String[]`, quartiers et villes, comme `ManagerProfile.zonesOfIntervention` |
| `directoryStatus` | `PRIVATE` / `PUBLIC` / `REFUSED` / `SUSPENDED` |
| `verifiedAt`, `verifiedById` | badge « vérifié », posé par un admin |
| `consentChangedAt` | heure du dernier changement d'accord (même règle d'ordre que l'unité 45) |
| `ratingAverage`, `ratingCount` | comme `ManagerProfile` |
| `userId` | **nullable, unique** : vide en V1, rempli le jour où l'artisan aura un compte (il récupère sa fiche et ses avis) |
| `createdById` | propriétaire ou gestionnaire qui l'a créé en premier |

`ArtisanTrade` : `PLUMBER`, `ELECTRICIAN`, `MASON`, `CARPENTER`, `PAINTER`, `AIR_CONDITIONING`, `LOCKSMITH`, `GLAZIER`, `WELDER`, `TILER`, `OTHER` (libellés français côté frontend).

**Qui modifie la fiche ?** Nom, métiers et quartiers : le créateur tant que la fiche est `PRIVATE`. Une fois `PUBLIC`, seulement l'admin (et plus tard l'artisan lui-même). Les autres propriétaires n'ont que leur note privée.

### `ArtisanContact` (le carnet)

`userId` (propriétaire ou gestionnaire), `artisanId`, `privateNote` (≤ 500 caractères, jamais montrée à l'artisan ni aux autres), `createdAt`. Unique sur (`userId`, `artisanId`).

### `ArtisanInvitation`

`artisanId`, `codeDigest` (empreinte HMAC du code via `TokenService`, jamais le code en clair — même règle que le code locataire), `expiresAt` (7 jours), `usedAt`, `createdById`. Une seule invitation valable à la fois par artisan.

### `ArtisanConsentEvent` (preuve)

`artisanId`, `previous`, `next` (`directoryStatus`), `noticeVersion`, `source` (`BOT` / `ADMIN`), `actorUserId` (admin), `phoneLast2`, `sourceAt` (heure Meta), `createdAt`. Même modèle de preuve que `WhatsappConsentEvent`.

### `SupportRequest` (unité 39, étendue)

L'unité 39 prévoit déjà `SupportRequest` (référence `SR-xxxx`, bucket privé `support-photos`). **On ne crée pas de deuxième table « panne »** : l'unité 39 est construite avec ces champs en plus.

| Champ ajouté | Rôle |
| --- | --- |
| `channel` | `WHATSAPP` / `WEB` |
| `trade` | `ArtisanTrade?` |
| `urgency` | `NORMAL` / `URGENT` |
| `status` | `OPEN` → `ASSIGNED` → `IN_PROGRESS` → `RESOLVED`, ou `CANCELLED` |
| `artisanId`, `assignedAt`, `assignedById` | artisan choisi |
| `resolvedAt`, `costAmount` (FCFA, entier), `costPaidBy` (`OWNER` / `TENANT`) | clôture |

Toute transition de statut est une écriture conditionnelle (`updateMany` gardé par le statut attendu), comme ailleurs dans le projet.

### `SupportRequestPhoto`

`supportRequestId`, `storagePath` (bucket `support-photos`), `position`. Au plus 5 photos par panne. URL signées 15 min (invariant #19).

### `ArtisanReview`

`artisanId`, `authorId`, `supportRequestId` (**unique** : un avis par panne), `rating` (1–5), `comment?` (≤ 1 000), `isHidden`, dates. Autorisé seulement si la panne est `RESOLVED` et que l'auteur peut agir sur le bien. `Artisan.ratingAverage` / `ratingCount` recalculés dans la même transaction (avis masqués exclus).

## Accès

| Qui | Voit / fait |
| --- | --- |
| **Public** (sans compte) | annuaire : artisans `PUBLIC` et non suspendus, filtrés par métier et quartier, avec note et badge. Bouton « Contacter sur WhatsApp » construit côté frontend (comme les annonces). |
| **Propriétaire / gestionnaire** | son carnet, l'annuaire, les pannes de ses biens (`canActOnProperty` — invariant #2 : lecture `canRead`, modification `canMutate`). Propriétaire avec mandat actif : lecture seule sur les pannes. |
| **Locataire** | ses propres pannes ; nom et numéro de l'artisan choisi pour elles. Jamais le carnet ni les notes privées. |
| **Admin** | badge vérifié, suspension (motif obligatoire, journal d'audit), masquer un avis. |

## Endpoints prévus

Propriétaire / gestionnaire :
- `GET/POST /api/artisans` (carnet, pagination ≤ 100 — invariant #11), `PATCH /api/artisans/:id`, `DELETE /api/artisans/:id` (retire du carnet seulement)
- `POST /api/artisans/:id/invitation` → lien wa.me et texte à transférer
- `GET /api/support-requests` (filtres bien / statut), `GET /api/support-requests/:id`, `PATCH /api/support-requests/:id/status`, `POST /api/support-requests/:id/assign`, `POST /api/support-requests/:id/review`

Locataire :
- `GET/POST /api/me/support-requests`, `POST /api/me/support-requests/:id/photos`, `POST /api/me/support-requests/:id/cancel`

Public (`@Public()`, limite de débit stricte, 20 résultats par page) :
- `GET /api/public/artisans` (filtres `trade`, `zone`), `GET /api/public/artisans/:id`

Admin :
- `GET /api/admin/artisans`, `POST /api/admin/artisans/:id/verify`, `POST /api/admin/artisans/:id/suspend`, `POST /api/admin/artisan-reviews/:id/hide`

## Notifications

Toutes passent par `NotifyService.notifyUser()` (invariant #6), sauf les réponses du robot à l'artisan (réponses conversationnelles, même exception que l'unité 44).

| Événement | Destinataire | Canal |
| --- | --- | --- |
| `support-request-created` | responsable du bien | push ou email |
| `support-request-assigned` | locataire | push ou email, plus WhatsApp (modèle Meta à créer) |
| `support-request-resolved` | locataire | push ou email, plus WhatsApp (modèle Meta à créer) |
| accord, invitation invalide, STOP | artisan | réponse du robot dans la fenêtre de 24 h |

Les **deux nouveaux modèles Meta** sont à déposer dès le début de l'unité 53 : leur validation prend plusieurs jours.

## Robot WhatsApp : ce qui change

- Le routage actuel (« numéro inconnu → silence ») gagne **une seule exception** : un message entier de la forme `ARTISAN <code>` est envoyé au traitement artisan. Tout autre message d'un numéro inconnu reste sans réponse.
- Un numéro qui est à la fois locataire et artisan garde le menu locataire ; seul `ARTISAN <code>`, « OUI » / « NON » à une demande d'accord artisan en cours, et `STOP ARTISAN` vont au traitement artisan.
- Anti-abus : 5 codes faux par numéro et par heure, puis silence ; les essais sont réservés avant la comparaison (même règle que le code locataire).
- Les textes vont dans `bot-messages.ts`, l'accord dans `constants.ts` avec sa version (le frontend ne les recopie jamais).

## Ordre de construction

| Unité | Contenu | Utilisable seule ? |
| --- | --- | --- |
| **51 Carnet d'artisans** | tables `Artisan`, `ArtisanContact`, enum, migration additive ; ajout, modification, retrait ; pages « Mes artisans » (propriétaire et gestionnaire) | oui : carnet privé |
| **52 Accord et annuaire public** | `ArtisanInvitation`, `ArtisanConsentEvent`, traitement `ARTISAN <code>` dans le robot, page publique `/artisans`, modération dans la console | oui : annuaire |
| **53 Pannes** | unité 39 construite avec les champs artisans, photos, signalement web et robot, choix de l'artisan, statuts, notifications, 2 modèles Meta | oui |
| **54 Avis sur les artisans** | `ArtisanReview`, note moyenne, masquage admin | oui |

Plus tard, sans rien refaire : compte artisan (`Artisan.userId`), réponse de l'artisan dans WARAH (accepte / refuse / devis), paiement de l'artisan par la plateforme, puis éventuelle commission (révision de l'invariant #14).

## Questions encore ouvertes

1. **Textes d'accord** (artisan et annuaire) : à faire valider juridiquement, comme ceux de l'unité 45.
2. **Vérification d'identité** des artisans pour le badge « vérifié » : pièce d'identité (réutiliser l'OCR CNI) ou simple appel de l'équipe ?
3. **Coût de l'intervention** : seulement noté pour l'historique, ou aussi compté dans les tableaux de bord et les rapports mensuels du propriétaire ?
4. **Tarification Meta** des réponses du robot aux artisans : à vérifier, comme pour les locataires.
