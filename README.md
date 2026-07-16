# LOKATO - Frontend

Plateforme de gestion locative immobilière pour le Togo.

## 🏠 À propos

LOKATO est une SaaS B2B conçue spécifiquement pour le marché togolais, permettant aux propriétaires immobiliers (locaux et diaspora) de gérer leurs biens, encaisser les loyers et automatiser les quittances.

### Stack Technique

- **Frontend** : Angular 20 (Standalone Components)
- **Styling** : Tailwind CSS
- **Backend** : Next.js 14/15+ (API REST) - À implémenter
- **Base de données** : PostgreSQL + Supabase - À implémenter
- **Paiements** : T-Money + Flooz via Paygate Globale - À implémenter

## 📦 Installation

### Prérequis

- Node.js 20+
- npm ou yarn

### Étapes

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm start

# Builder pour la production
npm run build
```

## 🏗️ Structure du Projet

```
src/
├── app/
│   ├── core/              # Guards, interceptors, services globaux
│   │   └── models/        # Interfaces TypeScript (Bien, Paiement, etc.)
│   ├── shared/            # Composants réutilisables
│   │   ├── components/    # Composants UI partagés
│   │   └── pipes/         # Pipes Angular personnalisés
│   ├── features/          # Modules fonctionnels
│   │   ├── auth/          # Authentification
│   │   ├── dashboard/     # Tableau de bord
│   │   ├── biens/         # Gestion des biens
│   │   ├── locataires/    # Gestion des locataires
│   │   ├── paiements/     # Collecte des loyers
│   │   └── annonces/      # Module annonces public
│   └── layouts/           # Shell propriétaire, shell public
```

## 🎨 Composants Partagés

### LokBadgeStatut
Badge coloré pour les statuts de bien (OCCUPÉ, VACANT, EN TRAVAUX, ARCHIVÉ).

```html
<lok-badge-statut [statut]="bien.statut"></lok-badge-statut>
```

### LokBadgePaiement
Badge coloré pour les statuts de paiement (PAYÉ, EN RETARD, IMPAYÉ, PARTIEL).

```html
<lok-badge-paiement [statut]="paiement.statut"></lok-badge-paiement>
```

### LokMontantFcfa
Composant et pipe pour formater les montants en FCFA.

```html
<lok-montant-fcfa [montant]="150000" size="lg" color="primary"></lok-montant-fcfa>
<!-- ou avec le pipe -->
{{ 150000 | fcfa }}  <!-- Affiche : "150 000 FCFA" -->
```

### LokCardBien
Card réutilisable pour afficher un bien immobilier.

```html
<lok-card-bien 
  [bien]="bien" 
  [showActions]="true"
  (onCardClick)="navigateToBien($event)"
  (onEdit)="editBien($event)"
  (onView)="viewBien($event)"
></lok-card-bien>
```

### LokAlerte
Composant d'alerte (info, warning, error, success).

```html
<lok-alerte 
  type="error" 
  titre="Erreur" 
  message="Une erreur est survenue"
  [dismissible]="true"
></lok-alerte>
```

### LokSkeleton
Skeleton loader pour les états de chargement.

```html
<lok-skeleton type="card"></lok-skeleton>
<lok-skeleton type="list" [count]="5"></lok-skeleton>
```

### LokEmptyState
État vide avec illustration et CTA.

```html
<lok-empty-state 
  titre="Aucun bien ajouté"
  description="Commencez par ajouter votre premier bien immobilier."
  ctaLabel="Ajouter un bien"
  icon="bien"
  (ctaAction)="addBien()"
></lok-empty-state>
```

### LokConfirmModal
Modal de confirmation pour les actions destructives.

```html
<lok-confirm-modal 
  titre="Supprimer le bien"
  message="Êtes-vous sûr de vouloir supprimer ce bien ?"
  (onConfirm)="deleteBien()"
  (onCancel)="closeModal()"
></lok-confirm-modal>
```

### LokUpload
Composant d'upload de fichiers (images + PDF) avec drag & drop.

```html
<lok-upload 
  accept="image/*,.pdf"
  [maxSize]="5"
  [multiple]="true"
  [maxFiles]="10"
  (filesChange)="onFilesChange($event)"
></lok-upload>
```

### LokTelephoneTogo
Input de téléphone avec préfixe +228 et validation du format togolais.

```html
<lok-telephone-togo 
  [formControl]="telephoneControl"
  [showError]="true"
></lok-telephone-togo>
```

## 🎨 Palette de Couleurs

- **Primaire** : Vert profond `#1A7A4A`
- **Secondaire** : Or/Ambre `#F59E0B`
- **Fond** : Blanc cassé `#F9FAFB`
- **Texte principal** : Gris très foncé `#111827`
- **Succès** : Vert `#10B981`
- **Erreur** : Rouge `#EF4444`
- **Avertissement** : Orange `#F59E0B`

## 📝 Règles de Développement

- Utiliser des composants Angular standalone
- TypeScript strict avec interfaces pour tous les modèles
- Tailwind CSS pour le styling
- Reactive Forms pour les formulaires
- RxJS pour la gestion des états asynchrones
- Commentaires en français dans le code
- Loading states et empty states pour chaque liste
- Zones cliquables ≥ 44px (accessibilité mobile)

## 🚀 Scripts Disponibles

```bash
npm start          # Démarrer le serveur de développement
npm run build      # Builder pour la production
npm test           # Exécuter les tests
npm run lint       # Linter le code
```

## 📄 Licence

Confidentiel - Usage interne LOKATO

---

*LOKATO — Gérez vos biens. Encaissez vos loyers. Dormez tranquille.*
