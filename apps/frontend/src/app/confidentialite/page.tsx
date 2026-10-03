import Link from 'next/link';
import PublicNavbar from '@/components/public-navbar';
import PublicFooter from '@/components/public-footer';
import './page.css';

export const metadata = { title: 'Politique de confidentialité — WARAH' };

const SECTIONS = [
  { id: 'responsable', label: '1. Qui est responsable de vos données' },
  { id: 'donnees', label: '2. Données que nous collectons' },
  { id: 'finalites', label: '3. Pourquoi nous les collectons' },
  { id: 'destinataires', label: '4. Qui peut y accéder' },
  { id: 'transferts', label: '5. Hébergement et transferts hors du Togo' },
  { id: 'conservation', label: '6. Durée de conservation' },
  { id: 'securite', label: '7. Sécurité' },
  { id: 'droits', label: '8. Vos droits' },
  { id: 'cookies', label: '9. Cookies et traceurs' },
  { id: 'mineurs', label: '10. Mineurs' },
  { id: 'modifications', label: '11. Modifications' },
  { id: 'contact', label: '12. Contact' },
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
            elles sont partagées, et quels droits vous pouvez exercer</strong> — conformément à la loi togolaise
            n°2019-014 du 29 janvier 2019 relative à la protection des données à caractère personnel.
          </p>

          <section className="legal-section" id="responsable">
            <h2><span className="legal-num">1.</span> Qui est responsable de vos données</h2>
            <p>
              Le responsable du traitement de vos données personnelles est :<br />
              <strong>WARAH SARL</strong>, société de droit togolais, dont le siège social est à Lomé, Togo.<br />
              RCCM : <span className="legal-placeholder">[RCCM à compléter]</span>
            </p>
            <p>
              Pour toute question relative à vos données personnelles, vous pouvez nous contacter à{' '}
              <a href="mailto:warah9896@gmail.com">warah9896@gmail.com</a>.
            </p>
          </section>

          <section className="legal-section" id="donnees">
            <h2><span className="legal-num">2.</span> Données que nous collectons</h2>
            <p>Nous collectons uniquement les données nécessaires au fonctionnement du service :</p>
            <table className="legal-table">
              <thead>
                <tr><th>Catégorie</th><th>Exemples</th></tr>
              </thead>
              <tbody>
                <tr><td>Identité et contact</td><td>Nom, prénom, email, numéro de téléphone, ville, pays de résidence</td></tr>
                <tr><td>Compte</td><td>Mot de passe (jamais stocké en clair — haché via bcrypt), rôle (propriétaire, gestionnaire, locataire)</td></tr>
                <tr><td>Paiements</td><td>Opérateur Mobile Money (T-Money / Flooz), numéro de réception des loyers, historique des paiements et montants — jamais vos codes secrets Mobile Money, qui ne transitent que par PayDunya</td></tr>
                <tr><td>Biens et baux</td><td>Adresse, quartier, ville, loyer, photos et documents du bien (titre, état des lieux…)</td></tr>
                <tr><td>Échanges</td><td>Avis laissés sur un gestionnaire, messages du formulaire de contact</td></tr>
                <tr><td>Techniques</td><td>Journal de connexion, adresse IP au moment d&apos;une action, abonnement aux notifications push</td></tr>
              </tbody>
            </table>
            <p>
              Les documents et photos que vous déposez (titre de propriété, état des lieux, pièces d&apos;identité
              éventuelles) sont stockés de façon chiffrée et ne sont accessibles qu&apos;aux personnes autorisées sur
              le bien concerné (voir section 4).
            </p>
          </section>

          <section className="legal-section" id="finalites">
            <h2><span className="legal-num">3.</span> Pourquoi nous les collectons</h2>
            <ul>
              <li><strong>Exécuter le contrat qui nous lie à vous</strong> : créer et gérer votre compte, afficher vos biens ou votre bail, calculer et encaisser les loyers, générer vos quittances.</li>
              <li><strong>Vous envoyer les notifications nécessaires au service</strong> : rappel d&apos;échéance, confirmation de paiement, alerte d&apos;impayé, mandat reçu.</li>
              <li><strong>Respecter nos obligations légales et comptables</strong> : conservation des pièces justificatives de paiement, lutte contre la fraude.</li>
              <li><strong>Avec votre consentement</strong> : notifications push sur votre appareil, communications non essentielles.</li>
              <li><strong>Notre intérêt légitime</strong> : sécurité de la plateforme (détection de connexions suspectes, journal d&apos;audit), amélioration du service.</li>
            </ul>
          </section>

          <section className="legal-section" id="destinataires">
            <h2><span className="legal-num">4.</span> Qui peut y accéder</h2>
            <p>Vos données ne sont jamais vendues. Elles sont accessibles :</p>
            <ul>
              <li>À vous-même, et aux autres parties strictement nécessaires à une relation que vous avez créée (ex. votre locataire voit votre nom pour le paiement de son loyer ; le gestionnaire que vous mandatez voit les biens qu&apos;il gère) ;</li>
              <li>À nos équipes, dans la stricte mesure nécessaire au support ou à la maintenance ;</li>
              <li>Aux prestataires techniques ci-dessous, chacun agissant pour notre compte et uniquement dans ce cadre :</li>
            </ul>
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
          </section>

          <section className="legal-section" id="transferts">
            <h2><span className="legal-num">5.</span> Hébergement et transferts hors du Togo</h2>
            <p>
              Certains de nos prestataires hébergent leurs serveurs hors du Togo, notamment dans l&apos;Union
              européenne. C&apos;est le cas aujourd&apos;hui de notre base de données (Union européenne) et de notre
              serveur applicatif (Union européenne). Ces transferts sont nécessaires au fonctionnement technique du
              service et sont encadrés contractuellement par des clauses de protection des données avec chaque
              prestataire. Vos données de paiement Mobile Money, elles, restent traitées par PayDunya en Afrique de
              l&apos;Ouest.
            </p>
          </section>

          <section className="legal-section" id="conservation">
            <h2><span className="legal-num">6.</span> Durée de conservation</h2>
            <ul>
              <li>Données de compte : pendant toute la durée d&apos;utilisation de votre compte, puis archivées ou supprimées après une période d&apos;inactivité prolongée (avec préavis par email).</li>
              <li>Historique des paiements et quittances : conservé plus longtemps, conformément aux durées de conservation comptables et fiscales applicables au Togo.</li>
              <li>Journal de sécurité (audit) : conservé pour une durée limitée nécessaire à la détection d&apos;incidents.</li>
              <li>Sur demande de suppression de compte, vos données sont anonymisées ou effacées, hors cas où une conservation plus longue est légalement requise (ex. pièces justificatives de paiement).</li>
            </ul>
          </section>

          <section className="legal-section" id="securite">
            <h2><span className="legal-num">7.</span> Sécurité</h2>
            <ul>
              <li>Mots de passe hachés (bcrypt), jamais stockés ni consultables en clair ;</li>
              <li>Connexions chiffrées (HTTPS) sur l&apos;ensemble de la plateforme ;</li>
              <li>Accès aux données d&apos;un bien limité aux personnes ayant un rôle légitime sur ce bien (propriétaire, gestionnaire mandaté, locataire concerné) ;</li>
              <li>Blocage temporaire d&apos;un compte après plusieurs échecs de connexion consécutifs ;</li>
              <li>Journal d&apos;audit des actions sensibles, consultable par l&apos;administration de la plateforme.</li>
            </ul>
            <div className="legal-note">
              Aucun système n&apos;est infaillible à 100&nbsp;%. En cas d&apos;incident de sécurité affectant vos
              données, nous vous en informerons dans les meilleurs délais conformément à la loi.
            </div>
          </section>

          <section className="legal-section" id="droits">
            <h2><span className="legal-num">8.</span> Vos droits</h2>
            <p>Conformément à la loi n°2019-014, vous disposez des droits suivants sur vos données :</p>
            <ul>
              <li><strong>Droit d&apos;accès</strong> : obtenir une copie des données que nous détenons sur vous ;</li>
              <li><strong>Droit de rectification</strong> : corriger des informations inexactes (directement depuis votre profil pour la plupart) ;</li>
              <li><strong>Droit à l&apos;effacement</strong> : demander la suppression de votre compte et de vos données, dans les limites des obligations légales de conservation ;</li>
              <li><strong>Droit d&apos;opposition</strong> : vous opposer à certains traitements fondés sur notre intérêt légitime ;</li>
              <li><strong>Droit de retrait du consentement</strong> : pour les traitements qui en dépendent (ex. notifications push), à tout moment.</li>
            </ul>
            <p>
              Pour exercer un de ces droits, écrivez à{' '}
              <a href="mailto:warah9896@gmail.com">warah9896@gmail.com</a>. Vous disposez également du droit
              d&apos;introduire une réclamation auprès de l&apos;Instance Nationale de Protection des Données à
              Caractère Personnel (INPDCP) du Togo.
            </p>
          </section>

          <section className="legal-section" id="cookies">
            <h2><span className="legal-num">9.</span> Cookies et traceurs</h2>
            <p>
              WARAH n&apos;utilise pas de cookies publicitaires ni de traceurs tiers à des fins commerciales. La
              plateforme conserve uniquement, dans le stockage local de votre navigateur, les informations
              strictement nécessaires à votre connexion (jeton de session) et à votre confort d&apos;utilisation
              (préférences d&apos;affichage).
            </p>
          </section>

          <section className="legal-section" id="mineurs">
            <h2><span className="legal-num">10.</span> Mineurs</h2>
            <p>
              WARAH est réservée aux personnes majeures (18 ans et plus), en raison notamment des transactions
              financières qu&apos;elle permet. Nous ne collectons pas sciemment de données concernant des mineurs.
            </p>
          </section>

          <section className="legal-section" id="modifications">
            <h2><span className="legal-num">11.</span> Modifications</h2>
            <p>
              Nous pouvons modifier cette politique pour refléter une évolution du service ou de la réglementation.
              Toute modification substantielle vous sera signalée par email ou notification avant son entrée en
              vigueur. La date de dernière mise à jour figure en haut de cette page.
            </p>
          </section>

          <section className="legal-section" id="contact">
            <h2><span className="legal-num">12.</span> Contact</h2>
            <p>
              Pour toute question sur cette politique ou sur vos données personnelles :<br />
              Email : <a href="mailto:warah9896@gmail.com">warah9896@gmail.com</a><br />
              Téléphone : +228 73 00 07 73 / +228 99 32 73 12
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
