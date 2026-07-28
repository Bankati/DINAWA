import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PublicNavbarComponent } from '../../../../shared/components/public-navbar/public-navbar.component';
import { PublicFooterComponent } from '../../../../shared/components/public-footer/public-footer.component';

interface ContactForm {
  nom: string;
  role: string;
  email: string;
  telephone: string;
  ville: string;
  sujet: string;
  message: string;
}

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule, PublicNavbarComponent, PublicFooterComponent],
  template: `
<div class="page">
  <app-public-navbar></app-public-navbar>

  <section class="contact-section">
    <div class="contact-inner">

      <!-- Colonne gauche -->
      <div class="contact-intro">
        <div class="contact-eyebrow"><span class="eyebrow-line"></span>CONTACT</div>
        <h1 class="contact-title">Une question&nbsp;? <br>Parlons-en<span class="dot">.</span></h1>
        <p class="contact-desc">Propriétaire, gestionnaire, locataire ou simple curieux — décrivez-nous votre besoin, notre équipe vous répond rapidement.</p>

        <div class="contact-direct">
          <span class="contact-direct-label">Ou écrivez-nous directement</span>
          <a href="mailto:contact@warah.tg" class="contact-direct-email">contact&#64;warah.tg</a>
        </div>

        <div class="contact-items">
          <div class="contact-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.02 1.18 2 2 0 012 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
            <span>+228 90 00 00 00</span>
          </div>
          <div class="contact-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>Lomé, Togo</span>
          </div>
        </div>
      </div>

      <!-- Formulaire -->
      <div class="contact-card">
        @if (submitted()) {
          <div class="contact-success">
            <div class="contact-success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <h3>Message envoyé</h3>
            <p>Merci, {{ form.nom }} ! Notre équipe vous recontacte très vite à {{ form.email }}.</p>
            <button type="button" class="contact-again" (click)="resetForm()">Envoyer un autre message</button>
          </div>
        } @else {
          <form class="contact-form" (ngSubmit)="onSubmit()" #f="ngForm">
            <div class="cf-row">
              <div class="cf-field">
                <label for="nom">Nom complet</label>
                <input id="nom" name="nom" type="text" [(ngModel)]="form.nom" required placeholder="Votre nom">
              </div>
              <div class="cf-field">
                <label for="role">Vous êtes <span class="cf-optional">Optionnel</span></label>
                <select id="role" name="role" [(ngModel)]="form.role">
                  <option value="">Sélectionner...</option>
                  <option value="proprietaire">Propriétaire</option>
                  <option value="gestionnaire">Gestionnaire immobilier</option>
                  <option value="locataire">Locataire</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>

            <div class="cf-row">
              <div class="cf-field">
                <label for="email">Email</label>
                <input id="email" name="email" type="email" [(ngModel)]="form.email" required placeholder="vous@exemple.com">
              </div>
              <div class="cf-field">
                <label for="telephone">Téléphone <span class="cf-optional">Optionnel</span></label>
                <input id="telephone" name="telephone" type="tel" [(ngModel)]="form.telephone" placeholder="+228 90 00 00 00">
              </div>
            </div>

            <div class="cf-row">
              <div class="cf-field">
                <label for="ville">Ville <span class="cf-optional">Optionnel</span></label>
                <input id="ville" name="ville" type="text" [(ngModel)]="form.ville" placeholder="Ex : Lomé, Kara...">
              </div>
              <div class="cf-field">
                <label for="sujet">Sujet</label>
                <select id="sujet" name="sujet" [(ngModel)]="form.sujet" required>
                  <option value="">Sélectionner...</option>
                  <option value="question">Question générale</option>
                  <option value="support">Support technique</option>
                  <option value="partenariat">Partenariat</option>
                  <option value="presse">Presse</option>
                </select>
              </div>
            </div>

            <div class="cf-field">
              <label for="message">Votre message</label>
              <textarea id="message" name="message" [(ngModel)]="form.message" required rows="5" placeholder="Décrivez votre demande..."></textarea>
            </div>

            <button type="submit" class="cf-submit" [disabled]="f.invalid">
              Envoyer le message
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
            </button>
          </form>
        }
      </div>

    </div>
  </section>

  <app-public-footer></app-public-footer>
</div>
  `,
  styles: [`
    * { box-sizing: border-box; }
    .page { font-family: 'Inter', system-ui, sans-serif; background: #fff; }

    .contact-section { padding: 72px 24px 96px; background: #F7F8FA; }
    .contact-inner { max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 56px; align-items: start; }

    /* Colonne intro */
    .contact-eyebrow { display: flex; align-items: center; gap: 12px; font-size: 12px; font-weight: 800; letter-spacing: .14em; color: #C9982E; text-transform: uppercase; margin-bottom: 24px; }
    .eyebrow-line { width: 28px; height: 2px; background: #C9982E; display: inline-block; }
    .contact-title { font-size: clamp(32px, 4vw, 46px); font-weight: 800; color: #0A2650; line-height: 1.15; margin-bottom: 18px; }
    .contact-title .dot { color: #C9982E; }
    .contact-desc { font-size: 16px; color: #4b5568; line-height: 1.7; max-width: 420px; margin-bottom: 40px; }

    .contact-direct { margin-bottom: 32px; }
    .contact-direct-label { display: block; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #9CA3AF; margin-bottom: 8px; }
    .contact-direct-email { font-size: 17px; font-weight: 700; color: #0F4C81; text-decoration: none; }
    .contact-direct-email:hover { color: #0A2650; }

    .contact-items { display: flex; flex-direction: column; gap: 14px; }
    .contact-item { display: flex; align-items: center; gap: 12px; font-size: 14.5px; color: #4b5568; }
    .contact-item svg { width: 18px; height: 18px; color: #0F4C81; flex-shrink: 0; }

    /* Carte formulaire */
    .contact-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 20px; padding: 40px; box-shadow: 0 4px 24px rgba(15,23,42,0.06); }
    .cf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .cf-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
    .cf-row .cf-field { margin-bottom: 0; }
    .cf-field label { font-size: 13.5px; font-weight: 700; color: #0A2650; display: flex; justify-content: space-between; }
    .cf-optional { font-weight: 500; color: #9CA3AF; text-transform: none; letter-spacing: 0; font-size: 12px; }
    .cf-field input, .cf-field select, .cf-field textarea {
      border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 12px 14px;
      font-size: 14.5px; font-family: inherit; color: #1F2937; background: #fff;
      transition: border-color .2s, box-shadow .2s;
    }
    .cf-field input:focus, .cf-field select:focus, .cf-field textarea:focus {
      outline: none; border-color: #0F4C81; box-shadow: 0 0 0 3px rgba(15,76,129,0.12);
    }
    .cf-field textarea { resize: vertical; min-height: 110px; }

    .cf-submit {
      display: inline-flex; align-items: center; gap: 10px;
      background: #0F4C81; color: #fff; font-size: 15px; font-weight: 700;
      padding: 13px 28px; border-radius: 10px; border: none; cursor: pointer;
      transition: background .2s, transform .15s;
    }
    .cf-submit svg { width: 18px; height: 18px; }
    .cf-submit:hover:not(:disabled) { background: #0A2650; transform: translateY(-1px); }
    .cf-submit:disabled { opacity: .5; cursor: not-allowed; }

    /* Succès */
    .contact-success { text-align: center; padding: 40px 20px; }
    .contact-success-icon {
      width: 64px; height: 64px; border-radius: 50%; background: #EAF1F8; color: #0F4C81;
      display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;
    }
    .contact-success-icon svg { width: 30px; height: 30px; }
    .contact-success h3 { font-size: 20px; font-weight: 800; color: #0A2650; margin-bottom: 10px; }
    .contact-success p { font-size: 14.5px; color: #6b7280; line-height: 1.6; margin-bottom: 24px; }
    .contact-again { background: none; border: 1.5px solid #0F4C81; color: #0F4C81; font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: 8px; cursor: pointer; transition: background .2s, color .2s; }
    .contact-again:hover { background: #0F4C81; color: #fff; }

    @media (max-width: 900px) {
      .contact-inner { grid-template-columns: 1fr; }
      .cf-row { grid-template-columns: 1fr; gap: 0; }
      .contact-card { padding: 28px; }
    }
  `]
})
export class ContactComponent {
  submitted = signal(false);

  form: ContactForm = {
    nom: '', role: '', email: '', telephone: '', ville: '', sujet: '', message: ''
  };

  onSubmit(): void {
    this.submitted.set(true);
  }

  resetForm(): void {
    this.form = { nom: '', role: '', email: '', telephone: '', ville: '', sujet: '', message: '' };
    this.submitted.set(false);
  }
}
