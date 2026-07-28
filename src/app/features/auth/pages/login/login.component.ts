import { Component, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { DashboardService } from '../../../dashboard/services/dashboard.service';
import { environment } from '@env/environment';

@Component({
  selector: 'app-login',
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
            <h1 class="lf-title">Connexion</h1>
            <p class="lf-sub">Accédez à votre espace WARAH</p>
          </div>

          <!-- Formulaire -->
          <form [formGroup]="loginForm" (ngSubmit)="onLogin()" class="lf-form">

            <!-- Email -->
            <div class="lf-group">
              <label class="lf-label" for="email">Adresse email</label>
              <input id="email" type="email" formControlName="email" class="lf-input"
                [class.lf-error]="email?.touched && email?.invalid"
                placeholder="votre@email.com">
              <span class="lf-err-msg" *ngIf="email?.touched && email?.invalid">Adresse email invalide</span>
            </div>

            <!-- Mot de passe -->
            <div class="lf-group">
              <div class="lf-label-row">
                <label class="lf-label" for="password">Mot de passe</label>
                <a routerLink="/auth/forgot-password" class="lf-forgot">Mot de passe oublié</a>
              </div>
              <div class="lf-pw-wrap">
                <input id="password" [type]="showPassword ? 'text' : 'password'" formControlName="motDePasse" class="lf-input"
                  placeholder="••••••••">
                <button type="button" class="lf-eye" (click)="showPassword=!showPassword" aria-label="Afficher le mot de passe">
                  {{ showPassword ? 'Masquer' : 'Afficher' }}
                </button>
              </div>
            </div>

            <!-- Se souvenir -->
            <label class="lf-remember">
              <input type="checkbox" class="lf-check">
              <span class="lf-check-box"></span>
              <span>Se souvenir de moi</span>
            </label>

            <!-- Bouton -->
            <button type="submit" class="lf-btn" [disabled]="loginForm.invalid || isLoading">
              {{ isLoading ? 'Connexion…' : 'Se connecter' }}
            </button>

            <!-- Erreur -->
            <div *ngIf="errorMessage" class="lf-error-banner">{{ errorMessage }}</div>

          </form>

          <!-- Footer -->
          <p class="lf-footer">
            Pas encore inscrit ? <a routerLink="/auth/register" class="lf-register-link">Créer un compte</a>
          </p>

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
    .lf-sub { font-size: 14px; color: #6B7280; }

    .lf-form { display: flex; flex-direction: column; gap: 22px; margin-bottom: 28px; }

    .lf-group { display: flex; flex-direction: column; gap: 8px; }
    .lf-label { font-size: 13px; font-weight: 600; color: #374151; }
    .lf-label-row { display: flex; align-items: center; justify-content: space-between; }
    .lf-forgot { font-size: 12.5px; color: #0F4C81; text-decoration: none; }
    .lf-forgot:hover { text-decoration: underline; }

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

    .lf-pw-wrap { display: flex; align-items: center; gap: 10px; }
    .lf-pw-wrap .lf-input { flex: 1; }
    .lf-eye { background: none; border: none; cursor: pointer; font-size: 12px; color: #9CA3AF; padding: 0; white-space: nowrap; }
    .lf-eye:hover { color: #0A2650; }

    .lf-err-msg { font-size: 12px; color: #D64545; }

    .lf-remember { display: flex; align-items: center; gap: 9px; cursor: pointer; font-size: 13px; color: #4B5563; }
    .lf-check { display: none; }
    .lf-check-box {
      position: relative; width: 16px; height: 16px;
      border: 1.5px solid #D1D5DB; border-radius: 4px; flex-shrink: 0;
    }
    .lf-check:checked + .lf-check-box { background: #0A2650; border-color: #0A2650; }
    .lf-check:checked + .lf-check-box::after {
      content: ''; position: absolute; left: 4px; top: 1px; width: 5px; height: 8px;
      border: solid white; border-width: 0 1.5px 1.5px 0; transform: rotate(45deg);
    }

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
    }
    .lf-btn:hover:not(:disabled) { background: #081E41; }
    .lf-btn:disabled { opacity: .45; cursor: not-allowed; }

    .lf-error-banner {
      background: #FDF1F1;
      border-left: 3px solid #D64545;
      padding: 10px 14px;
      color: #A02929;
      font-size: 13px;
    }

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
  `
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;
  emailFocused = false;
  passwordFocused = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private dashboardService: DashboardService,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      motDePasse: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate([this.authService.getDefaultRoute()]);
      return;
    }
    // /health/ready = @Public(), exécute SELECT 1 → chauffe la connexion
    // TCP ET le pool Prisma pendant que l'utilisateur saisit ses identifiants.
    fetch(`${environment.apiUrl}/health/ready`).catch(() => {});
  }

  get email() { return this.loginForm.get('email'); }
  get motDePasse() { return this.loginForm.get('motDePasse'); }

  onLogin(): void {
    if (this.loginForm.invalid) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.authService.login(
      this.loginForm.value.email,
      this.loginForm.value.motDePasse,
    ).subscribe({
      next: () => {
        this.isLoading = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const dest = returnUrl ?? this.authService.getDefaultRoute();
        // Pre-fetch dashboard pendant la navigation Angular (~20 ms) : quand
        // le composant monte et subscribe, la réponse est déjà en vol.
        if (!returnUrl && dest === '/dashboard') {
          this.dashboardService.invalidateCache();
          this.dashboardService.getKPIs().subscribe({ error: () => {} });
        }
        this.router.navigate([dest]);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect'
          : (err?.error?.message ?? 'Erreur de connexion');
      },
    });
  }
}
