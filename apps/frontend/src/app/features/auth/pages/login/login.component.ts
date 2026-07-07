import { Component, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ParticlesBackgroundComponent } from '../../../../shared/components/particles-background/particles-background.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ParticlesBackgroundComponent
  ],
  template: `
    <div class="login-container">
      <app-particles-background></app-particles-background>

      <!-- Badges flottants -->
      <div class="floating-badge badge-top-left">
        <span class="badge-icon">🏠</span>
        <span class="badge-text">1 200+ annonces au Togo</span>
      </div>
      <div class="floating-badge badge-bottom-right">
        <span class="badge-icon">⭐</span>
        <span class="badge-text">4.9/5 · Propriétaires satisfaits</span>
      </div>

      <!-- Carte centrale glassmorphism -->
      <div class="login-card">
        <!-- Logo et badge -->
        <div class="card-logo">
          <img src="/assets/warah-logo.png" alt="WARAH" class="logo-img">
        </div>
        <div class="security-badge">
          <span class="badge-icon">🔒</span>
          <span class="badge-text">Connexion sécurisée</span>
        </div>

        <!-- Header -->
        <div class="card-header">
          <h1 class="header-title">Bon retour 👋</h1>
          <p class="header-subtitle">Heureux de vous revoir sur WARAH</p>
        </div>

        <!-- Formulaire -->
        <form [formGroup]="loginForm" (ngSubmit)="onLogin()" class="login-form">
          <!-- Email -->
          <div class="form-group">
            <label class="form-label">Email</label>
            <div class="input-wrapper" [class.focused]="emailFocused">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <input 
                type="email" 
                formControlName="email" 
                class="form-input" 
                placeholder="votre@email.com"
                (focus)="emailFocused = true"
                (blur)="emailFocused = false"
              />
              <div class="focus-line" [class.active]="emailFocused"></div>
            </div>
            <div class="error-message" *ngIf="email?.touched && email?.invalid">Email invalide</div>
          </div>

          <!-- Mot de passe -->
          <div class="form-group">
            <label class="form-label">Mot de passe</label>
            <div class="input-wrapper" [class.focused]="passwordFocused">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input 
                [type]="showPassword ? 'text' : 'password'" 
                formControlName="motDePasse" 
                class="form-input" 
                placeholder="••••••••"
                (focus)="passwordFocused = true"
                (blur)="passwordFocused = false"
              />
              <button type="button" class="toggle-password" (click)="showPassword = !showPassword">
                <svg *ngIf="!showPassword" class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <svg *ngIf="showPassword" class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              </button>
              <div class="focus-line" [class.active]="passwordFocused"></div>
            </div>
            <div class="form-actions">
              <label class="remember-me">
                <input type="checkbox" class="remember-checkbox">
                <span class="remember-text">Se souvenir de moi</span>
              </label>
              <a routerLink="/auth/forgot-password" class="forgot-password">Mot de passe oublié ?</a>
            </div>
          </div>

          <!-- Bouton connexion -->
          <button type="submit" class="submit-btn" [disabled]="loginForm.invalid || isLoading">
            <div class="shimmer"></div>
            <svg *ngIf="isLoading" class="spinner" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span *ngIf="isLoading">Connexion...</span>
            <span *ngIf="!isLoading">Se connecter</span>
          </button>
        </form>

        <!-- Footer -->
        <div class="card-footer">
          <span class="footer-text">Pas encore inscrit ?</span>
          <a routerLink="/auth/register" class="footer-link">Créez un compte</a>
        </div>

        <!-- Accès rapide dev -->
        <div class="dev-section">
          <div class="dev-divider">
            <span class="dev-label">Accès rapide · Dev</span>
          </div>
          <div class="dev-cards">

            <button type="button" class="dev-card dev-card-blue" (click)="connexionRapide('proprietaire')">
              <div class="dev-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <div class="dev-card-info">
                <p class="dev-card-name">Propriétaire</p>
                <p class="dev-card-route">/dashboard</p>
              </div>
              <svg class="dev-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>

            <button type="button" class="dev-card dev-card-green" (click)="connexionRapide('locataire')">
              <div class="dev-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div class="dev-card-info">
                <p class="dev-card-name">Locataire</p>
                <p class="dev-card-route">/locataire</p>
              </div>
              <svg class="dev-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>

            <button type="button" class="dev-card dev-card-gold" (click)="connexionRapide('gestionnaire')">
              <div class="dev-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                </svg>
              </div>
              <div class="dev-card-info">
                <p class="dev-card-name">Gestionnaire</p>
                <p class="dev-card-route">/gestionnaire</p>
              </div>
              <svg class="dev-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>

            <button type="button" class="dev-card dev-card-red" (click)="connexionRapide('admin')">
              <div class="dev-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"></path>
                </svg>
              </div>
              <div class="dev-card-info">
                <p class="dev-card-name">Admin</p>
                <p class="dev-card-route">/admin</p>
              </div>
              <svg class="dev-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      position: relative;
      overflow: hidden;
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, var(--color-primary-50) 0%, #FFFFFF 60%);
    }

    .floating-badge {
      position: absolute;
      background: white;
      border: 1px solid var(--color-border);
      border-radius: 50px;
      padding: 0.75rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
      z-index: 2;
      animation: float 3s ease-in-out infinite;
    }

    .badge-top-left {
      top: 2rem;
      left: 2rem;
    }

    .badge-bottom-right {
      bottom: 2rem;
      right: 2rem;
      animation-delay: 0.5s;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }

    .badge-icon {
      font-size: 1rem;
    }

    .badge-text {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
    }

    .login-card {
      position: relative;
      background: white;
      border: 1px solid var(--color-border);
      border-radius: 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
      max-width: 480px;
      width: 100%;
      padding: 3rem;
      z-index: 3;
      animation: cardEnter 600ms ease-out;
    }

    @keyframes cardEnter {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .card-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .logo-img {
      height: 140px;
      width: auto;
      object-fit: contain;
      background: transparent !important;
      mix-blend-mode: multiply;
    }

    .logo-text {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-primary);
    }

    .security-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background: var(--color-primary-50);
      border: 1px solid var(--color-primary-100);
      border-radius: 50px;
      padding: 0.5rem 1rem;
      margin-bottom: 2rem;
      align-self: center;
    }

    .security-badge .badge-icon {
      font-size: 0.875rem;
    }

    .security-badge .badge-text {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-primary-dark);
    }

    .card-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .header-title {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 0.5rem;
    }

    .header-subtitle {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .form-group {
      position: relative;
    }

    .form-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text);
      margin-bottom: 0.5rem;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      background: white;
      border: 1px solid var(--color-border);
      border-radius: 12px;
      transition: all 0.2s;
      height: 52px;
    }

    .input-wrapper.focused {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(15, 76, 129, 0.12);
    }

    .input-icon {
      position: absolute;
      left: 1rem;
      width: 20px;
      height: 20px;
      color: var(--color-text-muted);
    }

    .form-input {
      width: 100%;
      padding: 0 3rem;
      background: transparent;
      border: none;
      border-radius: 12px;
      font-size: 0.9375rem;
      font-family: 'Inter', sans-serif;
      color: var(--color-text);
      height: 100%;
    }

    .form-input:focus {
      outline: none;
    }

    .form-input::placeholder {
      color: #9ca3af;
    }

    .focus-line {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2px;
      width: 0;
      background: var(--color-primary);
      transition: width 0.3s ease;
    }

    .focus-line.active {
      width: 100%;
    }

    .toggle-password {
      position: absolute;
      right: 1rem;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
    }

    .eye-icon {
      width: 20px;
      height: 20px;
      color: var(--color-text-muted);
    }

    .form-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
    }

    .remember-me {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .remember-checkbox {
      width: 16px;
      height: 16px;
      accent-color: var(--color-primary-light);
    }

    .remember-text {
      font-size: 0.8125rem;
      color: var(--color-text);
    }

    .forgot-password {
      font-size: 0.8125rem;
      color: var(--color-primary);
      text-decoration: none;
      transition: color 0.2s;
      font-weight: 500;
    }

    .forgot-password:hover {
      color: var(--color-primary-dark);
      text-decoration: underline;
    }

    .error-message {
      color: #EF4444;
      font-size: 0.8125rem;
      margin-top: 0.375rem;
      font-weight: 500;
    }

    .submit-btn {
      position: relative;
      width: 100%;
      padding: 1rem;
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      height: 52px;
      overflow: hidden;
    }

    .submit-btn:hover:not(:disabled) {
      filter: brightness(1.1);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(15, 76, 129, 0.4);
    }

    .submit-btn:active:not(:disabled) {
      transform: scale(0.98);
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .shimmer {
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s;
    }

    .submit-btn:hover .shimmer {
      left: 100%;
    }

    .spinner {
      width: 20px;
      height: 20px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .card-footer {
      text-align: center;
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    .footer-text {
      margin-right: 0.25rem;
    }

    .footer-link {
      color: var(--color-primary);
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s;
    }

    .footer-link:hover {
      color: var(--color-primary-dark);
      text-decoration: underline;
    }

    .dev-section {
      margin-top: 1.5rem;
    }

    .dev-divider {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.875rem;
    }

    .dev-divider::before,
    .dev-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--color-border);
    }

    .dev-label {
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--color-text-muted);
      white-space: nowrap;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .dev-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.625rem;
    }

    .dev-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 12px;
      border-radius: 11px;
      border: 1.5px solid transparent;
      background: #F8FAFC;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s;
      min-height: 52px;
    }

    .dev-card:hover {
      background: white;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .dev-card-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .dev-card-icon svg {
      width: 15px;
      height: 15px;
    }

    .dev-card-info {
      flex: 1;
      min-width: 0;
    }

    .dev-card-name {
      font-size: 12.5px;
      font-weight: 700;
      line-height: 1.2;
    }

    .dev-card-route {
      font-size: 10.5px;
      font-weight: 500;
      margin-top: 1px;
      opacity: 0.6;
    }

    .dev-card-arrow {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      opacity: 0.35;
      transition: opacity 0.15s;
    }

    .dev-card:hover .dev-card-arrow { opacity: 0.8; }

    /* Couleurs par rôle */
    .dev-card-blue { border-color: rgba(15,76,129,0.15); }
    .dev-card-blue:hover { border-color: var(--color-primary); }
    .dev-card-blue .dev-card-icon { background: rgba(15,76,129,0.1); }
    .dev-card-blue .dev-card-icon svg { stroke: var(--color-primary); }
    .dev-card-blue .dev-card-name { color: var(--color-primary); }
    .dev-card-blue .dev-card-route { color: var(--color-primary); }
    .dev-card-blue .dev-card-arrow { stroke: var(--color-primary); }

    .dev-card-green { border-color: rgba(16,185,129,0.15); }
    .dev-card-green:hover { border-color: #10B981; }
    .dev-card-green .dev-card-icon { background: rgba(16,185,129,0.1); }
    .dev-card-green .dev-card-icon svg { stroke: #10B981; }
    .dev-card-green .dev-card-name { color: #059669; }
    .dev-card-green .dev-card-route { color: #059669; }
    .dev-card-green .dev-card-arrow { stroke: #10B981; }

    .dev-card-gold { border-color: rgba(201,152,46,0.2); }
    .dev-card-gold:hover { border-color: var(--color-accent); }
    .dev-card-gold .dev-card-icon { background: rgba(201,152,46,0.12); }
    .dev-card-gold .dev-card-icon svg { stroke: var(--color-accent); }
    .dev-card-gold .dev-card-name { color: #92700e; }
    .dev-card-gold .dev-card-route { color: #92700e; }
    .dev-card-gold .dev-card-arrow { stroke: var(--color-accent); }

    .dev-card-red { border-color: rgba(239,68,68,0.15); }
    .dev-card-red:hover { border-color: #EF4444; }
    .dev-card-red .dev-card-icon { background: rgba(239,68,68,0.1); }
    .dev-card-red .dev-card-icon svg { stroke: #EF4444; }
    .dev-card-red .dev-card-name { color: #DC2626; }
    .dev-card-red .dev-card-route { color: #DC2626; }
    .dev-card-red .dev-card-arrow { stroke: #EF4444; }

    @media (max-width: 768px) {
      .floating-badge {
        display: none;
      }

      .login-card {
        padding: 2rem;
        max-width: 90%;
      }
    }

    @media (max-width: 480px) {
      .login-container {
        padding: 1rem;
      }

      .login-card {
        padding: 1.5rem;
        max-width: 100%;
      }

      .header-title {
        font-size: 1.5rem;
      }
    }
  `
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading: boolean = false;
  showPassword: boolean = false;
  emailFocused: boolean = false;
  passwordFocused: boolean = false;
  mousePosition = { x: 0, y: 0 };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      motDePasse: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.mousePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const x = (event.clientX / window.innerWidth - 0.5) * 20;
    const y = (event.clientY / window.innerHeight - 0.5) * 20;
    this.mousePosition = { x, y };
  }

  get email() { return this.loginForm.get('email'); }
  get motDePasse() { return this.loginForm.get('motDePasse'); }

  onSubmitClick() {
    // Animation de clic
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;

    setTimeout(() => {
      this.isLoading = false;
      this.router.navigate(['/dashboard']);
    }, 1000);
  }

  connexionRapide(role: 'proprietaire' | 'locataire' | 'gestionnaire' | 'admin'): void {
    const users: Record<string, { prenom: string; nom: string; email: string; role: string }> = {
      proprietaire: { prenom: 'Kofi', nom: 'Mensah', email: 'kofi@warah.tg', role: 'proprietaire' },
      locataire:    { prenom: 'Awa', nom: 'Koné', email: 'awa@warah.tg', role: 'locataire' },
      gestionnaire: { prenom: 'Yao', nom: 'Koffi', email: 'yao@warah.tg', role: 'gestionnaire' },
      admin:        { prenom: 'Admin', nom: 'WARAH', email: 'admin@warah.tg', role: 'admin' },
    };

    const routes: Record<string, string> = {
      proprietaire: '/dashboard',
      locataire:    '/locataire',
      gestionnaire: '/gestionnaire',
      admin:        '/admin',
    };

    localStorage.setItem('warah_token', `dev-token-${role}`);
    localStorage.setItem('warah_user', JSON.stringify({
      id: role,
      ...users[role],
      telephone: '+22890000000',
      ville: 'Lomé',
    }));

    this.router.navigate([routes[role]]);
  }
}
