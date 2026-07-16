import { Component } from '@angular/core';
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

  <!-- ── CORPS DU FOOTER ── -->
  <div class="pf-body">
    <div class="pf-inner">

      <!-- Brand -->
      <div class="pf-brand">
        <div class="pf-logo-wrap">
          <img src="/assets/WARAH-logo.png" alt="WARAH" class="pf-logo">
        </div>
        <p class="pf-brand-desc">La plateforme de gestion immobilière locative conçue pour le contexte africain. Loyers, quittances et baux — tout en un.</p>
        <div class="pf-social">
          <!-- Facebook -->
          <a href="#" class="pf-soc" aria-label="Facebook">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
          </a>
          <!-- Instagram -->
          <a href="#" class="pf-soc" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </a>
          <!-- LinkedIn -->
          <a href="#" class="pf-soc" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
          </a>
          <!-- WhatsApp -->
          <a href="#" class="pf-soc" aria-label="WhatsApp">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.118.554 4.103 1.523 5.828L.057 23.267a.75.75 0 00.917.918l5.491-1.474A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.952 9.952 0 01-5.073-1.384l-.363-.215-3.761 1.01 1.025-3.655-.236-.374A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
          </a>
          <!-- X (Twitter) -->
          <a href="#" class="pf-soc" aria-label="X / Twitter">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
        </div>
        <div class="pf-status">
          <span class="pf-status-dot"></span>
          Tous les systèmes opérationnels
        </div>
      </div>

      <!-- Produit -->
      <div class="pf-col">
        <h4 class="pf-col-title">Produit</h4>
        <nav class="pf-nav">
          <a routerLink="/annonces" class="pf-link">Annonces immobilières</a>
          <a routerLink="/auth/register" class="pf-link">Inscription propriétaire</a>
          <a routerLink="/auth/register" class="pf-link">Espace gestionnaire immobilier</a>
          <a routerLink="/auth/register" class="pf-link">Espace locataire</a>
          <a routerLink="/" fragment="tarifs" class="pf-link">Plans &amp; tarifs</a>
        </nav>
      </div>

      <!-- Ressources -->
      <div class="pf-col">
        <h4 class="pf-col-title">Ressources</h4>
        <nav class="pf-nav">
          <a href="#" class="pf-link">Guide de démarrage</a>
          <a routerLink="/a-propos" fragment="faq" class="pf-link">FAQ</a>
          <a href="#" class="pf-link">Blog immobilier</a>
          <a href="#" class="pf-link">Politique de confidentialité</a>
          <a href="#" class="pf-link">Mentions légales</a>
        </nav>
      </div>

      <!-- Société -->
      <div class="pf-col">
        <h4 class="pf-col-title">Société</h4>
        <nav class="pf-nav">
          <a routerLink="/a-propos" class="pf-link">À propos de WARAH</a>
          <a href="#" class="pf-link">Presse &amp; médias</a>
          <a href="#" class="pf-link">Partenaires</a>
          <a href="#" class="pf-link">Carrières</a>
        </nav>
      </div>

      <!-- Contact -->
      <div class="pf-col">
        <h4 class="pf-col-title">Contact</h4>
        <div class="pf-contact">
          <div class="pf-contact-item">
            <svg class="pf-ci-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span>contact&#64;warah.tg</span>
          </div>
          <div class="pf-contact-item">
            <svg class="pf-ci-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>Lomé, Togo</span>
          </div>
          <div class="pf-contact-item">
            <svg class="pf-ci-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.02 1.18 2 2 0 012 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
            <span>+228 XX XX XX XX</span>
          </div>
        </div>
        <div class="pf-payments">
          <span class="pf-pay-label">Paiements acceptés</span>
          <div class="pf-pay-logos">
            <div class="pf-pay-chip" title="Mixx by Yas">
              <img src="/assets/mixx-by-yas.png" alt="Mixx by Yas" class="pf-pay-img">
            </div>
            <div class="pf-pay-chip" title="MOOV Money Flooz">
              <img src="/assets/Flooz.jpg" alt="MOOV Money Flooz" class="pf-pay-img">
            </div>
            <div class="pf-pay-chip" title="Carte bancaire">
              <img src="/assets/carte-bancaire.jpg" alt="Carte bancaire" class="pf-pay-img pf-pay-img-card">
            </div>
          </div>
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
    .pf-top {
      border-bottom: 1px solid rgba(255,255,255,0.06);
      padding: 40px 0;
    }
    .pf-top-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 32px;
      flex-wrap: wrap;
    }
    .pf-top-label {
      display: block;
      font-size: .72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .1em;
      color: #C9982E;
      margin-bottom: 6px;
    }
    .pf-top-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: white;
      max-width: 500px;
    }
    .pf-top-actions {
      display: flex;
      gap: 12px;
      flex-shrink: 0;
      flex-wrap: wrap;
    }
    .pf-btn-primary {
      background: #C9982E;
      color: white;
      padding: 11px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: .88rem;
      transition: background .2s, transform .15s;
      white-space: nowrap;
    }
    .pf-btn-primary:hover { background: #b8881f; transform: translateY(-1px); }
    .pf-btn-ghost {
      border: 1.5px solid rgba(255,255,255,0.2);
      color: rgba(255,255,255,0.8);
      padding: 10px 22px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      font-size: .88rem;
      transition: border-color .2s, color .2s;
      white-space: nowrap;
    }
    .pf-btn-ghost:hover { border-color: rgba(255,255,255,0.5); color: white; }

    /* ── CORPS ── */
    .pf-body {
      padding: 64px 0 48px;
    }
    .pf-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 32px;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 1.3fr;
      gap: 48px;
    }

    /* Brand */
    .pf-logo-wrap { display: inline-flex; align-items: center; background: white; border-radius: 12px; padding: 8px 16px; margin-bottom: 18px; box-shadow: 0 2px 12px rgba(0,0,0,0.2); }
    .pf-logo { height: 54px; width: auto; display: block; }
    .pf-brand-desc {
      font-size: .85rem;
      color: rgba(255,255,255,0.5);
      line-height: 1.65;
      margin-bottom: 20px;
      max-width: 280px;
    }
    .pf-social {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .pf-soc {
      width: 36px;
      height: 36px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.5);
      text-decoration: none;
      transition: background .2s, color .2s, border-color .2s;
    }
    .pf-soc:hover {
      background: rgba(201,152,46,0.15);
      color: #C9982E;
      border-color: rgba(201,152,46,0.4);
    }
    .pf-soc svg { width: 16px; height: 16px; }

    .pf-status {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: .78rem;
      color: rgba(255,255,255,0.45);
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      padding: 5px 12px;
    }
    .pf-status-dot {
      width: 7px;
      height: 7px;
      background: #22c55e;
      border-radius: 50%;
      box-shadow: 0 0 6px rgba(34,197,94,0.6);
      animation: statusPulse 2s ease-in-out infinite;
    }
    @keyframes statusPulse {
      0%, 100% { box-shadow: 0 0 6px rgba(34,197,94,0.6); }
      50% { box-shadow: 0 0 12px rgba(34,197,94,0.9); }
    }

    /* Colonnes nav */
    .pf-col-title {
      font-size: .72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .1em;
      color: rgba(255,255,255,0.9);
      margin-bottom: 18px;
    }
    .pf-nav {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .pf-link {
      color: rgba(255,255,255,0.5);
      text-decoration: none;
      font-size: .85rem;
      transition: color .18s, padding-left .18s;
      display: inline-block;
    }
    .pf-link:hover { color: white; padding-left: 4px; }

    /* Contact */
    .pf-contact {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }
    .pf-contact-item {
      display: flex;
      align-items: center;
      gap: 9px;
      font-size: .84rem;
      color: rgba(255,255,255,0.5);
    }
    .pf-ci-icon { width: 15px; height: 15px; stroke: rgba(255,255,255,0.35); flex-shrink: 0; }

    .pf-pay-label {
      display: block;
      font-size: .72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: rgba(255,255,255,0.35);
      margin-bottom: 10px;
    }
    .pf-pay-logos { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .pf-pay-chip { display: flex; align-items: center; opacity: 0.88; transition: opacity .2s; }
    .pf-pay-chip:hover { opacity: 1; }
    .pf-pay-img {
      height: 32px;
      width: auto;
      max-width: 80px;
      display: block;
      border-radius: 6px;
      object-fit: contain;
      background: white;
    }
    .pf-pay-img-card {
      object-fit: cover;
      object-position: center;
      width: 52px;
    }
    .pf-pay-bank {
      gap: 6px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 6px;
      padding: 0 10px;
      height: 32px;
      color: rgba(255,255,255,0.65);
      font-size: .78rem;
      font-weight: 600;
    }
    .pf-bank-icon { width: 15px; height: 15px; flex-shrink: 0; color: rgba(255,255,255,0.7); }

    /* ── BARRE DU BAS ── */
    .pf-bottom {
      border-top: 1px solid rgba(255,255,255,0.06);
      padding: 20px 0;
    }
    .pf-bottom-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .pf-copy { font-size: .8rem; color: rgba(255,255,255,0.3); }
    .pf-legal { display: flex; align-items: center; gap: 8px; }
    .pf-legal-link { font-size: .8rem; color: rgba(255,255,255,0.35); text-decoration: none; transition: color .2s; }
    .pf-legal-link:hover { color: rgba(255,255,255,0.7); }
    .pf-sep { color: rgba(255,255,255,0.2); font-size: .8rem; }
    .pf-made { font-size: .8rem; color: rgba(255,255,255,0.3); }

    /* ── RESPONSIVE ── */
    @media (max-width: 1024px) {
      .pf-inner { grid-template-columns: 1fr 1fr 1fr; }
      .pf-brand { grid-column: 1 / -1; }
    }
    @media (max-width: 640px) {
      .pf-inner { grid-template-columns: 1fr 1fr; padding: 0 20px; }
      .pf-brand { grid-column: 1 / -1; }
      .pf-top-inner { flex-direction: column; align-items: flex-start; }
      .pf-bottom-inner { flex-direction: column; align-items: flex-start; gap: 8px; }
      .pf-made { display: none; }
    }
  `]
})
export class PublicFooterComponent {}
