import Link from 'next/link';
import PublicNavbar from '@/components/public-navbar';
import PublicFooter from '@/components/public-footer';
import './page.css';

export const metadata = { title: "Conditions Générales d'Utilisation — WARAH" };

const SECTIONS = [
  { id: 'objet', label: '1. Objet' },
  { id: 'definitions', label: '2. Définitions' },
  { id: 'acces', label: '3. Accès et création de compte' },
  { id: 'roles', label: '4. Rôles des utilisateurs' },
  { id: 'services', label: '5. Description des services' },
  { id: 'paiements', label: '6. Paiements, quittances et abonnement' },
  { id: 'intermediaire', label: '7. WARAH, intermédiaire technique' },
  { id: 'obligations', label: '8. Obligations de l’utilisateur' },
  { id: 'propriete', label: '9. Propriété intellectuelle' },
  { id: 'contenu', label: '10. Contenu que vous publiez' },
  { id: 'donnees', label: '11. Données personnelles' },
  { id: 'suspension', label: '12. Suspension et résiliation' },
  { id: 'disponibilite', label: '13. Disponibilité et responsabilité' },
  { id: 'modification', label: '14. Modification des CGU' },
  { id: 'droit', label: '15. Droit applicable et litiges' },
  { id: 'contact', label: '16. Contact' },
];

export default function CguPage() {
  return (
    <div className="page legal-page">
      <PublicNavbar />

      <section className="legal-hero">
        <span className="legal-eyebrow">Contrat d&apos;utilisation</span>
        <h1 className="legal-title">Conditions Générales d&apos;Utilisation</h1>
        <p className="legal-updated">Dernière mise à jour : 3 octobre 2026</p>
      </section>

      <div className="legal-wrap">
        <nav className="legal-toc" aria-label="Sommaire">
          <span className="legal-toc-title">Sommaire</span>
          {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`}>{s.label}</a>)}
        </nav>

        <div className="legal-body">
          <p className="legal-intro">
            Les présentes Conditions Générales d&apos;Utilisation (« CGU ») régissent l&apos;accès et l&apos;usage de
            la plateforme WARAH, éditée par <strong>WARAH SARL</strong>, société de droit togolais (RCCM :{' '}
            <span className="legal-placeholder">[RCCM à compléter]</span>), siège social à Lomé, Togo. En créant un
            compte, vous acceptez sans réserve les présentes CGU ainsi que notre{' '}
            <Link href="/confidentialite">Politique de confidentialité</Link>.
          </p>

          <section className="legal-section" id="objet">
            <h2><span className="legal-num">1.</span> Objet</h2>
            <p>
              WARAH est une plateforme numérique qui permet à des propriétaires et des gestionnaires immobiliers de
              gérer leurs biens locatifs au Togo (suivi des baux, paiements, quittances, annonces), et à des
              locataires de suivre et régler leurs loyers en ligne via Mobile Money.
            </p>
          </section>

          <section className="legal-section" id="definitions">
            <h2><span className="legal-num">2.</span> Définitions</h2>
            <ul>
              <li><strong>Plateforme</strong> : le site et l&apos;application web WARAH, dans leur ensemble.</li>
              <li><strong>Utilisateur</strong> : toute personne disposant d&apos;un compte WARAH (Propriétaire, Gestionnaire, Locataire) ou visitant la Plateforme.</li>
              <li><strong>Propriétaire</strong> : Utilisateur qui déclare un ou plusieurs biens sur la Plateforme.</li>
              <li><strong>Gestionnaire</strong> : Utilisateur professionnel auquel un Propriétaire confie la gestion d&apos;un ou plusieurs biens via un <strong>Mandat</strong>.</li>
              <li><strong>Locataire</strong> : Utilisateur occupant un bien dans le cadre d&apos;un bail suivi sur la Plateforme.</li>
              <li><strong>Mandat</strong> : accord entre un Propriétaire et un Gestionnaire, conclu et accepté sur la Plateforme, confiant la gestion d&apos;un bien contre une commission définie entre eux.</li>
              <li><strong>Quittance</strong> : document généré automatiquement par WARAH attestant qu&apos;un paiement de loyer a été confirmé.</li>
            </ul>
          </section>

          <section className="legal-section" id="acces">
            <h2><span className="legal-num">3.</span> Accès et création de compte</h2>
            <ul>
              <li>L&apos;inscription est réservée aux personnes majeures (18 ans et plus), disposant de la capacité juridique de contracter.</li>
              <li>Vous vous engagez à fournir des informations exactes, complètes, et à les tenir à jour (notamment votre numéro de réception Mobile Money, nécessaire au versement des loyers).</li>
              <li>Vous êtes seul responsable de la confidentialité de votre mot de passe et de toute action réalisée depuis votre compte.</li>
              <li>Un compte Locataire est créé par le Propriétaire ou le Gestionnaire qui l&apos;invite ; le Locataire active ensuite son compte via le lien reçu et choisit son propre mot de passe.</li>
            </ul>
          </section>

          <section className="legal-section" id="roles">
            <h2><span className="legal-num">4.</span> Rôles des utilisateurs</h2>
            <p>
              Chaque rôle dispose de droits et de responsabilités distincts sur la Plateforme : le Propriétaire gère
              ses biens et peut les confier à un Gestionnaire ; le Gestionnaire agit, pour les biens qui lui sont
              mandatés, avec les mêmes capacités de gestion que le Propriétaire (y compris la réception des loyers,
              voir article 7) ; le Locataire consulte ses échéances, déclare ou effectue ses paiements et accède à
              ses quittances.
            </p>
          </section>

          <section className="legal-section" id="services">
            <h2><span className="legal-num">5.</span> Description des services</h2>
            <ul>
              <li>Gestion de biens, baux et échéanciers de loyer ;</li>
              <li>Paiement en ligne du loyer par Mobile Money (via le prestataire PayDunya) ou déclaration d&apos;un paiement effectué autrement (espèces) ;</li>
              <li>Génération automatique de quittances au format PDF ;</li>
              <li>Mandats de gestion entre Propriétaires et Gestionnaires ;</li>
              <li>Publication d&apos;annonces pour les biens vacants ;</li>
              <li>Notifications par email et, sur consentement, par notification push.</li>
            </ul>
          </section>

          <section className="legal-section" id="paiements">
            <h2><span className="legal-num">6.</span> Paiements, quittances et abonnement</h2>
            <p>
              Les paiements de loyer en ligne sont traités par notre prestataire PayDunya (Mobile Money : T-Money,
              Flooz). WARAH n&apos;a jamais accès à vos codes secrets Mobile Money. Des frais de service peuvent
              s&apos;appliquer au paiement en ligne ; ils sont affichés avant toute confirmation de paiement.
            </p>
            <p>
              L&apos;accès à WARAH peut être proposé gratuitement pendant une période déterminée, affichée sur la
              Plateforme, avant bascule vers une offre payante selon les conditions tarifaires en vigueur au moment
              considéré, elles-mêmes communiquées au sein de l&apos;application. Toute bascule vers une offre
              payante fait l&apos;objet d&apos;une information préalable claire de l&apos;utilisateur.
            </p>
          </section>

          <section className="legal-section" id="intermediaire">
            <h2><span className="legal-num">7.</span> WARAH, intermédiaire technique</h2>
            <div className="legal-note-strong">
              <strong>WARAH n&apos;est pas partie au bail</strong> conclu entre un Propriétaire (ou son Gestionnaire
              mandaté) et un Locataire. WARAH fournit un outil technique de suivi et de paiement ; elle{' '}
              <strong>ne garantit pas</strong>{' '}la solvabilité, le comportement ou l&apos;identité des Utilisateurs,
              ni l&apos;état, la conformité ou la disponibilité réelle d&apos;un bien.
            </div>
            <p>
              Sur un bien sous mandat actif, les loyers payés en ligne sont reversés directement au Gestionnaire
              mandaté (et non au Propriétaire), conformément au Mandat accepté par les deux parties sur la
              Plateforme. La relation financière entre le Propriétaire et le Gestionnaire (répartition de la
              commission, reversement au Propriétaire) relève exclusivement du Mandat qu&apos;ils ont conclu entre
              eux ; WARAH n&apos;intervient pas dans cette relation.
            </p>
            <p>
              Tout litige relatif au bail, à l&apos;état du bien, ou à la relation entre Propriétaire, Gestionnaire
              et Locataire, doit être réglé entre les parties concernées, selon le droit applicable à leur contrat.
            </p>
          </section>

          <section className="legal-section" id="obligations">
            <h2><span className="legal-num">8.</span> Obligations de l&apos;utilisateur</h2>
            <ul>
              <li>Utiliser la Plateforme conformément à sa destination et à la loi togolaise ;</li>
              <li>Ne pas fournir d&apos;informations fausses ou trompeuses (identité, bien, paiement) ;</li>
              <li>Ne pas tenter de contourner, perturber ou compromettre la sécurité de la Plateforme ;</li>
              <li>Ne pas utiliser la Plateforme à des fins frauduleuses, notamment en matière de paiement.</li>
            </ul>
          </section>

          <section className="legal-section" id="propriete">
            <h2><span className="legal-num">9.</span> Propriété intellectuelle</h2>
            <p>
              La marque WARAH, son logo, son interface et ses contenus (hors contenu déposé par les utilisateurs)
              sont la propriété de WARAH SARL ou de ses partenaires, et protégés par le droit de la propriété
              intellectuelle. Toute reproduction ou exploitation non autorisée est interdite.
            </p>
          </section>

          <section className="legal-section" id="contenu">
            <h2><span className="legal-num">10.</span> Contenu que vous publiez</h2>
            <p>
              Vous restez propriétaire des photos, documents et descriptions que vous déposez (biens, avis,
              messages). En les publiant, vous accordez à WARAH le droit de les afficher et de les traiter dans la
              stricte mesure nécessaire au fonctionnement du service (ex. affichage d&apos;une annonce, génération
              d&apos;une quittance). Vous garantissez détenir les droits nécessaires sur tout contenu que vous
              publiez.
            </p>
          </section>

          <section className="legal-section" id="donnees">
            <h2><span className="legal-num">11.</span> Données personnelles</h2>
            <p>
              Le traitement de vos données personnelles est décrit en détail dans notre{' '}
              <Link href="/confidentialite">Politique de confidentialité</Link>, qui fait partie intégrante des
              présentes CGU.
            </p>
          </section>

          <section className="legal-section" id="suspension">
            <h2><span className="legal-num">12.</span> Suspension et résiliation</h2>
            <p>
              Nous pouvons suspendre ou résilier un compte en cas de violation des présentes CGU, de fraude avérée
              ou suspectée, d&apos;inactivité prolongée, ou de défaut de paiement d&apos;un abonnement dû. Vous
              pouvez à tout moment demander la clôture de votre compte en nous contactant, sous réserve des
              obligations de conservation légales mentionnées dans la Politique de confidentialité.
            </p>
          </section>

          <section className="legal-section" id="disponibilite">
            <h2><span className="legal-num">13.</span> Disponibilité et responsabilité</h2>
            <p>
              WARAH met tout en œuvre pour assurer la disponibilité et la fiabilité de la Plateforme, sans pouvoir
              garantir une disponibilité continue (maintenance, panne, indisponibilité d&apos;un prestataire tiers
              tel que PayDunya). WARAH ne saurait être tenue responsable des dommages indirects résultant de
              l&apos;utilisation ou de l&apos;impossibilité d&apos;utiliser la Plateforme, ni des conséquences
              d&apos;un cas de force majeure.
            </p>
          </section>

          <section className="legal-section" id="modification">
            <h2><span className="legal-num">14.</span> Modification des CGU</h2>
            <p>
              Nous pouvons modifier les présentes CGU pour refléter une évolution du service, de nos obligations
              légales ou réglementaires. Toute modification substantielle vous sera signalée avant son entrée en
              vigueur. La poursuite de l&apos;utilisation de la Plateforme après notification vaut acceptation des
              CGU modifiées.
            </p>
          </section>

          <section className="legal-section" id="droit">
            <h2><span className="legal-num">15.</span> Droit applicable et litiges</h2>
            <p>
              Les présentes CGU sont soumises au droit togolais. Tout litige relatif à leur interprétation ou à
              leur exécution relève de la compétence exclusive des juridictions de Lomé, Togo, après tentative de
              résolution amiable.
            </p>
          </section>

          <section className="legal-section" id="contact">
            <h2><span className="legal-num">16.</span> Contact</h2>
            <p>
              Email : <a href="mailto:warah9896@gmail.com">warah9896@gmail.com</a><br />
              Téléphone : +228 73 00 07 73 / +228 99 32 73 12
            </p>
          </section>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
