import { Component, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="lp">

      <!-- ── Panneau gauche ── -->
      <div class="lp-left">
        <div class="lp-left-inner">

          <!-- Logo -->
          <a routerLink="/" class="lp-logo">
            <div class="lp-logo-bg">
              <img src="/assets/WARAH-logo.png" alt="WARAH" class="lp-logo-img">
            </div>
          </a>

          <!-- Accroche -->
          <div class="lp-pitch">
            <h2 class="lp-pitch-title">Gérez vos biens<br>en toute sérénité</h2>
            <p class="lp-pitch-sub">La plateforme de gestion immobilière pensée pour les propriétaires, locataires et gestionnaires immobiliers du Togo.</p>
          </div>

          <!-- Features -->
          <ul class="lp-feats">
            <li class="lp-feat">
              <span class="lp-feat-ic">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 2L3 7v11h5v-5h4v5h5V7z"/></svg>
              </span>
              <div>
                <span class="lp-feat-title">Gestion multi-biens</span>
                <span class="lp-feat-desc">Villas, appartements, studios — tout en un</span>
              </div>
            </li>
            <li class="lp-feat">
              <span class="lp-feat-ic">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="4" width="16" height="13" rx="2"/><path d="M2 8h16"/><path d="M6 12h2M10 12h4"/></svg>
              </span>
              <div>
                <span class="lp-feat-title">Paiements T-Money & Flooz</span>
                <span class="lp-feat-desc">Loyers encaissés automatiquement</span>
              </div>
            </li>
            <li class="lp-feat">
              <span class="lp-feat-ic">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </span>
              <div>
                <span class="lp-feat-title">Alertes impayés en temps réel</span>
                <span class="lp-feat-desc">Notifications SMS & in-app instantanées</span>
              </div>
            </li>
            <li class="lp-feat">
              <span class="lp-feat-ic">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16l8-3 8 3V4a2 2 0 0 0-2-2z"/></svg>
              </span>
              <div>
                <span class="lp-feat-title">Contrats de bail PDF</span>
                <span class="lp-feat-desc">Génération et archivage automatiques</span>
              </div>
            </li>
          </ul>

          <!-- Stats -->
          <div class="lp-stats">
            <div class="lp-stat">
              <span class="lp-stat-n">1 200+</span>
              <span class="lp-stat-l">Annonces actives</span>
            </div>
            <div class="lp-stat-sep"></div>
            <div class="lp-stat">
              <span class="lp-stat-n">500+</span>
              <span class="lp-stat-l">Propriétaires</span>
            </div>
            <div class="lp-stat-sep"></div>
            <div class="lp-stat">
              <span class="lp-stat-n">4.9★</span>
              <span class="lp-stat-l">Satisfaction</span>
            </div>
          </div>

        </div>
      </div>

      <!-- ── Panneau droit ── -->
      <div class="lp-right">
        <div class="lp-form-wrap">

          <!-- Header -->
          <div class="lf-head">
            <h1 class="lf-title">Bon retour 👋</h1>
            <p class="lf-sub">Connectez-vous à votre espace WARAH</p>
          </div>

          <!-- Formulaire -->
          <form [formGroup]="loginForm" (ngSubmit)="onLogin()" class="lf-form">

            <!-- Email -->
            <div class="lf-group">
              <label class="lf-label">Adresse email</label>
              <div class="lf-input-wrap" [class.lf-focused]="emailFocused" [class.lf-error]="email?.touched && email?.invalid">
                <svg class="lf-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                  <path d="M3 5h14c.6 0 1 .4 1 1v8c0 .6-.4 1-1 1H3c-.6 0-1-.4-1-1V6c0-.6.4-1 1-1z"/><path d="M18 6l-8 6-8-6"/>
                </svg>
                <input type="email" formControlName="email" class="lf-input"
                  placeholder="votre@email.com"
                  (focus)="emailFocused=true" (blur)="emailFocused=false">
              </div>
              <span class="lf-err-msg" *ngIf="email?.touched && email?.invalid">Adresse email invalide</span>
            </div>

            <!-- Mot de passe -->
            <div class="lf-group">
              <div class="lf-label-row">
                <label class="lf-label">Mot de passe</label>
                <a routerLink="/auth/forgot-password" class="lf-forgot">Mot de passe oublié ?</a>
              </div>
              <div class="lf-input-wrap" [class.lf-focused]="passwordFocused">
                <svg class="lf-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                  <rect x="3" y="9" width="14" height="9" rx="1.5"/><path d="M7 9V6a3 3 0 0 1 6 0v3"/>
                </svg>
                <input [type]="showPassword ? 'text' : 'password'" formControlName="motDePasse" class="lf-input"
                  placeholder="••••••••"
                  (focus)="passwordFocused=true" (blur)="passwordFocused=false">
                <button type="button" class="lf-eye" (click)="showPassword=!showPassword" aria-label="Afficher le mot de passe">
                  <svg *ngIf="!showPassword" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                    <path d="M1 10s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z"/><circle cx="10" cy="10" r="2.5"/>
                  </svg>
                  <svg *ngIf="showPassword" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                    <path d="M14.5 14.5A8.4 8.4 0 0 1 10 17c-5.5 0-9-7-9-7a15.6 15.6 0 0 1 4.5-5.5M8.1 3.3A8.2 8.2 0 0 1 10 3c5.5 0 9 7 9 7a15.6 15.6 0 0 1-2.1 3M1 1l18 18"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Se souvenir -->
            <label class="lf-remember">
              <input type="checkbox" class="lf-check">
              <span class="lf-check-box"></span>
              <span class="lf-remember-txt">Se souvenir de moi</span>
            </label>

            <!-- Bouton -->
            <button type="submit" class="lf-btn" [disabled]="loginForm.invalid || isLoading">
              <svg *ngIf="isLoading" class="lf-spinner" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" stroke-width="4"/>
                <path fill="white" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
              </svg>
              <span>{{ isLoading ? 'Connexion…' : 'Se connecter' }}</span>
              <svg *ngIf="!isLoading" viewBox="0 0 20 20" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" class="lf-arrow">
                <path d="M4 10h12M10 4l6 6-6 6"/>
              </svg>
            </button>

            <!-- Erreur -->
            <div *ngIf="errorMessage" class="lf-error-banner">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="10" cy="10" r="8"/><path d="M10 6v4M10 14h.01"/>
              </svg>
              {{ errorMessage }}
            </div>

          </form>

          <!-- Footer -->
          <p class="lf-footer">
            Pas encore inscrit ?
            <a routerLink="/auth/register" class="lf-register-link">Créez un compte gratuitement</a>
          </p>

          <!-- Retour accueil -->
          <a routerLink="/" class="lf-back">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M15 10H5M10 4l-6 6 6 6"/>
            </svg>
            Retour à l'accueil
          </a>

        </div>
      </div>

    </div>
  `,
  styles: `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .lp {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1fr 1fr;
      font-family: 'Inter', system-ui, sans-serif;
    }

    /* ── PANNEAU GAUCHE ── */
    .lp-left {
      background: linear-gradient(150deg, #081E41 0%, #0A2650 45%, #0F4C81 100%);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      padding: 48px 40px;
    }

    /* Décor lumineux */
    .lp-left::before {
      content: '';
      position: absolute;
      top: -120px;
      right: -80px;
      width: 400px;
      height: 400px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(201,152,46,0.12) 0%, transparent 70%);
      pointer-events: none;
    }
    .lp-left::after {
      content: '';
      position: absolute;
      bottom: -80px;
      left: -60px;
      width: 320px;
      height: 320px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(15,76,129,0.4) 0%, transparent 70%);
      pointer-events: none;
    }

    .lp-left-inner {
      position: relative;
      z-index: 2;
      max-width: 440px;
      width: 100%;
    }

    .lp-logo { display: block; margin-bottom: 40px; }
    .lp-logo-bg {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: white;
      border-radius: 24px;
      padding: 24px 40px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.25);
    }
    .lp-logo-img {
      height: 160px;
      width: auto;
      object-fit: contain;
      display: block;
    }

    .lp-pitch { margin-bottom: 40px; }
    .lp-pitch-title {
      font-size: clamp(22px, 2.4vw, 32px);
      font-weight: 800;
      color: white;
      line-height: 1.2;
      margin-bottom: 14px;
    }
    .lp-pitch-sub {
      font-size: 14.5px;
      color: rgba(255,255,255,0.68);
      line-height: 1.7;
    }

    .lp-feats { list-style: none; display: flex; flex-direction: column; gap: 18px; margin-bottom: 40px; }
    .lp-feat { display: flex; align-items: flex-start; gap: 14px; }
    .lp-feat-ic {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(201,152,46,0.15);
      border: 1px solid rgba(201,152,46,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .lp-feat-ic svg { width: 17px; height: 17px; stroke: #C9982E; }
    .lp-feat-title { display: block; font-size: 13.5px; font-weight: 700; color: white; margin-bottom: 2px; }
    .lp-feat-desc { font-size: 12px; color: rgba(255,255,255,0.55); }

    .lp-stats {
      display: flex;
      align-items: center;
      gap: 0;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      padding: 16px 24px;
    }
    .lp-stat { flex: 1; text-align: center; }
    .lp-stat-n { display: block; font-size: 18px; font-weight: 800; color: #C9982E; }
    .lp-stat-l { font-size: 11px; color: rgba(255,255,255,0.55); margin-top: 2px; display: block; }
    .lp-stat-sep { width: 1px; height: 36px; background: rgba(255,255,255,0.12); }

    /* ── PANNEAU DROIT ── */
    .lp-right {
      background: #F7F8FB;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 40px;
    }

    .lp-form-wrap {
      width: 100%;
      max-width: 420px;
      animation: fadeUp .5s ease-out;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .lf-head { margin-bottom: 32px; }
    .lf-title { font-size: 28px; font-weight: 800; color: #0A2650; margin-bottom: 6px; }
    .lf-sub { font-size: 14px; color: #6B7280; }

    .lf-form { display: flex; flex-direction: column; gap: 20px; margin-bottom: 28px; }

    .lf-group { display: flex; flex-direction: column; gap: 6px; }
    .lf-label { font-size: 13px; font-weight: 600; color: #374151; }
    .lf-label-row { display: flex; align-items: center; justify-content: space-between; }
    .lf-forgot { font-size: 12.5px; color: #0F4C81; font-weight: 500; text-decoration: none; }
    .lf-forgot:hover { text-decoration: underline; }

    .lf-input-wrap {
      display: flex;
      align-items: center;
      background: white;
      border: 1.5px solid #E5E7EB;
      border-radius: 12px;
      height: 52px;
      padding: 0 14px;
      gap: 10px;
      transition: border-color .2s, box-shadow .2s;
    }
    .lf-input-wrap.lf-focused {
      border-color: #0F4C81;
      box-shadow: 0 0 0 3px rgba(15,76,129,0.1);
    }
    .lf-input-wrap.lf-error { border-color: #EF4444; }
    .lf-icon { width: 18px; height: 18px; stroke: #9CA3AF; flex-shrink: 0; }
    .lf-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: 14.5px;
      color: #0A2650;
      font-family: inherit;
    }
    .lf-input::placeholder { color: #D1D5DB; }
    .lf-eye { background: none; border: none; cursor: pointer; padding: 4px; display: flex; }
    .lf-eye svg { width: 18px; height: 18px; stroke: #9CA3AF; }
    .lf-err-msg { font-size: 12px; color: #EF4444; }

    .lf-remember {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      margin-top: -4px;
    }
    .lf-check { display: none; }
    .lf-check-box {
      width: 18px;
      height: 18px;
      border: 1.5px solid #D1D5DB;
      border-radius: 5px;
      flex-shrink: 0;
      transition: all .2s;
    }
    .lf-check:checked + .lf-check-box {
      background: #0F4C81;
      border-color: #0F4C81;
    }
    .lf-remember-txt { font-size: 13px; color: #374151; }

    .lf-btn {
      width: 100%;
      height: 52px;
      background: linear-gradient(135deg, #0F4C81 0%, #0A2650 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: filter .2s, transform .15s, box-shadow .2s;
      margin-top: 4px;
    }
    .lf-btn:hover:not(:disabled) {
      filter: brightness(1.12);
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(15,76,129,0.35);
    }
    .lf-btn:active:not(:disabled) { transform: scale(0.98); }
    .lf-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .lf-arrow { width: 16px; height: 16px; }
    .lf-spinner { width: 18px; height: 18px; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .lf-error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: 10px;
      padding: 12px 14px;
      color: #DC2626;
      font-size: 13.5px;
    }
    .lf-error-banner svg { width: 16px; height: 16px; flex-shrink: 0; }

    .lf-footer {
      text-align: center;
      font-size: 13.5px;
      color: #6B7280;
      margin-bottom: 20px;
    }
    .lf-register-link {
      color: #0F4C81;
      font-weight: 700;
      text-decoration: none;
      margin-left: 4px;
    }
    .lf-register-link:hover { text-decoration: underline; }

    .lf-back {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
      color: #9CA3AF;
      text-decoration: none;
      transition: color .2s;
    }
    .lf-back:hover { color: #0F4C81; }
    .lf-back svg { width: 14px; height: 14px; }

    /* ── RESPONSIVE ── */
    @media (max-width: 900px) {
      .lp { grid-template-columns: 1fr; }
      .lp-left {
        padding: 40px 28px;
        min-height: auto;
      }
      .lp-feats { display: none; }
      .lp-stats { display: none; }
      .lp-pitch-title { font-size: 22px; }
      .lp-logo-bg { padding: 18px 28px; }
      .lp-logo-img { height: 100px; }
    }

    @media (max-width: 480px) {
      .lp-right { padding: 32px 20px; }
      .lf-title { font-size: 24px; }
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
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      motDePasse: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate([this.authService.getDefaultRoute()]);
    }
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
        this.router.navigate([returnUrl ?? this.authService.getDefaultRoute()]);
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
