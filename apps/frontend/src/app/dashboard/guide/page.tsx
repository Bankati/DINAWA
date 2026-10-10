import { BookOpen, Home, Users, CreditCard, Megaphone, Handshake, UserSearch, Briefcase, Wallet } from 'lucide-react';
import { GuidePage, type GuideSection } from '@/components/guide/guide-page';

const SECTIONS: GuideSection[] = [
  {
    icon: Home,
    title: 'Mes biens',
    summary: 'Ajouter, organiser et suivre votre portefeuille immobilier',
    steps: [
      "Depuis « Mes biens », cliquez sur « Ajouter un bien » et renseignez adresse, quartier, ville, loyer et charges.",
      "Le champ « Immeuble » est facultatif : tapez le nom d'un immeuble existant (une liste de suggestions apparaît) ou saisissez-en un nouveau pour regrouper plusieurs biens au même endroit.",
      'Ajoutez des photos et documents depuis la fiche du bien après création.',
      'Utilisez les filtres de statut et le filtre « Immeuble » en haut de la liste pour retrouver rapidement un bien.',
      "Un bien vacant est automatiquement publié en annonce ; il repasse indisponible dès qu'un bail actif lui est associé.",
    ],
    tip: 'Le nombre de biens facturables que vous pouvez créer dépend de votre palier d’abonnement (Starter, Pro, Premium, Agence) — visible dans votre profil.',
  },
  {
    icon: Users,
    title: 'Locataires',
    summary: 'Suivre les locataires associés à vos biens',
    steps: [
      "Consultez la liste des locataires actifs et leur bail associé.",
      "Ouvrez la fiche d'un locataire pour voir son historique de paiements et son profil.",
    ],
  },
  {
    icon: Wallet,
    title: 'Recevoir vos loyers',
    summary: 'Indiquer où envoyer les loyers payés en ligne',
    steps: [
      "C'est le numéro renseigné à l'inscription qui reçoit vos loyers — pas de numéro séparé à ajouter. Pour le changer (ou changer d'opérateur T-Money/Flooz), passez par « Mon profil » : votre mot de passe vous est demandé.",
      "Tant que ce numéro et son opérateur ne sont pas complets, vos locataires ne peuvent pas payer en ligne : ils en sont informés et vous recevez une alerte.",
      "Dès qu'un locataire paie en ligne, le loyer complet est envoyé automatiquement sur ce numéro, sans commission WARAH. Les frais de paiement mobile money sont payés par le locataire en plus du loyer.",
      "Si le bien est sous mandat actif, le loyer est envoyé au gestionnaire : c'est entre vous et lui que se règle ensuite sa commission.",
    ],
    tip: "Chaque changement de numéro vous envoie un email d'alerte. Si vous n'en êtes pas à l'origine, changez immédiatement votre mot de passe.",
  },
  {
    icon: CreditCard,
    title: 'Paiements & quittances',
    summary: 'Suivre les loyers reçus et les quittances générées',
    steps: [
      'Chaque paiement confirmé (en ligne ou déclaré par le locataire puis validé) génère automatiquement une quittance PDF.',
      'La quittance est envoyée par email au locataire et à vous-même, et reste téléchargeable depuis « Paiements ».',
      'La signature de la quittance porte le nom du gestionnaire si le bien est sous mandat actif, sinon le vôtre.',
      'Le statut du reversement (en attente, reversé, en échec) est affiché pour chaque paiement en ligne. Pour un bien sous mandat, vous voyez les paiements en lecture seule : seul le gestionnaire peut les valider.',
    ],
  },
  {
    icon: Megaphone,
    title: 'Annonces',
    summary: 'Visibilité automatique de vos biens vacants',
    steps: [
      "Un bien vacant apparaît automatiquement dans l'annuaire public des annonces.",
      "Dès qu'un bail actif est créé pour ce bien, l'annonce est retirée automatiquement.",
    ],
  },
  {
    icon: Handshake,
    title: 'Délégation',
    summary: 'Confier la gestion d’un bien à un gestionnaire',
    steps: [
      'Depuis « Délégation », proposez un mandat à un gestionnaire pour un ou plusieurs de vos biens.',
      "Une fois le mandat actif, le gestionnaire gère ces biens à votre place (édition, paiements, locataires) et reçoit les loyers. Vous gardez un accès en lecture seule : vous voyez tout, mais vous ne pouvez plus rien modifier tant que le mandat est actif.",
      'Vous pouvez mettre fin au mandat à tout moment depuis la même page.',
    ],
  },
  {
    icon: UserSearch,
    title: 'Annuaire des gestionnaires',
    summary: 'Trouver un gestionnaire à qui déléguer un bien',
    steps: [
      "Parcourez l'annuaire public des gestionnaires par nom ou zone d'activité.",
      'Consultez leur profil public avant de leur proposer un mandat.',
    ],
  },
  {
    icon: Briefcase,
    title: 'Abonnement & quotas',
    summary: 'Comprendre votre palier et vos quotas de biens',
    steps: [
      'Chaque compte a un abonnement (Starter, Pro, Premium ou Agence) avec un quota de biens facturables.',
      'Un bien facturable est un bien loué, en travaux, ou publié en annonce active — jamais un bien archivé.',
      'Changez de palier à tout moment depuis votre profil si votre quota est atteint.',
    ],
  },
];

export default function DashboardGuidePage() {
  return (
    <GuidePage
      icon={BookOpen}
      title="Guide du Propriétaire"
      subtitle="Tout ce qu'il faut savoir pour gérer vos biens, vos locataires et vos paiements sur WARAH."
      sections={SECTIONS}
    />
  );
}
