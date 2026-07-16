import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';

@Component({
  selector: 'app-activate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LokAlerteComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-[#0A2650] to-[#0F4C81] flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div class="text-center mb-8">
          <img src="/assets/WARAH-logo.png" alt="WARAH" class="h-14 object-contain mx-auto mb-4" style="mix-blend-mode:multiply">
          <h1 class="text-2xl font-bold text-gray-900">Activation de votre compte</h1>
          <p class="text-gray-500 text-sm mt-1">Définissez votre mot de passe pour accéder à WARAH</p>
        </div>

        @if (!token) {
          <lok-alerte type="error" message="Lien d'activation invalide. Contactez votre propriétaire pour recevoir un nouveau lien."></lok-alerte>
          <a routerLink="/auth/login" class="btn-primary w-full block text-center mt-4">Retour à la connexion</a>
        } @else if (success()) {
          <div class="text-center space-y-4">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 class="text-xl font-semibold text-gray-900">Compte activé !</h2>
            <p class="text-gray-600">Votre compte locataire est prêt. Vous pouvez vous connecter.</p>
            <a routerLink="/auth/login" class="btn-primary w-full block text-center">Se connecter</a>
          </div>
        } @else {
          @if (errorMessage()) {
            <lok-alerte type="error" [message]="errorMessage()"></lok-alerte>
          }
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
              <input type="password" formControlName="password" class="input-field" placeholder="••••••••">
              @if (form.get('password')?.touched && form.get('password')?.invalid) {
                <p class="text-red-500 text-xs mt-1">Minimum 6 caractères</p>
              }
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe *</label>
              <input type="password" formControlName="confirm" class="input-field" placeholder="••••••••">
              @if (form.get('confirm')?.touched && form.hasError('mismatch')) {
                <p class="text-red-500 text-xs mt-1">Les mots de passe ne correspondent pas</p>
              }
            </div>
            <button type="submit" class="btn-primary w-full" [disabled]="form.invalid || isLoading()">
              @if (isLoading()) { Activation en cours… } @else { Activer mon compte }
            </button>
          </form>
        }
      </div>
    </div>
  `,
})
export class ActivateComponent implements OnInit {
  token = '';
  form: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');
  success = signal(false);

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) {
    this.form = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirm:  ['', Validators.required],
      },
      { validators: (g) => {
        const a = g.get('password')?.value;
        const b = g.get('confirm')?.value;
        return a && b && a !== b ? { mismatch: true } : null;
      }}
    );
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  onSubmit(): void {
    if (this.form.invalid || !this.token) return;
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.activateTenant(this.token, this.form.value.password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.success.set(true);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Lien expiré ou invalide. Demandez un nouveau lien à votre propriétaire.');
      },
    });
  }
}
