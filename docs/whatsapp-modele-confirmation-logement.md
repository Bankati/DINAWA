# Modèle WhatsApp « confirmation_logement »

Accord du locataire déjà inscrit (registre des décisions et contrat d'API du 09/11/2026).
Ce modèle est envoyé quand un propriétaire ou un gestionnaire invite une personne qui a déjà un compte WARAH activé : le bail attend son « Oui ».

**Qui le crée** : le boss ou Mabibè, dans Meta Business Manager (Gestionnaire WhatsApp → Modèles de messages). Le code n'appelle jamais l'API de création de modèles.

**Tant qu'il n'est pas approuvé**, tout fonctionne : la demande part par email et dans l'espace WARAH, le WhatsApp est simplement sauté. L'interrupteur `WHATSAPP_LEASE_CONFIRMATION_ENABLED` reste à `false` (valeur par défaut).

## 1. Réglages du modèle

| Champ | Valeur |
|---|---|
| Nom | `confirmation_logement` (exactement, en minuscules) |
| Catégorie | **Utility** (Utilité) |
| Langue | Français (`fr`) |
| En-tête | Texte : `Confirmez votre logement` |
| Pied de page | `WARAH – Répondez STOP pour ne plus recevoir ces messages.` (57 caractères, 60 au plus) |
| Boutons | 2 boutons de **réponse rapide** (Quick reply), dans cet ordre |

## 2. Corps du message (à copier tel quel)

```
Bonjour {{1}},
{{2}} vous ajoute comme locataire sur WARAH :
📍 {{3}}
💰 {{4}} F par mois, à partir du {{5}}
Est-ce bien votre logement ? Sans réponse, la demande expire le {{6}}. Répondez avec un des boutons ci-dessous.
```

Ce texte est aussi dans le code (`apps/backend/src/modules/notify/whatsapp-templates.ts`, champ `metaText`). Si Meta demande un changement, il faut modifier les deux au même endroit, sinon Meta refuse l'envoi (erreur 132000).

Exemples demandés par Meta pour chaque variable :

| Variable | Contenu | Exemple |
|---|---|---|
| `{{1}}` | Prénom du locataire (celui de son compte) | `Awa` |
| `{{2}}` | Nom de la personne qui invite | `Jean Dupont` |
| `{{3}}` | Logement (adresse, quartier, ville) | `Villa rue 12, Adidogomé, Lomé` |
| `{{4}}` | Loyer mensuel | `50 000` |
| `{{5}}` | Date de début du bail | `01/12/2026` |
| `{{6}}` | Date d'expiration de la demande | `16/11/2026` |

## 3. Boutons

| Ordre | Type | Libellé (sans émoji, règle Meta) | Code caché envoyé par WARAH |
|---|---|---|---|
| 1 | Réponse rapide | `Oui, c'est mon logement` (23 caractères) | `LC_ACCEPT:<id de la demande>` |
| 2 | Réponse rapide | `Ce n'est pas moi` (16 caractères) | `LC_REFUSE:<id de la demande>` |

- Le libellé est fixé chez Meta ; WARAH n'envoie que le code caché (« payload ») de chaque bouton, au moment de l'envoi.
- Si Meta refuse la virgule ou l'apostrophe : `Oui je confirme` et `Non pas moi` (proposition de Majoie). Les codes cachés ne changent pas.
- L'ordre compte : le bouton 1 doit être « Oui », le bouton 2 « Ce n'est pas moi ».

## 4. Après l'approbation

1. Vérifier que le modèle est **approuvé** et classé **Utility** (Meta peut le reclasser en Marketing : dans ce cas, ne pas l'activer et nous prévenir).
2. Dans Railway, ajouter la variable `WHATSAPP_LEASE_CONFIRMATION_ENABLED=true`, puis redéployer (« Deploy latest commit »).
3. Faire un essai avec un compte locataire de test qui a donné son accord WhatsApp et dont le numéro est vérifié : inviter ce compte sur un bien libre, appuyer sur les deux boutons (sur deux demandes différentes).

## 5. Ce que fait WARAH quand on appuie

- Le webhook reçoit le code caché, le robot l'applique avec les mêmes règles que l'espace WARAH (contrat d'API).
- Réponses du robot (texte libre, permis dans les 24 h qui suivent l'appui) :
  - « Oui » : « Merci Awa ! ✅ Votre bail est actif… Nous avons prévenu Jean Dupont. »
  - « Ce n'est pas moi » : « C'est noté, merci Awa. Ce logement n'a pas été ajouté à votre compte… »
  - Bail actif ailleurs : « Votre bail actuel doit d'abord être terminé par votre propriétaire. »
  - Deuxième appui, demande expirée ou annulée : « Cette demande n'est plus en cours. Rien n'a changé sur votre compte. »
- Le WhatsApp ne part jamais sans l'accord WhatsApp du locataire et sans numéro vérifié.

## 6. Coût

Les modèles « Utility » sont payants chez Meta (prix par message selon le pays). Je n'ai pas la grille de prix du compte WARAH : à vérifier dans Meta Business Manager avant d'activer. Les rappels à 2 et 5 jours renvoient ce modèle : au plus 3 messages par demande.
