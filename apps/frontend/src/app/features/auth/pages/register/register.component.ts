import { Component, OnInit, HostListener, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { ParticlesBackgroundComponent } from '../../../../shared/components/particles-background/particles-background.component';
import { AuthService } from '../../../../core/services/auth.service';

export type UserType = 'proprietaire_local' | 'proprietaire_diaspora' | 'locataire' | 'gestionnaire';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ParticlesBackgroundComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-12px)' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  template: `
    <div class="register-container">
      <app-particles-background></app-particles-background>

      <div class="glass-container">
        <!-- Panneau gauche -->
        <div class="left-panel">
          <div class="left-content">
            <div class="logo">
              <img src="/assets/warah-logo.png" alt="WARAH" class="logo-img">
            </div>
            <h1 class="hero-title">L'immobilier togolais dans votre poche</h1>
            <div class="features">
              <div class="feature-item">
                <svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span>Gérez vos biens à distance</span>
              </div>
              <div class="feature-item">
                <svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                  <line x1="2" y1="10" x2="22" y2="10"></line>
                </svg>
                <span>Encaissez via T-Money & Flooz</span>
              </div>
              <div class="feature-item">
                <svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                <span>Statistiques en temps réel</span>
              </div>
            </div>
            <div class="testimonial">
              <div class="testimonial-avatar">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div class="testimonial-content">
                <div class="testimonial-stars">★★★★★</div>
                <p class="testimonial-quote">"WARAH a transformé la gestion de mes biens. Simple, efficace."</p>
                <p class="testimonial-author">Kofi Mensah · Propriétaire</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Panneau droit -->
        <div class="right-panel">
          <div class="right-content">
            <div class="panel-header">
              <h1 class="page-title">Créer votre compte</h1>
              <a routerLink="/auth/login" class="login-link">Déjà inscrit ? Se connecter →</a>
            </div>

            <!-- Sélection du type en pills compactes -->
            <p class="type-label">Vous êtes…</p>
            <div class="type-pills">
              <button type="button" class="type-pill" [class.active]="selectedUserType === 'proprietaire_local'" (click)="selectUserType('proprietaire_local')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                </svg>
                Proprio local
              </button>
              <button type="button" class="type-pill" [class.active]="selectedUserType === 'proprietaire_diaspora'" (click)="selectUserType('proprietaire_diaspora')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 2L11 13"></path><path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
                </svg>
                Diaspora
              </button>
              <button type="button" class="type-pill" [class.active]="selectedUserType === 'locataire'" (click)="selectUserType('locataire')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                Locataire
              </button>
              <button type="button" class="type-pill" [class.active]="selectedUserType === 'gestionnaire'" (click)="selectUserType('gestionnaire')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect>
                </svg>
                Gestionnaire
              </button>
            </div>

            @if (!selectedUserType) {
              <p class="select-hint">Sélectionnez votre profil pour continuer</p>
            }

            <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form" [@slideDown] *ngIf="selectedUserType">
              <!-- Nom + Prénom -->
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Nom</label>
                  <div class="input-wrapper">
                    <input type="text" formControlName="nom" class="form-input" placeholder="Votre nom">
                    <div class="focus-line"></div>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Prénom</label>
                  <div class="input-wrapper">
                    <input type="text" formControlName="prenom" class="form-input" placeholder="Votre prénom">
                    <div class="focus-line"></div>
                  </div>
                </div>
              </div>

              <!-- Email + Téléphone -->
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <div class="input-wrapper">
                    <input type="email" formControlName="email" class="form-input" placeholder="votre@email.com">
                    <div class="focus-line"></div>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Téléphone</label>
                  <div class="phone-input-wrapper">
                    <span class="phone-prefix">+228</span>
                    <input type="tel" formControlName="telephone" class="form-input phone-input" placeholder="90 00 00 00">
                  </div>
                </div>
              </div>

              <!-- Mot de passe + Confirmation -->
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Mot de passe</label>
                  <div class="input-wrapper">
                    <input type="password" formControlName="motDePasse" class="form-input" placeholder="••••••••">
                    <div class="focus-line"></div>
                  </div>
                  <div class="strength-track">
                    <div class="strength-fill"
                      [class.weak]="passwordStrength < 40"
                      [class.medium]="passwordStrength >= 40 && passwordStrength < 80"
                      [class.strong]="passwordStrength >= 80"
                      [style.width.%]="passwordStrength">
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Confirmer</label>
                  <div class="input-wrapper">
                    <input type="password" formControlName="confirmMotDePasse" class="form-input" placeholder="••••••••">
                    <div class="focus-line"></div>
                  </div>
                </div>
              </div>

              <div class="terms-group">
                <label class="custom-checkbox">
                  <input type="checkbox" formControlName="acceptTerms">
                  <span class="checkmark"></span>
                  <span class="terms-text">J'accepte les <a href="#" class="terms-link">Conditions d'utilisation</a> et la <a href="#" class="terms-link">Politique de confidentialité</a> de WARAH</span>
                </label>
              </div>

              <button type="submit" class="submit-btn" [disabled]="registerForm.invalid || isLoading">
                <div class="shimmer"></div>
                <svg *ngIf="isLoading" class="spinner" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ isLoading ? 'Création en cours...' : 'Créer mon compte gratuitement' }}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    .register-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, var(--color-primary-50) 0%, #FFFFFF 60%);
    }

    .glass-container {
      position: relative;
      max-width: 1080px;
      width: 100%;
      background: white;
      border: 1px solid var(--color-border);
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
      z-index: 3;
      display: flex;
      overflow: hidden;
      animation: containerEnter 500ms ease-out;
    }

    @keyframes containerEnter {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Panneau gauche ── */
    .left-panel {
      flex: 0 0 38%;
      background: linear-gradient(160deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
      padding: 2.5rem 2rem;
      display: flex;
      flex-direction: column;
      color: white;
    }

    .left-content {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .logo { margin-bottom: 1.5rem; }

    .logo-img {
      height: 110px;
      width: auto;
      object-fit: contain;
    }

    .hero-title {
      font-size: 1.6rem;
      font-weight: 700;
      line-height: 1.25;
      margin-bottom: 1.5rem;
    }

    .features { margin-bottom: auto; }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.875rem;
      font-size: 0.9375rem;
    }

    .feature-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      opacity: 0.85;
    }

    .testimonial {
      display: flex;
      gap: 0.75rem;
      padding: 0.875rem;
      background: rgba(255,255,255,0.07);
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.12);
      margin-top: 1.5rem;
    }

    .testimonial-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255,255,255,0.18);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .testimonial-avatar svg { width: 20px; height: 20px; color: white; }

    .testimonial-stars { color: var(--color-accent); font-size: 0.75rem; margin-bottom: 0.25rem; }

    .testimonial-quote {
      font-size: 0.8125rem;
      opacity: 0.9;
      font-style: italic;
      color: white;
      margin-bottom: 0.25rem;
    }

    .testimonial-author {
      font-size: 0.75rem;
      font-weight: 500;
      color: rgba(255,255,255,0.7);
    }

    /* ── Panneau droit ── */
    .right-panel {
      flex: 1;
      background: white;
      padding: 2rem 2.5rem;
      overflow-y: auto;
    }

    .right-content { max-width: 560px; margin: 0 auto; }

    .panel-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .page-title {
      font-size: 1.625rem;
      font-weight: 700;
      color: var(--color-text);
      margin: 0;
    }

    .login-link {
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.8125rem;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .login-link:hover {
      color: var(--color-primary-dark);
      text-decoration: underline;
    }

    /* ── Pills de sélection de type ── */
    .type-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 0.625rem;
    }

    .type-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .type-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0 0.875rem;
      height: 40px;
      border: 1.5px solid var(--color-border);
      border-radius: 999px;
      background: white;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all 0.18s ease;
      font-family: 'Inter', sans-serif;
    }

    .type-pill svg {
      width: 14px;
      height: 14px;
    }

    .type-pill:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: var(--color-primary-50);
    }

    .type-pill.active {
      border-color: var(--color-primary);
      background: var(--color-primary);
      color: white;
    }

    .select-hint {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      text-align: center;
      padding: 1.5rem 0;
    }

    /* ── Formulaire ── */
    .register-form { }

    .form-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.875rem;
      margin-bottom: 0.875rem;
    }

    .form-group { }

    .form-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text);
      margin-bottom: 0.375rem;
    }

    .input-wrapper { position: relative; }

    .form-input {
      width: 100%;
      padding: 0 14px;
      background: white;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      font-size: 0.9375rem;
      font-family: 'Inter', sans-serif;
      transition: all 0.2s;
      color: var(--color-text);
      height: 46px;
      box-sizing: border-box;
    }

    .form-input:-webkit-autofill,
    .form-input:-webkit-autofill:hover,
    .form-input:-webkit-autofill:focus {
      -webkit-box-shadow: 0 0 0px 1000px white inset !important;
      -webkit-text-fill-color: var(--color-text) !important;
      border: 1px solid var(--color-border) !important;
      transition: background-color 5000s ease-in-out 0s;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(15, 76, 129, 0.1);
    }

    .form-input::placeholder { color: #9ca3af; }

    .focus-line {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2px;
      width: 0;
      background: var(--color-primary);
      border-radius: 0 0 10px 10px;
      transition: width 0.3s ease;
    }

    .input-wrapper:focus-within .focus-line { width: 100%; }

    .phone-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .phone-prefix {
      position: absolute;
      left: 0.875rem;
      font-size: 0.875rem;
      color: var(--color-text-muted);
      pointer-events: none;
    }

    .phone-input { padding-left: 3.75rem; }

    /* Barre de force du mot de passe */
    .strength-track {
      height: 3px;
      background: var(--color-border);
      border-radius: 2px;
      margin-top: 0.375rem;
      overflow: hidden;
    }

    .strength-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.3s ease, background 0.3s ease;
    }

    .strength-fill.weak   { background: #EF4444; }
    .strength-fill.medium { background: #F59E0B; }
    .strength-fill.strong { background: #10B981; }

    /* CGU */
    .terms-group { margin: 0.875rem 0; }

    .custom-checkbox {
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
      cursor: pointer;
    }

    .custom-checkbox input { display: none; }

    .checkmark {
      width: 18px;
      height: 18px;
      border: 2px solid var(--color-border);
      border-radius: 4px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      margin-top: 1px;
    }

    .custom-checkbox input:checked + .checkmark {
      background: var(--color-primary);
      border-color: var(--color-primary);
    }

    .custom-checkbox input:checked + .checkmark::after {
      content: '✓';
      color: white;
      font-size: 11px;
    }

    .terms-text { font-size: 0.8125rem; color: var(--color-text-muted); line-height: 1.4; }

    .terms-link {
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;
    }

    .terms-link:hover {
      color: var(--color-primary-dark);
      text-decoration: underline;
    }

    /* Bouton de soumission */
    .submit-btn {
      position: relative;
      width: 100%;
      padding: 0 1rem;
      background: linear-gradient(135deg, var(--color-accent), var(--color-accent-light));
      color: var(--color-primary-900);
      border: none;
      border-radius: 10px;
      font-size: 0.9375rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      height: 50px;
      overflow: hidden;
      font-family: 'Inter', sans-serif;
    }

    .submit-btn:hover:not(:disabled) {
      filter: brightness(1.08);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(201, 152, 46, 0.35);
    }

    .submit-btn:active:not(:disabled) { transform: scale(0.98); }

    .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .shimmer {
      position: absolute;
      top: 0; left: -100%;
      width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent);
      transition: left 0.5s;
    }

    .submit-btn:hover .shimmer { left: 100%; }

    .spinner {
      width: 18px;
      height: 18px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .glass-container { flex-direction: column; max-width: 520px; }
      .left-panel { padding: 1.75rem; }
      .hero-title { font-size: 1.375rem; }
      .right-panel { padding: 1.75rem; }
      .panel-header { flex-direction: column; gap: 0.25rem; }
    }

    @media (max-width: 600px) {
      .register-container { padding: 0.75rem; }
      .glass-container { max-width: 100%; border-radius: 14px; }
      .left-panel { padding: 1.25rem; }
      .right-panel { padding: 1.25rem; }
      .form-row { grid-template-columns: 1fr; gap: 0; }
      .form-row .form-group { margin-bottom: 0.875rem; }
      .type-pills { gap: 0.375rem; }
      .type-pill { font-size: 0.75rem; padding: 0 0.75rem; height: 36px; }
    }

    @media (max-width: 400px) {
      .glass-container { border-radius: 0; }
    }
  `
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  selectedUserType: UserType | null = null;
  isLoading: boolean = false;
  animatedCount: number = 0;
  passwordStrength: number = 0;
  mousePosition = { x: 0, y: 0 };
  showSuccess: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {
    this.registerForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', Validators.required],
      motDePasse: ['', [Validators.required, Validators.minLength(8)]],
      confirmMotDePasse: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue]
    });
  }

  get nom() { return this.registerForm.get('nom'); }
  get prenom() { return this.registerForm.get('prenom'); }
  get email() { return this.registerForm.get('email'); }
  get telephone() { return this.registerForm.get('telephone'); }
  get motDePasse() { return this.registerForm.get('motDePasse'); }
  get confirmMotDePasse() { return this.registerForm.get('confirmMotDePasse'); }

  get accountTypeLabel(): string {
    const labels: Record<UserType, string> = {
      proprietaire_local: 'Propriétaire Local',
      proprietaire_diaspora: 'Propriétaire Diaspora',
      locataire: 'Locataire',
      gestionnaire: 'Gestionnaire'
    };
    return this.selectedUserType ? labels[this.selectedUserType] : '';
  }

  ngOnInit(): void {
    this.animateCounter();
    this.mousePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    this.motDePasse?.valueChanges.subscribe(() => {
      this.calculatePasswordStrength();
    });
  }

  calculatePasswordStrength(): void {
    const password = this.motDePasse?.value || '';
    let strength = 0;

    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 15;
    if (/[a-z]/.test(password)) strength += 15;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 15;

    this.passwordStrength = Math.min(strength, 100);
    this.cdr.markForCheck();
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const x = (event.clientX / window.innerWidth - 0.5) * 20;
    const y = (event.clientY / window.innerHeight - 0.5) * 20;
    this.mousePosition = { x, y };
  }

  animateCounter(): void {
    const target = 500;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;

    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      this.animatedCount = Math.floor(current);
      this.cdr.markForCheck();
    }, duration / steps);
  }

  selectUserType(type: UserType): void {
    this.selectedUserType = type;
    this.cdr.markForCheck();
  }

  onSubmit(): void {
    if (this.registerForm.invalid || !this.selectedUserType) {
      return;
    }

    this.isLoading = true;

    const registerData = {
      prenom: this.prenom?.value,
      nom: this.nom?.value,
      email: this.email?.value,
      telephone: this.telephone?.value,
      motDePasse: this.motDePasse?.value,
      typeUtilisateur: this.selectedUserType
    };

    setTimeout(() => {
      this.isLoading = false;

      const mockResponse = {
        token: 'mock_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
        utilisateur: {
          id: 'user_' + Date.now(),
          prenom: this.prenom?.value,
          nom: this.nom?.value,
          email: this.email?.value,
          telephone: this.telephone?.value,
          ville: 'Lomé'
        }
      };

      localStorage.setItem('warah_token', mockResponse.token);
      localStorage.setItem('warah_refresh_token', mockResponse.refreshToken);
      localStorage.setItem('warah_user', JSON.stringify(mockResponse.utilisateur));

      const redirectMap: Record<UserType, string> = {
        proprietaire_local: '/proprietaires/dashboard',
        proprietaire_diaspora: '/proprietaires/dashboard',
        locataire: '/locataires/dashboard',
        gestionnaire: '/gestionnaire/dashboard'
      };

      const redirectPath = redirectMap[this.selectedUserType!];
      this.router.navigate([redirectPath]);
    }, 2000);
  }
}
