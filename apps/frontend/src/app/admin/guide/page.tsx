import { BookOpen, BarChart3, Users, CreditCard, Scale, History } from 'lucide-react';
import { GuidePage, type GuideSection } from '@/components/guide/guide-page';

const SECTIONS: GuideSection[] = [
  {
    icon: BarChart3,
    title: 'Statistiques',
    summary: 'Vue d’ensemble de la plateforme',
    steps: [
      "Suivez les indicateurs globaux : comptes, biens, paiements, litiges en cours.",
    ],
  },
  {
    icon: Users,
    title: 'Comptes',
    summary: 'Superviser les utilisateurs',
    steps: [
      'Recherchez un compte (propriétaire, gestionnaire ou locataire) par nom ou email.',
      "Consultez son statut et suspendez-le si nécessaire (inactivité, paiement, décision administrative).",
    ],
  },
  {
    icon: CreditCard,
    title: 'Transactions',
    summary: 'Vue globale des paiements de la plateforme',
    steps: [
      "Consultez l'ensemble des paiements, tous propriétaires et gestionnaires confondus.",
      "Filtrez par statut pour repérer rapidement les paiements en attente ou rejetés.",
    ],
  },
  {
    icon: Scale,
    title: 'Litiges',
    summary: 'Traiter les litiges signalés',
    steps: [
      "Examinez les litiges ouverts entre propriétaires, gestionnaires et locataires.",
      'Suivez leur résolution jusqu’à la clôture.',
    ],
  },
  {
    icon: History,
    title: "Journal d'audit",
    summary: 'Traçabilité des actions sensibles',
    steps: [
      "Consultez l'historique des actions administratives (suspensions, modifications sensibles).",
    ],
  },
];

export default function AdminGuidePage() {
  return (
    <GuidePage
      icon={BookOpen}
      title="Guide de l'Administrateur"
      subtitle="Supervisez les comptes, les transactions et les litiges de la plateforme WARAH."
      sections={SECTIONS}
    />
  );
}
