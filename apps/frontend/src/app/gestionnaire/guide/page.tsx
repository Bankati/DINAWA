import { BookOpen, Briefcase, Home, Users, CreditCard, Megaphone, UserCircle2 } from 'lucide-react';
import { GuidePage, type GuideSection } from '@/components/guide/guide-page';

const SECTIONS: GuideSection[] = [
  {
    icon: Briefcase,
    title: 'Portefeuille',
    summary: 'Vue d’ensemble de tous les biens que vous gérez',
    steps: [
      'Le portefeuille regroupe vos biens propres et les biens confiés par mandat actif.',
      "Chaque bien indique clairement s'il vous appartient ou s'il vous est délégué.",
    ],
  },
  {
    icon: Home,
    title: 'Biens gérés',
    summary: 'Ajouter et administrer les biens sous votre responsabilité',
    steps: [
      "Ajoutez vos propres biens de la même façon qu'un propriétaire.",
      "Le champ « Immeuble » (facultatif) permet de regrouper plusieurs biens au même endroit — choisissez un immeuble existant dans les suggestions ou tapez-en un nouveau.",
      "Sur un bien sous mandat actif, vous avez les mêmes droits que le propriétaire : modification, photos, statut.",
      'Utilisez le filtre « Immeuble » en haut de la liste pour retrouver un groupe de biens.',
    ],
  },
  {
    icon: Users,
    title: 'Locataires',
    summary: 'Suivre les locataires de tous les biens gérés',
    steps: [
      'Consultez les locataires actifs, quel que soit le bien (propre ou sous mandat).',
    ],
  },
  {
    icon: CreditCard,
    title: 'Paiements & quittances',
    summary: 'Suivre les loyers et valider les paiements déclarés',
    steps: [
      'Les paiements en ligne sont confirmés automatiquement ; les paiements déclarés par un locataire doivent être validés.',
      "Chaque paiement confirmé génère une quittance PDF envoyée au propriétaire et au locataire.",
      'Sur un bien sous mandat, la quittance porte votre nom dans la zone de signature.',
    ],
  },
  {
    icon: Megaphone,
    title: 'Annonces',
    summary: 'Suivre les annonces des biens vacants gérés',
    steps: [
      "Un bien vacant (propre ou sous mandat) apparaît automatiquement en annonce publique.",
    ],
  },
  {
    icon: UserCircle2,
    title: 'Profil public',
    summary: 'Être visible dans l’annuaire des gestionnaires',
    steps: [
      "Complétez votre profil public pour qu'un propriétaire puisse vous trouver et vous proposer un mandat.",
      "Un profil complet (photo, zone d'activité, présentation) inspire davantage confiance.",
    ],
  },
];

export default function GestionnaireGuidePage() {
  return (
    <GuidePage
      icon={BookOpen}
      title="Guide du Gestionnaire"
      subtitle="Gérez votre portefeuille, vos mandats et les paiements des biens qui vous sont confiés."
      sections={SECTIONS}
    />
  );
}
