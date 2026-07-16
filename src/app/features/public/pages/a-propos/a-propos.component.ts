import {
  Component, OnInit, OnDestroy,
  inject, signal, PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicFooterComponent } from '../../../../shared/components/public-footer/public-footer.component';

@Component({
  selector: 'app-a-propos',
  standalone: true,
  imports: [RouterLink, PublicFooterComponent],
  template: `
<div class="page">

  <!-- ── NAVBAR ── -->
  <nav class="nav" [class.nav-solid]="navScrolled()">
    <div class="nav-inner">
      <a routerLink="/" class="nav-logo"><img src="/assets/WARAH-logo.png" alt="WARAH" class="logo-img"></a>
      <ul class="nav-links">
        <li><a routerLink="/" class="nl" data-text="Accueil">Accueil</a></li>
        <li><a routerLink="/annonces" class="nl" data-text="Annonces">Annonces</a></li>
        <li><a routerLink="/a-propos" class="nl nl-active" data-text="À propos">À propos</a></li>
        <li><a href="/#tarifs" class="nl" data-text="Tarifs">Tarifs</a></li>
      </ul>
      <div class="nav-cta">
        <a routerLink="/auth/login" class="btn-ghost">Connexion</a>
        <a routerLink="/auth/register" class="btn-nav-primary">S'inscrire</a>
      </div>
      <button class="hamburger" (click)="menuOpen.set(!menuOpen())" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>
    @if (menuOpen()) {
      <div class="m-menu" (click)="menuOpen.set(false)">
        <a routerLink="/" class="mm-link">Accueil</a>
        <a routerLink="/annonces" class="mm-link">Annonces</a>
        <a routerLink="/a-propos" class="mm-link">À propos</a>
        <a href="/#tarifs" class="mm-link">Tarifs</a>
        <a routerLink="/auth/login" class="mm-link">Connexion</a>
        <a routerLink="/auth/register" class="mm-cta">S'inscrire gratuitement</a>
      </div>
    }
  </nav>

  <!-- ── HERO ── -->
  <section class="hero">
    <img src="/assets/handsome-young-african-man-holding-mobile-phone-gesturing-while-standing-against-grey-wall.jpg.jpeg"
         alt="WARAH — gestion immobilière digitale"
         class="hero-img">
    <div class="hero-bg"></div>
    <div class="hero-inner">
      <span class="hero-eyebrow">Qui sommes-nous</span>
      <h1 class="hero-title">La gestion immobilière<br>réinventée pour l'Afrique</h1>
      <p class="hero-sub">WARAH simplifie la relation entre propriétaires, gestionnaires immobiliers et locataires grâce à une plateforme digitale pensée pour le contexte togolais et africain.</p>
      <div class="hero-stats">
        <div class="h-stat"><span class="h-stat-n">2 024</span><span class="h-stat-l">Année de création</span></div>
        <div class="h-stat-sep"></div>
        <div class="h-stat"><span class="h-stat-n">Lomé</span><span class="h-stat-l">Siège social</span></div>
        <div class="h-stat-sep"></div>
        <div class="h-stat"><span class="h-stat-n">Afrique</span><span class="h-stat-l">Vision continentale</span></div>
      </div>
    </div>
  </section>

  <!-- ── PROFILS ── -->
  <section class="profils-section">
    <div class="sec-wrap">
      <div class="profils-eyebrow">
        <span class="sec-chip">› en un clic</span>
        <h2 class="sec-title-sm">JE SUIS…</h2>
      </div>
      <div class="profils-grid">
        <a routerLink="/auth/register" class="profil-card">
          <div class="pc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
          <h3 class="pc-title">Propriétaire</h3>
          <ul class="pc-list"><li>Gérer mes biens</li><li>Suivre mes loyers</li><li>Publier des annonces</li><li>Télécharger mes quittances</li></ul>
          <span class="pc-cta">J'accède →</span>
        </a>
        <a routerLink="/auth/register" class="profil-card profil-card-accent">
          <div class="pc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg></div>
          <h3 class="pc-title">Gestionnaire</h3>
          <ul class="pc-list"><li>Portefeuille de mandats</li><li>Rapports automatisés</li><li>Profil vérifié WARAH</li><li>Visibilité dans l'annuaire</li></ul>
          <span class="pc-cta">J'accède →</span>
        </a>
        <a routerLink="/auth/register" class="profil-card">
          <div class="pc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
          <h3 class="pc-title">Locataire</h3>
          <ul class="pc-list"><li>Payer via T-Money / Flooz</li><li>Suivre mes quittances</li><li>Contacter mon propriétaire</li><li>Historique des paiements</li></ul>
          <span class="pc-cta">J'accède →</span>
        </a>
      </div>
    </div>
  </section>

  <!-- ── HISTOIRE ── -->
  <section class="histoire-section">
    <div class="sec-wrap">
      <div class="hist-grid">
        <div class="hist-text">
          <span class="sec-chip">› notre histoire</span>
          <h2 class="hist-title">WARAH EST NÉ<br>D'UN CONSTAT SIMPLE</h2>
          <p class="hist-p">Le marché locatif immobilier au Togo souffre d'un déficit structurel d'outils numériques adaptés. Aujourd'hui, pour un propriétaire qui réside au Togo, en France, au Canada, aux USA ou en Chine, la gestion quotidienne de ses biens repose encore très largement sur des carnets, des appels téléphoniques et des quittances manuscrites. Les propriétaires et les gestionnaires immobiliers perdent du temps, les locataires manquent de visibilité et les impayés restent difficiles à suivre.</p>
          <p class="hist-p">Pour le propriétaire de la diaspora, l'absence d'outil de suivi à distance crée une anxiété permanente sur un patrimoine qu'il ne peut pas surveiller physiquement. Pour le propriétaire résidant au Togo, la multiplication des biens rend rapidement la gestion manuelle ingérable.</p>
          <p class="hist-p">C'est pourquoi nous avons conçu WARAH pour digitaliser ce quotidien. Sa promesse&nbsp;: transformer une activité locative artisanale et anxiogène en une gestion professionnelle, transparente et sereine, en couvrant l'intégralité du cycle de vie d'un bien immobilier&nbsp;— trouver un locataire, formaliser le bail, collecter les loyers via mobile money, générer automatiquement les quittances, alerter les cas d'impayés et disposer d'un tableau de bord centralisé&nbsp;— le tout pensé pour le contexte africain.</p>
          <a routerLink="/auth/register" class="hist-btn">Rejoindre WARAH</a>
        </div>
        <div class="hist-stats">
          <!-- Carte monde — diaspora internationale -->
          <div class="hs-world-wrap">
            <img src="/assets/c6b2b9b4149494be6317341b2e668d13.jpg.jpeg" alt="Présence mondiale WARAH" class="hs-world-img">
            <div class="hs-world-legend">
              <span class="hs-world-dot hs-wd-active"></span>Lomé — siège
              <span class="hs-world-dot hs-wd-diaspora" style="margin-left:10px"></span>Diaspora connectée
            </div>
          </div>
          <div class="hs-card"><span class="hs-n">100%</span><span class="hs-l">Paiements mobile money</span><p class="hs-p">T-Money & Flooz intégrés nativement</p></div>
          <div class="hs-card hs-card-dark"><span class="hs-n">3 rôles</span><span class="hs-l">Une plateforme unifiée</span><p class="hs-p">Propriétaire, gestionnaire immobilier et locataire</p></div>
          <div class="hs-card"><span class="hs-n">0 papier</span><span class="hs-l">Tout digitalisé</span><p class="hs-p">Quittances, baux et rapports en PDF auto</p></div>
          <div class="hs-card hs-card-gold"><span class="hs-n">Togo → Afrique</span><span class="hs-l">Vision continentale</span><p class="hs-p">Lancé à Lomé, vocation africaine</p></div>
        </div>
      </div>
    </div>
  </section>

  <!-- ── CARTE AFRIQUE (ECharts) ── -->
  <section class="carte-section">
    <div class="carte-inner">
      <div class="carte-text">
        <span class="sec-chip sec-chip-light">› zoom sur</span>
        <h2 class="carte-title">NOTRE PRÉSENCE<br>EN AFRIQUE</h2>
        <p class="carte-sub">Lancée depuis Lomé, WARAH ambitionne de connecter les marchés immobiliers du continent. Nos routes digitales relient déjà les grandes métropoles africaines.</p>
        <div class="carte-villes">
          <div class="cv-item"><span class="cv-dot cv-active"></span><strong>Lomé</strong> — Siège &amp; marché pilote</div>
          <div class="cv-item"><span class="cv-dot"></span>Lagos — Déploiement en cours</div>
          <div class="cv-item"><span class="cv-dot"></span>Accra — Déploiement en cours</div>
          <div class="cv-item"><span class="cv-dot"></span>Abidjan — Partenariats actifs</div>
          <div class="cv-item"><span class="cv-dot cv-soon"></span>Dakar · Nairobi · Kinshasa — À venir</div>
        </div>
      </div>
      <div class="carte-map">
        <div class="africa-map-wrap">
          <img src="/assets/280752-P61K2Q-532.jpg" alt="Carte de l'Afrique — présence WARAH" class="africa-img">
          <!-- Overlay SVG : routes animées entre les villes -->
          <svg class="africa-routes" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="rGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="0.8" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <!-- Lignes guide (statiques tiretées) -->
            <g opacity="0.25" fill="none" stroke-width="0.5" stroke-linecap="round">
              <path stroke="#C9982E" stroke-dasharray="2 4" d="M14,37 C19,43 24,49 28,53"/>
              <path stroke="#C9982E" stroke-dasharray="2 4" d="M28,53 C30,54 32,54 34,54"/>
              <path stroke="#C9982E" stroke-dasharray="2 4" d="M34,54 C36,54 38,53 39,52"/>
              <path stroke="#ff9a3c" stroke-dasharray="2 4" d="M34,54 C40,59 46,64 51,67"/>
              <path stroke="#64b5f6" stroke-dasharray="2 4" d="M51,67 C57,63 62,61 65,60"/>
              <path stroke="#64b5f6" stroke-dasharray="2 4" d="M65,60 C62,72 59,79 56,85"/>
              <path stroke="#81c784" stroke-dasharray="2 4" d="M65,60 C66,52 67,46 68,44"/>
              <path stroke="#81c784" stroke-dasharray="2 4" d="M68,44 C68,32 67,22 66,14"/>
              <path stroke="#81c784" stroke-dasharray="2 4" d="M26,13 C40,12 55,12 66,14"/>
            </g>
            <!-- Paquets animés (couloir Ouest : Dakar → Lagos) -->
            <g filter="url(#rGlow)" fill="none" stroke="#C9982E" stroke-width="1.4" stroke-linecap="round">
              <path class="pkt pkt-1" stroke-dasharray="4 200" d="M14,37 C19,43 24,49 28,53"/>
              <path class="pkt pkt-2" stroke-dasharray="4 200" d="M28,53 C30,54 32,54 34,54"/>
              <path class="pkt pkt-3" stroke-dasharray="4 200" d="M34,54 C36,54 38,53 39,52"/>
            </g>
            <!-- Paquets animés (Lomé → Kinshasa) -->
            <g filter="url(#rGlow)" fill="none" stroke="#ffb74d" stroke-width="1.4" stroke-linecap="round">
              <path class="pkt pkt-4" stroke-dasharray="4 200" d="M34,54 C40,59 46,64 51,67"/>
            </g>
            <!-- Paquets animés (Kinshasa → Nairobi → Addis → Caire) -->
            <g filter="url(#rGlow)" fill="none" stroke="#64b5f6" stroke-width="1.4" stroke-linecap="round">
              <path class="pkt pkt-5" stroke-dasharray="4 200" d="M51,67 C57,63 62,61 65,60"/>
              <path class="pkt pkt-6" stroke-dasharray="4 200" d="M65,60 C62,72 59,79 56,85"/>
            </g>
            <!-- Paquets animés (corridor Nord + axe Est) -->
            <g filter="url(#rGlow)" fill="none" stroke="#81c784" stroke-width="1.4" stroke-linecap="round">
              <path class="pkt pkt-7" stroke-dasharray="4 200" d="M65,60 C66,52 67,46 68,44"/>
              <path class="pkt pkt-8" stroke-dasharray="4 200" d="M68,44 C68,32 67,22 66,14"/>
              <path class="pkt pkt-9" stroke-dasharray="4 200" d="M26,13 C40,12 55,12 66,14"/>
            </g>
          </svg>
          <!-- Points des villes -->
          <div class="c-dot" style="left:14%;top:37%"><div class="c-core c-wh"></div><span class="c-lbl c-lbl-l">Dakar</span></div>
          <div class="c-dot" style="left:28%;top:53%"><div class="c-core c-wh"></div><span class="c-lbl c-lbl-b">Abidjan</span></div>
          <div class="c-dot" style="left:32%;top:54%"><div class="c-core c-wh"></div><span class="c-lbl c-lbl-t">Accra</span></div>
          <!-- Lomé — siège WARAH, point doré avec ripple -->
          <div class="c-dot c-lome" style="left:34%;top:54%">
            <div class="c-ripple"></div>
            <div class="c-ripple c-ripple-2"></div>
            <div class="c-core c-gold"></div>
            <span class="c-lbl c-lbl-t c-lbl-gold">Lomé ★</span>
          </div>
          <div class="c-dot" style="left:39%;top:52%"><div class="c-core c-wh"></div><span class="c-lbl c-lbl-r">Lagos</span></div>
          <div class="c-dot" style="left:51%;top:67%"><div class="c-core c-wh"></div><span class="c-lbl c-lbl-r">Kinshasa</span></div>
          <div class="c-dot" style="left:65%;top:60%"><div class="c-core c-wh"></div><span class="c-lbl c-lbl-r">Nairobi</span></div>
          <div class="c-dot" style="left:68%;top:44%"><div class="c-core c-wh"></div><span class="c-lbl c-lbl-r">Addis Abeba</span></div>
          <div class="c-dot" style="left:26%;top:13%"><div class="c-core c-wh"></div><span class="c-lbl c-lbl-r">Casablanca</span></div>
          <div class="c-dot" style="left:66%;top:14%"><div class="c-core c-wh"></div><span class="c-lbl c-lbl-r">Le Caire</span></div>
          <div class="c-dot" style="left:56%;top:85%"><div class="c-core c-wh"></div><span class="c-lbl c-lbl-t">Johannesburg</span></div>
        </div>
      </div>
    </div>
  </section>

  <!-- ── VALEURS ── -->
  <section class="valeurs-section">
    <div class="sec-wrap">
      <div class="val-head">
        <span class="sec-chip">› nos engagements</span>
        <h2 class="sec-title">Ce qui nous guide</h2>
      </div>
      <div class="val-grid">
        <div class="val-card">
          <div class="val-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
          <h3 class="val-t">Confiance</h3>
          <p class="val-p">Chaque transaction est tracée, chaque quittance authentifiée. La transparence comme fondement.</p>
        </div>
        <div class="val-card">
          <div class="val-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg></div>
          <h3 class="val-t">Accessibilité</h3>
          <p class="val-p">Conçu pour fonctionner sur réseau 3G, pour tous les niveaux de maîtrise numérique.</p>
        </div>
        <div class="val-card">
          <div class="val-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
          <h3 class="val-t">Efficacité</h3>
          <p class="val-p">Ce qui prenait des heures — relances, quittances, rapports — se fait en quelques secondes.</p>
        </div>
        <div class="val-card">
          <div class="val-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
          <h3 class="val-t">Communauté</h3>
          <p class="val-p">Un écosystème qui connecte propriétaires, gestionnaires immobiliers et locataires dans une relation plus équilibrée.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ── CTA ── -->
  <section class="cta-section">
    <div class="sec-wrap">
      <div class="cta-inner">
        <h2 class="cta-title">Prêt à simplifier votre gestion immobilière ?</h2>
        <p class="cta-sub">Rejoignez les propriétaires et gestionnaires immobiliers qui font confiance à WARAH.</p>
        <div class="cta-btns">
          <a routerLink="/auth/register" class="cta-btn-primary">Commencer gratuitement</a>
          <a routerLink="/annonces" class="cta-btn-ghost">Voir les annonces</a>
        </div>
      </div>
    </div>
  </section>

  <!-- ── FOOTER ── -->
  <app-public-footer />

</div>
  `,
  styles: [`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    .page { font-family: 'Inter', system-ui, sans-serif; color: #1a2940; overflow-x: hidden; }

    /* ── NAVBAR ── */
    .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: white; box-shadow: 0 2px 16px rgba(0,0,0,0.08); transition: box-shadow .3s; }
    .nav-solid { box-shadow: 0 4px 28px rgba(0,0,0,0.13); }
    .nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 80px; display: flex; align-items: center; gap: 32px; }
    .nav-logo { display: flex; align-items: center; text-decoration: none; }
    .logo-img { height: 54px; }
    .nav-links { display: flex; gap: 28px; list-style: none; padding: 0; margin: 0; flex: 1; }
    .nl { color: #0A2650; text-decoration: none; font-size: .9rem; font-weight: 500; transition: color .2s; padding-bottom: 2px; position: relative; }
    .nl::after { content: attr(data-text); display: block; height: 0; overflow: hidden; font-weight: 700; visibility: hidden; pointer-events: none; }
    .nl:hover { color: #C9982E; }
    .nl-active { color: #0F4C81; font-weight: 700; border-bottom: 2px solid #C9982E; }
    .nav-cta { display: flex; gap: 10px; align-items: center; }
    .btn-ghost { color: #0A2650; padding: 7px 18px; border-radius: 6px; text-decoration: none; font-size: .85rem; font-weight: 500; transition: background .2s; }
    .btn-ghost:hover { background: rgba(10,38,80,0.07); }
    .btn-nav-primary { background: #0F4C81; color: white; padding: 8px 20px; border-radius: 6px; text-decoration: none; font-size: .85rem; font-weight: 600; transition: background .2s; }
    .btn-nav-primary:hover { background: #0A2650; }
    .hamburger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 4px; }
    .hamburger span { display: block; width: 22px; height: 2px; background: #0A2650; border-radius: 2px; }
    .m-menu { position: absolute; top: 80px; left: 0; right: 0; background: white; padding: 16px 24px 24px; display: flex; flex-direction: column; gap: 4px; border-top: 1px solid #E5E7EB; box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
    .mm-link { color: #374151; text-decoration: none; font-size: 1rem; padding: 10px 0; border-bottom: 1px solid #F3F4F6; display: block; }
    .mm-cta { margin-top: 10px; background: #C9982E; color: white; text-align: center; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: 600; }

    /* ── HERO ── */
    .hero { min-height: 520px; position: relative; display: flex; align-items: center; overflow: hidden; }
    .hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center top; }
    .hero-bg { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(8,30,65,0.88) 0%, rgba(10,38,80,0.80) 50%, rgba(15,76,129,0.72) 100%); }
    .hero-inner { position: relative; max-width: 800px; margin: 0 auto; padding: 120px 24px 80px; text-align: center; }
    .hero-eyebrow { display: inline-block; background: rgba(201,152,46,.15); border: 1px solid rgba(201,152,46,.4); color: #C9982E; font-size: .8rem; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; padding: 6px 16px; border-radius: 20px; margin-bottom: 24px; }
    .hero-title { color: white; font-size: clamp(2rem,5vw,3.2rem); font-weight: 800; line-height: 1.15; margin-bottom: 20px; text-wrap: balance; }
    .hero-sub { color: rgba(255,255,255,.75); font-size: 1.05rem; line-height: 1.7; max-width: 600px; margin: 0 auto 40px; }
    .hero-stats { display: flex; align-items: center; justify-content: center; gap: 32px; flex-wrap: wrap; }
    .h-stat { text-align: center; }
    .h-stat-n { display: block; color: #C9982E; font-size: 1.4rem; font-weight: 700; }
    .h-stat-l { display: block; color: rgba(255,255,255,.6); font-size: .8rem; margin-top: 2px; }
    .h-stat-sep { width: 1px; height: 36px; background: rgba(255,255,255,.2); }

    /* ── UTILS ── */
    .sec-wrap { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .sec-chip { font-size: .75rem; font-weight: 600; color: #C9982E; text-transform: uppercase; letter-spacing: .08em; }
    .sec-title { font-size: clamp(1.6rem,3vw,2.2rem); font-weight: 800; color: #0A2650; text-wrap: balance; }
    .sec-title-sm { font-size: 1.5rem; font-weight: 800; color: #0A2650; letter-spacing: .04em; }

    /* ── PROFILS ── */
    .profils-section { padding: 80px 0; background: #f8f9fc; }
    .profils-eyebrow { margin-bottom: 32px; }
    .profils-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
    .profil-card { background: white; border: 1.5px solid #e8ecf2; border-radius: 16px; padding: 28px 24px; text-decoration: none; color: inherit; transition: transform .2s,box-shadow .2s,border-color .2s; display: flex; flex-direction: column; gap: 12px; }
    .profil-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(15,76,129,.12); border-color: #0F4C81; }
    .profil-card-accent { background: #0A2650; border-color: #C9982E; }
    .profil-card-accent .pc-title,.profil-card-accent .pc-cta { color: white; }
    .profil-card-accent .pc-list { color: rgba(255,255,255,.75); }
    .profil-card-accent .pc-icon svg { stroke: #C9982E; }
    .profil-card-accent .pc-cta { color: #C9982E; }
    .pc-icon { width: 44px; height: 44px; background: rgba(15,76,129,.08); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .pc-icon svg { width: 22px; height: 22px; stroke: #0F4C81; }
    .pc-title { font-size: 1.05rem; font-weight: 700; color: #0A2650; }
    .pc-list { list-style: none; display: flex; flex-direction: column; gap: 5px; font-size: .88rem; color: #5a6a7e; flex: 1; }
    .pc-list li::before { content: '— '; color: #0F4C81; font-weight: 600; }
    .profil-card-accent .pc-list li::before { color: #C9982E; }
    .pc-cta { font-size: .85rem; font-weight: 600; color: #0F4C81; margin-top: 4px; }

    /* ── HISTOIRE ── */
    .histoire-section { padding: 96px 0; background: white; }
    .hist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: start; }
    .hist-text { display: flex; flex-direction: column; gap: 16px; }
    .hist-title { font-size: clamp(1.5rem,2.5vw,2rem); font-weight: 900; color: #0A2650; line-height: 1.2; letter-spacing: .02em; }
    .hist-p { font-size: .95rem; color: #4a5a6e; line-height: 1.75; }
    .hist-btn { display: inline-block; margin-top: 8px; background: #0F4C81; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: .9rem; transition: background .2s; width: fit-content; }
    .hist-btn:hover { background: #0A2650; }
    .hist-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .hs-world-wrap { grid-column: 1 / -1; background: #f0f4f9; border-radius: 14px; overflow: hidden; }
    .hs-world-img { width: 100%; height: 140px; object-fit: cover; object-position: center; display: block; filter: opacity(0.7); }
    .hs-world-legend { display: flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 11px; font-weight: 600; color: #6B7280; }
    .hs-world-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .hs-wd-active { background: #C9982E; }
    .hs-wd-diaspora { background: #0F4C81; }
    .hs-card { background: #f0f4f9; border-radius: 14px; padding: 22px 20px; }
    .hs-card-dark { background: #0A2650; }
    .hs-card-gold { background: linear-gradient(135deg,#FFF8EC,#FFFBF2); border: 1.5px solid rgba(201,152,46,.3); }
    .hs-n { display: block; font-size: 1.4rem; font-weight: 800; color: #0F4C81; margin-bottom: 4px; }
    .hs-card-dark .hs-n { color: #C9982E; }
    .hs-card-gold .hs-n { color: #A07020; }
    .hs-l { display: block; font-size: .8rem; font-weight: 700; color: #0A2650; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
    .hs-card-dark .hs-l { color: rgba(255,255,255,.9); }
    .hs-card-gold .hs-l { color: #7A5518; }
    .hs-p { font-size: .82rem; color: #6a7a8e; line-height: 1.55; }
    .hs-card-dark .hs-p { color: rgba(255,255,255,.6); }

    /* ── CARTE AFRIQUE ── */
    .carte-section { background: linear-gradient(135deg,#081E41 0%,#0A2650 50%,#0F4C81 100%); }
    .carte-inner { max-width: 1200px; margin: 0 auto; padding: 80px 24px; display: grid; grid-template-columns: 1fr 1.4fr; gap: 48px; align-items: center; }
    .sec-chip-light { color: rgba(201,152,46,.9); }
    .carte-title { font-size: clamp(1.5rem,2.5vw,2rem); font-weight: 900; color: white; line-height: 1.2; letter-spacing: .02em; margin: 10px 0 16px; }
    .carte-sub { font-size: .92rem; color: rgba(255,255,255,.7); line-height: 1.7; margin-bottom: 28px; }
    .carte-villes { display: flex; flex-direction: column; gap: 10px; }
    .cv-item { display: flex; align-items: center; gap: 10px; font-size: .88rem; color: rgba(255,255,255,.8); }
    .cv-dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,.3); flex-shrink: 0; }
    .cv-active { background: #C9982E; box-shadow: 0 0 8px rgba(201,152,46,.6); }
    .cv-soon { background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.3); }
    .carte-map { display: flex; align-items: center; justify-content: center; }

    /* Wrapper image carte */
    .africa-map-wrap { position: relative; width: 100%; max-width: 520px; border-radius: 18px; overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(201,152,46,0.25); }
    .africa-img { width: 100%; height: auto; display: block; filter: brightness(0.88) saturate(1.15); margin-bottom: -42px; }

    /* SVG overlay routes */
    .africa-routes { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }

    /* Paquets animés sur les routes */
    @keyframes pktFlow { from { stroke-dashoffset: 204; } to { stroke-dashoffset: 0; } }
    .pkt { animation: pktFlow 3.5s linear infinite; }
    .pkt-1 { animation-duration: 3.2s; animation-delay: 0s; }
    .pkt-2 { animation-duration: 2.8s; animation-delay: -1.2s; }
    .pkt-3 { animation-duration: 3.0s; animation-delay: -0.5s; }
    .pkt-4 { animation-duration: 4.0s; animation-delay: -1.8s; }
    .pkt-5 { animation-duration: 3.8s; animation-delay: -0.8s; }
    .pkt-6 { animation-duration: 4.2s; animation-delay: -2.1s; }
    .pkt-7 { animation-duration: 3.4s; animation-delay: -1.5s; }
    .pkt-8 { animation-duration: 5.0s; animation-delay: -2.5s; }
    .pkt-9 { animation-duration: 4.5s; animation-delay: -0.3s; }

    /* Points de villes */
    .c-dot { position: absolute; transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center; }
    .c-core { width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.9); flex-shrink: 0; position: relative; z-index: 2; }
    .c-wh { background: white; box-shadow: 0 0 6px rgba(255,255,255,0.6); }
    .c-gold { background: #C9982E; width: 14px; height: 14px; border: 2px solid white; box-shadow: 0 0 12px rgba(201,152,46,0.9); }

    /* Lomé ripple */
    @keyframes ripple { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(3.5); opacity: 0; } }
    .c-ripple { position: absolute; width: 14px; height: 14px; border-radius: 50%; background: rgba(201,152,46,0.45); animation: ripple 2.2s ease-out infinite; z-index: 1; }
    .c-ripple-2 { animation-delay: -1.1s; }

    /* Labels villes */
    .c-lbl { position: absolute; font-size: 9px; font-weight: 600; color: rgba(255,255,255,0.9); white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,0.8); font-family: 'Inter', sans-serif; z-index: 3; pointer-events: none; }
    .c-lbl-t { bottom: calc(100% + 5px); left: 50%; transform: translateX(-50%); }
    .c-lbl-b { top: calc(100% + 5px); left: 50%; transform: translateX(-50%); }
    .c-lbl-r { left: calc(100% + 6px); top: 50%; transform: translateY(-50%); }
    .c-lbl-l { right: calc(100% + 6px); top: 50%; transform: translateY(-50%); }
    .c-lbl-gold { color: #F0C860; font-size: 10px; font-weight: 700; text-shadow: 0 1px 4px rgba(0,0,0,0.9), 0 0 10px rgba(201,152,46,0.7); }

    /* ── VALEURS ── */
    .valeurs-section { padding: 96px 0; background: #f8f9fc; }
    .val-head { text-align: center; margin-bottom: 48px; display: flex; flex-direction: column; gap: 8px; }
    .val-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; }
    .val-card { background: white; border: 1.5px solid #e8ecf2; border-radius: 16px; padding: 28px 22px; transition: transform .2s,box-shadow .2s; }
    .val-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(15,76,129,.1); }
    .val-icon { width: 48px; height: 48px; background: rgba(15,76,129,.08); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
    .val-icon svg { width: 24px; height: 24px; }
    .val-t { font-size: 1rem; font-weight: 700; color: #0A2650; margin-bottom: 8px; }
    .val-p { font-size: .85rem; color: #5a6a7e; line-height: 1.65; }

    /* ── CTA ── */
    .cta-section { padding: 96px 0; background: white; }
    .cta-inner { max-width: 700px; margin: 0 auto; text-align: center; }
    .cta-title { font-size: clamp(1.5rem,3vw,2.2rem); font-weight: 800; color: #0A2650; margin-bottom: 16px; text-wrap: balance; }
    .cta-sub { font-size: .95rem; color: #5a6a7e; line-height: 1.7; margin-bottom: 32px; }
    .cta-btns { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
    .cta-btn-primary { background: #0F4C81; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: .95rem; transition: background .2s; }
    .cta-btn-primary:hover { background: #0A2650; }
    .cta-btn-ghost { border: 2px solid #0F4C81; color: #0F4C81; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: .95rem; transition: background .2s,color .2s; }
    .cta-btn-ghost:hover { background: #0F4C81; color: white; }

    /* ── RESPONSIVE ── */
    @media (max-width: 900px) {
      .nav-links, .nav-cta { display: none; }
      .hamburger { display: flex; margin-left: auto; }
      .profils-grid, .hist-grid, .carte-inner { grid-template-columns: 1fr; }
      .val-grid { grid-template-columns: 1fr 1fr; }
      .h-stat-sep { display: none; }
      .africa-map-wrap { max-width: 420px; margin: 0 auto; }
      .c-lbl { font-size: 7.5px; }
    }
    @media (max-width: 600px) {
      .val-grid, .hist-stats { grid-template-columns: 1fr; }
    }
  `]
})
export class AProposComponent implements OnInit, OnDestroy {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private scrollFn?: () => void;

  navScrolled = signal(false);
  menuOpen   = signal(false);

  ngOnInit(): void {
    if (this.isBrowser) {
      this.scrollFn = () => this.navScrolled.set(window.scrollY > 40);
      window.addEventListener('scroll', this.scrollFn, { passive: true });
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser && this.scrollFn) {
      window.removeEventListener('scroll', this.scrollFn);
    }
  }
}
