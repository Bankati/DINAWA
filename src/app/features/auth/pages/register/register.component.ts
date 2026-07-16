import { Component, ChangeDetectionStrategy, ChangeDetectorRef, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

type Role = 'OWNER' | 'MANAGER';
type Step = 'role' | 'info' | 'cni' | 'success';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="register-page">
      <!-- Panneau gauche -->
      <div class="left-panel">
        <div class="left-content">
          <img src="/assets/WARAH-logo.png" alt="WARAH" class="logo">
          <h1>L'immobilier togolais<br>dans votre poche</h1>
          <div class="features">
            <div class="feature"><span class="dot"></span>Gérez vos biens à distance</div>
            <div class="feature"><span class="dot"></span>Encaissez via T-Money & Flooz</div>
            <div class="feature"><span class="dot"></span>Statistiques en temps réel</div>
            <div class="feature"><span class="dot"></span>Vérification CNI sécurisée</div>
          </div>
          <!-- Indicateur d'étapes -->
          <div class="steps-indicator">
            <div class="step-item" [class.active]="step() === 'role'" [class.done]="stepIndex() > 0">
              <span class="step-num">1</span><span>Rôle</span>
            </div>
            <div class="step-line"></div>
            <div class="step-item" [class.active]="step() === 'info'" [class.done]="stepIndex() > 1">
              <span class="step-num">2</span><span>Informations</span>
            </div>
            <div class="step-line"></div>
            <div class="step-item" [class.active]="step() === 'cni'" [class.done]="stepIndex() > 2">
              <span class="step-num">3</span><span>Pièce d'identité</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Panneau droit -->
      <div class="right-panel">
        <div class="form-card">

          <!-- ÉTAPE 1 : Choix du rôle -->
          @if (step() === 'role') {
            <div class="step-content">
              <h2>Créer votre compte</h2>
              <p class="subtitle">Je suis…</p>
              <div class="role-grid">
                <button type="button" class="role-card" [class.selected]="selectedRole() === 'OWNER'" (click)="selectRole('OWNER')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  <strong>Propriétaire</strong>
                  <span>Je possède des biens immobiliers au Togo</span>
                </button>
                <button type="button" class="role-card" [class.selected]="selectedRole() === 'MANAGER'" (click)="selectRole('MANAGER')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                  <strong>Gestionnaire</strong>
                  <span>Je gère des biens pour le compte de propriétaires</span>
                </button>
              </div>
              <button class="btn-primary" [disabled]="!selectedRole()" (click)="goToInfo()">
                Continuer
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
              <p class="login-link">Déjà un compte ? <a routerLink="/auth/login">Se connecter</a></p>
            </div>
          }

          <!-- ÉTAPE 2 : Informations personnelles -->
          @if (step() === 'info') {
            <div class="step-content">
              <button class="back-btn" (click)="goBack()">← Retour</button>
              <h2>Vos informations</h2>
              <p class="subtitle">{{ selectedRole() === 'OWNER' ? 'Compte propriétaire' : 'Compte gestionnaire immobilier' }}</p>
              <form [formGroup]="infoForm" (ngSubmit)="goToCni()" class="form-fields">
                <div class="field-row">
                  <div class="field">
                    <label>Prénom *</label>
                    <input formControlName="firstName" type="text" placeholder="Kofi">
                    @if (infoForm.get('firstName')?.touched && infoForm.get('firstName')?.invalid) {
                      <span class="error">Prénom requis</span>
                    }
                  </div>
                  <div class="field">
                    <label>Nom *</label>
                    <input formControlName="lastName" type="text" placeholder="Mensah">
                    @if (infoForm.get('lastName')?.touched && infoForm.get('lastName')?.invalid) {
                      <span class="error">Nom requis</span>
                    }
                  </div>
                </div>
                <div class="field">
                  <label>Email *</label>
                  <input formControlName="email" type="email" placeholder="kofi@exemple.com">
                  @if (infoForm.get('email')?.touched && infoForm.get('email')?.invalid) {
                    <span class="error">Email valide requis</span>
                  }
                </div>
                <div class="field">
                  <label>Mot de passe * <small>(min 6 caractères)</small></label>
                  <input formControlName="password" type="password" placeholder="••••••••">
                  @if (infoForm.get('password')?.touched && infoForm.get('password')?.invalid) {
                    <span class="error">Minimum 6 caractères</span>
                  }
                </div>
                @if (selectedRole() === 'OWNER') {
                  <div class="field">
                    <label>Pays de résidence *</label>
                    <select formControlName="residenceCountry">
                      <option value="">Sélectionner…</option>
                      <option value="TG">Togo</option>
                      <option value="FR">France</option>
                      <option value="BE">Belgique</option>
                      <option value="CI">Côte d'Ivoire</option>
                      <option value="GH">Ghana</option>
                      <option value="SN">Sénégal</option>
                      <option value="US">États-Unis</option>
                      <option value="CA">Canada</option>
                      <option value="DE">Allemagne</option>
                      <option value="OTHER">Autre</option>
                    </select>
                    @if (infoForm.get('residenceCountry')?.touched && infoForm.get('residenceCountry')?.invalid) {
                      <span class="error">Pays requis</span>
                    }
                  </div>
                }
                <button type="submit" class="btn-primary" [disabled]="infoForm.invalid">
                  Continuer
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </form>
            </div>
          }

          <!-- ÉTAPE 3 : CNI upload -->
          @if (step() === 'cni') {
            <div class="step-content">
              <button class="back-btn" (click)="step.set('info')">← Retour</button>
              <h2>Pièce d'identité</h2>
              <p class="subtitle">CNI en cours de validité — recto et verso (JPG/PNG, max 5 Mo)</p>

              @if (errorMessage()) {
                <div class="error-banner">{{ errorMessage() }}</div>
              }

              <div class="cni-grid">
                <!-- Recto -->
                <div class="upload-zone" [class.has-file]="cniRecto" (click)="triggerInput(rectInput)">
                  <input #rectInput type="file" accept="image/jpeg,image/png,image/webp" (change)="onFile($event, 'recto')" style="display:none">
                  @if (cniRecto) {
                    <div class="file-preview">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                      <span>{{ cniRecto.name }}</span>
                    </div>
                  } @else {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    <strong>CNI Recto</strong>
                    <span>Cliquer pour sélectionner</span>
                  }
                </div>
                <!-- Verso -->
                <div class="upload-zone" [class.has-file]="cniVerso" (click)="triggerInput(versoInput)">
                  <input #versoInput type="file" accept="image/jpeg,image/png,image/webp" (change)="onFile($event, 'verso')" style="display:none">
                  @if (cniVerso) {
                    <div class="file-preview">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                      <span>{{ cniVerso.name }}</span>
                    </div>
                  } @else {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    <strong>CNI Verso</strong>
                    <span>Cliquer pour sélectionner</span>
                  }
                </div>
              </div>

              @if (selectedRole() === 'MANAGER') {
                <div class="field" style="margin-top:1rem">
                  <label>Références professionnelles <small>(optionnel — max 5 fichiers)</small></label>
                  <input type="file" accept="image/*,.pdf" multiple (change)="onRefDocs($event)"
                    style="width:100%;padding:.5rem;border:1px dashed #d1d5db;border-radius:.5rem;cursor:pointer">
                  @if (refDocs.length > 0) {
                    <span class="text-sm text-gray-500">{{ refDocs.length }} fichier(s) sélectionné(s)</span>
                  }
                </div>
              }

              <button class="btn-primary" [disabled]="!cniRecto || !cniVerso || isLoading()" (click)="submit()">
                @if (isLoading()) {
                  <svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity=".25"/><path d="M12 2a10 10 0 0110 10" opacity=".75"/></svg>
                  Création en cours…
                } @else {
                  Créer mon compte
                }
              </button>
            </div>
          }

          <!-- ÉTAPE 4 : Succès -->
          @if (step() === 'success') {
            <div class="step-content success-content">
              <div class="success-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
              <h2>Compte créé !</h2>
              <p>Votre compte a été créé avec succès. Votre pièce d'identité est en cours de vérification (sous 24h).</p>
              <p class="info-note">Vous pouvez vous connecter dès maintenant. Certaines fonctionnalités seront disponibles après validation de votre CNI.</p>
              <a routerLink="/auth/login" class="btn-primary">Se connecter</a>
            </div>
          }

        </div>
      </div>
    </div>
  `,
  styles: [`
    .register-page {
      display: flex;
      min-height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
    }

    /* Panneau gauche */
    .left-panel {
      width: 42%;
      background: linear-gradient(135deg, #0A2650 0%, #0F4C81 60%, #081E41 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      position: sticky;
      top: 0;
      height: 100vh;
    }
    @media (max-width: 768px) { .left-panel { display: none; } }

    .left-content { color: white; max-width: 360px; }
    .logo { height: 64px; object-fit: contain; mix-blend-mode: lighten; margin-bottom: 2rem; }
    .left-content h1 { font-size: 1.75rem; font-weight: 700; line-height: 1.3; margin-bottom: 2rem; }

    .features { margin-bottom: 2.5rem; display: flex; flex-direction: column; gap: .75rem; }
    .feature { display: flex; align-items: center; gap: .75rem; font-size: .95rem; opacity: .9; }
    .dot { width: 8px; height: 8px; background: #C9982E; border-radius: 50%; flex-shrink: 0; }

    .steps-indicator { display: flex; align-items: center; gap: .5rem; }
    .step-item { display: flex; align-items: center; gap: .5rem; font-size: .8rem; opacity: .5; }
    .step-item.active { opacity: 1; }
    .step-item.done { opacity: .7; }
    .step-num { width: 24px; height: 24px; border: 2px solid rgba(255,255,255,.5); border-radius: 50%;
      display: flex; align-items: center; justify-content: center; font-size: .75rem; font-weight: 700; }
    .step-item.active .step-num { border-color: #C9982E; background: #C9982E; }
    .step-item.done .step-num { border-color: white; background: rgba(255,255,255,.2); }
    .step-line { flex: 1; height: 1px; background: rgba(255,255,255,.2); }

    /* Panneau droit */
    .right-panel {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: #f9fafb;
      overflow-y: auto;
    }

    .form-card {
      background: white;
      border-radius: 1.25rem;
      box-shadow: 0 4px 24px rgba(0,0,0,.08);
      padding: 2.5rem;
      width: 100%;
      max-width: 480px;
    }

    .step-content { display: flex; flex-direction: column; gap: 1.25rem; }
    .step-content h2 { font-size: 1.5rem; font-weight: 700; color: #111827; margin: 0; }
    .subtitle { color: #6b7280; font-size: .9rem; margin: 0; }

    .back-btn { background: none; border: none; color: #6b7280; cursor: pointer; font-size: .9rem;
      padding: 0; text-align: left; width: fit-content; }
    .back-btn:hover { color: #0F4C81; }

    /* Choix de rôle */
    .role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .role-card {
      border: 2px solid #e5e7eb; border-radius: .875rem; padding: 1.25rem;
      display: flex; flex-direction: column; align-items: center; gap: .5rem;
      cursor: pointer; background: white; transition: all .2s; text-align: center;
    }
    .role-card svg { width: 36px; height: 36px; color: #9ca3af; }
    .role-card strong { color: #111827; font-size: .95rem; }
    .role-card span { color: #6b7280; font-size: .8rem; line-height: 1.4; }
    .role-card:hover { border-color: #0F4C81; }
    .role-card.selected { border-color: #0F4C81; background: #f0f7ff; }
    .role-card.selected svg { color: #0F4C81; }

    /* Formulaire */
    .form-fields { display: flex; flex-direction: column; gap: 1rem; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .field { display: flex; flex-direction: column; gap: .375rem; }
    .field label { font-size: .85rem; font-weight: 500; color: #374151; }
    .field label small { font-weight: 400; color: #9ca3af; }
    .field input, .field select {
      border: 1.5px solid #d1d5db; border-radius: .5rem; padding: .625rem .875rem;
      font-size: .95rem; outline: none; transition: border-color .2s; width: 100%; box-sizing: border-box;
    }
    .field input:focus, .field select:focus { border-color: #0F4C81; }
    .error { color: #ef4444; font-size: .78rem; }

    /* Upload CNI */
    .cni-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .upload-zone {
      border: 2px dashed #d1d5db; border-radius: .875rem; padding: 1.5rem 1rem;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: .5rem; cursor: pointer; transition: all .2s; text-align: center; min-height: 140px;
    }
    .upload-zone svg { width: 32px; height: 32px; color: #9ca3af; }
    .upload-zone strong { font-size: .9rem; color: #374151; }
    .upload-zone span { font-size: .78rem; color: #9ca3af; }
    .upload-zone:hover { border-color: #0F4C81; background: #f0f7ff; }
    .upload-zone.has-file { border-color: #10b981; background: #f0fdf4; border-style: solid; }
    .file-preview { display: flex; flex-direction: column; align-items: center; gap: .5rem; }
    .file-preview svg { width: 28px; height: 28px; color: #10b981; }
    .file-preview span { font-size: .78rem; color: #374151; word-break: break-all; }

    /* Bouton principal */
    .btn-primary {
      background: #0F4C81; color: white; border: none; border-radius: .625rem;
      padding: .75rem 1.5rem; font-size: .95rem; font-weight: 600; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: .5rem;
      width: 100%; transition: background .2s;
    }
    .btn-primary:hover:not(:disabled) { background: #0A2650; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn-primary svg { width: 18px; height: 18px; }

    .spinner { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .login-link { text-align: center; font-size: .85rem; color: #6b7280; }
    .login-link a { color: #0F4C81; font-weight: 600; text-decoration: none; }
    .login-link a:hover { text-decoration: underline; }

    .error-banner {
      background: #fef2f2; border: 1px solid #fecaca; border-radius: .5rem;
      padding: .75rem 1rem; color: #dc2626; font-size: .875rem;
    }

    /* Succès */
    .success-content { text-align: center; align-items: center; padding: 1rem 0; }
    .success-icon svg { width: 64px; height: 64px; color: #10b981; }
    .success-content h2 { font-size: 1.75rem; }
    .success-content p { color: #6b7280; max-width: 340px; }
    .info-note { background: #eff6ff; border-radius: .5rem; padding: .75rem; color: #1d4ed8 !important; font-size: .85rem !important; }
  `],
})
export class RegisterComponent {
  step = signal<Step>('role');
  selectedRole = signal<Role | null>(null);
  isLoading = signal(false);
  errorMessage = signal('');

  cniRecto: File | null = null;
  cniVerso: File | null = null;
  refDocs: File[] = [];

  infoForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    this.infoForm = this.fb.group({
      firstName:        ['', Validators.required],
      lastName:         ['', Validators.required],
      email:            ['', [Validators.required, Validators.email]],
      password:         ['', [Validators.required, Validators.minLength(6)]],
      residenceCountry: [''],
    });
  }

  stepIndex(): number {
    const map: Record<Step, number> = { role: 0, info: 1, cni: 2, success: 3 };
    return map[this.step()];
  }

  selectRole(role: Role): void {
    this.selectedRole.set(role);
    const ctrl = this.infoForm.get('residenceCountry')!;
    if (role === 'OWNER') {
      ctrl.setValidators(Validators.required);
    } else {
      ctrl.clearValidators();
    }
    ctrl.updateValueAndValidity();
  }

  goToInfo(): void {
    if (this.selectedRole()) this.step.set('info');
  }

  goToCni(): void {
    if (this.infoForm.valid) this.step.set('cni');
    else this.infoForm.markAllAsTouched();
  }

  goBack(): void {
    this.step.set('role');
  }

  triggerInput(el: HTMLInputElement): void {
    el.click();
  }

  onFile(event: Event, side: 'recto' | 'verso'): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (side === 'recto') this.cniRecto = file;
    else this.cniVerso = file;
    this.cdr.markForCheck();
  }

  onRefDocs(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (files) this.refDocs = Array.from(files).slice(0, 5);
  }

  submit(): void {
    if (!this.cniRecto || !this.cniVerso || !this.selectedRole()) return;
    this.isLoading.set(true);
    this.errorMessage.set('');

    const v = this.infoForm.value;
    const role = this.selectedRole()!;

    const obs$ = role === 'OWNER'
      ? this.authService.signupOwner({
          email: v.email,
          password: v.password,
          firstName: v.firstName,
          lastName: v.lastName,
          residenceCountry: v.residenceCountry,
          cniRecto: this.cniRecto,
          cniVerso: this.cniVerso,
        })
      : this.authService.signupManager({
          email: v.email,
          password: v.password,
          firstName: v.firstName,
          lastName: v.lastName,
          cniRecto: this.cniRecto,
          cniVerso: this.cniVerso,
          referenceDocuments: this.refDocs.length ? this.refDocs : undefined,
        });

    obs$.subscribe({
      next: () => {
        this.isLoading.set(false);
        this.step.set('success');
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Une erreur est survenue lors de la création du compte.');
        this.cdr.markForCheck();
      },
    });
  }
}
