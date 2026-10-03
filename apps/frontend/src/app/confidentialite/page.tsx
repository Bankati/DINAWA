import Link from 'next/link';
import PublicNavbar from '@/components/public-navbar';
import PublicFooter from '@/components/public-footer';
import './page.css';

export const metadata = { title: 'Politique de confidentialité — WARAH' };

const SECTIONS = [
  { id: 'preambule', label: '1. Préambule et champ d’application' },
  { id: 'responsable', label: '2. Responsable du traitement' },
  { id: 'principes', label: '3. Principes directeurs' },
  { id: 'donnees', label: '4. Données que nous collectons' },
  { id: 'finalites', label: '5. Finalités et bases légales' },
  { id: 'destinataires', label: '6. Destinataires des données' },
  { id: 'soustraitants', label: '7. Sous-traitants et prestataires' },
  { id: 'transferts', label: '8. Transferts hors du Togo' },
  { id: 'conservation', label: '9. Durée de conservation' },
  { id: 'securite', label: '10. Sécurité et gestion des incidents' },
  { id: 'droits', label: '11. Vos droits' },
  { id: 'automatise', label: '12. Décisions automatisées' },
  { id: 'cookies', label: '13. Cookies et traceurs' },
  { id: 'mineurs', label: '14. Mineurs' },
  { id: 'modifications', label: '15. Modifications' },
  { id: 'contact', label: '16. Réclamation et contact' },
];

export default function ConfidentialitePage() {
  return (
    <div className="page legal-page">
      <PublicNavbar />

      <section className="legal-hero">
        <span className="legal-eyebrow">Données personnelles</span>
        <h1 className="legal-title">Politique de confidentialité</h1>
        <p className="legal-updated">Dernière mise à jour : 3 octobre 2026</p>
      </section>

      <div className="legal-wrap">
        <nav className="legal-toc" aria-label="Sommaire">
          <span className="legal-toc-title">Sommaire</span>
          {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`}>{s.label}</a>)}
        </nav>

        <div className="legal-body">
          <p className="legal-intro">
            WARAH est une plateforme togolaise de gestion locative qui met en relation propriétaires, gestionnaires
            immobiliers et locataires, et qui permet le suivi et le paiement des loyers en ligne. La présente
            politique explique <strong>quelles données nous collectons, pourquoi, pendant combien de temps, avec qui
            elles sont partagées, et quels droits vous pouvez exercer</strong>{' '}— conformément à la loi togolaise
            n°2019-014 du 29 janvier 2019 relative à la protection des données à caractère personnel, sous le
            contrôle de l&apos;Instance Nationale de Protection des Données à Caractère Personnel (INPDCP).
          </p>

          <section className="legal-section" id="preambule">
            <h2><span className="legal-num">1.</span> Préambule et champ d&apos;application</h2>
            <p>
              Cette politique s&apos;applique à toute personne qui utilise la Plateforme WARAH (Propriétaire,
              Gestionnaire, Locataire) ainsi qu&apos;à tout visiteur des pages publiques (annonces, formulaire de
              contact). Elle fait partie intégrante de nos{' '}
              <Link href="/cgu">Conditions Générales d&apos;Utilisation</Link>, que vous acceptez conjointement en
              créant un Compte.
            </p>
          </section>

          <section className="legal-section" id="responsable">
            <h2><span className="legal-num">2.</span> Responsable du traitement</h2>
            <p>
              Le responsable du traitement de vos données personnelles est :<br />
              <strong>WARAH SARL</strong>, société de droit togolais, dont le siège social est à Lomé, Togo.<br />
              RCCM : TG-LFW-01-2026-B13-02630
            </p>
            <p>
              Pour toute question relative à vos données personnelles, vous pouvez nous contacter à{' '}
              <a href="mailto:warah9896@gmail.com">warah9896@gmail.com</a>.
            </p>
          </section>

          <section className="legal-section" id="principes">
            <h2><span className="legal-num">3.</span> Principes directeurs</h2>
            <p>Notre traitement de vos données repose sur les principes suivants :</p>
            <ul>
              <li><strong>Minimisation</strong> : nous ne collectons que les données strictement nécessaires au fonctionnement du service ;</li>
              <li><strong>Finalité déterminée</strong> : chaque donnée est collectée pour un objectif précis, jamais réutilisée à une fin incompatible sans vous en informer ;</li>
              <li><strong>Exactitude</strong> : nous vous donnons les moyens de corriger vos données directement depuis votre profil ;</li>
              <li><strong>Limitation de la conservation</strong> : vos données ne sont pas gardées indéfiniment (voir section 9) ;</li>
              <li><strong>Transparence</strong> : la présente politique est rédigée pour être compréhensible, sans jargon inutile ;</li>
              <li><strong>Non-commercialisation</strong> : vos données personnelles ne sont jamais vendues à des tiers à des fins commerciales ou publicitaires.</li>
            </ul>
          </section>

          <section className="legal-section" id="donnees">
            <h2><span className="legal-num">4.</span> Données que nous collectons</h2>
            <table className="legal-table">
              <thead>
                <tr><th>Catégorie</th><th>Exemples</th></tr>
              </thead>
              <tbody>
                <tr><td>Identité et contact</td><td>Nom, prénom, email, numéro de téléphone, ville, pays de résidence</td></tr>
                <tr><td>Compte</td><td>Mot de passe (jamais stocké en clair — haché via bcrypt), rôle (propriétaire, gestionnaire, locataire)</td></tr>
                <tr><td>Paiements</td><td>Opérateur Mobile Money (T-Money / Flooz), numéro de réception des loyers, historique des paiements et montants — jamais vos codes secrets Mobile Money, qui ne transitent que par notre Prestataire de paiement</td></tr>
                <tr><td>Biens et baux</td><td>Adresse, quartier, ville, loyer, photos et documents du bien (titre, état des lieux…)</td></tr>
                <tr><td>Échanges</td><td>Avis laissés sur un gestionnaire, messages du formulaire de contact</td></tr>
                <tr><td>Techniques</td><td>Journal de connexion, adresse IP au moment d&apos;une action, type d&apos;appareil et navigateur, abonnement aux notifications push</td></tr>
              </tbody>
            </table>
            <p>
              Les documents et photos que vous déposez (titre de propriété, état des lieux, pièces d&apos;identité
              éventuelles) sont stockés de façon chiffrée et ne sont accessibles qu&apos;aux personnes autorisées sur
              le bien concerné (voir section 6). Nous ne collectons volontairement aucune donnée dite sensible
              (origine, santé, opinions religieuses ou politiques, orientation sexuelle) et vous demandons de ne
              jamais nous en communiquer, y compris dans un champ de texte libre (message, note).
            </p>
            <h3>4.1 Comment nous collectons ces données</h3>
            <ul>
              <li><strong>Directement de vous</strong> : lors de votre inscription, de la déclaration d&apos;un bien, d&apos;un paiement, ou de tout échange avec notre équipe ;</li>
              <li><strong>Automatiquement</strong> : lors de votre navigation sur la Plateforme (journal de connexion, type d&apos;appareil), nécessaire au bon fonctionnement technique et à la sécurité du service ;</li>
              <li><strong>Par un tiers autorisé</strong> : notamment notre Prestataire de paiement, qui nous confirme la réussite ou l&apos;échec d&apos;une opération Mobile Money sans jamais nous transmettre votre code secret.</li>
            </ul>
          </section>

          <section className="legal-section" id="finalites">
            <h2><span className="legal-num">5.</span> Finalités et bases légales</h2>
            <p>
              Chaque traitement de vos données repose sur l&apos;une des bases légales reconnues par la loi
              n°2019-014 : l&apos;exécution du contrat qui nous lie (les CGU que vous avez acceptées), le respect
              d&apos;une obligation légale, votre consentement explicite, ou notre intérêt légitime — ce dernier
              n&apos;étant retenu que lorsqu&apos;il ne porte pas une atteinte disproportionnée à vos droits et
              libertés, et toujours mis en balance avec votre droit d&apos;opposition (voir section 11).
            </p>
            <table className="legal-table">
              <thead><tr><th>Finalité</th><th>Base légale</th></tr></thead>
              <tbody>
                <tr><td>Créer et gérer votre Compte, afficher vos Biens ou votre Bail</td><td>Exécution du contrat (CGU)</td></tr>
                <tr><td>Calculer, encaisser et reverser les loyers, générer les Quittances</td><td>Exécution du contrat</td></tr>
                <tr><td>Envoyer les notifications nécessaires au service (rappel, confirmation, alerte)</td><td>Exécution du contrat</td></tr>
                <tr><td>Envoyer des notifications push non essentielles</td><td>Consentement (révocable à tout moment)</td></tr>
                <tr><td>Conserver les pièces justificatives de paiement</td><td>Obligation légale et comptable</td></tr>
                <tr><td>Détecter et prévenir la fraude, sécuriser la Plateforme (journal d&apos;audit)</td><td>Intérêt légitime</td></tr>
                <tr><td>Améliorer le service (statistiques d&apos;usage agrégées)</td><td>Intérêt légitime</td></tr>
              </tbody>
            </table>
          </section>

          <section className="legal-section" id="destinataires">
            <h2><span className="legal-num">6.</span> Destinataires des données</h2>
            <p>Vos données ne sont jamais vendues. Elles sont accessibles :</p>
            <ul>
              <li>À vous-même, et aux autres parties strictement nécessaires à une relation que vous avez créée (ex. votre locataire voit votre nom pour le paiement de son loyer ; le gestionnaire que vous mandatez voit les biens qu&apos;il gère) ;</li>
              <li>À nos équipes, dans la stricte mesure nécessaire au support, à la maintenance ou à la lutte contre la fraude ;</li>
              <li>Aux autorités compétentes togolaises, sur réquisition légale ou judiciaire régulière ;</li>
              <li>À un repreneur éventuel de l&apos;activité de WARAH, dans le cadre d&apos;une fusion, acquisition ou cession, sous réserve que ce dernier respecte des garanties de confidentialité équivalentes et que vous en soyez informé ;</li>
              <li>À nos prestataires techniques, détaillés à la section suivante, chacun agissant pour notre compte et uniquement dans ce cadre.</li>
            </ul>
          </section>

          <section className="legal-section" id="soustraitants">
            <h2><span className="legal-num">7.</span> Sous-traitants et prestataires techniques</h2>
            <table className="legal-table">
              <thead><tr><th>Prestataire</th><th>Rôle</th></tr></thead>
              <tbody>
                <tr><td>Supabase</td><td>Hébergement de la base de données et authentification</td></tr>
                <tr><td>Railway</td><td>Hébergement du serveur applicatif (backend)</td></tr>
                <tr><td>Vercel</td><td>Hébergement de l&apos;interface web (frontend)</td></tr>
                <tr><td>PayDunya</td><td>Passerelle de paiement Mobile Money (collecte des loyers et reversements)</td></tr>
                <tr><td>Resend</td><td>Envoi des emails transactionnels (confirmations, quittances, réinitialisation de mot de passe)</td></tr>
              </tbody>
            </table>
            <p>
              Chacun de ces prestataires n&apos;accède qu&apos;aux données strictement nécessaires à l&apos;exécution
              de sa prestation technique, dans le cadre d&apos;un contrat qui l&apos;engage à ne pas les utiliser à
              d&apos;autres fins ni les divulguer.
            </p>
          </section>

          <section className="legal-section" id="transferts">
            <h2><span className="legal-num">8.</span> Transferts hors du Togo</h2>
            <p>
              Certains de nos prestataires hébergent leurs serveurs hors du Togo, notamment dans l&apos;Union
              européenne. C&apos;est le cas aujourd&apos;hui de notre base de données et de notre serveur
              applicatif. Ces transferts sont nécessaires au fonctionnement technique du service et sont encadrés
              contractuellement par des clauses de protection des données avec chaque prestataire, garantissant un
              niveau de protection adéquat de vos informations. Vos données de paiement Mobile Money, elles, restent
              traitées par notre Prestataire de paiement en Afrique de l&apos;Ouest.
            </p>
          </section>

          <section className="legal-section" id="conservation">
            <h2><span className="legal-num">9.</span> Durée de conservation</h2>
            <table className="legal-table">
              <thead><tr><th>Donnée</th><th>Durée</th></tr></thead>
              <tbody>
                <tr><td>Compte actif (profil, biens, baux)</td><td>Toute la durée d&apos;utilisation du Compte</td></tr>
                <tr><td>Compte inactif</td><td>Archivage ou suppression après une période d&apos;inactivité prolongée, avec préavis par email</td></tr>
                <tr><td>Historique des paiements et Quittances</td><td>Conservé conformément aux durées de conservation comptables et fiscales applicables au Togo</td></tr>
                <tr><td>Journal d&apos;audit / sécurité</td><td>Durée limitée nécessaire à la détection et à l&apos;investigation d&apos;incidents</td></tr>
                <tr><td>Données après clôture volontaire du Compte</td><td>Anonymisées ou supprimées, hors cas de conservation légalement requise</td></tr>
              </tbody>
            </table>
          </section>

          <section className="legal-section" id="securite">
            <h2><span className="legal-num">10.</span> Sécurité et gestion des incidents</h2>
            <ul>
              <li>Mots de passe hachés (bcrypt), jamais stockés ni consultables en clair ;</li>
              <li>Connexions chiffrées (HTTPS) sur l&apos;ensemble de la Plateforme, données chiffrées au repos chez nos hébergeurs ;</li>
              <li>Accès aux données d&apos;un bien limité aux personnes ayant un rôle légitime sur ce bien (propriétaire, gestionnaire mandaté, locataire concerné) ;</li>
              <li>Blocage temporaire d&apos;un compte après plusieurs échecs de connexion consécutifs ;</li>
              <li>Journal d&apos;audit des actions sensibles, consultable par l&apos;administration de la plateforme ;</li>
              <li>Accès interne limité au principe du moindre privilège : seules les personnes de notre équipe dont la mission l&apos;exige peuvent consulter des données au-delà de ce qui est strictement nécessaire au support demandé ;</li>
              <li>Revue régulière des accès et des dépendances techniques (prestataires, bibliothèques) utilisées par la Plateforme.</li>
            </ul>
            <h3>10.1 Gestion des incidents</h3>
            <p>
              Aucun système n&apos;est infaillible à 100&nbsp;%. Si une violation de données venait à se produire
              (accès non autorisé, perte, divulgation accidentelle), nous nous engageons à : (i) qualifier
              l&apos;incident et en limiter l&apos;impact dans les meilleurs délais ; (ii) en informer
              l&apos;INPDCP, conformément à la loi, lorsque l&apos;incident est susceptible d&apos;engendrer un
              risque pour les droits et libertés des personnes concernées ; (iii) informer directement les personnes
              concernées lorsque le risque est élevé pour elles, en leur indiquant la nature de l&apos;incident et
              les mesures prises.
            </p>
          </section>

          <section className="legal-section" id="droits">
            <h2><span className="legal-num">11.</span> Vos droits</h2>
            <p>Conformément à la loi n°2019-014, vous disposez des droits suivants sur vos données :</p>
            <ul>
              <li><strong>Droit d&apos;accès</strong> : obtenir une copie des données que nous détenons sur vous, ainsi que des informations sur leur traitement (finalités, destinataires, durée de conservation) ;</li>
              <li><strong>Droit de rectification</strong> : corriger des informations inexactes ou incomplètes (directement depuis votre profil pour la plupart d&apos;entre elles) ;</li>
              <li><strong>Droit à l&apos;effacement</strong> : demander la suppression de votre compte et de vos données, dans les limites des obligations légales de conservation (notamment comptables) ;</li>
              <li><strong>Droit à la limitation du traitement</strong> : demander la suspension temporaire d&apos;un traitement, par exemple le temps que nous vérifiions l&apos;exactitude d&apos;une donnée que vous contestez ;</li>
              <li><strong>Droit à la portabilité</strong> : recevoir les données que vous nous avez fournies dans un format structuré et couramment utilisé, ou les faire transmettre à un autre service lorsque cela est techniquement possible ;</li>
              <li><strong>Droit d&apos;opposition</strong> : vous opposer, pour des raisons tenant à votre situation particulière, à un traitement fondé sur notre intérêt légitime ;</li>
              <li><strong>Droit de retrait du consentement</strong> : pour les traitements qui en dépendent (ex. notifications push), à tout moment et sans effet rétroactif.</li>
            </ul>
            <h3>11.1 Comment exercer ces droits</h3>
            <p>
              Écrivez-nous à <a href="mailto:warah9896@gmail.com">warah9896@gmail.com</a> en précisant le droit que
              vous souhaitez exercer et, si nécessaire, les éléments permettant de vérifier votre identité (nous ne
              répondrons à une demande relative à votre compte qu&apos;après nous être assurés qu&apos;elle émane
              bien de vous, afin de protéger vos propres données contre une usurpation). L&apos;exercice de ces
              droits est gratuit. Nous nous efforçons de répondre dans un délai raisonnable n&apos;excédant pas un
              (1) mois ; ce délai peut être prolongé de deux mois supplémentaires pour les demandes complexes, auquel
              cas nous vous en informons. En cas de demandes manifestement infondées ou excessives, notamment par
              leur caractère répétitif, nous nous réservons le droit de facturer des frais raisonnables ou de
              refuser d&apos;y donner suite, dans les conditions prévues par la loi.
            </p>
            <h3>11.2 Réclamation auprès de l&apos;autorité de contrôle</h3>
            <p>
              Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous disposez du
              droit d&apos;introduire une réclamation auprès de l&apos;Instance Nationale de Protection des Données
              à Caractère Personnel (INPDCP) du Togo, autorité compétente pour contrôler l&apos;application de la
              loi n°2019-014.
            </p>
          </section>

          <section className="legal-section" id="automatise">
            <h2><span className="legal-num">12.</span> Décisions automatisées</h2>
            <p>
              WARAH ne prend aucune décision produisant des effets juridiques vous concernant sur le seul fondement
              d&apos;un traitement automatisé ou d&apos;un profilage (ex. notation automatique de fiabilité). Les
              seuls traitements automatisés mis en œuvre (calcul d&apos;échéance, génération de quittance, détection
              technique d&apos;anomalie de paiement) sont des traitements d&apos;exécution du service, sans
              conséquence juridique autonome sur votre Compte sans intervention humaine en cas de contestation.
            </p>
          </section>

          <section className="legal-section" id="cookies">
            <h2><span className="legal-num">13.</span> Cookies et traceurs</h2>
            <p>
              WARAH n&apos;utilise pas de cookies publicitaires ni de traceurs tiers à des fins commerciales. La
              plateforme conserve uniquement, dans le stockage local de votre navigateur, les informations
              strictement nécessaires à votre connexion (jeton de session) et à votre confort d&apos;utilisation
              (préférences d&apos;affichage). Ces informations restent sur votre appareil et ne sont jamais
              transmises à des tiers à des fins de suivi publicitaire.
            </p>
          </section>

          <section className="legal-section" id="mineurs">
            <h2><span className="legal-num">14.</span> Mineurs</h2>
            <p>
              WARAH est réservée aux personnes majeures (18 ans et plus), en raison notamment des transactions
              financières qu&apos;elle permet. Nous ne collectons pas sciemment de données concernant des mineurs ;
              si nous venions à en identifier, nous procéderions à leur suppression dans les meilleurs délais.
            </p>
          </section>

          <section className="legal-section" id="modifications">
            <h2><span className="legal-num">15.</span> Modifications</h2>
            <p>
              Nous pouvons modifier cette politique pour refléter une évolution du service, de nos prestataires ou
              de la réglementation. Toute modification substantielle vous sera signalée par email ou notification
              avant son entrée en vigueur. La date de dernière mise à jour figure en haut de cette page.
            </p>
          </section>

          <section className="legal-section" id="contact">
            <h2><span className="legal-num">16.</span> Réclamation et contact</h2>
            <p>
              Pour toute question sur cette politique ou sur vos données personnelles :<br />
              Email : <a href="mailto:warah9896@gmail.com">warah9896@gmail.com</a><br />
              Téléphone : +228 73 00 07 73 / +228 99 32 73 12
            </p>
            <p>
              Si vous estimez que vos droits ne sont pas respectés après nous avoir contactés, vous pouvez saisir
              l&apos;Instance Nationale de Protection des Données à Caractère Personnel (INPDCP) du Togo.
            </p>
            <p>
              Voir aussi nos <Link href="/cgu">Conditions Générales d&apos;Utilisation</Link>.
            </p>
          </section>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
