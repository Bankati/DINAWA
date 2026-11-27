import type { GuideVideo } from './guide-page';

// Les 10 tutoriels vidéo WARAH (public/videos/tutoriels/), compressés en 720p.
// Chaque vidéo se termine en annonçant la suivante : garder cet ordre dans les listes.
export const TUTORIELS = {
  compte: { fichier: 'tuto-01-creer-son-compte-proprietaire', titre: 'Créer son compte propriétaire' },
  biens: { fichier: 'tuto-02-ajouter-ses-biens', titre: 'Ajouter ses biens' },
  bail: { fichier: 'tuto-03-inviter-un-locataire-et-creer-le-bail', titre: 'Inviter un locataire et créer le bail' },
  paiements: { fichier: 'tuto-04-suivre-les-paiements-et-quittances', titre: 'Suivre les paiements et les quittances' },
  loyers: { fichier: 'tuto-05-recevoir-les-loyers', titre: 'Recevoir les loyers sur son téléphone' },
  delegation: { fichier: 'tuto-06-confier-ses-biens-a-un-gestionnaire', titre: 'Confier ses biens à un gestionnaire' },
  payerEnLigne: { fichier: 'tuto-07-locataire-payer-en-ligne', titre: 'Locataire : activer son compte et payer en ligne' },
  especes: { fichier: 'tuto-08-locataire-paiement-en-especes', titre: 'Locataire : déclarer un paiement en espèces' },
  whatsapp: { fichier: 'tuto-09-assistant-whatsapp', titre: "L'assistant WhatsApp de WARAH" },
  gestionnaires: { fichier: 'tuto-10-gestionnaires-et-agences', titre: 'Gestionnaires et agences' },
} satisfies Record<string, GuideVideo>;
