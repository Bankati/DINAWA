import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { CommonModule } from '@angular/common';

type Step = 'request' | 'confirm' | 'success';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LokAlerteComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-[#0A2650] to-[#0F4C81] flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">

        <div class="text-center mb-8">
          <img src="/assets/WARAH-logo.png" alt="WARAH" class="h-14 object-contain mx-auto mb-4" style="mix-blend-mode:multiply">
          <h1 class="text-2xl font-bold text-gray-900">Mot de passe oublié</h1>
          <p class="text-gray-500 text-sm mt-1">
            @if (step() === 'request') { Entrez votre email pour recevoir un code OTP }
            @if (step() === 'confirm') { Entrez le code reçu par email }
            @if (step() === 'success') { Mot de passe réinitialisé }
          </p>
        </div>

        @if (errorMessage()) {
          <lok-alerte type="error" [message]="errorMessage()"></lok-alerte>
        }

        <!-- Étape 1 : demande OTP -->
        @if (step() === 'request') {
          <form [formGroup]="requestForm" (ngSubmit)="onRequest()" class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" formControlName="email" class="input-field" placeholder="kofi@exemple.com">
              @if (requestForm.get('email')?.touched && requestForm.get('email')?.invalid) {
                <p class="text-red-500 text-xs mt-1">Email valide requis</p>
              }
            </div>
            <button type="submit" class="btn-primary w-full" [disabled]="requestForm.invalid || isLoading()">
              @if (isLoading()) { Envoi en cours… } @else { Recevoir le code }
            </button>
          </form>
        }

        <!-- Étape 2 : code OTP + nouveau mot de passe -->
        @if (step() === 'confirm') {
          <form [formGroup]="confirmForm" (ngSubmit)="onConfirm()" class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Code à 6 chiffres</label>
              <input type="text" formControlName="code" class="input-field text-center text-2xl tracking-widest"
                placeholder="000000" maxlength="6" inputmode="numeric">
              @if (confirmForm.get('code')?.touched && confirmForm.get('code')?.invalid) {
                <p class="text-red-500 text-xs mt-1">Code à 6 chiffres requis</p>
              }
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
              <input type="password" formControlName="newPassword" class="input-field" placeholder="••••••••">
              @if (confirmForm.get('newPassword')?.touched && confirmForm.get('newPassword')?.invalid) {
                <p class="text-red-500 text-xs mt-1">Minimum 6 caractères</p>
              }
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
              <input type="password" formControlName="confirmPassword" class="input-field" placeholder="••••••••">
              @if (confirmForm.get('confirmPassword')?.touched && confirmForm.hasError('mismatch')) {
                <p class="text-red-500 text-xs mt-1">Les mots de passe ne correspondent pas</p>
              }
            </div>
            <button type="submit" class="btn-primary w-full" [disabled]="confirmForm.invalid || isLoading()">
              @if (isLoading()) { Réinitialisation… } @else { Réinitialiser }
            </button>
            <button type="button" class="w-full text-sm text-gray-500 hover:text-gray-700" (click)="step.set('request')">
              ← Renvoyer un code
            </button>
          </form>
        }

        <!-- Étape 3 : succès -->
        @if (step() === 'success') {
          <div class="text-center space-y-4">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <p class="text-gray-600">Votre mot de passe a été réinitialisé avec succès.</p>
            <a routerLink="/auth/login" class="btn-primary w-full block text-center">Se connecter</a>
          </div>
        }

        @if (step() !== 'success') {
          <p class="text-center text-sm text-gray-500 mt-6">
            <a routerLink="/auth/login" class="text-[#0F4C81] font-semibold hover:underline">← Retour à la connexion</a>
          </p>
        }
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  step = signal<Step>('request');
  isLoading = signal(false);
  errorMessage = signal('');

  requestForm: FormGroup;
  confirmForm: FormGroup;

  private emailUsed = '';

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.requestForm = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
    this.confirmForm = this.fb.group(
      {
        code:            ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
        newPassword:     ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: (g) => {
        const a = g.get('newPassword')?.value;
        const b = g.get('confirmPassword')?.value;
        return a && b && a !== b ? { mismatch: true } : null;
      }}
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
        this.errorMessage.set(err.error?.message || 'Erreur lors de l\'envoi du code.');
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
}
