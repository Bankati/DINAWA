import { BookOpen, Wallet, FileText, History, User } from 'lucide-react';
import { GuidePage, type GuideSection } from '@/components/guide/guide-page';

const SECTIONS: GuideSection[] = [
  {
    icon: Wallet,
    title: 'Payer votre loyer en ligne',
    summary: 'Chaque mois, réglez votre échéance par Mobile Money',
    steps: [
      "Depuis « Déclarer un paiement », choisissez l'échéance à régler puis cliquez sur « Payer en ligne ».",
      'Sélectionnez votre opérateur mobile money (TMoney ou Flooz) et validez.',
      'Vous êtes redirigé vers la page de paiement sécurisée PayDunya pour confirmer.',
      "De retour sur WARAH, le statut du paiement se met à jour automatiquement dès la confirmation reçue.",
      'Une quittance PDF est générée et vous est envoyée par email dès le paiement confirmé.',
    ],
    tip: 'Recommencez cette même démarche chaque mois, à chaque nouvelle échéance affichée.',
  },
  {
    icon: FileText,
    title: 'Déclarer un paiement déjà effectué',
    summary: 'Si vous avez payé en espèces ou par virement',
    steps: [
      "Choisissez l'échéance concernée, puis basculez sur « Paiement déjà effectué ».",
      'Indiquez le montant, le mode de paiement (espèces ou virement) et, si besoin, une preuve (photo ou PDF, 5 Mo max).',
      "Votre propriétaire ou gestionnaire examine la déclaration avant de la valider.",
      "Une quittance est générée automatiquement une fois la déclaration validée.",
    ],
  },
  {
    icon: History,
    title: 'Historique des paiements',
    summary: 'Retrouver vos paiements et quittances',
    steps: [
      "Consultez tous vos paiements passés, avec leur statut (payé, en attente de confirmation, rejeté).",
      'Téléchargez à tout moment la quittance PDF de chaque paiement confirmé.',
    ],
  },
  {
    icon: User,
    title: 'Mon profil',
    summary: 'Vos informations personnelles',
    steps: [
      'Mettez à jour vos coordonnées et votre photo de profil.',
    ],
  },
];

export default function LocataireGuidePage() {
  return (
    <GuidePage
      icon={BookOpen}
      title="Guide du Locataire"
      subtitle="Payez votre loyer chaque mois, suivez vos quittances et gérez votre bail en toute simplicité."
      sections={SECTIONS}
    />
  );
}
