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

                <!-- Téléphone avec drapeau auto-détecté -->
                <div class="field">
                  <label>Téléphone *</label>
                  <div class="phone-wrap">
                    <span class="phone-prefix">
                      @if (detectedCountry()) {
                        <img [src]="'https://flagcdn.com/w40/' + detectedCountry()!.country.toLowerCase() + '.png'"
                             [alt]="detectedCountry()!.name" class="flag-img">
                      } @else {
                        <svg width="20" height="20" fill="none" stroke="#9ca3af" stroke-width="1.8" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="2" y1="12" x2="22" y2="12"/>
                          <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
                        </svg>
                      }
                    </span>
                    <input formControlName="phone" type="tel" placeholder="+228 90 12 34 56"
                      class="phone-input" (input)="onPhoneInput()">
                  </div>
                  @if (infoForm.get('phone')?.touched && infoForm.get('phone')?.invalid) {
                    <span class="error">Numéro de téléphone invalide (ex : +22890123456)</span>
                  }
                </div>

                <div class="field">
                  <label>Ville de résidence *</label>
                  <input formControlName="city" type="text" placeholder="Lomé">
                  @if (infoForm.get('city')?.touched && infoForm.get('city')?.invalid) {
                    <span class="error">Ville requise</span>
                  }
                </div>

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

    /* Champ téléphone avec drapeau */
    .phone-wrap {
      display: flex; align-items: stretch;
      border: 1.5px solid #d1d5db; border-radius: .5rem; overflow: hidden;
      transition: border-color .2s;
    }
    .phone-wrap:focus-within { border-color: #0F4C81; }
    .phone-prefix {
      padding: 0 .75rem;
      background: #f9fafb; border-right: 1.5px solid #e5e7eb;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; min-width: 52px;
    }
    .flag-img { width: 26px; height: 20px; border-radius: 3px; object-fit: cover; display: block; }
    .phone-input {
      flex: 1; border: none; outline: none; padding: .625rem .75rem;
      font-size: .95rem; background: transparent; min-width: 0;
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
  detectedCountry = signal<{ code: string; country: string; name: string; flag: string } | null>(null);

  cniRecto: File | null = null;
  cniVerso: File | null = null;
  refDocs: File[] = [];

  infoForm: FormGroup;

  readonly phonePrefixes = [
    // ── Afrique subsaharienne ──────────────────────────────────────
    { code: '+228', country: 'TG', name: 'Togo',                    flag: '🇹🇬' },
    { code: '+229', country: 'BJ', name: 'Bénin',                   flag: '🇧🇯' },
    { code: '+225', country: 'CI', name: "Côte d'Ivoire",           flag: '🇨🇮' },
    { code: '+233', country: 'GH', name: 'Ghana',                   flag: '🇬🇭' },
    { code: '+221', country: 'SN', name: 'Sénégal',                 flag: '🇸🇳' },
    { code: '+226', country: 'BF', name: 'Burkina Faso',            flag: '🇧🇫' },
    { code: '+223', country: 'ML', name: 'Mali',                    flag: '🇲🇱' },
    { code: '+224', country: 'GN', name: 'Guinée',                  flag: '🇬🇳' },
    { code: '+245', country: 'GW', name: 'Guinée-Bissau',           flag: '🇬🇼' },
    { code: '+240', country: 'GQ', name: 'Guinée équatoriale',      flag: '🇬🇶' },
    { code: '+227', country: 'NE', name: 'Niger',                   flag: '🇳🇪' },
    { code: '+234', country: 'NG', name: 'Nigéria',                 flag: '🇳🇬' },
    { code: '+237', country: 'CM', name: 'Cameroun',                flag: '🇨🇲' },
    { code: '+235', country: 'TD', name: 'Tchad',                   flag: '🇹🇩' },
    { code: '+236', country: 'CF', name: 'Rép. centrafricaine',     flag: '🇨🇫' },
    { code: '+241', country: 'GA', name: 'Gabon',                   flag: '🇬🇦' },
    { code: '+242', country: 'CG', name: 'Congo',                   flag: '🇨🇬' },
    { code: '+243', country: 'CD', name: 'RD Congo',                flag: '🇨🇩' },
    { code: '+244', country: 'AO', name: 'Angola',                  flag: '🇦🇴' },
    { code: '+239', country: 'ST', name: 'Sao Tomé-et-Príncipe',   flag: '🇸🇹' },
    { code: '+238', country: 'CV', name: 'Cap-Vert',                flag: '🇨🇻' },
    { code: '+220', country: 'GM', name: 'Gambie',                  flag: '🇬🇲' },
    { code: '+222', country: 'MR', name: 'Mauritanie',              flag: '🇲🇷' },
    { code: '+232', country: 'SL', name: 'Sierra Leone',            flag: '🇸🇱' },
    { code: '+231', country: 'LR', name: 'Libéria',                 flag: '🇱🇷' },
    { code: '+230', country: 'MU', name: 'Maurice',                 flag: '🇲🇺' },
    { code: '+248', country: 'SC', name: 'Seychelles',              flag: '🇸🇨' },
    { code: '+269', country: 'KM', name: 'Comores',                 flag: '🇰🇲' },
    { code: '+261', country: 'MG', name: 'Madagascar',              flag: '🇲🇬' },
    { code: '+250', country: 'RW', name: 'Rwanda',                  flag: '🇷🇼' },
    { code: '+257', country: 'BI', name: 'Burundi',                 flag: '🇧🇮' },
    { code: '+255', country: 'TZ', name: 'Tanzanie',                flag: '🇹🇿' },
    { code: '+254', country: 'KE', name: 'Kenya',                   flag: '🇰🇪' },
    { code: '+256', country: 'UG', name: 'Ouganda',                 flag: '🇺🇬' },
    { code: '+251', country: 'ET', name: 'Éthiopie',                flag: '🇪🇹' },
    { code: '+252', country: 'SO', name: 'Somalie',                 flag: '🇸🇴' },
    { code: '+253', country: 'DJ', name: 'Djibouti',                flag: '🇩🇯' },
    { code: '+291', country: 'ER', name: 'Érythrée',                flag: '🇪🇷' },
    { code: '+258', country: 'MZ', name: 'Mozambique',              flag: '🇲🇿' },
    { code: '+260', country: 'ZM', name: 'Zambie',                  flag: '🇿🇲' },
    { code: '+263', country: 'ZW', name: 'Zimbabwe',                flag: '🇿🇼' },
    { code: '+265', country: 'MW', name: 'Malawi',                  flag: '🇲🇼' },
    { code: '+267', country: 'BW', name: 'Botswana',                flag: '🇧🇼' },
    { code: '+264', country: 'NA', name: 'Namibie',                 flag: '🇳🇦' },
    { code: '+268', country: 'SZ', name: 'Eswatini',                flag: '🇸🇿' },
    { code: '+266', country: 'LS', name: 'Lesotho',                 flag: '🇱🇸' },
    { code: '+27',  country: 'ZA', name: 'Afrique du Sud',          flag: '🇿🇦' },
    // ── Afrique du Nord ───────────────────────────────────────────
    { code: '+20',  country: 'EG', name: 'Égypte',                  flag: '🇪🇬' },
    { code: '+212', country: 'MA', name: 'Maroc',                   flag: '🇲🇦' },
    { code: '+213', country: 'DZ', name: 'Algérie',                 flag: '🇩🇿' },
    { code: '+216', country: 'TN', name: 'Tunisie',                 flag: '🇹🇳' },
    { code: '+218', country: 'LY', name: 'Libye',                   flag: '🇱🇾' },
    { code: '+249', country: 'SD', name: 'Soudan',                  flag: '🇸🇩' },
    { code: '+211', country: 'SS', name: 'Soudan du Sud',           flag: '🇸🇸' },
    // ── Europe ────────────────────────────────────────────────────
    { code: '+33',  country: 'FR', name: 'France',                  flag: '🇫🇷' },
    { code: '+32',  country: 'BE', name: 'Belgique',                flag: '🇧🇪' },
    { code: '+41',  country: 'CH', name: 'Suisse',                  flag: '🇨🇭' },
    { code: '+49',  country: 'DE', name: 'Allemagne',               flag: '🇩🇪' },
    { code: '+34',  country: 'ES', name: 'Espagne',                 flag: '🇪🇸' },
    { code: '+44',  country: 'GB', name: 'Royaume-Uni',             flag: '🇬🇧' },
    { code: '+39',  country: 'IT', name: 'Italie',                  flag: '🇮🇹' },
    { code: '+351', country: 'PT', name: 'Portugal',                flag: '🇵🇹' },
    { code: '+31',  country: 'NL', name: 'Pays-Bas',                flag: '🇳🇱' },
    { code: '+352', country: 'LU', name: 'Luxembourg',              flag: '🇱🇺' },
    { code: '+353', country: 'IE', name: 'Irlande',                 flag: '🇮🇪' },
    { code: '+354', country: 'IS', name: 'Islande',                 flag: '🇮🇸' },
    { code: '+358', country: 'FI', name: 'Finlande',                flag: '🇫🇮' },
    { code: '+46',  country: 'SE', name: 'Suède',                   flag: '🇸🇪' },
    { code: '+47',  country: 'NO', name: 'Norvège',                 flag: '🇳🇴' },
    { code: '+45',  country: 'DK', name: 'Danemark',                flag: '🇩🇰' },
    { code: '+48',  country: 'PL', name: 'Pologne',                 flag: '🇵🇱' },
    { code: '+43',  country: 'AT', name: 'Autriche',                flag: '🇦🇹' },
    { code: '+420', country: 'CZ', name: 'Tchéquie',                flag: '🇨🇿' },
    { code: '+421', country: 'SK', name: 'Slovaquie',               flag: '🇸🇰' },
    { code: '+36',  country: 'HU', name: 'Hongrie',                 flag: '🇭🇺' },
    { code: '+40',  country: 'RO', name: 'Roumanie',                flag: '🇷🇴' },
    { code: '+359', country: 'BG', name: 'Bulgarie',                flag: '🇧🇬' },
    { code: '+30',  country: 'GR', name: 'Grèce',                   flag: '🇬🇷' },
    { code: '+357', country: 'CY', name: 'Chypre',                  flag: '🇨🇾' },
    { code: '+356', country: 'MT', name: 'Malte',                   flag: '🇲🇹' },
    { code: '+385', country: 'HR', name: 'Croatie',                 flag: '🇭🇷' },
    { code: '+386', country: 'SI', name: 'Slovénie',                flag: '🇸🇮' },
    { code: '+387', country: 'BA', name: 'Bosnie-Herzégovine',      flag: '🇧🇦' },
    { code: '+381', country: 'RS', name: 'Serbie',                  flag: '🇷🇸' },
    { code: '+382', country: 'ME', name: 'Monténégro',              flag: '🇲🇪' },
    { code: '+383', country: 'XK', name: 'Kosovo',                  flag: '🇽🇰' },
    { code: '+389', country: 'MK', name: 'Macédoine du Nord',       flag: '🇲🇰' },
    { code: '+355', country: 'AL', name: 'Albanie',                 flag: '🇦🇱' },
    { code: '+380', country: 'UA', name: 'Ukraine',                 flag: '🇺🇦' },
    { code: '+375', country: 'BY', name: 'Biélorussie',             flag: '🇧🇾' },
    { code: '+370', country: 'LT', name: 'Lituanie',                flag: '🇱🇹' },
    { code: '+371', country: 'LV', name: 'Lettonie',                flag: '🇱🇻' },
    { code: '+372', country: 'EE', name: 'Estonie',                 flag: '🇪🇪' },
    { code: '+373', country: 'MD', name: 'Moldavie',                flag: '🇲🇩' },
    { code: '+374', country: 'AM', name: 'Arménie',                 flag: '🇦🇲' },
    { code: '+376', country: 'AD', name: 'Andorre',                 flag: '🇦🇩' },
    { code: '+377', country: 'MC', name: 'Monaco',                  flag: '🇲🇨' },
    { code: '+378', country: 'SM', name: 'Saint-Marin',             flag: '🇸🇲' },
    { code: '+423', country: 'LI', name: 'Liechtenstein',           flag: '🇱🇮' },
    { code: '+350', country: 'GI', name: 'Gibraltar',               flag: '🇬🇮' },
    { code: '+7',   country: 'RU', name: 'Russie',                  flag: '🇷🇺' },
    // ── Moyen-Orient ──────────────────────────────────────────────
    { code: '+971', country: 'AE', name: 'Émirats arabes unis',     flag: '🇦🇪' },
    { code: '+966', country: 'SA', name: 'Arabie Saoudite',         flag: '🇸🇦' },
    { code: '+974', country: 'QA', name: 'Qatar',                   flag: '🇶🇦' },
    { code: '+965', country: 'KW', name: 'Koweït',                  flag: '🇰🇼' },
    { code: '+973', country: 'BH', name: 'Bahreïn',                 flag: '🇧🇭' },
    { code: '+968', country: 'OM', name: 'Oman',                    flag: '🇴🇲' },
    { code: '+967', country: 'YE', name: 'Yémen',                   flag: '🇾🇪' },
    { code: '+964', country: 'IQ', name: 'Irak',                    flag: '🇮🇶' },
    { code: '+963', country: 'SY', name: 'Syrie',                   flag: '🇸🇾' },
    { code: '+961', country: 'LB', name: 'Liban',                   flag: '🇱🇧' },
    { code: '+962', country: 'JO', name: 'Jordanie',                flag: '🇯🇴' },
    { code: '+972', country: 'IL', name: 'Israël',                  flag: '🇮🇱' },
    { code: '+970', country: 'PS', name: 'Palestine',               flag: '🇵🇸' },
    { code: '+90',  country: 'TR', name: 'Turquie',                 flag: '🇹🇷' },
    { code: '+98',  country: 'IR', name: 'Iran',                    flag: '🇮🇷' },
    // ── Asie centrale ─────────────────────────────────────────────
    { code: '+994', country: 'AZ', name: 'Azerbaïdjan',             flag: '🇦🇿' },
    { code: '+995', country: 'GE', name: 'Géorgie',                 flag: '🇬🇪' },
    { code: '+992', country: 'TJ', name: 'Tadjikistan',             flag: '🇹🇯' },
    { code: '+993', country: 'TM', name: 'Turkménistan',            flag: '🇹🇲' },
    { code: '+996', country: 'KG', name: 'Kirghizistan',            flag: '🇰🇬' },
    { code: '+998', country: 'UZ', name: 'Ouzbékistan',             flag: '🇺🇿' },
    { code: '+76',  country: 'KZ', name: 'Kazakhstan',              flag: '🇰🇿' },
    { code: '+93',  country: 'AF', name: 'Afghanistan',             flag: '🇦🇫' },
    // ── Asie du Sud ───────────────────────────────────────────────
    { code: '+91',  country: 'IN', name: 'Inde',                    flag: '🇮🇳' },
    { code: '+92',  country: 'PK', name: 'Pakistan',                flag: '🇵🇰' },
    { code: '+880', country: 'BD', name: 'Bangladesh',              flag: '🇧🇩' },
    { code: '+94',  country: 'LK', name: 'Sri Lanka',               flag: '🇱🇰' },
    { code: '+977', country: 'NP', name: 'Népal',                   flag: '🇳🇵' },
    { code: '+975', country: 'BT', name: 'Bhoutan',                 flag: '🇧🇹' },
    { code: '+960', country: 'MV', name: 'Maldives',                flag: '🇲🇻' },
    // ── Asie de l'Est ─────────────────────────────────────────────
    { code: '+86',  country: 'CN', name: 'Chine',                   flag: '🇨🇳' },
    { code: '+81',  country: 'JP', name: 'Japon',                   flag: '🇯🇵' },
    { code: '+82',  country: 'KR', name: 'Corée du Sud',            flag: '🇰🇷' },
    { code: '+850', country: 'KP', name: 'Corée du Nord',           flag: '🇰🇵' },
    { code: '+886', country: 'TW', name: 'Taïwan',                  flag: '🇹🇼' },
    { code: '+852', country: 'HK', name: 'Hong Kong',               flag: '🇭🇰' },
    { code: '+853', country: 'MO', name: 'Macao',                   flag: '🇲🇴' },
    { code: '+976', country: 'MN', name: 'Mongolie',                flag: '🇲🇳' },
    // ── Asie du Sud-Est ───────────────────────────────────────────
    { code: '+66',  country: 'TH', name: 'Thaïlande',               flag: '🇹🇭' },
    { code: '+84',  country: 'VN', name: 'Viêt Nam',                flag: '🇻🇳' },
    { code: '+855', country: 'KH', name: 'Cambodge',                flag: '🇰🇭' },
    { code: '+856', country: 'LA', name: 'Laos',                    flag: '🇱🇦' },
    { code: '+95',  country: 'MM', name: 'Myanmar',                 flag: '🇲🇲' },
    { code: '+60',  country: 'MY', name: 'Malaisie',                flag: '🇲🇾' },
    { code: '+65',  country: 'SG', name: 'Singapour',               flag: '🇸🇬' },
    { code: '+62',  country: 'ID', name: 'Indonésie',               flag: '🇮🇩' },
    { code: '+63',  country: 'PH', name: 'Philippines',             flag: '🇵🇭' },
    { code: '+670', country: 'TL', name: 'Timor-Leste',             flag: '🇹🇱' },
    { code: '+673', country: 'BN', name: 'Brunei',                  flag: '🇧🇳' },
    // ── Océanie ───────────────────────────────────────────────────
    { code: '+61',  country: 'AU', name: 'Australie',               flag: '🇦🇺' },
    { code: '+64',  country: 'NZ', name: 'Nouvelle-Zélande',        flag: '🇳🇿' },
    { code: '+675', country: 'PG', name: 'Papouasie-Nvle-Guinée',   flag: '🇵🇬' },
    { code: '+679', country: 'FJ', name: 'Fidji',                   flag: '🇫🇯' },
    { code: '+677', country: 'SB', name: 'Îles Salomon',            flag: '🇸🇧' },
    { code: '+678', country: 'VU', name: 'Vanuatu',                 flag: '🇻🇺' },
    { code: '+676', country: 'TO', name: 'Tonga',                   flag: '🇹🇴' },
    { code: '+685', country: 'WS', name: 'Samoa',                   flag: '🇼🇸' },
    { code: '+686', country: 'KI', name: 'Kiribati',                flag: '🇰🇮' },
    { code: '+674', country: 'NR', name: 'Nauru',                   flag: '🇳🇷' },
    { code: '+691', country: 'FM', name: 'Micronésie',              flag: '🇫🇲' },
    { code: '+692', country: 'MH', name: 'Îles Marshall',           flag: '🇲🇭' },
    { code: '+680', country: 'PW', name: 'Palaos',                  flag: '🇵🇼' },
    { code: '+688', country: 'TV', name: 'Tuvalu',                  flag: '🇹🇻' },
    // ── Amériques du Nord & Caraïbes ──────────────────────────────
    { code: '+1242', country: 'BS', name: 'Bahamas',                flag: '🇧🇸' },
    { code: '+1246', country: 'BB', name: 'Barbade',                flag: '🇧🇧' },
    { code: '+1264', country: 'AI', name: 'Anguilla',               flag: '🇦🇮' },
    { code: '+1268', country: 'AG', name: 'Antigua-et-Barbuda',     flag: '🇦🇬' },
    { code: '+1340', country: 'VI', name: 'Îles Vierges (US)',      flag: '🇻🇮' },
    { code: '+1345', country: 'KY', name: 'Îles Caïmans',           flag: '🇰🇾' },
    { code: '+1441', country: 'BM', name: 'Bermudes',               flag: '🇧🇲' },
    { code: '+1473', country: 'GD', name: 'Grenade',                flag: '🇬🇩' },
    { code: '+1649', country: 'TC', name: 'Turques-et-Caïques',     flag: '🇹🇨' },
    { code: '+1664', country: 'MS', name: 'Montserrat',             flag: '🇲🇸' },
    { code: '+1758', country: 'LC', name: 'Sainte-Lucie',           flag: '🇱🇨' },
    { code: '+1767', country: 'DM', name: 'Dominique',              flag: '🇩🇲' },
    { code: '+1784', country: 'VC', name: 'Saint-Vincent',          flag: '🇻🇨' },
    { code: '+1809', country: 'DO', name: 'Rép. dominicaine',       flag: '🇩🇴' },
    { code: '+1868', country: 'TT', name: 'Trinité-et-Tobago',      flag: '🇹🇹' },
    { code: '+1869', country: 'KN', name: 'Saint-Kitts-et-Nevis',  flag: '🇰🇳' },
    { code: '+1876', country: 'JM', name: 'Jamaïque',               flag: '🇯🇲' },
    { code: '+1',    country: 'US', name: 'États-Unis / Canada',    flag: '🇺🇸' },
    { code: '+52',   country: 'MX', name: 'Mexique',                flag: '🇲🇽' },
    { code: '+53',   country: 'CU', name: 'Cuba',                   flag: '🇨🇺' },
    { code: '+509',  country: 'HT', name: 'Haïti',                  flag: '🇭🇹' },
    { code: '+501',  country: 'BZ', name: 'Belize',                 flag: '🇧🇿' },
    { code: '+502',  country: 'GT', name: 'Guatemala',              flag: '🇬🇹' },
    { code: '+503',  country: 'SV', name: 'El Salvador',            flag: '🇸🇻' },
    { code: '+504',  country: 'HN', name: 'Honduras',               flag: '🇭🇳' },
    { code: '+505',  country: 'NI', name: 'Nicaragua',              flag: '🇳🇮' },
    { code: '+506',  country: 'CR', name: 'Costa Rica',             flag: '🇨🇷' },
    { code: '+507',  country: 'PA', name: 'Panama',                 flag: '🇵🇦' },
    // ── Amériques du Sud ──────────────────────────────────────────
    { code: '+55',   country: 'BR', name: 'Brésil',                 flag: '🇧🇷' },
    { code: '+54',   country: 'AR', name: 'Argentine',              flag: '🇦🇷' },
    { code: '+56',   country: 'CL', name: 'Chili',                  flag: '🇨🇱' },
    { code: '+57',   country: 'CO', name: 'Colombie',               flag: '🇨🇴' },
    { code: '+58',   country: 'VE', name: 'Venezuela',              flag: '🇻🇪' },
    { code: '+51',   country: 'PE', name: 'Pérou',                  flag: '🇵🇪' },
    { code: '+593',  country: 'EC', name: 'Équateur',               flag: '🇪🇨' },
    { code: '+591',  country: 'BO', name: 'Bolivie',                flag: '🇧🇴' },
    { code: '+595',  country: 'PY', name: 'Paraguay',               flag: '🇵🇾' },
    { code: '+598',  country: 'UY', name: 'Uruguay',                flag: '🇺🇾' },
    { code: '+592',  country: 'GY', name: 'Guyana',                 flag: '🇬🇾' },
    { code: '+597',  country: 'SR', name: 'Suriname',               flag: '🇸🇷' },
  ];

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
      phone:            ['', [Validators.required, Validators.pattern(/^\+?\d{8,15}$/)]],
      city:             ['', Validators.required],
      residenceCountry: [''],
    });
  }

  stepIndex(): number {
    const map: Record<Step, number> = { role: 0, info: 1, cni: 2, success: 3 };
    return map[this.step()];
  }

  selectRole(role: Role): void {
    this.selectedRole.set(role);
  }

  onPhoneInput(): void {
    const val = (this.infoForm.get('phone')!.value || '').trim();
    // Les codes les plus longs d'abord pour éviter les faux positifs (+1 vs +212)
    const match = [...this.phonePrefixes]
      .sort((a, b) => b.code.length - a.code.length)
      .find(p => val.startsWith(p.code));
    this.detectedCountry.set(match ?? null);
    if (match) {
      this.infoForm.patchValue({ residenceCountry: match.country }, { emitEvent: false });
    }
    this.cdr.markForCheck();
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

    // Supprimer les espaces du numéro pour correspondre au pattern backend ^\+?\d{8,15}$
    const phone = (v.phone as string).replace(/\s+/g, '');

    const obs$ = role === 'OWNER'
      ? this.authService.signupOwner({
          email: v.email,
          password: v.password,
          firstName: v.firstName,
          lastName: v.lastName,
          phone,
          city: v.city,
          residenceCountry: v.residenceCountry || 'TG',
          cniRecto: this.cniRecto,
          cniVerso: this.cniVerso,
        })
      : this.authService.signupManager({
          email: v.email,
          password: v.password,
          firstName: v.firstName,
          lastName: v.lastName,
          phone,
          city: v.city,
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
