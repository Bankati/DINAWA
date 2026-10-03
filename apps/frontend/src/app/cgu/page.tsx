import Link from 'next/link';
import PublicNavbar from '@/components/public-navbar';
import PublicFooter from '@/components/public-footer';
import './page.css';

export const metadata = { title: "Conditions Générales d'Utilisation — WARAH" };

const SECTIONS = [
  { id: 'objet', label: '1. Objet et champ d’application' },
  { id: 'definitions', label: '2. Définitions' },
  { id: 'acces', label: '3. Accès et création de compte' },
  { id: 'roles', label: '4. Rôles et responsabilités' },
  { id: 'services', label: '5. Description des services' },
  { id: 'paiement-en-ligne', label: '6. Paiement en ligne' },
  { id: 'abonnement', label: '7. Abonnement et facturation' },
  { id: 'intermediaire', label: '8. WARAH, intermédiaire technique' },
  { id: 'fraude', label: '9. Prévention de la fraude' },
  { id: 'obligations', label: '10. Obligations de l’utilisateur' },
  { id: 'propriete', label: '11. Propriété intellectuelle' },
  { id: 'contenu', label: '12. Contenu publié et modération' },
  { id: 'donnees', label: '13. Données personnelles' },
  { id: 'preuve', label: '14. Preuve électronique' },
  { id: 'suspension', label: '15. Suspension et résiliation' },
  { id: 'disponibilite', label: '16. Disponibilité et force majeure' },
  { id: 'responsabilite', label: '17. Limitation de responsabilité' },
  { id: 'modification', label: '18. Modification des CGU' },
  { id: 'diverses', label: '19. Dispositions diverses' },
  { id: 'droit', label: '20. Droit applicable et litiges' },
  { id: 'contact', label: '21. Contact' },
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
            Les présentes Conditions Générales d&apos;Utilisation (« CGU ») constituent un contrat entre vous
            (« l&apos;Utilisateur ») et <strong>WARAH SARL</strong>, société de droit togolais (RCCM :{' '}
            <span className="legal-placeholder">[RCCM à compléter]</span>), dont le siège social est à Lomé, Togo
            (« WARAH », « nous »). Elles régissent l&apos;accès et l&apos;usage de la plateforme WARAH, accessible
            notamment via son site web et ses applications (la « Plateforme »). En créant un compte ou en utilisant
            la Plateforme, vous déclarez avoir lu, compris et accepté sans réserve les présentes CGU ainsi que notre{' '}
            <Link href="/confidentialite">Politique de confidentialité</Link>, qui en fait partie intégrante. Si
            vous n&apos;acceptez pas ces CGU, vous ne devez pas utiliser la Plateforme.
          </p>

          <section className="legal-section" id="objet">
            <h2><span className="legal-num">1.</span> Objet et champ d&apos;application</h2>
            <p>
              WARAH est une plateforme numérique de gestion locative qui permet à des propriétaires et des
              gestionnaires immobiliers de gérer leurs biens locatifs au Togo (suivi des baux, paiements,
              quittances, annonces, mandats de gestion), et à des locataires de suivre et régler leurs loyers en
              ligne via Mobile Money.
            </p>
            <p>
              Les présentes CGU s&apos;appliquent à tout Utilisateur, quel que soit son rôle (Propriétaire,
              Gestionnaire, Locataire) et quel que soit le moyen d&apos;accès utilisé (navigateur web, application
              mobile le cas échéant). Elles s&apos;appliquent également, dans leurs dispositions pertinentes, à
              tout visiteur non inscrit consultant les pages publiques de la Plateforme (ex. annonces, formulaire
              de contact).
            </p>
          </section>

          <section className="legal-section" id="definitions">
            <h2><span className="legal-num">2.</span> Définitions</h2>
            <p>Dans les présentes CGU, les termes suivants, qu&apos;ils soient utilisés au singulier ou au pluriel, ont la signification ci-après :</p>
            <ul>
              <li><strong>Plateforme</strong> : le site, l&apos;application web et l&apos;ensemble des services numériques édités par WARAH.</li>
              <li><strong>Utilisateur</strong> : toute personne physique disposant d&apos;un compte WARAH (Propriétaire, Gestionnaire ou Locataire).</li>
              <li><strong>Propriétaire</strong> : Utilisateur qui déclare un ou plusieurs Biens sur la Plateforme et en est le titulaire légal, ou dûment habilité à les administrer.</li>
              <li><strong>Gestionnaire</strong> : Utilisateur professionnel ou particulier auquel un Propriétaire confie la gestion d&apos;un ou plusieurs Biens via un Mandat.</li>
              <li><strong>Locataire</strong> : Utilisateur occupant un Bien dans le cadre d&apos;un Bail suivi sur la Plateforme.</li>
              <li><strong>Bien</strong> : tout logement ou local (villa, appartement, studio, chambre, local professionnel, etc.) déclaré par un Propriétaire sur la Plateforme.</li>
              <li><strong>Bail</strong> : le contrat de location conclu entre un Propriétaire (ou son Gestionnaire mandaté) et un Locataire pour un Bien, dont les paramètres essentiels (loyer, échéances, dates) sont renseignés sur la Plateforme à titre de suivi, sans que la Plateforme ne s&apos;y substitue juridiquement.</li>
              <li><strong>Mandat</strong> : accord conclu et accepté sur la Plateforme entre un Propriétaire et un Gestionnaire, confiant à ce dernier la gestion d&apos;un ou plusieurs Biens contre une commission définie entre eux.</li>
              <li><strong>Échéance</strong> : date à laquelle un paiement de loyer est attendu, selon la périodicité définie pour le Bail.</li>
              <li><strong>Quittance</strong> : document généré automatiquement par WARAH attestant qu&apos;un paiement de loyer a été confirmé pour une Échéance donnée.</li>
              <li><strong>Mobile Money</strong> : service de paiement mobile proposé par un opérateur de télécommunications togolais (notamment T-Money, Flooz), utilisé pour le règlement des loyers en ligne.</li>
              <li><strong>Prestataire de paiement</strong> : société tierce agréée (notamment PayDunya) chargée techniquement de l&apos;exécution des opérations de paiement Mobile Money pour le compte de WARAH.</li>
              <li><strong>Compte</strong> : espace personnel et sécurisé attribué à chaque Utilisateur sur la Plateforme, protégé par un identifiant et un mot de passe.</li>
            </ul>
          </section>

          <section className="legal-section" id="acces">
            <h2><span className="legal-num">3.</span> Accès et création de compte</h2>
            <h3>3.1 Conditions d&apos;éligibilité</h3>
            <ul>
              <li>L&apos;inscription est réservée aux personnes physiques majeures (18 ans et plus), disposant de la pleine capacité juridique de contracter.</li>
              <li>Chaque Utilisateur ne peut détenir qu&apos;un seul Compte par rôle exercé ; la création de comptes multiples dans le but de contourner une suspension, un quota ou une limitation est interdite.</li>
              <li>Un Compte Locataire est créé par le Propriétaire ou le Gestionnaire qui invite le Locataire ; ce dernier active ensuite son Compte via le lien d&apos;invitation reçu et choisit lui-même son mot de passe, ce qui vaut acceptation personnelle des présentes CGU.</li>
            </ul>
            <h3>3.2 Exactitude des informations</h3>
            <p>
              Vous vous engagez à fournir, lors de l&apos;inscription puis tout au long de l&apos;utilisation de la
              Plateforme, des informations exactes, à jour et complètes — en particulier votre numéro de téléphone
              et votre opérateur Mobile Money, nécessaires au versement des loyers qui vous sont dus. Une
              information erronée ou périmée relative à votre numéro de réception peut entraîner l&apos;échec ou le
              retard d&apos;un reversement ; WARAH ne saurait en être tenue responsable.
            </p>
            <h3>3.3 Sécurité du compte</h3>
            <p>
              Vous êtes seul responsable de la confidentialité de vos identifiants de connexion et de toute action
              réalisée depuis votre Compte, qu&apos;elle ait été autorisée par vous ou non. Vous vous engagez à nous
              signaler sans délai, à <a href="mailto:warah9896@gmail.com">warah9896@gmail.com</a>, toute utilisation
              non autorisée de votre Compte ou toute atteinte suspectée à sa sécurité.
            </p>
          </section>

          <section className="legal-section" id="roles">
            <h2><span className="legal-num">4.</span> Rôles et responsabilités des utilisateurs</h2>
            <p>Chaque rôle dispose de droits et d&apos;obligations propres sur la Plateforme :</p>
            <h3>4.1 Propriétaire</h3>
            <ul>
              <li>Déclare ses Biens avec exactitude (caractéristiques, loyer, charges) ;</li>
              <li>Reste seul responsable de la conformité légale de ses Biens à la location (normes, autorisations éventuelles) ;</li>
              <li>Peut confier la gestion d&apos;un Bien à un Gestionnaire via un Mandat, ou gérer directement ses Biens et ses Locataires.</li>
            </ul>
            <h3>4.2 Gestionnaire</h3>
            <ul>
              <li>N&apos;agit sur un Bien que dans le cadre d&apos;un Mandat accepté, et dans les limites de ce Mandat ;</li>
              <li>Dispose, pour les Biens qui lui sont mandatés, des mêmes capacités de gestion que le Propriétaire, y compris la réception des loyers versés en ligne (voir article 8.2) ;</li>
              <li>Reste redevable envers le Propriétaire des termes financiers convenus dans leur Mandat (commission, reversement) — relation qui s&apos;établit et s&apos;exécute en dehors de la Plateforme, WARAH n&apos;intervenant pas dans ce reversement secondaire ;</li>
              <li>S&apos;engage à agir avec diligence et loyauté envers le Propriétaire mandant.</li>
            </ul>
            <h3>4.3 Locataire</h3>
            <ul>
              <li>S&apos;engage à régler son loyer aux Échéances convenues, en ligne via Mobile Money ou par tout autre moyen accepté par le Propriétaire/Gestionnaire ;</li>
              <li>Lorsqu&apos;il déclare un paiement effectué autrement qu&apos;en ligne (espèces), s&apos;engage à ce que cette déclaration soit sincère et exacte ; une déclaration frauduleuse constitue une violation grave des présentes CGU ;</li>
              <li>Peut consulter à tout moment ses Échéances, son historique de paiement et ses Quittances.</li>
            </ul>
          </section>

          <section className="legal-section" id="services">
            <h2><span className="legal-num">5.</span> Description détaillée des services</h2>
            <ul>
              <li><strong>Gestion de biens et de baux</strong> : déclaration des Biens, suivi des Baux et des échéanciers de loyer.</li>
              <li><strong>Paiement en ligne</strong> : règlement du loyer par Mobile Money via notre Prestataire de paiement.</li>
              <li><strong>Déclaration de paiement hors-ligne</strong> : enregistrement par le Locataire, ou par le Propriétaire/Gestionnaire, d&apos;un paiement reçu en espèces, soumis à validation.</li>
              <li><strong>Quittances automatiques</strong> : génération et envoi d&apos;un document PDF après confirmation de chaque paiement, à chaque partie concernée (Propriétaire, Locataire et, le cas échéant, Gestionnaire mandaté).</li>
              <li><strong>Mandats de gestion</strong> : mise en relation et formalisation de la délégation de gestion entre Propriétaires et Gestionnaires.</li>
              <li><strong>Annonces</strong> : publication automatique d&apos;une annonce pour tout Bien vacant, visible publiquement.</li>
              <li><strong>Avis sur les Gestionnaires</strong> : les Propriétaires ayant mandaté un Gestionnaire peuvent lui laisser un avis visible des autres Utilisateurs.</li>
              <li><strong>Notifications</strong> : rappels d&apos;échéance, confirmations de paiement, alertes d&apos;impayé, réception d&apos;un Mandat, par email et, sur consentement, par notification push.</li>
              <li><strong>Rapports et tableaux de bord</strong> : statistiques de revenus locatifs et exports à usage de l&apos;Utilisateur.</li>
            </ul>
            <p>
              WARAH se réserve le droit de faire évoluer, enrichir ou retirer tout ou partie de ces fonctionnalités,
              notamment pour les adapter aux évolutions réglementaires ou techniques, dans les conditions de
              l&apos;article 18.
            </p>
          </section>

          <section className="legal-section" id="paiement-en-ligne">
            <h2><span className="legal-num">6.</span> Paiement en ligne</h2>
            <p>
              Le paiement en ligne d&apos;un loyer est initié par le Locataire depuis la Plateforme, puis exécuté
              techniquement par notre Prestataire de paiement (PayDunya), qui redirige l&apos;Utilisateur vers son
              propre système sécurisé de collecte Mobile Money. WARAH n&apos;a à aucun moment accès à votre code
              secret Mobile Money.
            </p>
            <p>
              Un Paiement est considéré confirmé lorsque le Prestataire de paiement notifie WARAH de sa réussite ;
              la Quittance correspondante est alors générée automatiquement. Des frais de service, affichés avant
              toute confirmation, peuvent s&apos;appliquer au paiement en ligne, en complément du loyer. Ces frais
              rémunèrent le fonctionnement de la Plateforme et les coûts de la passerelle de paiement ; ils ne sont
              ni remboursables ni négociables une fois le paiement confirmé, sauf erreur technique imputable à
              WARAH ou à son Prestataire de paiement, auquel cas WARAH s&apos;efforcera de résoudre l&apos;incident
              avec diligence, y compris via un remboursement si la situation le justifie.
            </p>
            <p>
              En cas d&apos;échec, de délai anormal ou d&apos;indisponibilité du service Mobile Money ou du
              Prestataire de paiement, le Locataire conserve la possibilité de régler son loyer par un autre moyen
              accepté par le Propriétaire ou le Gestionnaire. WARAH ne saurait être tenue responsable des délais ou
              défaillances propres aux réseaux Mobile Money ou au Prestataire de paiement, qui demeurent des tiers
              indépendants.
            </p>
          </section>

          <section className="legal-section" id="abonnement">
            <h2><span className="legal-num">7.</span> Abonnement et facturation</h2>
            <p>
              L&apos;accès à WARAH peut être proposé gratuitement pendant une période déterminée, affichée sur la
              Plateforme, avant bascule vers une offre payante selon les formules, paliers et tarifs en vigueur au
              moment considéré, communiqués de façon claire au sein de l&apos;application avant toute facturation
              effective. Toute bascule d&apos;une offre gratuite vers une offre payante fait l&apos;objet
              d&apos;une information préalable de l&apos;Utilisateur.
            </p>
            <p>
              En cas de défaut de paiement d&apos;un abonnement dû, WARAH peut suspendre tout ou partie des
              fonctionnalités avancées du Compte concerné jusqu&apos;à régularisation, sans préjudice de la
              conservation des données existantes. Les factures d&apos;abonnement et leur historique sont
              consultables depuis votre Compte. Toute résiliation d&apos;un abonnement payant prend effet à
              l&apos;issue de la période déjà facturée, sans remboursement au prorata sauf disposition contraire
              expressément communiquée au moment de la souscription.
            </p>
          </section>

          <section className="legal-section" id="intermediaire">
            <h2><span className="legal-num">8.</span> WARAH, intermédiaire technique — limites de responsabilité</h2>
            <div className="legal-note-strong">
              <strong>WARAH n&apos;est pas partie au Bail</strong> conclu entre un Propriétaire (ou son Gestionnaire
              mandaté) et un Locataire. WARAH fournit un outil technique de suivi et de paiement ; elle{' '}
              <strong>ne garantit pas</strong>{' '}la solvabilité, le comportement, l&apos;identité réelle ou les
              intentions des Utilisateurs, ni l&apos;état, la conformité, la disponibilité réelle ou
              l&apos;exactitude de la description d&apos;un Bien.
            </div>
            <h3>8.1 Relation entre les parties au Bail</h3>
            <p>
              Tout litige relatif au Bail lui-même (état du Bien, dépôt de garantie, préavis, résiliation, trouble
              de jouissance, etc.), ou plus largement à la relation entre Propriétaire, Gestionnaire et Locataire,
              doit être réglé directement entre les parties concernées, selon le droit applicable à leur contrat.
              WARAH n&apos;a pas vocation à arbitrer ces différends, même si elle peut, à sa discrétion et sans y
              être obligée, fournir aux parties un accès aux données de paiement pertinentes conservées sur la
              Plateforme.
            </p>
            <h3>8.2 Reversement sur bien mandaté</h3>
            <p>
              Sur un Bien sous Mandat actif, les loyers payés en ligne sont reversés directement au Gestionnaire
              mandaté (et non au Propriétaire), conformément au Mandat accepté par les deux parties sur la
              Plateforme. La répartition ultérieure entre le Gestionnaire et le Propriétaire (commission,
              reversement net) relève exclusivement du Mandat conclu entre eux ; WARAH n&apos;intervient pas dans
              cette relation financière secondaire et ne saurait être tenue responsable d&apos;un manquement de
              l&apos;une des parties envers l&apos;autre à ce titre.
            </p>
            <h3>8.3 Contenu et exactitude des annonces</h3>
            <p>
              La responsabilité du contenu d&apos;une Annonce (photos, description, loyer affiché) incombe
              exclusivement au Propriétaire ou au Gestionnaire qui l&apos;a publiée. WARAH n&apos;effectue pas de
              contrôle systématique préalable de conformité, de véracité ou de disponibilité réelle des Biens
              annoncés.
            </p>
          </section>

          <section className="legal-section" id="fraude">
            <h2><span className="legal-num">9.</span> Prévention de la fraude</h2>
            <p>
              WARAH se réserve le droit de mettre en œuvre des mesures de vigilance raisonnables afin de prévenir
              toute utilisation frauduleuse de la Plateforme ou de ses services de paiement, notamment en cas de
              comportement inhabituel (volume de transactions anormal, informations contradictoires, signalements
              d&apos;autres Utilisateurs). À ce titre, WARAH peut suspendre temporairement une opération ou un
              Compte, demander des justificatifs complémentaires, et, si la loi l&apos;exige, coopérer avec les
              autorités compétentes togolaises. Ces mesures sont prises avec mesure et ne visent qu&apos;à protéger
              l&apos;intégrité de la Plateforme et de ses Utilisateurs.
            </p>
          </section>

          <section className="legal-section" id="obligations">
            <h2><span className="legal-num">10.</span> Obligations de l&apos;utilisateur</h2>
            <ul>
              <li>Utiliser la Plateforme conformément à sa destination, aux présentes CGU et à la loi togolaise en vigueur ;</li>
              <li>Ne pas fournir d&apos;informations fausses, inexactes ou trompeuses (identité, Bien, paiement, document) ;</li>
              <li>Maintenir à jour ses informations de contact et de réception de paiement ;</li>
              <li>Ne pas tenter de contourner, perturber, surcharger ou compromettre la sécurité, l&apos;intégrité ou le bon fonctionnement de la Plateforme (y compris par extraction automatisée de données — « scraping » — ou ingénierie inverse) ;</li>
              <li>Ne pas utiliser la Plateforme à des fins frauduleuses, notamment en matière de paiement, de blanchiment ou de financement d&apos;activités illicites ;</li>
              <li>Respecter les droits des autres Utilisateurs, notamment leur vie privée et leurs données personnelles ;</li>
              <li>Assumer seul la responsabilité du respect de ses propres obligations légales, fiscales et réglementaires liées à la location de ses Biens — WARAH n&apos;est ni un conseil juridique, ni un conseil fiscal, et les informations affichées sur la Plateforme ne sauraient être interprétées comme telles.</li>
            </ul>
          </section>

          <section className="legal-section" id="propriete">
            <h2><span className="legal-num">11.</span> Propriété intellectuelle</h2>
            <p>
              La marque WARAH, son logo, son identité visuelle, l&apos;architecture et le code de la Plateforme,
              ainsi que sa base de données, sont la propriété exclusive de WARAH SARL ou de ses partenaires, et
              protégés par le droit de la propriété intellectuelle applicable. Toute reproduction, représentation,
              extraction substantielle de la base de données, ou exploitation non autorisée, totale ou partielle,
              est strictement interdite et peut engager la responsabilité de son auteur.
            </p>
          </section>

          <section className="legal-section" id="contenu">
            <h2><span className="legal-num">12.</span> Contenu publié et modération</h2>
            <p>
              Vous restez propriétaire des photos, documents et descriptions que vous déposez (Biens, avis,
              messages). En les publiant, vous accordez à WARAH une licence non exclusive, gratuite et limitée à la
              durée d&apos;utilisation de la Plateforme, lui permettant de les afficher, héberger et traiter dans la
              stricte mesure nécessaire au fonctionnement du service (ex. affichage d&apos;une Annonce, génération
              d&apos;une Quittance). Vous garantissez détenir tous les droits nécessaires sur tout contenu que vous
              publiez et qu&apos;il ne porte atteinte à aucun droit de tiers ni à la loi.
            </p>
            <p>
              WARAH se réserve le droit de retirer, sans préavis, tout contenu manifestement illicite, trompeur ou
              contraire aux présentes CGU, et d&apos;examiner tout signalement reçu à cet effet.
            </p>
          </section>

          <section className="legal-section" id="donnees">
            <h2><span className="legal-num">13.</span> Données personnelles</h2>
            <p>
              Le traitement de vos données personnelles est décrit en détail dans notre{' '}
              <Link href="/confidentialite">Politique de confidentialité</Link>, qui fait partie intégrante des
              présentes CGU et que vous êtes réputé avoir acceptée en créant votre Compte.
            </p>
          </section>

          <section className="legal-section" id="preuve">
            <h2><span className="legal-num">14.</span> Preuve électronique</h2>
            <p>
              Les registres informatisés conservés par WARAH dans ses systèmes (y compris les journaux de
              connexion, les confirmations de paiement et les Quittances générées) sont conservés dans des
              conditions raisonnables de sécurité et sont considérés par les parties comme faisant foi des échanges
              et opérations intervenus entre elles via la Plateforme, sauf erreur manifeste démontrée. Une Quittance
              générée par WARAH constitue un justificatif de paiement, sans préjudice du droit de toute partie
              d&apos;apporter la preuve contraire par tout moyen légalement admissible.
            </p>
          </section>

          <section className="legal-section" id="suspension">
            <h2><span className="legal-num">15.</span> Suspension et résiliation</h2>
            <h3>15.1 Par WARAH</h3>
            <p>
              Nous pouvons suspendre ou résilier un Compte, avec ou sans préavis selon la gravité des faits, en cas
              de violation des présentes CGU, de fraude avérée ou raisonnablement suspectée, d&apos;inactivité
              prolongée, ou de défaut de paiement d&apos;un abonnement dû. En cas de suspension pour fraude
              suspectée, l&apos;Utilisateur en est informé dans les meilleurs délais et peut présenter ses
              explications.
            </p>
            <h3>15.2 Par l&apos;Utilisateur</h3>
            <p>
              Vous pouvez à tout moment demander la clôture de votre Compte en nous contactant, sous réserve des
              obligations de conservation légales mentionnées dans la Politique de confidentialité (notamment les
              pièces justificatives de paiement).
            </p>
            <h3>15.3 Effets de la résiliation</h3>
            <p>
              La résiliation d&apos;un Compte Gestionnaire met fin à sa capacité d&apos;agir sur les Biens qui lui
              étaient mandatés ; les Mandats concernés sont alors réputés révoqués, charge au Propriétaire de
              réorganiser la gestion de ses Biens. La résiliation n&apos;affecte pas l&apos;exécution des Baux en
              cours entre Propriétaires et Locataires, qui demeurent régis par leur contrat respectif en dehors de
              la Plateforme.
            </p>
          </section>

          <section className="legal-section" id="disponibilite">
            <h2><span className="legal-num">16.</span> Disponibilité, maintenance et force majeure</h2>
            <p>
              WARAH met tout en œuvre pour assurer la disponibilité et la fiabilité de la Plateforme, sans pouvoir
              garantir une disponibilité continue ou exempte d&apos;erreurs. Des opérations de maintenance,
              programmées ou non, peuvent entraîner une interruption temporaire d&apos;accès ; WARAH s&apos;efforce,
              dans la mesure du possible, d&apos;en informer les Utilisateurs à l&apos;avance pour les maintenances
              programmées.
            </p>
            <p>
              Aucune des parties ne pourra être tenue responsable d&apos;un manquement à ses obligations résultant
              d&apos;un cas de force majeure, c&apos;est-à-dire tout événement extérieur, imprévisible et
              irrésistible au sens du droit togolais, incluant notamment : coupure prolongée d&apos;électricité ou
              de réseau de télécommunication, panne généralisée d&apos;un opérateur Mobile Money ou du Prestataire
              de paiement, catastrophe naturelle, émeute, décision des pouvoirs publics, ou cyberattaque d&apos;un
              prestataire tiers échappant au contrôle raisonnable de WARAH.
            </p>
          </section>

          <section className="legal-section" id="responsabilite">
            <h2><span className="legal-num">17.</span> Limitation de responsabilité</h2>
            <p>
              Dans les limites permises par la loi togolaise, WARAH ne saurait être tenue responsable des dommages
              indirects résultant de l&apos;utilisation ou de l&apos;impossibilité d&apos;utiliser la Plateforme
              (perte de revenus locatifs, perte de chance, préjudice d&apos;image, etc.). La responsabilité de
              WARAH, lorsqu&apos;elle est retenue au titre de l&apos;exécution des présentes CGU, est strictement
              limitée aux dommages directs, personnels et certains, et ne saurait excéder le montant des frais de
              service effectivement perçus par WARAH sur les transactions concernées au cours des douze (12) mois
              précédant le fait générateur. Cette limitation ne s&apos;applique pas en cas de faute lourde ou
              intentionnelle de WARAH, ni dans les cas où la loi togolaise l&apos;interdit expressément.
            </p>
          </section>

          <section className="legal-section" id="modification">
            <h2><span className="legal-num">18.</span> Modification des CGU</h2>
            <p>
              Nous pouvons modifier les présentes CGU pour refléter une évolution du service, de nos obligations
              légales ou réglementaires, ou de nos pratiques. Toute modification substantielle vous sera signalée
              par email ou notification avant son entrée en vigueur, avec un préavis raisonnable. La poursuite de
              l&apos;utilisation de la Plateforme après notification vaut acceptation des CGU modifiées ; si vous
              refusez ces modifications, vous devez cesser d&apos;utiliser la Plateforme et pouvez demander la
              clôture de votre Compte.
            </p>
          </section>

          <section className="legal-section" id="diverses">
            <h2><span className="legal-num">19.</span> Dispositions diverses</h2>
            <ul>
              <li><strong>Divisibilité</strong> : si une clause des présentes CGU est jugée invalide ou inapplicable par une juridiction compétente, les autres clauses conservent leur pleine validité et effet.</li>
              <li><strong>Non-renonciation</strong> : le fait pour WARAH de ne pas se prévaloir à un moment donné d&apos;une disposition des présentes CGU ne saurait être interprété comme une renonciation à s&apos;en prévaloir ultérieurement.</li>
              <li><strong>Intégralité de l&apos;accord</strong> : les présentes CGU, ainsi que la Politique de confidentialité et, le cas échéant, les conditions tarifaires spécifiques affichées dans l&apos;application, constituent l&apos;intégralité de l&apos;accord entre vous et WARAH concernant votre utilisation de la Plateforme.</li>
              <li><strong>Cession</strong> : vous ne pouvez céder vos droits et obligations au titre des présentes CGU sans l&apos;accord préalable écrit de WARAH. WARAH peut céder les présentes CGU dans le cadre d&apos;une restructuration, fusion ou cession de son activité, sous réserve d&apos;en informer les Utilisateurs.</li>
            </ul>
          </section>

          <section className="legal-section" id="droit">
            <h2><span className="legal-num">20.</span> Droit applicable et règlement des litiges</h2>
            <p>
              Les présentes CGU sont soumises au droit togolais. En cas de différend relatif à leur interprétation
              ou à leur exécution, les parties s&apos;engagent à rechercher de bonne foi une résolution amiable
              dans un délai de trente (30) jours à compter de sa notification écrite. À défaut d&apos;accord amiable
              dans ce délai, le différend relève de la compétence exclusive des juridictions de Lomé, Togo.
            </p>
          </section>

          <section className="legal-section" id="contact">
            <h2><span className="legal-num">21.</span> Contact</h2>
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
