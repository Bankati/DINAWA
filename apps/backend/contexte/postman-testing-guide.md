# Guide de test manuel — Postman

Couvre tous les endpoints construits jusqu'à l'unité 13 (inclus). Données fictives togolaises cohérentes tout au long du guide, pour pouvoir suivre un scénario de bout en bout.

---

## 0. Mise en place

### Variables d'environnement Postman à créer

| Variable             | Valeur initiale                                            |
| -------------------- | ---------------------------------------------------------- |
| `baseUrl`            | `http://localhost:3001/api` (dev) ou l'URL Railway en prod |
| `accessTokenOwner`   | (rempli après login)                                       |
| `accessTokenManager` | (rempli après login)                                       |
| `accessTokenTenant`  | (rempli après login)                                       |
| `propertyId`         | (rempli après création de bien)                            |
| `photoId`            | (rempli après upload photo)                                |
| `documentId`         | (rempli après upload document)                             |
| `invitationToken`    | (rempli après invite locataire)                            |
| `otpCode`            | (lu en base — voir note plus bas)                          |

Astuce Postman : dans l'onglet **Tests** d'une requête de login, ajouter ce script pour remplir automatiquement la variable :

```js
pm.environment.set('accessTokenOwner', pm.response.json().accessToken);
```

### Personnages fictifs utilisés partout dans ce guide

- **Propriétaire** : Koffi Mensah — `koffi.mensah@example.tg` / bien à Bè, Lomé
- **Gestionnaire** : Ama Adjoa — `ama.adjoa@example.tg`
- **Locataire** : Sena Agbeko — `sena.agbeko@example.tg` / `+22890112233`
- **Tiers (pour tester les refus d'accès)** : Yao Kodjo — `yao.kodjo@example.tg`

### Frictions à connaître avant de commencer

1. **Inscription propriétaire/gestionnaire (`/auth/signup/*`) exige un email confirmé avant de pouvoir se connecter.** Un vrai email est envoyé (Resend). En dev, si vous ne voulez pas attendre l'email, confirmez manuellement `email_confirmed_at` dans la table `auth.users` via le dashboard Supabase.
2. **L'inscription locataire (`/auth/invite/tenant`) n'a pas ce problème** — le compte est créé avec l'email déjà confirmé (l'invitation vaut confirmation).
3. **Un bien doit exister avant de pouvoir inviter un locataire** — enchaînez : signup owner → confirmer email → login → créer un bien → inviter le locataire.
4. **La vérification CNI (`image`/`imageBack`) utilise de l'OCR réel (Tesseract.js)** — une image aléatoire donnera légitimement `REJECTED` (comportement attendu, pas un bug). Pour tester le chemin `VERIFIED`, utilisez une vraie photo de CNI togolaise recto/verso.
5. **Le code OTP de réinitialisation de mot de passe** est envoyé par email — en dev, il peut aussi être lu directement en base (table `password_reset_otps`, colonne `code`) si l'email n'arrive pas.
6. Ne réutilisez jamais un compte de test « permanent » pour des opérations destructrices (`DELETE /profile`, verrouillage par échecs de connexion) — créez un compte jetable pour ça.

---

## 1. Health (`/health`, hors préfixe `/api`)

### `GET http://localhost:3001/health/live`

- Aucune auth.
- **Scénarios** : toujours `200 { status: 'ok' }`. Si ça ne répond pas, le serveur ne tourne pas — inutile de tester le reste.

### `GET http://localhost:3001/health/ready`

- **Scénarios** : `200` si la DB est joignable ; couper la connexion DB pour vérifier qu'il renvoie bien une erreur plutôt qu'un timeout silencieux.

---

## 2. Auth

### `POST /auth/signup/owner` — multipart/form-data

Champs texte : `email=koffi.mensah@example.tg`, `password=MotDePasse123`, `firstName=Koffi`, `lastName=Mensah`, `residenceCountry=TG`
Fichiers : `image` (recto CNI), `imageBack` (verso CNI) — les deux obligatoires.

**Scénarios :**

- Succès → `201`, email de confirmation envoyé, CNI en cours de vérification.
- `residenceCountry` minuscule (`tg`) → `400` (le format exige 2 lettres majuscules).
- `password` de 5 caractères → `400` (Supabase exige 6 min).
- `image` ou `imageBack` manquant → `400` propre, **pas** de compte orphelin créé (vérifié à l'étape 09).
- Email déjà utilisé → `409 Conflict`.
- Re-signup avec le même email après un `image` volontairement corrompu (fichier texte renommé `.jpg`) → `400`, puis un second essai avec le même email doit fonctionner (pas de compte fantôme laissé par le premier essai).
- Photo CNI de 6 Mo (limite 5 Mo) → `400`.

### `POST /auth/signup/manager` — multipart/form-data

Champs texte : `email=ama.adjoa@example.tg`, `password=MotDePasse123`, `firstName=Ama`, `lastName=Adjoa`
Fichiers : `image`, `imageBack` (obligatoires), `referenceDocuments` (0 à 5 fichiers, optionnel — ex. un PDF d'attestation).

**Scénarios :**

- Succès sans `referenceDocuments` → `201`, `referenceDocumentPaths: []`.
- Succès avec 3 `referenceDocuments` → `201`, 3 chemins enregistrés.
- 6 `referenceDocuments` → `400` (plafond 5).
- CNI `REJECTED` (image aléatoire) → compte créé mais en accès restreint (vérifier ensuite `GET /auth/me`).

### `POST /auth/invite/tenant` — JSON, auth OWNER/MANAGER requise

```json
{
  "propertyId": "{{propertyId}}",
  "email": "sena.agbeko@example.tg",
  "phone": "90112233",
  "firstName": "Sena",
  "lastName": "Agbeko"
}
```

**Scénarios :**

- Succès → `201`, email d'invitation envoyé, `invitationToken` récupérable dans le lien de l'email (ou en loggant le token côté serveur en dev).
- `propertyId` inexistant → `404`.
- `propertyId` appartenant à un autre propriétaire (sans mandat) → `403` (`canActOnProperty`).
- Appelé par un `TENANT` → `403` (`@Roles`).
- `phone` mal formé (`abc`) → `400`.
- Email déjà utilisé par un autre compte → `409`.

### `POST /auth/signup/tenant?token={{invitationToken}}` — JSON, public

```json
{ "password": "MotDePasse123" }
```

**Scénarios :**

- Succès → `201 { userId }`.
- Sans `?token` du tout → `400` propre (pas `500` — bug historique déjà corrigé, revérifier qu'il ne régresse pas).
- Token expiré (>7 jours) ou signature altérée → `400`.
- Rejouer le même token une seconde fois après activation → doit échouer proprement (compte déjà activé).
- `password` trop court → `400`.

### `POST /auth/login` — JSON, public

```json
{ "email": "koffi.mensah@example.tg", "password": "MotDePasse123" }
```

**Scénarios (les plus importants du projet à retester régulièrement) :**

- Succès → `201`, `accessToken` + `refreshToken` + `user`.
- Mauvais mot de passe → `401`, `failedLoginAttempts` incrémenté (vérifiable via `GET /auth/me` ensuite… mais impossible tant que non connecté — vérifier en base ou via `/account/status` après déblocage).
- **5 mauvais mots de passe consécutifs → le 6ᵉ essai (même avec le bon mot de passe) doit renvoyer `403` avec un message de blocage 15 minutes**, pas `401`.
- Bon mot de passe après blocage → toujours `403` tant que les 15 minutes ne sont pas passées.
- Email inexistant → `401` (message générique, jamais « email inconnu » — pas de fuite d'information).
- Compte avec email non confirmé → `403 EMAIL_NOT_CONFIRMED`.
- Compte `SUSPENDED_ADMIN` → `401`.

### `POST /auth/password-reset/request` — JSON, public

```json
{ "email": "koffi.mensah@example.tg" }
```

**Scénarios :**

- Email existant → `201`, message générique, code à 6 chiffres envoyé.
- Email inexistant → **même réponse générique** `201` (jamais révéler si le compte existe).
- Deux demandes consécutives → seul le second code doit fonctionner (le premier est invalidé).

### `POST /auth/password-reset/confirm` — JSON, public

```json
{ "email": "koffi.mensah@example.tg", "code": "123456", "newPassword": "NouveauMotDePasse456" }
```

**Scénarios :**

- Code correct et récent → `201`, mot de passe changé (retester `POST /auth/login` avec le nouveau).
- Code correct mais réutilisé une seconde fois → `400` (usage unique).
- Code expiré (>10 min) → `400`.
- Code à 5 chiffres (`12345`) → `400` (regex `^\d{6}$`).
- `newPassword` < 6 caractères → `400`.

### `GET /auth/me` — auth requise (tous rôles)

**Scénarios :**

- Token valide → `200`, renvoie `user` + profil de rôle + `accountStatus` + préférences.
- Sans token → `401`.
- Token expiré → `401`.

---

## 3. Identity (`/identity`)

### `POST /identity/verify` — multipart, auth requise

Fichiers : `image` (recto), `imageBack` (verso) — tous deux obligatoires, JPG/PNG/WebP, 5 Mo max chacun.

**Scénarios :**

- Vraie CNI togolaise recto+verso → `202`, statut `PENDING` immédiat, puis `VERIFIED` après quelques secondes (interroger `GET /identity/status`).
- Image aléatoire → `202` puis `REJECTED` (comportement attendu).
- Image tournée à 90°/180° → doit tout de même aboutir à `VERIFIED` si c'est une vraie CNI (4 rotations testées automatiquement).
- Fichier corrompu (texte renommé `.jpg`) → jamais de crash serveur, `400` propre ou traitement asynchrone qui aboutit à `REJECTED` sans jamais planter le process.
- Manque `imageBack` → `400`.
- Deuxième appel alors qu'une vérification `PENDING` est déjà en cours pour ce compte → doit être rejeté (contrainte unique partielle en base).

### `GET /identity/status` — auth requise

**Scénarios :**

- Après upload → `200` avec le statut courant.
- Aucune vérification jamais soumise → `200 null` (pas d'erreur).

---

## 4. Profile (`/profile`)

### `GET /profile` — auth requise

**Scénarios :** `200` avec toutes les infos du compte courant, jamais celles d'un autre utilisateur.

### `PATCH /profile` — multipart, auth requise

Champs texte optionnels : `firstName=Koffi`, `lastName=Mensah`, `reminderDaysBefore=7`, `overdueGraceDays=5`
Fichier optionnel : `photo` (JPG/PNG/WebP, 5 Mo max).

**Scénarios :**

- Mise à jour partielle (juste `firstName`) → `200`, autres champs inchangés.
- Avec `photo` → `200`, `profilePhotoPath` se termine par `.webp` (compression automatique).
- Remplacer une photo existante par une nouvelle → l'ancienne doit disparaître du bucket Storage (pas seulement la ligne).
- `photo` corrompue → `400` propre, jamais `500`.
- `reminderDaysBefore=31` (plafond 30) → `400`.
- `reminderDaysBefore=0` (min 1) → `400`.

### `PATCH /profile/notification-consent` — JSON, auth requise

```json
{ "consent": "ACCEPTED" }
```

**Scénarios :**

- `"ACCEPTED"` ou `"DECLINED"` → `200`.
- `"NOT_ASKED"` → `400` (pas un choix utilisateur valide).
- `"MAYBE"` → `400`.

### `DELETE /profile` — auth requise, **destructif**

**Scénarios (toujours sur un compte jetable, jamais un compte de test réutilisable) :**

- Succès → `200`, compte Supabase supprimé (login impossible ensuite), ligne Prisma conservée avec champs personnels vidés, photo de profil supprimée du Storage.
- Après anonymisation, retenter `POST /auth/login` avec les mêmes identifiants → doit échouer (compte Supabase supprimé).
- Vérifier que l'historique (paiements/baux futurs liés à cet utilisateur) reste consultable — rien n'est supprimé en cascade.

---

## 5. Account (`/account`)

### `GET /account/status` — auth requise

**Scénarios :**

- Compte `ACTIVE` → `{ accountStatus: 'ACTIVE', suspendedReason: null, unblockCondition: null }`.
- Compte `SUSPENDED_INACTIVITY` (basculé manuellement en base pour le test) → motif + condition de déblocage non nuls, le texte diffère entre `OWNER` (« enregistrez un bien ») et `MANAGER` (mentionne aussi les mandats).
- Depuis ce statut, `POST /properties` doit rester accessible (`@AllowWhileSuspended`) alors que `PATCH /profile` doit renvoyer `403 ACCOUNT_SUSPENDED`.

---

## 6. Push (`/push`)

### `GET /push/vapid-public-key` — auth requise

**Scénarios :** `200 { publicKey }`, toujours la même valeur (config statique).

### `POST /push/subscribe` — JSON, auth requise

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/exemple-fictif-123",
  "keys": { "p256dh": "clefP256dhFictive", "auth": "clefAuthFictive" }
}
```

**Scénarios :**

- Succès → `204`, `notificationConsent` passe à `ACCEPTED`.
- `endpoint` qui n'est pas une URL → `400`.
- ⚠️ Un abonnement fictif ne recevra jamais de vraie notification — pour tester l'envoi réel, utiliser un vrai navigateur (voir étape 06).

### `POST /push/unsubscribe` — JSON, auth requise

```json
{ "endpoint": "https://fcm.googleapis.com/fcm/send/exemple-fictif-123" }
```

**Scénarios :**

- Succès sur un endpoint existant → `204`.
- Endpoint inexistant → toujours `204` (idempotent, ne doit jamais planter).
- Dernier abonnement supprimé → `notificationConsent` repasse à `DECLINED` ; s'il en reste d'autres (multi-appareils), il ne doit **pas** basculer.

---

## 7. Properties (`/properties`)

### `POST /properties` — JSON, auth OWNER/MANAGER

```json
{
  "type": "APARTMENT",
  "address": "12 Rue des Palmiers",
  "neighborhood": "Bè",
  "city": "Lomé",
  "surfaceArea": 45,
  "roomsCount": 3,
  "monthlyRent": 45000,
  "monthlyCharges": 5000,
  "description": "Appartement lumineux, proche du marché"
}
```

**Scénarios :**

- Succès → `201`, `status: "VACANT"` toujours forcé, `ownerId` toujours l'appelant.
- Tenter d'envoyer `"status": "OCCUPIED"` ou `"ownerId": "quelqu-un-dautre"` dans le body → `400` (champs non whitelistés, rejetés par le `ValidationPipe` global).
- `address` de 201 caractères → `400` (`@MaxLength(200)`).
- `surfaceArea: 0` ou négatif → `400`.
- `monthlyRent: 0` → `400`.
- `monthlyCharges: -100` → `400`.
- `type: "MAISON"` (hors enum) → `400`.
- Appelé par un `TENANT` → `403`.
- Appelé par un compte `SUSPENDED_INACTIVITY` → **doit réussir** (`@AllowWhileSuspended`), et le compte doit repasser `ACTIVE` juste après (vérifier `GET /account/status`).

### `GET /properties?page=1&limit=20&status=VACANT` — auth OWNER/MANAGER/ADMIN

**Scénarios :**

- Sans query params → `page=1, limit=20` par défaut.
- `limit=101` → `400` (plafond 100).
- `status=VACANT` → ne renvoie que les biens `VACANT` de l'appelant.
- Un `OWNER` ne voit que ses biens possédés + ceux sous mandat actif — jamais ceux d'un tiers.
- Un `ADMIN` voit tout le parc, tous propriétaires confondus.
- Un `MANAGER` mandaté sur un bien d'un autre propriétaire le voit apparaître dans sa liste.

### `GET /properties/:id` — auth OWNER/MANAGER/ADMIN

**Scénarios :**

- Bien possédé → `200`, inclut `photos: [{id, url, position}]` (URLs signées, jamais de chemin brut).
- `:id` inexistant → `404`.
- Bien d'un tiers sans mandat → `403`.
- Propriétaire dont le bien est sous mandat actif → `200` en lecture (mais `PATCH`/`DELETE` refusés, voir plus bas).

### `PATCH /properties/:id` — JSON, auth OWNER/MANAGER/ADMIN

**Scénarios de transition de statut (le cœur métier de cette unité) :**

- `{"status": "RENOVATION"}` depuis `VACANT` → `200`, succès.
- `{"status": "VACANT"}` depuis `RENOVATION` → `200`, succès.
- `{"status": "OCCUPIED"}` depuis n'importe quel statut → `400` (piloté uniquement par un futur bail, pas encore construit).
- `{"status": "ARCHIVED"}` via `PATCH` → `400` (« utilisez DELETE »).
- `{"status": "VACANT"}` sur un bien `OCCUPIED` **avec un bail `ACTIVE` seedé en base** → `400`.
- Même chose après avoir résilié le bail (`status: TERMINATED`) → `200`, succès.
- N'importe quelle modification sur un bien déjà `ARCHIVED` → `400` (statut terminal).
- Propriétaire sur un bien sous mandat actif → `403` (lecture seule).
- Gestionnaire mandataire sur ce même bien → `200`, succès.
- Modifier juste `description` sans toucher `status` → `200`, aucune vérification de transition déclenchée.

### `DELETE /properties/:id` — auth OWNER/MANAGER/ADMIN, **archivage logique**

**Scénarios :**

- Bien sans bail actif → `200`, `status: "ARCHIVED"`, `archivedAt` renseigné.
- Bien avec un bail `ACTIVE` → `409 Conflict`, message explicite (« résiliez le bail d'abord »).
- Re-`DELETE` un bien déjà `ARCHIVED` → à vérifier : doit rester cohérent (pas de double archivage silencieux).
- Vérifier qu'aucune suppression physique n'a lieu (la ligne existe toujours en base après coup).

---

## 8. Photos et documents du bien (`/properties/:id/photos`, `/documents`)

### `POST /properties/:id/photos` — multipart, champ `photos` (jusqu'à 10 fichiers), auth OWNER/MANAGER/ADMIN

**Scénarios :**

- 2 vraies photos JPG → `201`, tableau de `{id, url, position}`, positions `0` et `1`.
- Upload de 9 photos au total puis tenter d'en ajouter 2 de plus (9+2=11 > 10) → `400`, **rien n'est uploadé** (ni Storage ni Prisma) même si certaines auraient tenu dans le plafond.
- Un fichier corrompu au milieu d'un lot de 3 → `400`, **aucune des 3** n'est écrite (ni les 2 valides avant le fichier corrompu).
- Fichier de 6 Mo (plafond 5 Mo) → `400` (rejeté par Multer avant même d'atteindre le service).
- Aucun fichier dans la requête → `400`.
- Appelé par un tiers sans accès → `403`.
- Appelé par le propriétaire sous mandat actif → `403` (lecture seule).
- Vérifier après upload : `GET /properties/:id` renvoie bien ces photos avec des URLs signées valides (ouvrir l'URL dans un navigateur dans les 15 minutes).

### `DELETE /properties/:id/photos/:photoId` — auth OWNER/MANAGER/ADMIN

**Scénarios :**

- Photo existante du bon bien → `200`, disparaît de `GET /properties/:id` ensuite.
- Vérifier directement dans le bucket Supabase Storage que le fichier a bien disparu (pas seulement la ligne Prisma).
- `photoId` inexistant → `404`.
- `photoId` valide mais appartenant à un **autre** bien (`:id` ne correspond pas) → `404` (jamais un accès croisé silencieux).
- Appelé par un tiers → `403`.

### `POST /properties/:id/documents` — multipart, champ `type` + champ fichiers `documents`, auth OWNER/MANAGER/ADMIN

```
type: STATE_OF_PLAY
documents: [etat-des-lieux.pdf]
```

**Scénarios :**

- PDF valide avec `type: "STATE_OF_PLAY"` → `201`, jamais compressé (comparer la taille du fichier stocké à l'original).
- `type: "PROPERTY_TITLE"`, `type: "INSURANCE"`, `type: "OTHER"` → tous acceptés.
- `type: "AUTRE_CHOSE"` (hors enum) → `400`.
- Image JPG/PNG en tant que document → acceptée (types autorisés : PDF/JPG/PNG).
- Fichier `.docx` → `400` (type MIME non autorisé).
- Upload de 19 documents au total puis 2 de plus (19+2=21 > 20) → `400`, rejet total.
- Fichier de 11 Mo (plafond 10 Mo) → `400`.

### `GET /properties/:id/documents` — auth OWNER/MANAGER/ADMIN

**Scénarios :**

- Liste des documents avec URLs signées — jamais de `storagePath` brut dans la réponse.
- URL signée expirée après 15 minutes → un nouvel appel à cet endpoint doit renvoyer une URL fraîche et valide.
- Tiers sans accès → `403`.

### `DELETE /properties/:id/documents/:documentId` — auth OWNER/MANAGER/ADMIN

**Scénarios :** identiques à la suppression de photo (Storage supprimé avant Prisma, `404` sur ID inexistant ou appartenant à un autre bien, `403` pour un tiers).

---

## 9. Ce qui n'est PAS encore testable (pas encore construit)

- Acceptation de mandat par un gestionnaire (unité 31) — un gestionnaire ne peut donc être testé que sur ses **propres** biens pour l'instant, jamais ceux d'un tiers via mandat réel (seul un mandat seedé directement en base permet de simuler ce cas, comme fait pendant le développement).
- Création de bail (unité 15) — le statut `OCCUPIED` est donc injoignable via l'API tant que cette unité n'existe pas ; pour tester les scénarios liés à un bail actif, seeder directement une ligne `Lease` en base (voir les scripts de test utilisés pendant le développement des étapes 12/13).
- Historique locataire, paiements, quittances — rien à tester ici avant les phases 3 (fin) et 4.

---

## 10. Check-list rapide « tout répond »

Avant de dérouler les scénarios détaillés ci-dessus, un passage rapide pour confirmer qu'aucun endpoint n'est cassé :

1. `GET /health/live` → `200`
2. `POST /auth/login` (compte existant confirmé) → `201` + token
3. `GET /auth/me` → `200`
4. `GET /profile` → `200`
5. `GET /account/status` → `200`
6. `GET /push/vapid-public-key` → `200`
7. `GET /properties` → `200`
8. `POST /properties` → `201`
9. `GET /properties/:id` (celui créé à l'étape 8) → `200`, `photos: []`
10. `POST /properties/:id/photos` (1 vraie photo) → `201`
11. `GET /properties/:id/documents` → `200 []`

Si ces 11 appels répondent tous avec le code attendu, l'ossature complète (auth, profil, compte, push, biens, photos, documents) est vivante.
