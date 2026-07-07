import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService, ForgotPasswordRequest } from '../../../../core/services/auth.service';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LokAlerteComponent
  ],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <!-- Logo et titre -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-primary mb-2">WARAH</h1>
          <p class="text-gray-600">Réinitialisez votre mot de passe</p>
        </div>

        <!-- Alerte d'erreur -->
        @if (errorMessage) {
          <lok-alerte type="error" [message]="errorMessage"></lok-alerte>
        }

        <!-- Alerte de succès -->
        @if (successMessage) {
          <lok-alerte type="success" [message]="successMessage"></lok-alerte>
        }

        <!-- Étape 1 : Demande de réinitialisation -->
        @if (!showResetForm) {
          <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <p class="text-sm text-gray-600 mb-4">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                formControlName="email"
                class="input-field"
                placeholder="exemple@email.com"
              />
              @if (forgotPasswordForm.get('email')?.touched && forgotPasswordForm.get('email')?.invalid) {
                <p class="text-red-500 text-xs mt-1">Email invalide</p>
              }
            </div>

            <!-- Bouton submit -->
            <button
              type="submit"
              [disabled]="forgotPasswordForm.invalid || isLoading"
              class="btn-primary w-full"
            >
              @if (isLoading) {
                <svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Envoi en cours...
              } @else {
                Envoyer le lien
              }
            </button>
          </form>
        }

        <!-- Étape 2 : Formulaire de réinitialisation -->
        @if (showResetForm) {
          <form [formGroup]="resetPasswordForm" (ngSubmit)="onResetPassword()" class="space-y-6">
            <p class="text-sm text-gray-600 mb-4">
              Entrez votre nouveau mot de passe.
            </p>

            <!-- Nouveau mot de passe -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
              <input
                type="password"
                formControlName="nouveauMotDePasse"
                class="input-field"
                placeholder="••••••••"
              />
              @if (resetPasswordForm.get('nouveauMotDePasse')?.touched && resetPasswordForm.get('nouveauMotDePasse')?.invalid) {
                <p class="text-red-500 text-xs mt-1">
                  Le mot de passe doit contenir au moins 8 caractères
                </p>
              }
            </div>

            <!-- Confirmation mot de passe -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Confirmer le mot de passe</label>
              <input
                type="password"
                formControlName="confirmMotDePasse"
                class="input-field"
                placeholder="••••••••"
              />
              @if (resetPasswordForm.get('confirmMotDePasse')?.touched && resetPasswordForm.get('confirmMotDePasse')?.invalid) {
                <p class="text-red-500 text-xs mt-1">
                  @if (resetPasswordForm.get('confirmMotDePasse')?.errors?.['required']) {
                    La confirmation est requise
                  } @else {
                    Les mots de passe ne correspondent pas
                  }
                </p>
              }
            </div>

            <!-- Bouton submit -->
            <button
              type="submit"
              [disabled]="resetPasswordForm.invalid || isLoading"
              class="btn-primary w-full"
            >
              @if (isLoading) {
                <svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Réinitialisation...
              } @else {
                Réinitialiser le mot de passe
              }
            </button>
          </form>
        }

        <!-- Lien retour -->
        <p class="text-center text-sm text-gray-600 mt-6">
          <a routerLink="/auth/login" class="text-primary font-semibold hover:underline">
            Retour à la connexion
          </a>
        </p>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm: FormGroup;
  resetPasswordForm: FormGroup;
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  showResetForm: boolean = false;
  private resetToken: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.resetPasswordForm = this.fb.group({
      nouveauMotDePasse: ['', [Validators.required, Validators.minLength(8)]],
      confirmMotDePasse: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    // Vérifier si un token de réinitialisation est présent dans l'URL
    const token = this.route.snapshot.queryParams['token'];
    if (token) {
      this.resetToken = token;
      this.showResetForm = true;
    }
  }

  /**
   * Validateur personnalisé pour vérifier que les mots de passe correspondent
   */
  passwordMatchValidator(form: FormGroup): any {
    const password = form.get('nouveauMotDePasse')?.value;
    const confirmPassword = form.get('confirmMotDePasse')?.value;

    if (password !== confirmPassword) {
      form.get('confirmMotDePasse')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }

    return null;
  }

  /**
   * Soumet la demande de réinitialisation
   */
  onSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const data: ForgotPasswordRequest = {
      email: this.forgotPasswordForm.value.email
    };

    this.authService.forgotPassword(data).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.successMessage = 'Un lien de réinitialisation a été envoyé à votre adresse email.';
      },
      error: (error: any) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Une erreur est survenue lors de l\'envoi du lien';
      }
    });
  }

  /**
   * Soumet le formulaire de réinitialisation de mot de passe
   */
  onResetPassword(): void {
    if (this.resetPasswordForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.resetPassword({
      token: this.resetToken,
      nouveauMotDePasse: this.resetPasswordForm.value.nouveauMotDePasse
    }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.successMessage = 'Mot de passe réinitialisé avec succès ! Redirection vers la connexion...';
        
        // Rediriger vers la page de connexion après 2 secondes
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (error: any) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Une erreur est survenue lors de la réinitialisation';
      }
    });
  }
}
