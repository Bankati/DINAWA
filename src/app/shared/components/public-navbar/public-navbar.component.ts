import { Component, signal, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-public-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
<nav class="nav" [class.nav-scrolled]="scrolled()">
  <div class="nav-inner">
    <a routerLink="/" class="nav-logo">
      <img src="/assets/WARAH-logo.png" alt="WARAH" class="logo-img">
    </a>

    <ul class="nav-links">
      <li><a routerLink="/" routerLinkActive="nl-active" [routerLinkActiveOptions]="{exact: true}" class="nl">Accueil</a></li>
      <li><a routerLink="/annonces" routerLinkActive="nl-active" class="nl">Annonces</a></li>
      <li><a routerLink="/a-propos" routerLinkActive="nl-active" class="nl">À propos</a></li>
      <li><a routerLink="/" fragment="tarifs" class="nl">Tarifs</a></li>
      <li><a routerLink="/contact" routerLinkActive="nl-active" class="nl">Contact</a></li>
    </ul>

    <div class="nav-cta">
      <a routerLink="/auth/login" class="nav-login">Connexion</a>
      <a routerLink="/auth/register" class="nav-pill">S'inscrire</a>
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
      <a routerLink="/" fragment="tarifs" class="mm-link">Tarifs</a>
      <a routerLink="/contact" class="mm-link">Contact</a>
      <div class="mm-sep"></div>
      <a routerLink="/auth/login" class="mm-link">Connexion</a>
      <a routerLink="/auth/register" class="mm-cta">S'inscrire gratuitement</a>
    </div>
  }
</nav>
  `,
  styles: [`
    .nav {
      position: sticky; top: 0; z-index: 200;
      background: #fff;
      border-bottom: 1px solid #EEF0F3;
      transition: box-shadow .25s ease;
    }
    .nav-scrolled { box-shadow: 0 4px 20px rgba(15,23,42,0.08); }
    .nav-inner {
      max-width: 1240px; margin: 0 auto; padding: 0 24px;
      height: 76px; display: flex; align-items: center; gap: 36px;
    }
    .nav-logo { flex-shrink: 0; display: flex; align-items: center; }
    .logo-img { height: 48px; width: auto; display: block; }

    .nav-links { display: flex; gap: 30px; flex: 1; list-style: none; margin: 0; padding: 0; }
    .nl {
      color: #1F2937; font-size: 14.5px; font-weight: 500;
      text-decoration: none; padding-bottom: 4px;
      border-bottom: 2px solid transparent;
      transition: color .2s, border-color .2s;
    }
    .nl:hover { color: #C9982E; }
    .nl-active { color: #C9982E; border-bottom-color: #C9982E; font-weight: 700; }

    .nav-cta { display: flex; align-items: center; gap: 18px; flex-shrink: 0; }
    .nav-login { color: #1F2937; font-size: 14px; font-weight: 500; text-decoration: none; transition: color .2s; }
    .nav-login:hover { color: #C9982E; }
    .nav-pill {
      background: #C9982E; color: #fff; font-size: 14px; font-weight: 700;
      padding: 11px 26px; border-radius: 999px; text-decoration: none;
      transition: background .2s, transform .15s, box-shadow .2s;
      box-shadow: 0 2px 10px rgba(201,152,46,0.3);
    }
    .nav-pill:hover { background: #B8861F; transform: translateY(-1px); box-shadow: 0 6px 18px rgba(201,152,46,0.4); }

    .hamburger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 6px; margin-left: auto; }
    .hamburger span { display: block; width: 22px; height: 2px; background: #1F2937; border-radius: 2px; }

    .m-menu { background: white; padding: 16px 24px 24px; display: flex; flex-direction: column; gap: 4px; border-top: 1px solid #E5E7EB; box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
    .mm-link { color: #374151; font-size: 15px; padding: 12px 0; border-bottom: 1px solid #F3F4F6; text-decoration: none; display: block; }
    .mm-link:hover { color: #0F4C81; }
    .mm-sep { height: 12px; }
    .mm-cta { margin-top: 8px; background: #C9982E; color: #fff; text-align: center; padding: 13px; border-radius: 999px; font-weight: 700; text-decoration: none; display: block; }

    @media (max-width: 900px) {
      .nav-links, .nav-cta { display: none; }
      .hamburger { display: flex; }
    }
  `]
})
export class PublicNavbarComponent {
  menuOpen = signal(false);
  scrolled = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 8);
  }
}
