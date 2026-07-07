import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService, Verify2FARequest } from '../../../../core/services/auth.service';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verify-2fa',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LokAlerteComponent
  ],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <!-- Logo et titre -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-primary mb-2">WARAH</h1>
          <p class="text-gray-600">Vérification en deux étapes</p>
        </div>

        <!-- Alerte d'erreur -->
        @if (errorMessage) {
          <lok-alerte type="error" [message]="errorMessage"></lok-alerte>
        }

        <!-- Alerte de succès -->
        @if (successMessage) {
          <lok-alerte type="success" [message]="successMessage"></lok-alerte>
        }

        <!-- Instructions -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <p class="text-sm text-blue-800 font-medium">Code de vérification envoyé</p>
              <p class="text-sm text-blue-600 mt-1">
                Un code à 6 chiffres a été envoyé à votre email <strong>{{ email }}</strong>.
                Ce code expire dans 15 minutes.
              </p>
            </div>
          </div>
        </div>

        <!-- Formulaire de vérification -->
        <form [formGroup]="verifyForm" (ngSubmit)="onSubmit()" class="space-y-6">
          <!-- Code de vérification -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Code de vérification</label>
            <input
              type="text"
              formControlName="code"
              class="input-field text-center text-2xl tracking-widest"
              placeholder="000000"
              maxlength="6"
              (input)="formatCode($event)"
            />
            @if (verifyForm.get('code')?.touched && verifyForm.get('code')?.invalid) {
              <p class="text-red-500 text-xs mt-1">
                @if (verifyForm.get('code')?.errors?.['required']) {
                  Le code est requis
                } @else {
                  Le code doit contenir 6 chiffres
                }
              </p>
            }
          </div>

          <!-- Timer de renvoi -->
          <div class="text-center">
            @if (canResend) {
              <button
                type="button"
                (click)="resendCode()"
                class="text-primary font-semibold hover:underline text-sm"
              >
                Renvoyer le code
              </button>
            } @else {
              <p class="text-sm text-gray-600">
                Renvoyer le code dans <strong>{{ countdown }} secondes</strong>
              </p>
            }
          </div>

          <!-- Bouton submit -->
          <button
            type="submit"
            [disabled]="verifyForm.invalid || isLoading"
            class="btn-primary w-full"
          >
            @if (isLoading) {
              <svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Vérification en cours...
            } @else {
              Vérifier
            }
          </button>
        </form>

        <!-- Lien pour annuler -->
        <p class="text-center text-sm text-gray-600 mt-6">
          <button
            type="button"
            (click)="cancel()"
            class="text-gray-600 hover:text-gray-800"
          >
            Annuler et retourner à la connexion
          </button>
        </p>
      </div>
    </div>
  `,
})
export class Verify2FAComponent implements OnInit {
  verifyForm: FormGroup;
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  email: string = '';
  countdown: number = 60;
  canResend: boolean = false;
  countdownInterval: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.verifyForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]]
    });
  }

  ngOnInit(): void {
    // Récupérer l'email depuis les query params ou le localStorage
    this.email = this.route.snapshot.queryParamMap.get('email') ||
                 localStorage.getItem('warah_2fa_email') || '';

    if (!this.email) {
      this.errorMessage = 'Email non trouvé. Veuillez vous reconnecter.';
      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 3000);
    } else {
      localStorage.setItem('warah_2fa_email', this.email);
      this.startCountdown();
    }
  }

  /**
   * Formate le code pour n'accepter que des chiffres
   */
  formatCode(event: any): void {
    const value = event.target.value.replace(/[^0-9]/g, '');
    event.target.value = value;
    this.verifyForm.patchValue({ code: value });
  }

  /**
   * Démarre le compte à rebours pour le renvoi du code
   */
  startCountdown(): void {
    this.canResend = false;
    this.countdown = 60;
    
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.canResend = true;
        clearInterval(this.countdownInterval);
      }
    }, 1000);
  }

  /**
   * Renvoie le code de vérification
   */
  resendCode(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    // Appeler l'API pour renvoyer le code
    this.authService.forgotPassword({ email: this.email }).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Nouveau code envoyé avec succès !';
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
        this.startCountdown();
      },
      error: (error: any) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Erreur lors de l\'envoi du code';
      }
    });
  }

  /**
   * Soumet le formulaire de vérification
   */
  onSubmit(): void {
    if (this.verifyForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const verifyData: Verify2FARequest = {
      email: this.email,
      code: this.verifyForm.value.code
    };

    this.authService.verify2FA(verifyData).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.successMessage = 'Vérification réussie ! Redirection vers le tableau de bord...';

        // Nettoyer le localStorage
        localStorage.removeItem('warah_2fa_email');

        // Rediriger vers le dashboard après 2 secondes
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 2000);
      },
      error: (error: any) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Code de vérification invalide ou expiré';
      }
    });
  }

  /**
   * Annule la vérification et retourne à la connexion
   */
  cancel(): void {
    localStorage.removeItem('warah_2fa_email');
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.router.navigate(['/auth/login']);
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }
}
