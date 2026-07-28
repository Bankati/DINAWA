import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

type Step = 'request' | 'confirm' | 'success';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="lp">

      <!-- ── Panneau gauche ── -->
      <div class="lp-left">
        <div class="lp-left-inner">

          <a routerLink="/" class="lp-logo">
            <img src="/assets/warah-icon.png" alt="" class="lp-logo-icon">
            WARAH
          </a>

          <p class="lp-pitch">
            Gérez vos biens en toute sérénité. La plateforme pensée pour les propriétaires,
            locataires et gestionnaires immobiliers du Togo.
          </p>

          <ul class="lp-list">
            <li>Gestion multi-biens — villas, appartements, studios</li>
            <li>Paiements T-Money &amp; Flooz encaissés automatiquement</li>
            <li>Alertes impayés en temps réel</li>
            <li>Contrats de bail générés et archivés en PDF</li>
          </ul>

          <div class="lp-stats">
            <span>1 200+ annonces</span>
            <span>500+ propriétaires</span>
            <span>4.9 satisfaction</span>
          </div>

        </div>
      </div>

      <!-- ── Panneau droit ── -->
      <div class="lp-right">
        <div class="lp-form-wrap">

          <!-- Header -->
          <div class="lf-head">
            <h1 class="lf-title">Mot de passe oublié</h1>
            <p class="lf-sub">
              @if (step() === 'request') { Entrez votre email pour recevoir un code de vérification }
              @if (step() === 'confirm') { Entrez le code reçu par email et choisissez un nouveau mot de passe }
              @if (step() === 'success') { Mot de passe réinitialisé avec succès }
            </p>
          </div>

          @if (errorMessage()) {
            <div class="lf-error-banner lf-error-banner-top">{{ errorMessage() }}</div>
          }

          <!-- Étape 1 : demande de code -->
          @if (step() === 'request') {
            <form [formGroup]="requestForm" (ngSubmit)="onRequest()" class="lf-form">
              <div class="lf-group">
                <label class="lf-label" for="email">Adresse email</label>
                <input id="email" type="email" formControlName="email" class="lf-input"
                  [class.lf-error]="requestForm.get('email')?.touched && requestForm.get('email')?.invalid"
                  placeholder="votre@email.com">
                @if (requestForm.get('email')?.touched && requestForm.get('email')?.invalid) {
                  <span class="lf-err-msg">Adresse email valide requise</span>
                }
              </div>

              <button type="submit" class="lf-btn" [disabled]="requestForm.invalid || isLoading()">
                @if (isLoading()) { Envoi en cours… } @else { Recevoir le code }
              </button>
            </form>
          }

          <!-- Étape 2 : code + nouveau mot de passe -->
          @if (step() === 'confirm') {
            <form [formGroup]="confirmForm" (ngSubmit)="onConfirm()" class="lf-form">
              <div class="lf-group">
                <label class="lf-label" for="code">Code à 6 chiffres</label>
                <input id="code" type="text" formControlName="code" class="lf-input lf-input-otp"
                  [class.lf-error]="confirmForm.get('code')?.touched && confirmForm.get('code')?.invalid"
                  placeholder="000000" maxlength="6" inputmode="numeric" autocomplete="one-time-code">
                @if (confirmForm.get('code')?.touched && confirmForm.get('code')?.invalid) {
                  <span class="lf-err-msg">Code à 6 chiffres requis</span>
                }
              </div>

              <div class="lf-group">
                <label class="lf-label" for="newPassword">Nouveau mot de passe</label>
                <div class="lf-pw-wrap">
                  <input id="newPassword" [type]="showNewPassword ? 'text' : 'password'" formControlName="newPassword" class="lf-input"
                    [class.lf-error]="confirmForm.get('newPassword')?.touched && confirmForm.get('newPassword')?.invalid"
                    placeholder="••••••••">
                  <button type="button" class="lf-eye" (click)="showNewPassword = !showNewPassword" aria-label="Afficher le mot de passe">
                    {{ showNewPassword ? 'Masquer' : 'Afficher' }}
                  </button>
                </div>
                @if (confirmForm.get('newPassword')?.touched && confirmForm.get('newPassword')?.invalid) {
                  <span class="lf-err-msg">Minimum 6 caractères</span>
                }
              </div>

              <div class="lf-group">
                <label class="lf-label" for="confirmPassword">Confirmer le mot de passe</label>
                <div class="lf-pw-wrap">
                  <input id="confirmPassword" [type]="showConfirmPassword ? 'text' : 'password'" formControlName="confirmPassword" class="lf-input"
                    [class.lf-error]="confirmForm.get('confirmPassword')?.touched && confirmForm.hasError('mismatch')"
                    placeholder="••••••••">
                  <button type="button" class="lf-eye" (click)="showConfirmPassword = !showConfirmPassword" aria-label="Afficher le mot de passe">
                    {{ showConfirmPassword ? 'Masquer' : 'Afficher' }}
                  </button>
                </div>
                @if (confirmForm.get('confirmPassword')?.touched && confirmForm.hasError('mismatch')) {
                  <span class="lf-err-msg">Les mots de passe ne correspondent pas</span>
                }
              </div>

              <button type="submit" class="lf-btn" [disabled]="confirmForm.invalid || isLoading()">
                @if (isLoading()) { Réinitialisation… } @else { Réinitialiser le mot de passe }
              </button>

              <button type="button" class="lf-resend" (click)="backToRequest()">← Renvoyer un code</button>
            </form>
          }

          <!-- Étape 3 : succès -->
          @if (step() === 'success') {
            <div class="lf-success">
              <div class="lf-success-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <p class="lf-success-text">Votre mot de passe a été réinitialisé avec succès.</p>
              <a routerLink="/auth/login" class="lf-btn lf-btn-link">Se connecter</a>
            </div>
          }

          <!-- Footer -->
          @if (step() !== 'success') {
            <p class="lf-footer">
              <a routerLink="/auth/login" class="lf-register-link">← Retour à la connexion</a>
            </p>
          }

          <a routerLink="/" class="lf-back">Retour à l'accueil</a>

        </div>
      </div>

    </div>
  `,
  styles: `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .lp {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 5fr 6fr;
      font-family: 'Inter', system-ui, sans-serif;
    }

    /* ── PANNEAU GAUCHE ── */
    .lp-left {
      background: #081E41;
      display: flex;
      align-items: center;
      padding: 56px;
    }
    .lp-left-inner { max-width: 380px; }

    .lp-logo { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 800; letter-spacing: .16em; color: white; text-decoration: none; margin-bottom: 56px; }
    .lp-logo-icon { width: 26px; height: 26px; object-fit: contain; display: block; }

    .lp-pitch { font-size: 22px; font-weight: 600; color: white; line-height: 1.5; margin-bottom: 40px; }

    .lp-list { list-style: none; display: flex; flex-direction: column; gap: 12px; margin-bottom: 48px; padding-left: 18px; border-left: 2px solid rgba(201,152,46,0.5); }
    .lp-list li { font-size: 13.5px; color: rgba(255,255,255,0.62); line-height: 1.6; }

    .lp-stats { display: flex; gap: 18px; flex-wrap: wrap; font-size: 12.5px; color: rgba(255,255,255,0.4); }

    /* ── PANNEAU DROIT ── */
    .lp-right {
      background: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 40px;
    }

    .lp-form-wrap { width: 100%; max-width: 380px; }

    .lf-head { margin-bottom: 36px; }
    .lf-title { font-size: 26px; font-weight: 700; color: #0A2650; margin-bottom: 6px; }
    .lf-sub { font-size: 14px; color: #6B7280; line-height: 1.5; }

    .lf-form { display: flex; flex-direction: column; gap: 22px; margin-bottom: 28px; }

    .lf-group { display: flex; flex-direction: column; gap: 8px; }
    .lf-label { font-size: 13px; font-weight: 600; color: #374151; }

    .lf-input {
      width: 100%;
      border: none;
      border-bottom: 1.5px solid #E2E5EA;
      padding: 10px 2px;
      font-size: 15px;
      color: #0A2650;
      font-family: inherit;
      background: transparent;
      outline: none;
      transition: border-color .15s;
    }
    .lf-input:focus { border-bottom-color: #0A2650; }
    .lf-input.lf-error { border-bottom-color: #D64545; }
    .lf-input::placeholder { color: #C3C9D2; }

    .lf-input-otp { text-align: center; font-size: 26px; font-weight: 700; letter-spacing: .5em; padding-left: 0.5em; }

    .lf-pw-wrap { display: flex; align-items: center; gap: 10px; }
    .lf-pw-wrap .lf-input { flex: 1; }
    .lf-eye { background: none; border: none; cursor: pointer; font-size: 12px; color: #9CA3AF; padding: 0; white-space: nowrap; }
    .lf-eye:hover { color: #0A2650; }

    .lf-err-msg { font-size: 12px; color: #D64545; }

    .lf-btn {
      width: 100%;
      height: 46px;
      background: #0A2650;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14.5px;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s;
      margin-top: 6px;
      display: block;
      text-align: center;
      line-height: 46px;
      text-decoration: none;
    }
    .lf-btn:hover:not(:disabled) { background: #081E41; }
    .lf-btn:disabled { opacity: .45; cursor: not-allowed; }

    .lf-resend {
      background: none; border: none; cursor: pointer;
      font-size: 13px; color: #6B7280; text-align: center;
      padding: 4px; transition: color .15s;
    }
    .lf-resend:hover { color: #0A2650; }

    .lf-error-banner {
      background: #FDF1F1;
      border-left: 3px solid #D64545;
      padding: 10px 14px;
      color: #A02929;
      font-size: 13px;
    }
    .lf-error-banner-top { margin-bottom: 22px; }

    .lf-success { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; margin-bottom: 28px; }
    .lf-success-icon {
      width: 64px; height: 64px; border-radius: 50%;
      background: #E7F7EF; color: #1A9C5C;
      display: flex; align-items: center; justify-content: center;
    }
    .lf-success-icon svg { width: 30px; height: 30px; }
    .lf-success-text { font-size: 14.5px; color: #4B5563; line-height: 1.5; }
    .lf-btn-link { width: 100%; }

    .lf-footer { font-size: 13.5px; color: #6B7280; margin-bottom: 24px; }
    .lf-register-link { color: #0A2650; font-weight: 600; text-decoration: none; }
    .lf-register-link:hover { text-decoration: underline; }

    .lf-back { display: inline-block; font-size: 12.5px; color: #9CA3AF; text-decoration: none; }
    .lf-back:hover { color: #0A2650; }

    /* ── RESPONSIVE ── */
    @media (max-width: 900px) {
      .lp { grid-template-columns: 1fr; }
      .lp-left { padding: 40px 28px; }
      .lp-list, .lp-stats { display: none; }
      .lp-pitch { font-size: 18px; margin-bottom: 0; }
    }

    @media (max-width: 480px) {
      .lp-right { padding: 32px 20px; }
    }
  `,
})
export class ForgotPasswordComponent {
  step = signal<Step>('request');
  isLoading = signal(false);
  errorMessage = signal('');
  showNewPassword = false;
  showConfirmPassword = false;

  requestForm: FormGroup;
  confirmForm: FormGroup;

  private emailUsed = '';

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.requestForm = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
    this.confirmForm = this.fb.group(
      {
        code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      {
        validators: (g) => {
          const a = g.get('newPassword')?.value;
          const b = g.get('confirmPassword')?.value;
          return a && b && a !== b ? { mismatch: true } : null;
        },
      },
    );
  }

  onRequest(): void {
    if (this.requestForm.invalid) return;
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.emailUsed = this.requestForm.value.email;

    this.authService.requestPasswordReset(this.emailUsed).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.step.set('confirm');
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || "Erreur lors de l'envoi du code.");
      },
    });
  }

  onConfirm(): void {
    if (this.confirmForm.invalid) return;
    this.isLoading.set(true);
    this.errorMessage.set('');
    const { code, newPassword } = this.confirmForm.value;

    this.authService.confirmPasswordReset(this.emailUsed, code, newPassword).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.step.set('success');
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Code incorrect ou expiré.');
      },
    });
  }

  backToRequest(): void {
    this.errorMessage.set('');
    this.step.set('request');
  }
}
