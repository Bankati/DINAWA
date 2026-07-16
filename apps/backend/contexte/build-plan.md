# Build Plan — WARAH Backend

## Principe Fondamental

Backend construit en couches successives — fondations techniques d'abord (auth, base de données, services transverses), puis domaine métier (biens, locataires, baux), puis intégrations externes (Cashpay, PDF, cron), puis modules périphériques (annonces, gestionnaires, admin). Chaque module est testable via Postman/Insomnia avec des données réalistes avant de passer au suivant. Aucun module n'est laissé à moitié implémenté.

Hypothèse structurante : le périmètre géographique est strictement le Togo en V1, la devise est uniquement le FCFA, la langue est uniquement le français — aucune logique multi-pays, multi-devise ou i18n à prévoir.

Principe de stockage : les PDFs (quittances, rapports mensuels, factures d'abonnement) ne sont jamais stockés. Toutes les données nécessaires à leur génération existent en base, donc le PDF est généré à la volée à chaque demande et streamé directement (ou attaché à l'email) puis oublié. Seules les pièces d'identité, photos de biens, documents administratifs des biens et justificatifs de paiement uploadés par les utilisateurs sont stockés.

Principe de notification : tout événement métier passe par un point d'entrée unique `notifyUser()` qui choisit push web si consentement accepté et abonnement actif, sinon email — jamais les deux canaux pour le même événement. Les emails d'authentification (confirmation d'inscription, réinitialisation de mot de passe) restent en email pur, jamais en push, parce qu'ils doivent fonctionner même sans installation préalable du navigateur.

Stack : NestJS 10+ (TypeScript strict), Prisma comme ORM, PostgreSQL via Supabase, Supabase Auth (validation JWT côté NestJS), Supabase Storage (photos, documents administratifs, pièces d'identité, justificatifs de paiement), Resend (emails avec templates fournis), `web-push` + VAPID (notifications push web), Cashpay (paiements mobile money), PDFKit (génération PDF à la volée), Tesseract.js (OCR pour vérification CNI), Railway (hébergement + cron via `@nestjs/schedule`).

---

## Phase 1 — Fondations

### 01 Setup projet NestJS, Prisma et Supabase

**Logique :**

- Initialisation du projet NestJS avec TypeScript strict, ESLint et Prettier
- Installation et configuration de Prisma avec connexion à la base PostgreSQL Supabase
- Variables d'environnement documentées dans `.env.example` (DATABASE_URL, SUPABASE__, RESEND_API_KEY, CASHPAY__, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)
- Configuration Swagger (`@nestjs/swagger`) accessible sur `/api/docs` en dev pour tester les endpoints
- Health check `GET /api/health` qui vérifie la connexion DB et répond `{ status: "ok" }`
- Déploiement initial sur Railway avec build qui passe

### 02 Schéma Prisma initial

**Logique :**

- Modèles : `User`, `OwnerProfile`, `TenantProfile`, `ManagerProfile`, `AdminProfile`, `Property`, `PropertyPhoto`, `PropertyDocument`, `Lease`, `Payment`, `PaymentDeclaration`, `PaymentScheduleEntry`, `Listing`, `ListingContact`, `Mandate`, `ManagerReview`, `Subscription`, `SubscriptionInvoice`, `IdentityVerification`, `PushSubscription`, `AuditLog`, `Notification`
- Pas de modèle `Receipt`, `MonthlyReport` ni `Invoice` — les PDFs sont générés à la volée, jamais stockés
- Énumérations : `UserRole` (OWNER / TENANT / MANAGER / ADMIN), `PropertyStatus` (OCCUPIED / VACANT / RENOVATION / ARCHIVED), `LeaseStatus` (ACTIVE / TERMINATED / EXPIRED), `PaymentFrequency` (MONTHLY / QUARTERLY / BIANNUAL / ANNUAL), `PaymentStatus` (PENDING / PENDING_CONFIRMATION / PAID / PARTIAL / LATE / OVERDUE / REJECTED), `PaymentSource` (CASHPAY_API / MANUAL_OWNER / TENANT_DECLARATION), `PaymentMethod` (TMONEY / FLOOZ / CASH / BANK_TRANSFER), `SubscriptionTier` (STARTER / PRO / PREMIUM), `IdVerificationStatus` (PENDING / VERIFIED / REJECTED), `NotificationConsent` (NOT_ASKED / ACCEPTED / DECLINED), `AccountStatus` (ACTIVE / SUSPENDED_INACTIVITY / SUSPENDED_ADMIN / SUSPENDED_PAYMENT)
- Contrainte : un `User` a exactement un rôle actif, lié à un profil unique selon ce rôle
- Le rôle `MANAGER` inclut tous les droits du rôle `OWNER` sur les biens dont il est lui-même propriétaire, plus la capacité d'être mandataire des biens d'autres propriétaires via le modèle `Mandate`
- Contrainte : un `TenantProfile` ne peut être lié qu'à un seul `Lease` en statut `ACTIVE` à un instant donné — l'historique des baux passés et de leurs paiements est intégralement conservé même quand le locataire change de bien
- Contrainte : un `Payment` issu de `CASHPAY_API` a obligatoirement un `transactionId` unique (clé d'idempotence) et passe directement à `PAID` via le webhook
- Index sur les colonnes de filtrage fréquent (`ownerId`, `propertyId`, `leaseId`, `dueDate`, `transactionId`, `status`)
- Migrations Prisma versionnées dans le repo (`prisma/migrations/`)

### 03 Authentification Supabase et rôles

**Logique :**

- `SupabaseAuthGuard` (`src/common/guards/supabase-auth.guard.ts`) — valide le JWT Supabase passé dans le header `Authorization: Bearer`, récupère l'utilisateur via Supabase Admin SDK et injecte `request.user`
- `RolesGuard` + décorateur `@Roles(UserRole.OWNER)` — vérifie le rôle après authentification
- Décorateur custom `@CurrentUser()` — extrait l'utilisateur courant dans les controllers
- Synchronisation automatique : à la première connexion d'un utilisateur Supabase, création de la ligne correspondante dans `User` côté Prisma si absente
- Helper `canActOnProperty(user, propertyId)` — autorité unique pour décider qui peut agir sur un bien : le propriétaire si pas de mandat actif, le gestionnaire mandataire si un mandat est actif, l'admin toujours. Tous les services métier passent par ce helper.
- Endpoint `GET /api/auth/me` — renvoie le profil de l'utilisateur courant selon son rôle, statut du compte et préférences de notification. Depuis la révision de l'unité 08 (2026-07-16), inclut aussi `identityVerifiedAt` (date de la dernière `IdentityVerification` en statut `VERIFIED`, `null` sinon) — badge de vérification visible uniquement par l'utilisateur lui-même, aucune surface publique pour l'instant.

### 04 Service emails transactionnels (Resend)

**Logique :**

- Client Resend configuré dans `src/modules/email/email.service.ts`
- Templates fournis par le client intégrés tels quels dans `src/modules/email/templates/` — la liste exacte sera précisée à la livraison, mais couvre au minimum : confirmation d'inscription, réinitialisation de mot de passe, invitation locataire, quittance de loyer, rappel d'échéance, alerte impayé, déclaration de paiement à confirmer, rapport mensuel gestionnaire, notification de contact d'annonce, blocage de compte imminent, compte bloqué
- Méthode `sendEmail({ to, template, variables, attachments? })` — point d'entrée unique pour tout envoi
- Gestion des échecs avec retry exponentiel (max 3 tentatives) et log dans `AuditLog`
- Limite de débit respectée pour ne pas saturer Resend en cas de cron de masse

### 05 Service de stockage (Supabase Storage)

**Logique :**

- Service `StorageService` (`src/modules/storage/storage.service.ts`) — wrapper sur le SDK Supabase Storage
- Buckets dédiés : `property-photos`, `property-documents`, `id-documents`, `manager-documents`, `payment-proofs` — aucun bucket pour les quittances ou rapports (générés à la volée). `manager-documents` reste défini mais n'est plus utilisé par aucun flux depuis le retrait du document de référence gestionnaire (voir unité 09 révisée, 2026-07-16) — conservé au cas où un usage futur apparaîtrait.
- Méthode `upload(bucket, path, file)` — upload avec compression image (sharp) si applicable
- Méthode `getSignedUrl(bucket, path, expiresIn)` — URLs signées avec expiration courte pour les fichiers privés
- Validation systématique des types MIME et de la taille (5 Mo max pour photos, 10 Mo pour documents)
- Suppression effective côté Storage quand un enregistrement Prisma est supprimé

### 06 Préférences de notifications et infrastructure push web

**Logique :**

- Génération unique des clés VAPID, stockées en variables d'environnement (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)
- Endpoint `GET /api/push/vapid-public-key` — renvoie la clé publique VAPID au frontend pour l'abonnement
- Endpoint `POST /api/push/subscribe` — sauvegarde une `PushSubscription` (endpoint, keys p256dh et auth) pour l'utilisateur courant et passe son `notificationConsent` à `ACCEPTED`
- Endpoint `POST /api/push/unsubscribe` — supprime l'abonnement et passe `notificationConsent` à `DECLINED`
- Service `WebPushService` (`src/modules/push/web-push.service.ts`) — envoie une notification via la lib `web-push` à toutes les `PushSubscription` actives d'un utilisateur, supprime automatiquement les abonnements qui retournent `410 Gone`
- Service `NotifyService` (`src/modules/notify/notify.service.ts`), méthode `notifyUser({ userId, event, variables })` — **point d'entrée unique pour toute notification métier** : envoie un push si `notificationConsent === ACCEPTED` et qu'au moins une `PushSubscription` est active, sinon envoie un email avec le template correspondant ; jamais les deux canaux pour le même événement
- Exception : les emails d'authentification (réinitialisation de mot de passe, confirmation d'inscription) appellent directement `EmailService` et ne passent jamais par `NotifyService` — ils doivent fonctionner même sans abonnement push préalable

---

## Phase 2 — Comptes utilisateurs

### 07 Vérification automatique de la carte d'identité togolaise

**Logique :**

- Service `IdentityVerificationService` (`src/modules/identity/identity.service.ts`) utilisant Tesseract.js pour l'OCR
- Endpoint `POST /api/identity/verify` — multipart, accepte une image (JPG, PNG, WebP, max 5 Mo) ; lance immédiatement le pipeline OCR + validation
- Pipeline de vérification, entièrement automatique, sans intervention humaine :
  1. OCR sur l'image avec Tesseract.js, langues `fra+eng`
  2. Vérification de la présence des marqueurs obligatoires de la CNI togolaise (« RÉPUBLIQUE TOGOLAISE », « CARTE NATIONALE D'IDENTITÉ » et autres motifs caractéristiques — liste finale à figer après réception de l'exemple fourni par le client)
  3. Validation du format du numéro de CNI selon le pattern attendu (à figer après réception de l'exemple)
  4. Décision automatique : `VERIFIED` si tous les critères passent, `REJECTED` avec motif détaillé sinon
- Création d'une ligne `IdentityVerification` liant l'image (stockée dans `id-documents`), le texte OCR brut, le statut et la raison
- En cas de `REJECTED`, l'utilisateur peut re-soumettre une nouvelle image immédiatement — pas de blocage, pas de file d'attente, pas de validation manuelle
- La vérification doit terminer en moins de 10 secondes ; au-delà, l'endpoint répond avec un statut `PROCESSING` et l'utilisateur peut interroger `GET /api/identity/status` pour récupérer le résultat

### 08 Inscription propriétaire

**Logique :**

- Endpoint `POST /api/auth/signup/owner` — création du compte Supabase Auth, création du `User` (avec `phone`, `city`, obligatoires) et de l'`OwnerProfile` en une transaction Prisma
- Distinction local / diaspora via le champ `residenceCountry` (`TG` ou autre code ISO)
- Pièce d'identité **facultative** à l'inscription (revu le 2026-07-16 avec le développeur, voir /architect — initialement obligatoire) : si `image`/`imageBack` sont fournis, la vérification démarre immédiatement via le pipeline de l'étape 07 ; sinon elle peut être soumise plus tard via `POST /api/identity/verify`
- Le verrou fonctionnel n'est plus à l'inscription mais à `POST /api/properties` : tant que `idVerificationStatus !== VERIFIED`, la création de bien est refusée (`ForbiddenException`, voir `assertIdentityVerified()`) — aucune autre action n'est bloquée par ce statut
- Envoi automatique de l'email de confirmation Supabase ; tant que l'email n'est pas confirmé, le `SupabaseAuthGuard` rejette les requêtes avec un code d'erreur explicite

### 09 Inscription locataire et gestionnaire

**Logique :**

- Endpoint `POST /api/auth/invite/tenant` — réservé au propriétaire ou au gestionnaire mandaté du bien, envoie au locataire un lien d'invitation contenant un token signé (expiration 7 jours)
- Endpoint `POST /api/auth/signup/tenant?token=...` — création du compte locataire lié au propriétaire invitant via le token ; pièce d'identité **optionnelle**, aucune vérification CNI déclenchée tant qu'elle n'est pas fournie
- Endpoint `POST /api/auth/signup/manager` — création du compte gestionnaire (avec `phone`, `city`, obligatoires) ; même mécanique que l'inscription propriétaire (CNI facultative à l'inscription, voir unité 08 révisée)
- Document de référence professionnelle (PDF) **retiré** (revu le 2026-07-16 avec le développeur, voir /architect — jugé non indispensable, sans consommateur produit tant que la Phase 8 n'existe pas) : plus d'upload `referenceDocuments`, plus de colonne `ManagerProfile.referenceDocumentPaths`
- Un gestionnaire possède le rôle `MANAGER`, ce qui lui permet à la fois d'enregistrer ses propres biens (avec tous les droits d'un propriétaire dessus, sous réserve du verrou identité de l'unité 08) **et** d'être mandataire de biens d'autres propriétaires via le modèle `Mandate`
- Principe retenu pour l'unité 31 (mandats, non construite) : accepter un mandat ne nécessitera pas de vérification d'identité propre au gestionnaire — la confiance transite par le propriétaire, déjà vérifié pour avoir pu créer son bien

### 10 Sécurité d'accès et gestion du profil

**Logique :**

- Connexion par email et mot de passe : si les identifiants sont valides, ouverture immédiate d'une session pleine, sans étape supplémentaire — aucun code OTP n'est envoyé lors d'une connexion réussie
- Réinitialisation de mot de passe (cas « mot de passe oublié ») par OTP : code à 6 chiffres envoyé par email via `EmailService` directement (jamais via `NotifyService`), expiration 10 minutes, usage unique
- Toute nouvelle demande de réinitialisation invalide les codes précédents non utilisés du même utilisateur
- Blocage temporaire (15 minutes) après 5 tentatives de connexion échouées
- Endpoint `GET /api/profile` et `PATCH /api/profile` — gestion des informations personnelles, photo de profil (via `StorageService`), nombre de jours pour les rappels (`reminderDaysBefore`) et pour les alertes impayés (`overdueGraceDays`)
- Endpoint `PATCH /api/profile/notification-consent` — déclenche le flux d'abonnement / désabonnement push web (voir 06)
- Endpoint `DELETE /api/profile` — anonymisation des données personnelles et désactivation du compte, conservation des historiques de paiement pour obligations légales

### 11 Blocage automatique des comptes inactifs

**Logique :**

- Cron quotidien `@Cron('0 7 * * *')` dans `src/modules/scheduling/inactivity.task.ts` — détecte les comptes sans activité significative depuis 2 mois
- Règle propriétaire : compte créé depuis ≥ 60 jours **et** aucun `Property` non archivé → suspension
- Règle gestionnaire : compte créé depuis ≥ 60 jours **et** aucun `Property` non archivé dont il est propriétaire **et** aucun `Mandate` actif → suspension
- Rappels automatiques via `notifyUser()` : à J-30 (date d'inscription + 30 jours), J-7 et J-1 avant la date butoir, avec un message clair sur la condition de levée du blocage
- À la suspension, le champ `accountStatus` passe à `SUSPENDED_INACTIVITY` ; l'utilisateur peut se connecter mais tous les endpoints de mutation renvoient `403 ACCOUNT_SUSPENDED` avec un message explicite
- Déblocage automatique et immédiat dès qu'un bien est créé (côté propriétaire/gestionnaire) ou qu'un mandat est accepté (côté gestionnaire) — `accountStatus` repasse à `ACTIVE`, notification de bienvenue envoyée via `notifyUser()`
- Endpoint `GET /api/account/status` — renvoie le statut du compte, le motif de suspension et la condition de déblocage, utilisable par le frontend pour afficher un bandeau

---

## Phase 3 — Patrimoine immobilier

### 12 CRUD biens immobiliers

**Logique :**

- Module `PropertiesModule` (`src/modules/properties/`) — controller, service, DTOs avec `class-validator`
- Endpoints : `POST /api/properties`, `GET /api/properties` (paginé, filtrable par statut), `GET /api/properties/:id`, `PATCH /api/properties/:id`, `DELETE /api/properties/:id` (archivage logique, jamais de suppression physique)
- Validation stricte : adresse non vide, type parmi les valeurs autorisées, surface > 0, loyer > 0, charges ≥ 0
- Toute action sur un bien passe par le helper `canActOnProperty()` de l'étape 03 :
  - Bien sans mandat actif : seul le propriétaire peut agir (création de bail, saisie de paiement, publication d'annonce, modification de la fiche)
  - Bien avec mandat actif : le gestionnaire mandataire dispose de tous les droits opérationnels, et le propriétaire passe en lecture seule sur ce bien — il ne voit que les chiffres, les paiements et les rapports mensuels envoyés par le gestionnaire
- Statuts gérés en service avec règles de transition : un bien `OCCUPIED` ne peut passer à `VACANT` que si le bail courant est résilié

### 13 Photos et documents du bien

**Logique :**

- Endpoint `POST /api/properties/:id/photos` — multipart, jusqu'à 10 photos par bien, compression automatique via sharp (max 1920px, qualité 80, format WebP), stockage dans `property-photos`
- Endpoint `DELETE /api/properties/:id/photos/:photoId` — supprime la ligne Prisma et le fichier Storage
- Endpoint `POST /api/properties/:id/documents` — upload de documents (état des lieux, titre, assurance), max 20 par bien, 10 Mo par fichier, types acceptés PDF/JPG/PNG
- Endpoint `GET /api/properties/:id/documents` — liste des documents avec URLs signées (expiration 15 min)
- Toutes les URLs servies aux clients sont signées et non publiques/

### 14 Locataires

**Logique :**

- Module `TenantsModule` — gestion des locataires liés à un propriétaire
- Endpoint `POST /api/tenants` — création d'un locataire (nom, prénom, téléphone, pièce d'identité **optionnelle**)
- Endpoint `POST /api/tenants/:id/invite` — envoie l'invitation à rejoindre la plateforme (voir 09)
- Contrainte forte : un locataire ne peut être lié qu'à **un seul `Lease` en statut `ACTIVE` à un instant donné** — la création d'un nouveau bail pour un locataire déjà actif ailleurs est rejetée avec un message explicite
- Exception : la création d'un nouveau bail devient possible dès que le bien précédent du locataire est passé en `VACANT` (résiliation du bail précédent) ; le locataire peut alors être rattaché à un nouveau bien
- L'historique complet du locataire (ancien bail, paiements passés, quittances générables à la volée) est **intégralement conservé** lors du passage d'un bien à un autre — rien n'est supprimé, seul le `Lease` précédent reste en statut `TERMINATED`
- Endpoint `GET /api/properties/:id/tenants/history` — historique complet des locataires d'un bien, avec bilan paiements (total versé, retards, durée)
- Endpoint `GET /api/tenants/:id/leases/history` — historique complet des baux passés et présent d'un locataire donné
- Suppression interdite — désactivation logique uniquement pour conserver l'historique

### 15 Baux simplifiés (V1)

**Logique :**

- Module `LeasesModule` — création et gestion des baux ; le propriétaire du bien ou le gestionnaire mandaté (déterminé via `canActOnProperty()`) peut créer un bail
- Endpoint `POST /api/leases` — création d'un bail liant un bien et un locataire
- Champs obligatoires : `propertyId`, `tenantId`, `monthlyRent`, `monthlyCharges`, `paymentFrequency`, `startDate`, `securityDeposit`
- Champ optionnel : `endDate` — si absent, le bail est considéré ouvert et le calendrier d'échéances est généré sur 12 mois roulants, prolongé automatiquement à mesure que le temps passe
- À la création du bail, génération automatique des `PaymentScheduleEntry` sur la durée connue (`endDate` si fournie, sinon 12 mois glissants) selon la fréquence
- Calcul automatique du montant par échéance : `montant = (monthlyRent + monthlyCharges) × nombreDeMoisDansLaPeriode`
- Le bien passe automatiquement à `OCCUPIED` à la création du bail
- Endpoint `POST /api/leases/:id/terminate` — résilie le bail, libère le bien (`VACANT`), passe le `Lease` en statut `TERMINATED` ; les paiements passés restent intacts et les quittances passées restent générables à la volée
- Suivi du dépôt de garantie : montant perçu, date, conditions de restitution stockées sur le bail

---

## Phase 4 — Paiements

### 16 Modèle de paiements et générateur d'échéances

**Logique :**

- Module `PaymentsModule` — cœur fonctionnel de la plateforme
- À chaque `PaymentScheduleEntry` peut correspondre 0 ou plusieurs `Payment` (paiement partiel possible)
- Service `PaymentSchedulerService` — calcul des dates d'échéance, du montant attendu, des périodes couvertes selon la `PaymentFrequency` du bail
- Pour un bail trimestriel à 50 000 FCFA/mois, le service produit des échéances tous les 3 mois pour 150 000 FCFA, avec `periodStart` et `periodEnd` couvrant exactement les 3 mois
- Le statut d'une échéance est dérivé en temps réel : somme des `paidAmount` vs `expectedAmount`, et comparaison de la date du jour avec `dueDate + overdueGraceDays`
- Endpoint `GET /api/leases/:id/schedule` — renvoie le calendrier complet avec statut de chaque échéance

### 17 Intégration Cashpay — initialisation de paiement

**Logique :**

- Service `CashpayService` (`src/modules/payments/cashpay.service.ts`) — wrapper sur l'API Cashpay
- Endpoint `POST /api/payments/initiate` — body : `scheduleEntryId`, `paymentMethod` (TMONEY ou FLOOZ), `phone` du payeur
- Appel à l'API Cashpay pour créer la transaction, stockage de la référence Cashpay côté `Payment` avec statut `PENDING` et `source = CASHPAY_API`
- Retour au client : instructions de paiement (USSD, lien, ou redirection selon le flux Cashpay)
- Gestion explicite des erreurs API : timeout, refus, indisponibilité — chaque cas a un code d'erreur métier propre
- Logging détaillé de chaque appel pour le debug en cas de désaccord avec Cashpay

### 18 Webhook Cashpay — confirmation et idempotence

**Logique :**

- Endpoint `POST /api/webhooks/cashpay` — public, signé
- Vérification de la signature Cashpay (HMAC) avant tout traitement — rejet immédiat en cas de signature invalide avec log de sécurité
- **Idempotence stricte** : vérification que `transactionId` n'a jamais été traité avant de modifier quoi que ce soit. Si déjà traité, réponse 200 immédiate sans effet de bord
- Mise à jour du `Payment` correspondant : statut `PAID`, `paidAmount`, `paidAt`
- Déclenchement asynchrone (via `EventEmitter2`) de : génération de la quittance PDF, notifications via `notifyUser()` au propriétaire et au locataire, mise à jour du tableau de bord
- Règle critique : un `Payment` avec `source = CASHPAY_API` ne peut **jamais** être re-confirmé manuellement ni rejeté par un propriétaire/gestionnaire — le webhook est la source de vérité unique. Les endpoints de confirmation manuelle rejettent toute action sur ces paiements.
- Réponse 2xx au webhook dans tous les cas où la signature est valide, même si le traitement métier échoue (relance par cron de réconciliation séparé)
- Audit log complet de chaque webhook reçu avec payload brut

### 19 Saisie manuelle par le propriétaire ou le gestionnaire

**Logique :**

- Endpoint `POST /api/payments/manual` — réservé à celui qui peut agir sur le bien selon `canActOnProperty()` : propriétaire si pas de mandat actif, gestionnaire mandaté sinon
- Initiée par le propriétaire/gestionnaire (pas le locataire) — il atteste avoir reçu le paiement et l'enregistre directement
- Body : `scheduleEntryId`, `paidAmount`, `paidAt`, `paymentMethod` (CASH ou BANK_TRANSFER), `note` libre
- Création directe d'un `Payment` en statut `PAID` avec `source = MANUAL_OWNER`, sans passer par `PENDING_CONFIRMATION`
- Upload optionnel d'un justificatif (photo, scan) via `StorageService`, stocké dans `payment-proofs`
- Traçabilité : qui a saisi (userId), quand (createdAt), depuis quel rôle — toujours auditable
- Déclenche immédiatement la génération de quittance et les notifications via `notifyUser()`

### 20 Déclaration de paiement par le locataire

**Logique :**

- Module `PaymentDeclarationsModule` — flow distinct de la saisie manuelle (19), initié par le locataire
- Endpoint `POST /api/payment-declarations` — réservé au locataire connecté, body : `scheduleEntryId`, `paidAmount`, `paidAt`, `paymentMethod` (CASH ou BANK_TRANSFER), `note` libre
- Upload optionnel d'une photo justificative (preuve de paiement, capture de transaction) via `StorageService` dans `payment-proofs`
- Création d'un `Payment` avec statut `PENDING_CONFIRMATION` et `source = TENANT_DECLARATION`
- Notification immédiate via `notifyUser()` à celui qui peut agir sur le bien (propriétaire ou gestionnaire mandaté) : « X a déclaré avoir payé Y FCFA pour [bien] »
- Endpoint `PATCH /api/payment-declarations/:id` — le locataire peut modifier sa déclaration tant qu'elle est en `PENDING_CONFIRMATION` (montant, date, justificatif)
- Endpoint `DELETE /api/payment-declarations/:id` — le locataire peut annuler sa déclaration tant qu'elle est en `PENDING_CONFIRMATION`
- Endpoint `POST /api/payments/:id/confirm` — réservé au propriétaire/gestionnaire mandaté ; il peut optionnellement uploader sa propre photo de preuve avant de confirmer ; à la confirmation, le `Payment` passe à `PAID` et l'événement `payment.confirmed` est émis (quittance + notifications aux deux parties)
- Endpoint `POST /api/payments/:id/reject` — rejet avec motif obligatoire ; le `Payment` passe à `REJECTED`, le locataire est notifié via `notifyUser()`, l'échéance retombe en `PENDING` et peut être déclarée à nouveau
- **Règle critique** : les endpoints `confirm` et `reject` rejettent toute action sur un `Payment` dont `source = CASHPAY_API` — les paiements API sont auto-confirmés par le webhook et ne sont jamais re-validables manuellement
- Cron quotidien `@Cron('0 8 * * *')` — pour chaque déclaration en `PENDING_CONFIRMATION` depuis ≥ 3 jours, rappel automatique au propriétaire/gestionnaire via `notifyUser()` ; second rappel à ≥ 7 jours ; aucune confirmation automatique, l'action humaine reste requise

### 21 Génération de quittance PDF à la volée

**Logique :**

- Service `ReceiptPdfService` (`src/modules/receipts/receipt-pdf.service.ts`) — utilise PDFKit
- Le template du PDF suit strictement la maquette qui sera fournie par le client ; toute la mise en forme (logo, en-tête, mentions légales, pied de page) est intégrée à ce template
- Données injectées dans le template, toutes lues en direct depuis Prisma : nom du propriétaire, nom du locataire, adresse du bien, période couverte (`periodStart` à `periodEnd`), montant perçu, date et heure du paiement, numéro de transaction (Cashpay ou interne pour les paiements manuels), mode de paiement, source (API, saisie propriétaire, déclaration locataire confirmée)
- Pour les baux non mensuels, mention explicite : « Quittance de loyer — Période du [start] au [end] — Montant perçu : [montant] FCFA »
- Le PDF est **généré à la volée à chaque demande** et n'est jamais persisté (ni en base, ni dans Storage)
- Endpoint `GET /api/payments/:id/receipt.pdf` — génère le PDF en mémoire et le streame directement dans la réponse HTTP avec le bon `Content-Type` et `Content-Disposition`
- Cible de performance : génération en moins de 5 secondes

### 22 Envoi automatique de quittance

**Logique :**

- Écouteur de l'événement `payment.confirmed` (émis par les flows 18, 19 et 20 à la confirmation effective d'un paiement)
- Le PDF de quittance est généré en mémoire par `ReceiptPdfService` au moment de la notification, joint comme pièce jointe à l'email si l'envoi se fait par email, puis libéré — jamais stocké
- Envoi simultané au propriétaire et au locataire via `notifyUser()` :
  - Si l'utilisateur a accepté les push web et a un abonnement actif, push avec un lien direct vers la quittance téléchargeable
  - Sinon, email avec PDF en pièce jointe via le template fourni (catégorie « quittance »)
- Cible de délai : notification envoyée dans les 30 secondes après la confirmation du paiement
- En cas d'échec d'envoi (push ou email), retry exponentiel et log dans `AuditLog`

### 23 Historique et export des paiements

**Logique :**

- Endpoint `GET /api/payments` — liste paginée des paiements du propriétaire, filtres par bien, locataire, période, statut, source
- Endpoint `GET /api/payments/export?format=pdf` — génération d'un PDF récapitulatif via PDFKit (tableau de tous les paiements de la période demandée), streamé sans stockage
- Endpoint `GET /api/payments/export?format=xlsx` — génération XLSX via ExcelJS, prêt pour intégration en comptabilité, streamé sans stockage
- Les chiffres exportés correspondent exactement à la somme des paiements en base, quelle que soit leur source (CASHPAY_API, MANUAL_OWNER ou TENANT_DECLARATION), avec une colonne dédiée pour distinguer
- Exports limités à 2 ans glissants pour éviter les générations trop lourdes

---

## Phase 5 — Rappels et alertes automatiques

### 24 Cron rappels d'échéance adaptés à la fréquence

**Logique :**

- Cron horaire défini avec `@nestjs/schedule` via `@Cron(CronExpression.EVERY_HOUR)` dans `src/modules/scheduling/reminders.task.ts`
- À chaque exécution, sélection des `PaymentScheduleEntry` dont la date d'échéance approche selon le `reminderDaysBefore` configuré par chaque propriétaire (par défaut 5 jours)
- Filtre anti-doublon : la colonne `reminderSentAt` est posée après l'envoi, ce qui empêche tout renvoi
- Un locataire en bail trimestriel ne reçoit aucun rappel les mois où aucune échéance n'est due — le rappel suit la `PaymentScheduleEntry`, pas le calendrier mensuel
- Notification envoyée via `notifyUser()` au locataire (push si activé, sinon email avec template « rappel-échéance ») avec montant, période couverte, date limite, instructions de paiement Cashpay

### 25 Cron alertes d'impayés adaptés à la fréquence

**Logique :**

- Cron horaire séparé `@Cron(CronExpression.EVERY_HOUR)` dans `src/modules/scheduling/overdue.task.ts`
- Sélection des `PaymentScheduleEntry` avec `dueDate + overdueGraceDays < now()` et statut `PENDING` ou `PARTIAL`
- Mise à jour du statut vers `OVERDUE`, notification via `notifyUser()` au propriétaire (ou au gestionnaire mandataire du bien) avec template fourni « alerte-impayé »
- Anti-doublon : colonne `overdueAlertSentAt` mise à jour après l'envoi
- Pour les baux non mensuels, aucune alerte n'est déclenchée entre deux échéances réelles — un impayé trimestriel ne génère qu'une seule alerte à J+N après l'échéance trimestrielle
- Si un paiement partiel arrive après l'alerte, le statut passe à `PARTIAL` et une nouvelle évaluation est faite à la prochaine itération du cron

---

## Phase 6 — Tableaux de bord propriétaire et locataire

### 26 Tableau de bord propriétaire

**Logique :**

- Endpoint `GET /api/dashboard/owner/summary` — nombre total de biens, biens occupés vs vacants, taux de recouvrement périodique (loyers encaissés / loyers attendus selon la fréquence contractuelle de chaque bien), distinction explicite entre biens **auto-gérés** (le propriétaire agit dessus) et biens **sous mandat** (un gestionnaire agit dessus, le propriétaire est en lecture seule)
- Endpoint `GET /api/dashboard/owner/revenue?months=12` — évolution mensuelle des revenus sur les 12 derniers mois, avec comparaison mois courant vs mois précédent
- Endpoint `GET /api/dashboard/owner/alerts` — liste consolidée : biens auto-gérés avec loyer en retard, baux expirant dans moins de 30 jours, demandes de contact d'annonces non lues, déclarations de paiement en attente de confirmation, biens sous mandat dont le rapport mensuel vient d'arriver
- Endpoint `GET /api/dashboard/owner/properties/:id/performance` — taux de paiement à temps sur les 6 derniers mois pour le bien donné
- Les calculs sont faits côté serveur via des requêtes Prisma optimisées (jamais d'agrégation côté client)
- Cible de performance : réponse en moins de 500 ms pour le `summary`

### 27 Tableau de bord locataire

**Logique :**

- Endpoint `GET /api/dashboard/tenant/summary` — bien actuel (adresse, nom du propriétaire ou du gestionnaire mandaté en contact, loyer mensuel, charges, fréquence de paiement), montant du dépôt de garantie versé, date d'entrée dans les lieux
- Endpoint `GET /api/dashboard/tenant/next-payment` — prochaine échéance à venir (date, montant, période couverte) et liens directs vers : l'initialisation du paiement Cashpay et le formulaire de déclaration manuelle (étape 20)
- Endpoint `GET /api/dashboard/tenant/history?period=12m` — historique chronologique de tous ses paiements avec statut (y compris les déclarations en `PENDING_CONFIRMATION` ou `REJECTED`) et possibilité de télécharger chaque quittance via `GET /api/payments/:id/receipt.pdf`
- Endpoint `GET /api/dashboard/tenant/deposit` — état du dépôt de garantie (montant initial, conditions de restitution telles que définies au bail)
- Filtres disponibles sur l'historique : période (3 mois / 6 mois / 12 mois / tout), statut (payé / en attente de confirmation / partiel / en retard / rejeté)
- Aucun accès aux données d'autres locataires ni à d'autres biens — vérification systématique du `tenantId` courant

---

## Phase 7 — Annonces de biens vacants

### 28 Publication d'annonces et page publique

**Logique :**

- Module `ListingsModule` — gestion des annonces
- Endpoint `POST /api/listings` — création d'une annonce pour un bien dont le statut est `VACANT` uniquement, sinon rejet ; appel à `canActOnProperty()` pour décider qui peut publier (propriétaire ou gestionnaire mandaté)
- Le montant du loyer affiché doit correspondre exactement au loyer enregistré dans la fiche du bien — toute divergence bloque la publication
- Endpoints publics sans authentification : `GET /api/public/listings` (paginé, filtres par type, quartier, fourchette de loyer, nombre de pièces) et `GET /api/public/listings/:slug` (fiche détaillée)
- Le `slug` est généré automatiquement (`{type}-{quartier}-{ville}-{loyer}-fcfa`) pour favoriser le SEO côté frontend
- L'adresse exacte du bien n'est jamais exposée publiquement — seuls le quartier et la ville sont visibles
- Désactivation automatique de l'annonce dès qu'un locataire est rattaché au bien (statut `OCCUPIED`)
- Conservation de l'historique de toutes les annonces publiées par bien avec dates d'activation/désactivation

### 29 Formulaire de contact candidat locataire

**Logique :**

- Endpoint public `POST /api/public/listings/:id/contact` — body : prénom, téléphone, message court (max 500 caractères)
- Rate limiting strict par IP (max 5 demandes par heure) pour éviter le spam
- Création d'une ligne `ListingContact` liée à l'annonce
- Notification immédiate via `notifyUser()` au propriétaire ou au gestionnaire mandataire (selon `canActOnProperty()`) avec les coordonnées du candidat
- Si la notification se fait par email, lien `wa.me` inclus pour permettre un contact WhatsApp direct
- Endpoint `GET /api/listings/:id/contacts` — réservé à celui qui peut agir sur le bien, liste de toutes les demandes reçues avec statut lu/non lu

### 30 Modération et suspension automatique

**Logique :**

- Tâche planifiée quotidienne — suspension automatique des annonces actives depuis plus de 90 jours sans aucun contact reçu, avec notification via `notifyUser()` pour réactiver ou vérifier
- Endpoint `POST /api/admin/listings/:id/suspend` — réservé admin, suspension manuelle d'une annonce signalée comme frauduleuse ou non conforme, avec motif obligatoire et notification au propriétaire
- Endpoint public `POST /api/public/listings/:id/report` — signalement d'une annonce par un visiteur, motif libre, crée une ligne dans la file de modération admin

---

## Phase 8 — Gestionnaires immobiliers

### 31 Mandats et espace gestionnaire

**Logique :**

- Module `MandatesModule` — gestion des liens propriétaire ↔ gestionnaire ↔ bien
- Endpoint `POST /api/mandates` — création d'un mandat par un propriétaire, désigne un gestionnaire validé pour un ou plusieurs biens, avec date de début, date de fin optionnelle, tarif (pourcentage ou forfait)
- Endpoint `POST /api/mandates/:id/accept` — réservé au gestionnaire destinataire ; le mandat ne devient `ACTIVE` qu'après acceptation explicite
- Endpoint `POST /api/mandates/:id/revoke` — révocation à tout moment par le propriétaire ou par le gestionnaire, avec motif
- **Transfert des droits opérationnels** : dès qu'un mandat est `ACTIVE` sur un bien, `canActOnProperty()` renvoie le gestionnaire mandataire pour toutes les actions opérationnelles (création de bail, saisie de paiement, confirmation/rejet des déclarations locataire, publication d'annonces, contact des candidats). Le propriétaire passe en lecture seule sur ce bien — il ne voit que les chiffres et reçoit le rapport mensuel.
- **Retour des droits** : à la révocation du mandat, le propriétaire récupère immédiatement tous les droits opérationnels sur le bien
- Endpoint `GET /api/manager/portfolio` — liste des biens sous mandat actif du gestionnaire connecté, séparée de la liste de ses biens propres
- Un gestionnaire ne voit jamais que les données des biens qui lui ont été formellement confiés via un mandat actif, plus ses biens propres — vérification systématique dans tous les services concernés

### 32 Tableau de bord gestionnaire

**Logique :**

- Endpoint `GET /api/dashboard/manager/summary` — nombre total de biens gérés (avec distinction biens propres / biens sous mandat), répartition par statut (occupés / vacants / en travaux), nombre de propriétaires mandants
- Endpoint `GET /api/dashboard/manager/revenue` — encaissements du mois en cours et du mois précédent sur l'ensemble des biens gérés, avec comparaison et ventilation biens propres / biens sous mandat
- Endpoint `GET /api/dashboard/manager/alerts` — retards et impayés en cours, baux expirant dans moins de 30 jours, déclarations de paiement locataire en attente de confirmation, nouveaux contacts d'annonces
- Endpoint `GET /api/dashboard/manager/owners` — liste des propriétaires mandants avec le nombre de biens confiés et le statut de la relation
- Endpoint `GET /api/dashboard/manager/upcoming-payments` — calendrier des prochaines échéances triées par date
- Endpoint `GET /api/dashboard/manager/properties/:id/performance` — taux de recouvrement à temps sur les 6 derniers mois pour un bien donné
- **Filtres disponibles** sur l'ensemble des endpoints listés : par propriétaire mandant (`ownerId`), par bien (`propertyId`), par périmètre (biens propres / biens sous mandat / tous), par période (semaine / mois / trimestre / année / personnalisée avec dates), par statut de paiement (à venir / payé / partiel / retard / impayé / en attente de confirmation), par type de bien (villa / appartement / studio / commercial)
- Les filtres se cumulent (ET logique) et toute combinaison est valide

### 33 Rapports mensuels automatiques

**Logique :**

- Cron mensuel le 1er de chaque mois à 8h `@Cron('0 8 1 * *')` dans `src/modules/scheduling/monthly-reports.task.ts`
- **Raison d'être** : informer chaque propriétaire mandant de l'activité du mois écoulé sur les biens qu'il a confiés à un gestionnaire, sans qu'il ait à se connecter. C'est la matérialisation mensuelle du mandat — un compte-rendu officiel d'activité, qui prend tout son sens parce que le propriétaire est en lecture seule sur ces biens.
- Pour chaque mandat actif, génération à la volée d'un PDF récapitulatif du mois écoulé : récapitulatif des paiements reçus (par bien), liste des retards et impayés en cours, évolution du taux d'occupation sur le mois, déclarations de paiement traitées, note libre du gestionnaire (interventions, incidents, observations)
- Le PDF est généré en mémoire au moment de la notification, attaché à l'email (si envoi email) puis libéré — jamais stocké
- Envoi automatique via `notifyUser()` au propriétaire mandant ; si push activé, lien direct vers la version téléchargeable, sinon email avec PDF en pièce jointe (template fourni « rapport-mensuel »)
- Endpoint `GET /api/manager/mandates/:id/report/preview.pdf` — permet au gestionnaire de prévisualiser à tout moment le rapport courant pour un mandat (même génération à la volée)
- Endpoint `POST /api/manager/mandates/:id/note` — permet au gestionnaire d'ajouter ou modifier sa note libre pour le mois courant, intégrée au prochain rapport envoyé

### 34 Profil public et avis

**Logique :**

- Endpoint public `GET /api/public/managers` — liste filtrable par ville d'intervention, fourchette de tarifs, note moyenne
- Endpoint public `GET /api/public/managers/:id` — profil détaillé : nom ou raison sociale, ancienneté, zones d'intervention, tarifs, portfolio (nombre de biens gérés, types de biens), avis vérifiés
- Endpoint `POST /api/managers/:id/reviews` — création d'un avis réservée à un propriétaire ayant ou ayant eu un mandat actif avec ce gestionnaire (vérification stricte côté service)
- Calcul automatique de la note moyenne sur 5 étoiles et du nombre d'avis
- Endpoint `POST /api/admin/reviews/:id/moderate` — modération admin d'un avis signalé

---

## Phase 9 — Abonnements

### 35 Forfaits et quotas

**Logique :**

- Module `SubscriptionsModule` — gestion des forfaits Starter (2 000 FCFA, 5 biens gérés), Pro (5 000 FCFA, 15 biens gérés), Premium (10 000 FCFA, biens illimités)
- Service `QuotaService` — comptage en temps réel des biens gérés selon la définition exacte du glossaire du cahier des charges : un bien est compté s'il a un locataire actif OU une annonce active OU un statut `RENOVATION` avec bail en préparation. Les biens simplement enregistrés ne comptent pas.
- Pour un gestionnaire, le quota porte sur ses biens propres uniquement — les biens sous mandat n'entrent pas dans son quota personnel mais dans celui du propriétaire mandant
- Endpoint `GET /api/subscription/quota` — état actuel du quota vs limite du forfait courant
- Garde de quota appliquée à toutes les actions susceptibles de faire passer un bien en « géré » (création de bail, publication d'annonce, passage en statut travaux) — rejet avec message explicite proposant l'upgrade en cas de dépassement
- Endpoint `POST /api/subscription/upgrade` — migration vers un forfait supérieur instantanée, sans frais ni pénalité
- Endpoint `POST /api/subscription/cancel` — annulation effective à la fin de la période payée

### 36 Prélèvement mensuel et politique de lancement

**Logique :**

- Cron mensuel `@Cron('0 6 1 * *')` — prélèvement automatique des abonnements actifs via Cashpay, création d'une `SubscriptionInvoice` par propriétaire
- En cas d'échec de paiement, 3 retries sur 7 jours avec rappels via `notifyUser()` ; après 7 jours, suspension automatique du compte (`accountStatus = SUSPENDED_PAYMENT`) avec maintien en lecture seule
- Période bêta : 3 mois gratuits appliqués automatiquement à tout propriétaire inscrit durant la phase bêta — flag `betaUntil` sur la souscription
- Réduction de lancement : 50 % sur Starter pendant les 3 premiers mois payants — appliqué via le champ `promoDiscount` sur la souscription
- Endpoint `GET /api/subscription/invoices` — historique des factures d'abonnement, téléchargeables en PDF généré à la volée (jamais stocké)

---

## Phase 10 — Administration

### 37 Supervision plateforme

**Logique :**

- Module `AdminModule` — protégé par `@Roles(UserRole.ADMIN)` sur tous les endpoints
- Endpoint `GET /api/admin/users` — liste paginée des utilisateurs, filtres par rôle, statut de compte (`ACTIVE`, `SUSPENDED_INACTIVITY`, `SUSPENDED_ADMIN`, `SUSPENDED_PAYMENT`), date d'inscription, statut de vérification CNI, recherche par nom/email
- Endpoint `POST /api/admin/users/:id/suspend` — suspension manuelle d'un compte avec motif, passage en `SUSPENDED_ADMIN`, l'utilisateur est notifié par email
- Endpoint `POST /api/admin/users/:id/reactivate` — levée d'une suspension admin
- Endpoint `GET /api/admin/transactions` — supervision de tous les paiements de la plateforme, filtres par source, période, statut, méthode
- Endpoint `GET /api/admin/identity-verifications` — supervision des vérifications CNI (toutes les tentatives, taux de rejet, motifs récurrents) pour ajuster les règles OCR si nécessaire

### 38 Tableau de bord administrateur

**Logique :**

- Endpoint `GET /api/dashboard/admin/kpis` — utilisateurs actifs mensuels par rôle (MAU), MRR (somme des abonnements actifs), volume cumulé de loyers traités sur la plateforme, nombre de biens gérés, taux de conversion bêta → payant
- Endpoint `GET /api/dashboard/admin/growth?months=12` — évolution mensuelle des inscriptions par rôle, courbe du MRR, taux de rétention
- Endpoint `GET /api/dashboard/admin/payments-health` — taux de succès des paiements Cashpay sur 30 jours, taux d'échec par méthode (T-Money vs Flooz), webhooks reçus vs traités, latence moyenne du webhook, taux de rejet des déclarations locataire
- Endpoint `GET /api/dashboard/admin/top-owners?limit=10` — top 10 propriétaires par volume de loyers traités sur la période sélectionnée
- Endpoint `GET /api/dashboard/admin/top-managers?limit=10` — top 10 gestionnaires par nombre de mandats actifs et par taux de recouvrement
- Endpoint `GET /api/dashboard/admin/geography` — répartition géographique des biens gérés (par ville et par quartier de Lomé), avec volume de loyers par zone
- Endpoint `GET /api/dashboard/admin/recovery-rate?months=12` — évolution du taux de recouvrement global de la plateforme
- Endpoint `GET /api/dashboard/admin/system-alerts` — erreurs techniques récentes (webhooks échoués, OCR en échec répétés, retries notification épuisés, jobs cron en erreur)
- Endpoint `GET /api/dashboard/admin/moderation-queue` — résumé de la file de modération (annonces signalées, avis signalés, gestionnaires en attente de re-vérification CNI) avec ancienneté du plus vieux cas
- Endpoint `GET /api/dashboard/admin/suspended-accounts` — liste paginée des comptes suspendus avec motif (inactivité 2 mois / admin / échec de paiement abonnement), date et durée
- Endpoint `GET /api/dashboard/admin/notification-channels` — répartition push vs email parmi les utilisateurs ayant donné leur consentement, taux d'acceptation des notifications push, taux de désabonnement
- Filtres disponibles transversalement : période (jour / semaine / mois / trimestre / année / personnalisée), rôle, ville, méthode de paiement, statut de souscription

### 39 Gestion des litiges et signalements

**Logique :**

- File d'attente unifiée : annonces signalées, avis signalés, comptes signalés, cas litigieux remontés par les utilisateurs (incluant les déclarations de paiement contestées)
- Endpoint `GET /api/admin/queue` — flux de modération paginé, trié par ancienneté
- Endpoint `POST /api/admin/queue/:id/resolve` — résolution d'un cas avec décision (accepté / rejeté / suspension) et motif obligatoire
- Notification automatique de l'utilisateur concerné via `notifyUser()` à la résolution
- Audit log systématique de chaque décision admin pour traçabilité

---

## Phase 11 — Sécurité, conformité et observabilité

### 40 Journalisation, rate limiting et headers de sécurité

**Logique :**

- Interceptor global `AuditLogInterceptor` — log automatique dans `AuditLog` des actions critiques : connexion, modification de bien, paiement (toutes sources), confirmation/rejet de déclaration locataire, action admin, changement d'abonnement, vérification CNI, suspension/déblocage de compte, création/révocation de mandat
- `@nestjs/throttler` configuré globalement avec quotas plus stricts sur les endpoints sensibles (auth, webhook public, contact d'annonce, vérification CNI, déclaration de paiement)
- Helmet appliqué globalement (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- Tous les schémas DTO validés avec `class-validator`, transformation automatique des entrées via `ValidationPipe` global avec `whitelist: true` et `forbidNonWhitelisted: true`
- Logging structuré (Pino ou similaire) — toutes les requêtes loggées avec correlation ID pour traçabilité

### 41 Sauvegardes, export RGPD et conformité

**Logique :**

- Sauvegardes Supabase automatiques activées et vérifiées (quotidien chiffré, rétention 30 jours, restauration testée)
- Endpoint `GET /api/profile/export` — export complet des données personnelles d'un utilisateur en JSON (RGPD)
- Endpoint `DELETE /api/profile` — anonymisation effective (voir 10) avec conservation légale des transactions sur 5 ans conformément aux obligations togolaises
- Journalisation des transactions financières horodatées (timestamp UTC), signées et archivées pendant 5 ans minimum
- Documentation des procédures de sécurité et de continuité dans `architecture.md`

---

## Récapitulatif des fonctionnalités

| Phase                                                | Fonctionnalités |
| ---------------------------------------------------- | --------------- |
| Phase 1 — Fondations                                 | 6               |
| Phase 2 — Comptes utilisateurs                       | 5               |
| Phase 3 — Patrimoine immobilier                      | 4               |
| Phase 4 — Paiements                                  | 8               |
| Phase 5 — Rappels et alertes automatiques            | 2               |
| Phase 6 — Tableaux de bord propriétaire et locataire | 2               |
| Phase 7 — Annonces de biens vacants                  | 3               |
| Phase 8 — Gestionnaires immobiliers                  | 4               |
| Phase 9 — Abonnements                                | 2               |
| Phase 10 — Administration                            | 3               |
| Phase 11 — Sécurité, conformité et observabilité     | 2               |
| **Total**                                            | **41**          |
