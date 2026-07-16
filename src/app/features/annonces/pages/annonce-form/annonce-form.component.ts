import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AnnoncesService, AnnonceRequest } from '../../services/annonces.service';
import { TypeAnnonce } from '@core/models/annonce.model';

@Component({
  selector: 'app-annonce-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="annonce-form-container">
      <div class="top-bar">
        <button routerLink="/" class="back-btn">
          <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Retour à l'accueil
        </button>
        <button routerLink="/annonces/list" class="annonces-btn">
          <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          </svg>
          Mes annonces
        </button>
        <div class="logo">WARAH</div>
      </div>

      <div class="breadcrumb">
        <a routerLink="/annonces/list" class="breadcrumb-link">Mes annonces</a>
        <svg class="breadcrumb-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
        <span class="breadcrumb-current">{{ breadcrumbText }}</span>
      </div>

      <div class="form-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="form-title">{{ formTitle }}</h1>
            <p class="form-subtitle">{{ formSubtitle }}</p>
          </div>
          <div class="header-badge" [class.badge-edit]="isEditMode" [class.badge-create]="!isEditMode">
            {{ badgeText }}
          </div>
        </div>
      </div>

      <div class="stepper">
        <div class="stepper-item" [class.active]="currentStep === 1" [class.completed]="currentStep > 1">
          <div class="stepper-circle">
            <span *ngIf="currentStep > 1" class="stepper-check">✓</span>
            <span *ngIf="currentStep === 1">1</span>
            <span *ngIf="currentStep < 1">1</span>
          </div>
          <span class="stepper-label">Infos générales</span>
        </div>
        <div class="stepper-line" [class.completed]="currentStep > 1"></div>
        <div class="stepper-item" [class.active]="currentStep === 2" [class.completed]="currentStep > 2">
          <div class="stepper-circle">
            <span *ngIf="currentStep > 2" class="stepper-check">✓</span>
            <span *ngIf="currentStep === 2">2</span>
            <span *ngIf="currentStep < 2">2</span>
          </div>
          <span class="stepper-label">Adresse</span>
        </div>
        <div class="stepper-line" [class.completed]="currentStep > 2"></div>
        <div class="stepper-item" [class.active]="currentStep === 3" [class.completed]="currentStep > 3">
          <div class="stepper-circle">
            <span *ngIf="currentStep > 3" class="stepper-check">✓</span>
            <span *ngIf="currentStep === 3">3</span>
            <span *ngIf="currentStep < 3">3</span>
          </div>
          <span class="stepper-label">Contact</span>
        </div>
      </div>

      <div class="form-card">
        <form [formGroup]="annonceForm">
          <div class="step-content" *ngIf="currentStep === 1">
            <h2 class="step-title">Informations générales</h2>

            <div class="form-group" [class.shake]="shakeFields.titre">
              <label class="form-label">Titre de l'annonce</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <input type="text" formControlName="titre" class="form-input" maxlength="100" placeholder="Ex: Appartement 3 chambres Lomé Centre">
                <span class="char-count">{{ titre?.value?.length || 0 }}/100</span>
              </div>
              <div class="error-message" *ngIf="titre?.touched && titre?.invalid">Le titre est requis</div>
            </div>

            <div class="form-group" [class.shake]="shakeFields.type">
              <label class="form-label">Type d'annonce</label>
              <div class="type-grid">
                <div class="type-card" *ngFor="let type of typeOptions" [class.selected]="type.value === typeControl?.value" (click)="selectType(type.value)">
                  <svg class="type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path *ngIf="type.icon === 'home'" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <path *ngIf="type.icon === 'sell'" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                    <path *ngIf="type.icon === 'group'" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle *ngIf="type.icon === 'group'" cx="9" cy="7" r="4"></circle>
                    <path *ngIf="type.icon === 'group'" d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path *ngIf="type.icon === 'group'" d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    <rect *ngIf="type.icon === 'business'" x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                    <path *ngIf="type.icon === 'business'" d="M9 22v-4h6v4"></path>
                    <path *ngIf="type.icon === 'business'" d="M8 6h.01"></path>
                    <path *ngIf="type.icon === 'business'" d="M16 6h.01"></path>
                    <path *ngIf="type.icon === 'business'" d="M12 6h.01"></path>
                    <path *ngIf="type.icon === 'business'" d="M12 10h.01"></path>
                    <path *ngIf="type.icon === 'business'" d="M12 14h.01"></path>
                    <path *ngIf="type.icon === 'business'" d="M16 10h.01"></path>
                    <path *ngIf="type.icon === 'business'" d="M16 14h.01"></path>
                    <path *ngIf="type.icon === 'business'" d="M8 10h.01"></path>
                    <path *ngIf="type.icon === 'business'" d="M8 14h.01"></path>
                  </svg>
                  <span class="type-label">{{ type.label }}</span>
                </div>
              </div>
              <div class="error-message" *ngIf="typeControl?.touched && typeControl?.invalid">Le type est requis</div>
            </div>

            <div class="form-group" [class.shake]="shakeFields.prix">
              <label class="form-label">Prix (FCFA)</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold">F</text>
                </svg>
                <input type="text" formControlName="prix" class="form-input" [value]="formatPrice(prix?.value)" (input)="onPriceInput($event)" placeholder="Ex: 150000">
              </div>
              <input type="range" class="price-slider" min="0" max="5000000" step="10000" [value]="prix?.value || 0" (input)="onSliderChange($event)">
              <div class="error-message" *ngIf="prix?.touched && prix?.invalid">Le prix est requis</div>
            </div>

            <div class="form-group" [class.shake]="shakeFields.description">
              <label class="form-label">Description</label>
              <textarea formControlName="description" class="form-textarea" rows="6" maxlength="500"></textarea>
              <span class="char-count">{{ description?.value?.length || 0 }}/500 caractères</span>
              <div class="error-message" *ngIf="description?.touched && description?.invalid">La description est requise</div>
            </div>
          </div>

          <div class="step-content" *ngIf="currentStep === 2">
            <h2 class="step-title">Adresse & Localisation</h2>

            <div class="form-group" [class.shake]="shakeFields.ville">
              <label class="form-label">Ville</label>
              <select formControlName="adresse.ville" class="form-select">
                <option value="">Sélectionner une ville</option>
                <option *ngFor="let ville of villes" [value]="ville.name">{{ ville.name }}</option>
              </select>
              <div class="error-message" *ngIf="villeControl?.touched && villeControl?.invalid">La ville est requise</div>
            </div>

            <div class="form-group" [class.shake]="shakeFields.quartier">
              <label class="form-label">Quartier</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                </svg>
                <input type="text" formControlName="adresse.quartier" class="form-input">
              </div>
              <div class="error-message" *ngIf="quartierControl?.touched && quartierControl?.invalid">Le quartier est requis</div>
            </div>

            <div class="form-group">
              <label class="form-label">Adresse complète</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                </svg>
                <input type="text" formControlName="adresse.adresseComplete" class="form-input">
              </div>
            </div>

            <div class="map-placeholder">
              <img src="https://images.unsplash.com/photo-1524661135-423995722909?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" class="map-image">
              <div class="map-pin">
                <svg viewBox="0 0 24 24" fill="var(--color-primary)">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="step-content" *ngIf="currentStep === 3">
            <h2 class="step-title">Contact & Bien associé</h2>

            <div class="form-group" [class.shake]="shakeFields.nom">
              <label class="form-label">Nom du contact</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <input type="text" formControlName="contact.nom" class="form-input">
              </div>
              <div class="error-message" *ngIf="nomControl?.touched && nomControl?.invalid">Le nom est requis</div>
            </div>

            <div class="form-group" [class.shake]="shakeFields.telephone">
              <label class="form-label">Téléphone</label>
              <div class="input-wrapper">
                <span class="phone-prefix">🇹🇬 +228</span>
                <input type="text" formControlName="contact.telephone" class="form-input phone-input" (input)="formatPhone($event)">
              </div>
              <div class="error-message" *ngIf="telephoneControl?.touched && telephoneControl?.invalid">Le téléphone est requis</div>
            </div>

            <div class="form-group">
              <label class="form-label">Email</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                </svg>
                <input type="email" formControlName="contact.email" class="form-input">
              </div>
            </div>

            <div class="form-group" [class.shake]="shakeFields.bienId">
              <label class="form-label">Bien associé</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                </svg>
                <input type="text" formControlName="bienId" class="form-input">
              </div>
              <div class="error-message" *ngIf="bienIdControl?.touched && bienIdControl?.invalid">L'ID du bien est requis</div>
            </div>

            <div class="form-group">
              <label class="form-label">Photos</label>
              <div class="upload-zone" (click)="fileInput.click()">
                <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p class="upload-text">Glissez vos photos ici ou cliquez pour choisir</p>
                <input type="file" #fileInput multiple accept="image/*" (change)="onFileSelect($event)" class="file-input">
              </div>
              <div class="photos-grid" *ngIf="photos.length > 0">
                <div class="photo-item" *ngFor="let photo of photos; let i = index">
                  <img [src]="photo" class="photo-preview">
                  <button type="button" class="photo-delete" (click)="removePhoto(i)">×</button>
                </div>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-prev" (click)="previousStep()" *ngIf="currentStep > 1">← Précédent</button>
            <button type="button" class="btn-next" (click)="nextStep()" *ngIf="currentStep < 3">Suivant →</button>
            <div class="final-actions" *ngIf="currentStep === 3">
              <a href="/annonces/list" class="btn-cancel">Annuler</a>
              <button type="button" class="btn-draft" (click)="saveDraft()">
                <span *ngIf="!draftSaved">Brouillon</span>
                <span *ngIf="draftSaved">✓ Sauvegardé</span>
              </button>
              <button type="submit" class="btn-publish" [disabled]="annonceForm.invalid || submitting" (click)="onSubmit()">
                <span *ngIf="!submitting">Publier</span>
                <span *ngIf="submitting">Publication...</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    .annonce-form-container { min-height: 100vh; background: linear-gradient(135deg, #F8FAF9 0%, #E8F5E9 100%); padding: 0; font-family: 'Inter', sans-serif; }
    
    .top-bar { display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; background: white; border-bottom: 1px solid #E5E7EB; position: sticky; top: 0; z-index: 100; }
    .back-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #F3F4F6; border: none; border-radius: 8px; color: #374151; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .back-btn:hover { background: #E5E7EB; transform: translateX(-2px); }
    .annonces-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #D1FAE5; border: none; border-radius: 8px; color: var(--color-primary); font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .annonces-btn:hover { background: #A7F3D0; }
    .back-icon { width: 18px; height: 18px; }
    .logo { font-size: 1.5rem; font-weight: 700; color: var(--color-primary); letter-spacing: -0.5px; }
    
    .breadcrumb { display: flex; align-items: center; gap: 0.5rem; padding: 1.5rem 2rem 1rem; font-size: 0.875rem; }
    .breadcrumb-link { color: #6B7280; text-decoration: none; transition: color 0.2s; }
    .breadcrumb-link:hover { color: var(--color-primary); }
    .breadcrumb-arrow { width: 16px; height: 16px; color: #9CA3AF; }
    .breadcrumb-current { color: var(--color-primary); font-weight: 500; }
    .breadcrumb-separator { margin: 0 0.5rem; color: #9CA3AF; }
    .breadcrumb-current { color: var(--color-primary); font-weight: 500; }
    .form-header { margin: 1.5rem 2rem 2rem; }
    .header-content { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .form-title { font-size: 2.25rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem; letter-spacing: -0.5px; }
    .form-subtitle { font-size: 1.125rem; color: #6B7280; }
    .header-badge { padding: 0.625rem 1.25rem; border-radius: 2rem; font-size: 0.875rem; font-weight: 600; letter-spacing: 0.5px; }
    .badge-edit { background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%); color: #065F46; }
    .badge-create { background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%); color: #1E40AF; }
    .stepper { display: flex; align-items: center; gap: 1rem; margin: 0 2rem 2rem; padding: 1.5rem; background: white; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
    .stepper-item { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; flex: 1; }
    .stepper-circle { width: 40px; height: 40px; border-radius: 50%; background: #E5E7EB; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #6B7280; transition: all 0.3s; }
    .stepper-item.active .stepper-circle { background: var(--color-primary); color: white; }
    .stepper-item.completed .stepper-circle { background: var(--color-primary); color: white; }
    .stepper-label { font-size: 0.875rem; color: #374151; font-weight: 500; }
    .stepper-item.active .stepper-label { color: var(--color-primary); font-weight: 600; }
    .stepper-item.completed .stepper-label { color: var(--color-primary); }
    .stepper-line { flex: 1; height: 2px; background: #E5E7EB; transition: background 0.3s; }
    .stepper-line.completed { background: var(--color-primary); }
    .form-card { max-width: 900px; margin: 0 2rem 2rem; background: white; border-radius: 1.25rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); padding: 3rem; }
    .step-title { font-size: 1.75rem; font-weight: 700; color: #111827; margin-bottom: 2rem; letter-spacing: -0.5px; }
    .form-group { margin-bottom: 1.75rem; position: relative; }
    .form-label { display: block; font-size: 0.9375rem; font-weight: 600; color: #374151; margin-bottom: 0.625rem; }
    .floating-label { position: absolute; top: 1.125rem; left: 3.5rem; font-size: 0.9375rem; color: #9CA3AF; transition: all 0.2s; pointer-events: none; }
    .floating-label.focused { top: -0.625rem; left: 0; font-size: 0.8125rem; color: var(--color-primary); background: white; padding: 0 0.25rem; }
    .input-wrapper { position: relative; display: flex; align-items: center; }
    .input-icon { position: absolute; left: 1.25rem; width: 22px; height: 22px; color: #9CA3AF; }
    .form-input { width: 100%; padding: 1rem 1rem 1rem 3.5rem; border: 1.5px solid #E5E7EB; border-radius: 0.75rem; font-size: 0.9375rem; transition: all 0.2s; font-family: 'Inter', sans-serif; }
    .form-input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 4px rgba(27,107,69,0.1); }
    .form-input.ng-valid.ng-touched { border-color: #10B981; }
    .form-input.ng-invalid.ng-touched { border-color: #E53E3E; }
    .phone-input { padding-left: 7rem; }
    .phone-prefix { position: absolute; left: 1.25rem; font-size: 0.9375rem; color: #6B7280; font-weight: 500; }
    .form-select { width: 100%; padding: 1rem; border: 1.5px solid #E5E7EB; border-radius: 0.75rem; font-size: 0.9375rem; background: white; cursor: pointer; font-family: 'Inter', sans-serif; }
    .form-select:focus { outline: none; border-color: var(--color-primary); }
    .form-textarea { width: 100%; padding: 1rem; border: 1.5px solid #E5E7EB; border-radius: 0.75rem; font-size: 0.9375rem; resize: vertical; font-family: 'Inter', sans-serif; }
    .form-textarea:focus { outline: none; border-color: var(--color-primary); }
    .char-count { position: absolute; bottom: 0.625rem; right: 1rem; font-size: 0.8125rem; color: #9CA3AF; font-weight: 500; }
    .error-message { color: #E53E3E; font-size: 0.8125rem; margin-top: 0.375rem; font-weight: 500; }
    .shake { animation: shake 0.5s ease; }
    @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
    .type-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    .type-card { padding: 1.25rem; border: 2px solid #E5E7EB; border-radius: 0.875rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.875rem; }
    .type-card:hover { border-color: var(--color-primary); transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .type-card.selected { border-color: var(--color-primary); background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%); }
    .type-icon { width: 32px; height: 32px; color: #6B7280; }
    .type-card:hover .type-icon { color: var(--color-primary); }
    .type-card.selected .type-icon { color: var(--color-primary); }
    .type-label { font-weight: 600; color: #374151; font-size: 0.9375rem; }
    .price-slider { width: 100%; margin-top: 0.625rem; accent-color: var(--color-primary); height: 8px; }
    .map-placeholder { position: relative; height: 220px; border-radius: 0.875rem; overflow: hidden; margin-top: 1rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .map-image { width: 100%; height: 100%; object-fit: cover; }
    .map-pin { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 48px; height: 48px; }
    .upload-zone { border: 2px dashed #E5E7EB; border-radius: 0.875rem; padding: 2.5rem; text-align: center; cursor: pointer; transition: all 0.2s; background: #F9FAFB; }
    .upload-zone:hover { border-color: var(--color-primary); background: #D1FAE5; }
    .upload-icon { width: 56px; height: 56px; color: #9CA3AF; margin-bottom: 1rem; }
    .upload-text { font-size: 0.9375rem; color: #374151; margin-bottom: 0.25rem; font-weight: 500; }
    .file-input { display: none; }
    .photos-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; margin-top: 1rem; }
    .photo-item { position: relative; aspect-ratio: 1; border-radius: 0.625rem; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .photo-preview { width: 100%; height: 100%; object-fit: cover; }
    .photo-delete { position: absolute; top: 0.375rem; right: 0.375rem; width: 28px; height: 28px; background: rgba(239,68,68,0.95); border: none; border-radius: 50%; cursor: pointer; color: white; font-weight: 600; font-size: 1rem; }
    .form-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 2.5rem; padding-top: 2rem; border-top: 1px solid #E5E7EB; }
    .btn-prev { padding: 0.875rem 1.75rem; background: white; border: 1.5px solid #E5E7EB; border-radius: 0.625rem; font-size: 0.9375rem; font-weight: 600; color: #6B7280; cursor: pointer; transition: all 0.2s; }
    .btn-prev:hover { background: #F3F4F6; transform: translateX(-2px); }
    .btn-next { padding: 0.875rem 1.75rem; background: var(--color-primary); border: none; border-radius: 0.625rem; font-size: 0.9375rem; font-weight: 600; color: white; cursor: pointer; transition: all 0.2s; }
    .btn-next:hover { background: var(--color-primary-dark); transform: translateX(2px); }
    .final-actions { display: flex; gap: 1rem; align-items: center; }
    .btn-cancel { padding: 0.875rem 1.75rem; color: #E53E3E; text-decoration: none; font-size: 0.9375rem; font-weight: 500; }
    .btn-draft { padding: 0.875rem 1.75rem; background: white; border: 2px solid var(--color-primary); border-radius: 0.625rem; font-size: 0.9375rem; font-weight: 600; color: var(--color-primary); cursor: pointer; transition: all 0.2s; }
    .btn-draft:hover { background: #D1FAE5; }
    .btn-publish { padding: 0.875rem 2rem; background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dark) 100%); border: none; border-radius: 0.625rem; font-size: 0.9375rem; font-weight: 700; color: white; cursor: pointer; transition: all 0.2s; }
    .btn-publish:hover:not(:disabled) { background: linear-gradient(135deg, var(--color-accent-dark) 0%, #D97706 100%); transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(245,166,35,0.3); }
    .btn-publish:disabled { opacity: 0.5; cursor: not-allowed; }
    @media (max-width: 768px) {
      .annonce-form-container { padding: 1rem; }
      .form-card { padding: 1.5rem; }
      .header-content { flex-direction: column; align-items: flex-start; }
      .type-grid { grid-template-columns: 1fr; }
      .photos-grid { grid-template-columns: repeat(3, 1fr); }
      .form-actions { flex-direction: column; gap: 1rem; }
      .final-actions { flex-direction: column; width: 100%; }
      .btn-cancel, .btn-draft, .btn-publish { width: 100%; }
    }
  `
})
export class AnnonceFormComponent implements OnInit {
  annonceForm: FormGroup;
  isEditMode = false;
  annonceId = '';
  currentStep = 1;
  submitting = false;
  draftSaved = false;
  photos: string[] = [];
  shakeFields: any = {};

  typeOptions = [
    { value: 'LOCATION', label: 'Location', icon: 'home' },
    { value: 'VENTE', label: 'Vente', icon: 'sell' },
    { value: 'COLOCATION', label: 'Colocation', icon: 'group' },
    { value: 'BUREAU', label: 'Bureau', icon: 'business' }
  ];

  villes = [
    { name: 'Lomé' },
    { name: 'Kpalimé' },
    { name: 'Atakpamé' },
    { name: 'Sokodé' },
    { name: 'Kara' },
    { name: 'Tsévié' }
  ];

  constructor(
    private fb: FormBuilder,
    private annoncesService: AnnoncesService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.annonceForm = this.fb.group({
      titre: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      type: ['', Validators.required],
      prix: ['', [Validators.required, Validators.min(1)]],
      adresse: this.fb.group({
        quartier: ['', Validators.required],
        ville: ['', Validators.required],
        adresseComplete: ['']
      }),
      bienId: ['', Validators.required],
      contact: this.fb.group({
        nom: ['', Validators.required],
        telephone: ['', Validators.required],
        email: ['', Validators.email]
      })
    });
  }

  ngOnInit(): void {
    this.cdr.markForCheck();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.annonceId = id;
        this.loadAnnonce(id);
      }
      this.cdr.markForCheck();
    });
  }

  get titre() { return this.annonceForm.get('titre'); }
  get description() { return this.annonceForm.get('description'); }
  get typeControl() { return this.annonceForm.get('type'); }
  get prix() { return this.annonceForm.get('prix'); }
  get villeControl() { return this.annonceForm.get('adresse.ville'); }
  get quartierControl() { return this.annonceForm.get('adresse.quartier'); }
  get nomControl() { return this.annonceForm.get('contact.nom'); }
  get telephoneControl() { return this.annonceForm.get('contact.telephone'); }
  get emailControl() { return this.annonceForm.get('contact.email'); }
  get bienIdControl() { return this.annonceForm.get('bienId'); }

  get breadcrumbText() { return this.isEditMode ? 'Modifier l\'annonce' : 'Nouvelle annonce'; }
  get formTitle() { return this.isEditMode ? 'Modifier l\'annonce' : 'Créer une nouvelle annonce'; }
  get formSubtitle() { return this.isEditMode ? 'Mettez à jour les informations de votre annonce' : 'Remplissez les informations pour publier votre annonce'; }
  get badgeText() { return this.isEditMode ? 'Modification' : 'Création'; }

  loadAnnonce(id: string): void {
    this.annoncesService.getAnnonceById(id).subscribe({
      next: (annonce) => {
        this.photos = annonce.photos || [];
        this.annonceForm.patchValue({
          titre: annonce.titre,
          description: annonce.description,
          type: annonce.type,
          prix: annonce.prix,
          adresse: {
            quartier: annonce.adresse.quartier,
            ville: annonce.adresse.ville,
            adresseComplete: annonce.adresse.adresseComplete || ''
          },
          bienId: annonce.bienId,
          contact: {
            nom: annonce.contact.nom,
            telephone: annonce.contact.telephone,
            email: annonce.contact.email || ''
          }
        });
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Erreur lors du chargement de l\'annonce:', error);
      }
    });
  }

  selectType(value: string): void {
    this.typeControl?.setValue(value);
  }

  formatPrice(value: any): string {
    if (!value) return '';
    const numValue = typeof value === 'string' ? parseInt(value.replace(/\s/g, '')) : value;
    return numValue.toLocaleString('fr-FR') + ' FCFA';
  }

  onPriceInput(event: any): void {
    const value = event.target.value.replace(/\D/g, '');
    this.prix?.setValue(value);
  }

  onSliderChange(event: any): void {
    this.prix?.setValue(parseInt(event.target.value));
    this.cdr.markForCheck();
  }

  formatPhone(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 10) value = value.substring(0, 10);
    if (value.length >= 2) value = value.substring(0, 2) + ' ' + value.substring(2);
    if (value.length >= 5) value = value.substring(0, 5) + ' ' + value.substring(5);
    if (value.length >= 8) value = value.substring(0, 8) + ' ' + value.substring(8);
    if (value.length >= 11) value = value.substring(0, 11) + ' ' + value.substring(11);
    this.telephoneControl?.setValue(value.trim());
    this.cdr.markForCheck();
  }

  onFileSelect(event: any): void {
    const files = event.target.files;
    if (files) {
      const remainingSlots = 10 - this.photos.length;
      const filesToProcess = Math.min(files.length, remainingSlots);
      for (let i = 0; i < filesToProcess; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            this.photos.push(e.target.result);
            this.cdr.markForCheck();
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }

  removePhoto(index: number): void {
    this.photos.splice(index, 1);
    this.cdr.markForCheck();
  }

  validateStep(step: number): boolean {
    this.shakeFields = {};
    let valid = true;

    if (step === 1) {
      if (this.titre?.invalid) { this.shakeFields.titre = true; valid = false; }
      if (this.typeControl?.invalid) { this.shakeFields.type = true; valid = false; }
      if (this.prix?.invalid) { this.shakeFields.prix = true; valid = false; }
      if (this.description?.invalid) { this.shakeFields.description = true; valid = false; }
    }

    if (step === 2) {
      if (this.villeControl?.invalid) { this.shakeFields.ville = true; valid = false; }
      if (this.quartierControl?.invalid) { this.shakeFields.quartier = true; valid = false; }
    }

    if (step === 3) {
      if (this.nomControl?.invalid) { this.shakeFields.nom = true; valid = false; }
      if (this.telephoneControl?.invalid) { this.shakeFields.telephone = true; valid = false; }
      if (this.bienIdControl?.invalid) { this.shakeFields.bienId = true; valid = false; }
    }

    this.cdr.markForCheck();
    return valid;
  }

  nextStep(): void {
    if (this.validateStep(this.currentStep)) {
      this.currentStep++;
      this.cdr.markForCheck();
    }
  }

  previousStep(): void {
    this.currentStep--;
    this.cdr.markForCheck();
  }

  saveDraft(): void {
    localStorage.setItem('annonce_draft', JSON.stringify(this.annonceForm.value));
    this.draftSaved = true;
    this.cdr.markForCheck();
    setTimeout(() => { this.draftSaved = false; this.cdr.markForCheck(); }, 3000);
  }

  onSubmit(): void {
    if (this.annonceForm.invalid) return;

    this.submitting = true;
    const annonceRequest: AnnonceRequest = {
      ...this.annonceForm.value,
      photos: this.photos
    };

    if (this.isEditMode) {
      this.annoncesService.updateAnnonce(this.annonceId, annonceRequest).subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigate(['/annonces/list']);
        },
        error: () => {
          this.submitting = false;
        }
      });
    } else {
      this.annoncesService.createAnnonce(annonceRequest).subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigate(['/annonces/list']);
        },
        error: () => {
          this.submitting = false;
        }
      });
    }
  }
}
