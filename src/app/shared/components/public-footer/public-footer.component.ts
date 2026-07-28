import { Component, signal, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-public-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
<footer class="pf">

  <!-- ── BANDE SUPÉRIEURE ── -->
  <div class="pf-top">
    <div class="pf-top-inner">
      <div class="pf-top-text">
        <span class="pf-top-label">Nouveau sur WARAH ?</span>
        <p class="pf-top-title">Commencez à gérer vos biens gratuitement dès aujourd'hui.</p>
      </div>
      <div class="pf-top-actions">
        <a routerLink="/auth/register" class="pf-btn-primary">Créer un compte</a>
        <a routerLink="/annonces" class="pf-btn-ghost">Voir les annonces</a>
      </div>
    </div>
  </div>

  <!-- ── OPÉRATEURS MOBILE MONEY ── -->
  <div class="pf-partners">
    <span class="pf-partners-label">Opérateurs Mobile Money partenaires</span>
    <div class="pf-partners-row">
      <div class="pf-partner-card" title="Mixx by Yas"><img src="/assets/mixx-by-yas.png" alt="Mixx by Yas"></div>
      <div class="pf-partner-card" title="Moov Money Flooz"><img src="/assets/Flooz.jpg" alt="Moov Money Flooz"></div>
      <div class="pf-partner-card" title="Carte bancaire"><img src="/assets/carte-bancaire.jpg" alt="Carte bancaire" class="pf-partner-img-card"></div>
    </div>
  </div>

  <!-- ── CORPS DU FOOTER ── -->
  <div class="pf-body">
    <div class="pf-inner">

      <!-- Brand -->
      <div class="pf-brand">
        <div class="pf-logo-wrap">
          <img src="/assets/WARAH-logo.png" alt="WARAH" class="pf-logo">
        </div>
        <p class="pf-brand-desc">L'infrastructure numérique du logement au Togo. Paiements Mobile Money, quittances certifiées, gestion locative complète.</p>
      </div>

      <!-- Produit -->
      <div class="pf-col">
        <h4 class="pf-col-title">Produit</h4>
        <nav class="pf-nav">
          <a routerLink="/" fragment="fonctionnalites" class="pf-link">Fonctionnalités</a>
          <a routerLink="/" fragment="comment" class="pf-link">Comment ça marche</a>
          <a routerLink="/a-propos" class="pf-link">Pour qui</a>
          <a routerLink="/auth/login" class="pf-link">Se connecter</a>
          <a routerLink="/auth/register" class="pf-link">Créer un compte</a>
        </nav>
      </div>

      <!-- Entreprise -->
      <div class="pf-col">
        <h4 class="pf-col-title">Entreprise</h4>
        <nav class="pf-nav">
          <a routerLink="/a-propos" class="pf-link">À propos</a>
        </nav>
      </div>

      <!-- Contact -->
      <div class="pf-col">
        <h4 class="pf-col-title">Contact</h4>
        <div class="pf-contact">
          <a href="mailto:contact@warah.tg" class="pf-contact-item">
            <svg class="pf-ci-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span>contact&#64;warah.tg</span>
          </a>
        </div>
      </div>

    </div>
  </div>

  <!-- ── BARRE DE BAS ── -->
  <div class="pf-bottom">
    <div class="pf-bottom-inner">
      <p class="pf-copy">© 2026 WARAH — Tous droits réservés</p>
    </div>
  </div>

  <button class="pf-scrolltop" [class.pf-scrolltop-visible]="showScrollTop()" (click)="scrollToTop()" aria-label="Retour en haut">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
  </button>

</footer>
  `,
  styles: [`
    /* ── FOOTER 2026 ── */
    .pf {
      background: #080D18;
      color: rgba(255,255,255,0.6);
      font-family: 'Inter', system-ui, sans-serif;
      font-size: .9rem;
      border-top: 1px solid rgba(201,152,46,0.25);
      position: relative;
    }
    .pf::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, #C9982E 30%, #C9982E 70%, transparent 100%);
      opacity: 0.6;
    }

    /* ── BANDE SUPÉRIEURE ── */
    .pf-top { border-bottom: 1px solid rgba(255,255,255,0.06); padding: 40px 0; }
    .pf-top-inner {
      max-width: 1200px; margin: 0 auto; padding: 0 32px;
      display: flex; align-items: center; justify-content: space-between; gap: 32px; flex-wrap: wrap;
    }
    .pf-top-label { display: block; font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #C9982E; margin-bottom: 6px; }
    .pf-top-title { font-size: 1.15rem; font-weight: 700; color: white; max-width: 500px; }
    .pf-top-actions { display: flex; gap: 12px; flex-shrink: 0; flex-wrap: wrap; }
    .pf-btn-primary { background: #C9982E; color: white; padding: 11px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: .88rem; transition: background .2s, transform .15s; white-space: nowrap; }
    .pf-btn-primary:hover { background: #b8881f; transform: translateY(-1px); }
    .pf-btn-ghost { border: 1.5px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.8); padding: 10px 22px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: .88rem; transition: border-color .2s, color .2s; white-space: nowrap; }
    .pf-btn-ghost:hover { border-color: rgba(255,255,255,0.5); color: white; }

    /* ── PARTENAIRES MOBILE MONEY ── */
    .pf-partners { border-bottom: 1px solid rgba(255,255,255,0.06); padding: 32px 32px; text-align: center; }
    .pf-partners-label { display: block; font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: rgba(255,255,255,0.4); margin-bottom: 20px; }
    .pf-partners-row { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; }
    .pf-partner-card {
      background: white; border-radius: 12px; padding: 14px 22px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.15); min-width: 100px; height: 56px;
    }
    .pf-partner-card img { height: 30px; width: auto; max-width: 100px; object-fit: contain; display: block; }
    .pf-partner-img-card { height: 40px !important; border-radius: 4px; object-fit: cover; }

    /* ── CORPS ── */
    .pf-body { padding: 56px 0 48px; }
    .pf-inner { max-width: 1200px; margin: 0 auto; padding: 0 32px; display: grid; grid-template-columns: 1.6fr 1fr 1fr 1.2fr; gap: 40px; }

    /* Brand */
    .pf-logo-wrap { display: inline-flex; align-items: center; background: white; border-radius: 12px; padding: 8px 16px; margin-bottom: 18px; box-shadow: 0 2px 12px rgba(0,0,0,0.2); }
    .pf-logo { height: 54px; width: auto; display: block; }
    .pf-brand-desc { font-size: .85rem; color: rgba(255,255,255,0.5); line-height: 1.65; margin-bottom: 18px; max-width: 300px; }

    /* Colonnes nav */
    .pf-col-title { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: rgba(255,255,255,0.9); margin-bottom: 18px; }
    .pf-nav { display: flex; flex-direction: column; gap: 10px; margin-bottom: 22px; }
    .pf-link { color: rgba(255,255,255,0.5); text-decoration: none; font-size: .85rem; transition: color .18s, padding-left .18s; display: inline-block; }
    .pf-link:hover { color: white; padding-left: 4px; }

    /* Contact (colonne Sécurité & légal) */
    .pf-contact { display: flex; flex-direction: column; gap: 10px; }
    .pf-contact-item { display: flex; align-items: center; gap: 9px; font-size: .84rem; color: rgba(255,255,255,0.5); text-decoration: none; transition: color .18s; }
    .pf-contact-item:hover { color: white; }
    .pf-ci-icon { width: 15px; height: 15px; flex-shrink: 0; }

    /* ── BARRE DU BAS ── */
    .pf-bottom { border-top: 1px solid rgba(255,255,255,0.06); padding: 20px 0; }
    .pf-bottom-inner { max-width: 1200px; margin: 0 auto; padding: 0 32px; display: flex; align-items: center; justify-content: center; }
    .pf-copy { font-size: .8rem; color: rgba(255,255,255,0.3); }

    /* ── BOUTON RETOUR EN HAUT ── */
    .pf-scrolltop {
      position: fixed; right: 24px; bottom: 24px; z-index: 300;
      width: 44px; height: 44px; border-radius: 50%;
      background: #0F4C81; color: white; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 6px 20px rgba(15,76,129,0.4);
      opacity: 0; transform: translateY(12px); pointer-events: none;
      transition: opacity .25s, transform .25s, background .2s;
    }
    .pf-scrolltop-visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
    .pf-scrolltop:hover { background: #0A2650; }
    .pf-scrolltop svg { width: 20px; height: 20px; }

    /* ── RESPONSIVE ── */
    @media (max-width: 1024px) {
      .pf-inner { grid-template-columns: 1fr 1fr 1fr; }
      .pf-brand { grid-column: 1 / -1; }
    }
    @media (max-width: 640px) {
      .pf-inner { grid-template-columns: 1fr 1fr; padding: 0 20px; }
      .pf-brand { grid-column: 1 / -1; }
      .pf-top-inner { flex-direction: column; align-items: flex-start; }
      .pf-partners-row { gap: 10px; }
    }
  `]
})
export class PublicFooterComponent {
  showScrollTop = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    this.showScrollTop.set(window.scrollY > 500);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
