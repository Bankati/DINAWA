# Guide de Test - Quittance WARAH

## 📋 Vue d'ensemble

Ce guide vous permet de tester manuellement la génération de quittance WARAH sans avoir besoin de l'API complète.

## 🧪 Tests Automatisés (Jest)

### Exécution des tests unitaires

```bash
cd apps/backend
npm test -- src/modules/receipts/receipt-pdf.service.spec.ts
```

### Ce que les tests vérifient

Les tests dans `receipt-pdf.service.spec.ts` vérifient :

1. ✅ **Génération PDF valide** - Le fichier commence par `%PDF`
2. ✅ **Présence du branding WARAH** - Texte "WARAH" et "QUITTANCE DE LOYER"
3. ✅ **Informations propriétaire** - Nom et email corrects
4. ✅ **Informations locataire** - Nom et email corrects
5. ✅ **Adresse du bien** - Adresse complète affichée
6. ✅ **Numéro de quittance** - Format ABC12345
7. ✅ **Montant en FCFA** - Format "55 000 FCFA"
8. ✅ **Mention légale** - Texte légal complet
9. ✅ **URL de vérification** - www.warah.tg/verif/
10. ✅ **Gestion des données manquantes** - Pas d'erreur avec null/undefined
11. ✅ **Méthodes de paiement** - T-Money, Flooz, Espèces, Virement

## 🔧 Test Manuel (Script Node.js)

### Prérequis

```bash
cd apps/backend
npm install
```

### Exécution du test manuel

```bash
node test-receipt-manual.js
```

### Ce que fait le script manuel

1. Génère un PDF de quittance avec des données de test
2. Vérifie que le PDF est valide (en-tête %PDF)
3. Vérifie le contenu du PDF
4. Sauvegarde le PDF dans `test-quittance-warah.pdf`
5. Affiche un rapport de vérification

### Données de test utilisées

```javascript
{
  id: 'abc12345-def67-89012',
  paidAmount: 55000,
  paidAt: new Date('2026-01-05T10:30:00Z'),
  paymentMethod: 'CASH',
  transactionId: 'TXN-2026-001',
  lease: {
    owner: {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
      phone: '+228 90 00 00 00',
      city: 'Lomé',
    },
    tenant: {
      firstName: 'Ama',
      lastName: 'Kodjo',
      email: 'ama.kodjo@example.com',
      phone: '+228 91 00 00 00',
    },
    property: {
      address: '12 rue de Lomé, Tokoin',
      type: 'Appartement',
    },
  },
  scheduleEntry: {
    periodStart: new Date('2026-01-01'),
    periodEnd: new Date('2026-02-01'),
  },
}
```

## ✅ Critères de validation

### Format PDF

- [ ] Le fichier généré est un PDF valide (extension .pdf)
- [ ] Le fichier s'ouvre correctement dans un lecteur PDF
- [ ] La taille du fichier est raisonnable (> 1 Ko)

### Contenu WARAH

- [ ] En-tête "WARAH – Gestion locative simplifiée" présent
- [ ] Titre "QUITTANCE DE LOYER" présent
- [ ] Numéro de quittance affiché (ex: ABC12345)
- [ ] Période affichée (ex: January 2026)

### Informations bailleur

- [ ] Section "BAILLEUR" présente
- [ ] Nom/raison sociale affiché
- [ ] Adresse affichée
- [ ] Téléphone affiché
- [ ] Email affiché

### Informations locataire

- [ ] Section "LOCATAIRE" présente
- [ ] Nom et prénom(s) affiché
- [ ] Téléphone affiché
- [ ] Email affiché
- [ ] Numéro de contrat de bail affiché

### Détails paiement

- [ ] Section "DÉTAIL DU PAIEMENT" présente
- [ ] Montant du loyer affiché
- [ ] Charges affichées (0 FCFA pour l'instant)
- [ ] MONTANT TOTAL RÉGLÉ en gras
- [ ] Montant en toutes lettres affiché
- [ ] Mode de paiement affiché
- [ ] Date de paiement affichée
- [ ] Référence de transaction affichée

### Mention légale

- [ ] Section "MENTION LÉGALE" présente
- [ ] Premier paragraphe légal présent
- [ ] Deuxième paragraphe légal présent

### Pied de page

- [ ] Placeholder QR code présent
- [ ] Texte "Vérification d'authenticité" présent
- [ ] URL www.warah.tg/verif/ présente
- [ ] Date et lieu "Fait à Lomé" présents
- [ ] Signature "Le bailleur" présente
- [ ] Ligne de signature présente

## 🐛 Dépannage

### Si les tests échouent

1. **Vérifiez les dépendances** :

   ```bash
   npm install
   ```

2. **Vérifiez TypeScript** :

   ```bash
   npx tsc --noEmit
   ```

3. **Vérifiez le service** :
   ```bash
   npm run build
   ```

### Si le PDF ne se génère pas

1. Vérifiez que `pdfkit` est installé
2. Vérifiez que `date-fns` est installé
3. Consultez les logs d'erreur détaillés

## 📊 Résultats attendus

### Test unitaire réussi

```
PASS  src/modules/receipts/receipt-pdf.service.spec.ts
  ReceiptPdfService - Format WARAH
    ✓ génère un PDF valide (en-tête %PDF) pour un paiement
    ✓ contient le texte WARAH dans le PDF généré
    ✓ contient les informations du propriétaire
    ✓ contient les informations du locataire
    ✓ contient l'adresse du bien
    ✓ contient le numéro de quittance
    ✓ contient le montant en FCFA
    ✓ contient la mention légale
    ✓ contient l'URL de vérification
    ✓ gère les données manquantes sans erreur
    ✓ fonctionne avec T-Money comme méthode de paiement
    ✓ fonctionne avec Flooz comme méthode de paiement
```

### Test manuel réussi

```
🧪 Test de génération de quittance WARAH...

📄 Génération du PDF...
✅ PDF généré avec succès !
📏 Taille du PDF : 8234 octets
🔍 En-tête PDF : %PDF

🔎 Vérifications du contenu :
   - Contient 'WARAH' : ✅
   - Contient 'QUITTANCE DE LOYER' : ✅
   - Contient 'Jean Dupont' : ✅
   - Contient 'Ama Kodjo' : ✅
   - Contient '55 000 FCFA' : ✅
   - Contient la mention légale : ✅
   - Contient l'URL de vérification : ✅

💾 PDF sauvegardé : ./test-quittance-warah.pdf
📂 Vous pouvez ouvrir ce fichier pour vérifier visuellement le format WARAH

🎉 Test terminé avec succès !
```

## 🎯 Prochaines étapes

Une fois les tests validés :

1. **Intégration API** - Tester avec l'endpoint `/payments/:id/receipt.pdf`
2. **Test email** - Vérifier l'envoi automatique par email
3. **Test QR code** - Implémenter la génération réelle du QR code
4. **Test complet** - Scénario de bout en bout avec paiement réel
