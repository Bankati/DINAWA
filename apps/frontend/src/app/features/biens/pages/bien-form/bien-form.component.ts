import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { BiensService } from '../../services/biens.service';
import { Bien, TypeBien, StatutBien } from '@core/models/bien.model';
import { LokUploadComponent, UploadedFile } from '../../../../shared/components/lok-upload/lok-upload.component';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bien-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LokUploadComponent,
    LokAlerteComponent,
    LokSkeletonComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ isEditMode ? 'Modifier le bien' : 'Ajouter un bien' }}</h1>
            <p class="text-sm text-gray-600">{{ isEditMode ? 'Modifiez les informations du bien' : 'Remplissez les informations pour ajouter un nouveau bien' }}</p>
          </div>
          <button
            routerLink="/dashboard/biens"
            class="btn-secondary"
          >
            Annuler
          </button>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="p-6 max-w-4xl mx-auto">
        <!-- Progression des étapes -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-4">
            @for (step of steps; track step.number) {
              <div class="flex items-center">
                <div 
                  class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                  [class.bg-primary.text-white]="currentStep >= step.number"
                  [class.bg-gray-200.text-gray-600]="currentStep < step.number"
                >
                  @if (currentStep > step.number) {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  } @else {
                    {{ step.number }}
                  }
                </div>
                @if (step.number < steps.length) {
                  <div class="w-16 h-1 mx-2" [class.bg-primary]="currentStep > step.number" [class.bg-gray-200]="currentStep <= step.number"></div>
                }
              </div>
            }
          </div>
          <div class="flex justify-between text-xs text-gray-600">
            @for (step of steps; track step.number) {
              <span>{{ step.title }}</span>
            }
          </div>
        </div>

        <!-- Alerte d'erreur -->
        @if (errorMessage) {
          <lok-alerte type="error" [message]="errorMessage"></lok-alerte>
        }

        <!-- Formulaire -->
        @if (loading) {
          <lok-skeleton type="card"></lok-skeleton>
        } @else {
          <form [formGroup]="bienForm" class="space-y-6">
            <!-- Étape 1 : Informations générales -->
            @if (currentStep === 1) {
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Informations générales</h2>
                
                <div class="space-y-4">
                  <!-- Titre -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Titre du bien *</label>
                    <input
                      type="text"
                      formControlName="titre"
                      class="input-field"
                      placeholder="Ex: Appartement Lomé Centre"
                    />
                    @if (bienForm.get('titre')?.touched && bienForm.get('titre')?.invalid) {
                      <p class="text-red-500 text-xs mt-1">Le titre est requis</p>
                    }
                  </div>

                  <!-- Type de bien -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Type de bien *</label>
                    <select
                      formControlName="typeBien"
                      class="input-field"
                    >
                      <option value="">Sélectionnez un type</option>
                      <option value="VILLA">Villa</option>
                      <option value="APPARTEMENT">Appartement</option>
                      <option value="STUDIO">Studio</option>
                      <option value="CHAMBRE">Chambre</option>
                      <option value="BUREAU">Bureau</option>
                      <option value="LOCAL">Local commercial</option>
                    </select>
                    @if (bienForm.get('typeBien')?.touched && bienForm.get('typeBien')?.invalid) {
                      <p class="text-red-500 text-xs mt-1">Le type est requis</p>
                    }
                  </div>

                  <!-- Description -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      formControlName="description"
                      class="input-field"
                      rows="4"
                      placeholder="Décrivez votre bien..."
                    ></textarea>
                  </div>
                </div>
              </div>
            }

            <!-- Étape 2 : Adresse -->
            @if (currentStep === 2) {
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Adresse</h2>

                <div class="space-y-4" formGroupName="adresse">
                  <!-- Quartier -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Quartier *</label>
                    <input
                      type="text"
                      formControlName="quartier"
                      class="input-field"
                      placeholder="Ex: Centre"
                    />
                    @if (bienForm.get('adresse.quartier')?.touched && bienForm.get('adresse.quartier')?.invalid) {
                      <p class="text-red-500 text-xs mt-1">Le quartier est requis</p>
                    }
                  </div>

                  <!-- Ville -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Ville *</label>
                    <select
                      formControlName="ville"
                      class="input-field"
                    >
                      <option value="">Sélectionnez une ville</option>
                      <option value="Lomé">Lomé</option>
                      <option value="Sokodé">Sokodé</option>
                      <option value="Kara">Kara</option>
                      <option value="Atakpamé">Atakpamé</option>
                      <option value="Kpalimé">Kpalimé</option>
                      <option value="Dapaong">Dapaong</option>
                      <option value="Tsévié">Tsévié</option>
                      <option value="Aného">Aného</option>
                    </select>
                    @if (bienForm.get('adresse.ville')?.touched && bienForm.get('adresse.ville')?.invalid) {
                      <p class="text-red-500 text-xs mt-1">La ville est requise</p>
                    }
                  </div>

                  <!-- Adresse complète -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Adresse complète</label>
                    <input
                      type="text"
                      formControlName="adresseComplete"
                      class="input-field"
                      placeholder="Ex: 123 Rue de la Paix, Lomé"
                    />
                  </div>
                </div>
              </div>
            }

            <!-- Étape 3 : Caractéristiques -->
            @if (currentStep === 3) {
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Caractéristiques</h2>
                
                <div class="space-y-4">
                  <!-- Surface -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Surface (m²) *</label>
                    <input
                      type="number"
                      formControlName="surface"
                      class="input-field"
                      placeholder="Ex: 85"
                    />
                    @if (bienForm.get('surface')?.touched && bienForm.get('surface')?.invalid) {
                      <p class="text-red-500 text-xs mt-1">La surface est requise</p>
                    }
                  </div>

                  <!-- Nombre de pièces -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Nombre de pièces *</label>
                    <input
                      type="number"
                      formControlName="nbPieces"
                      class="input-field"
                      placeholder="Ex: 3"
                    />
                    @if (bienForm.get('nbPieces')?.touched && bienForm.get('nbPieces')?.invalid) {
                      <p class="text-red-500 text-xs mt-1">Le nombre de pièces est requis</p>
                    }
                  </div>

                  <!-- Loyer -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Loyer mensuel (FCFA) *</label>
                    <input
                      type="number"
                      formControlName="loyer"
                      class="input-field"
                      placeholder="Ex: 100000"
                    />
                    @if (bienForm.get('loyer')?.touched && bienForm.get('loyer')?.invalid) {
                      <p class="text-red-500 text-xs mt-1">Le loyer est requis</p>
                    }
                  </div>

                  <!-- Charges -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Charges mensuelles (FCFA)</label>
                    <input
                      type="number"
                      formControlName="charges"
                      class="input-field"
                      placeholder="Ex: 15000"
                    />
                  </div>

                  <!-- Statut -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Statut *</label>
                    <select
                      formControlName="statut"
                      class="input-field"
                    >
                      <option value="">Sélectionnez un statut</option>
                      <option value="VACANT">Vacant</option>
                      <option value="OCCUPE">Occupé</option>
                      <option value="EN_TRAVAUX">En travaux</option>
                      <option value="ARCHIVE">Archivé</option>
                    </select>
                    @if (bienForm.get('statut')?.touched && bienForm.get('statut')?.invalid) {
                      <p class="text-red-500 text-xs mt-1">Le statut est requis</p>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- Étape 4 : Photos -->
            @if (currentStep === 4) {
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Photos</h2>
                
                <lok-upload
                  accept="image/*"
                  [maxSize]="5"
                  [multiple]="true"
                  [maxFiles]="10"
                  (filesChange)="onPhotosChange($event)"
                ></lok-upload>
                <p class="text-xs text-gray-500 mt-2">
                  JPG, PNG (max 5 Mo par photo, max 10 photos)
                </p>
              </div>
            }

            <!-- Étape 5 : Documents -->
            @if (currentStep === 5) {
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Documents</h2>
                
                <div class="space-y-6">
                  <!-- Bail -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Contrat de bail (PDF)</label>
                    <lok-upload
                      accept=".pdf"
                      [maxSize]="10"
                      [multiple]="false"
                      [maxFiles]="1"
                      (filesChange)="onBailChange($event)"
                    ></lok-upload>
                    <p class="text-xs text-gray-500 mt-1">
                      PDF uniquement (max 10 Mo)
                    </p>
                  </div>

                  <!-- État des lieux -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">État des lieux (PDF/Photos)</label>
                    <lok-upload
                      accept=".pdf,image/*"
                      [maxSize]="10"
                      [multiple]="true"
                      [maxFiles]="5"
                      (filesChange)="onEtatLieuxChange($event)"
                    ></lok-upload>
                    <p class="text-xs text-gray-500 mt-1">
                      PDF ou images (max 10 Mo par fichier, max 5 fichiers)
                    </p>
                  </div>

                  <!-- Autres documents -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Autres documents (optionnel)</label>
                    <lok-upload
                      accept=".pdf,.doc,.docx,image/*"
                      [maxSize]="10"
                      [multiple]="true"
                      [maxFiles]="10"
                      (filesChange)="onAutresDocumentsChange($event)"
                    ></lok-upload>
                    <p class="text-xs text-gray-500 mt-1">
                      PDF, Word, images (max 10 Mo par fichier, max 10 fichiers)
                    </p>
                  </div>
                </div>
              </div>
            }

            <!-- Boutons de navigation -->
            <div class="flex justify-between">
              <button
                type="button"
                (click)="previousStep()"
                [disabled]="currentStep === 1"
                [class.opacity-50]="currentStep === 1"
                class="btn-secondary"
              >
                Précédent
              </button>
              
              @if (currentStep < steps.length) {
                <button
                  type="button"
                  (click)="nextStep()"
                  [disabled]="!isCurrentStepValid()"
                  class="btn-primary"
                >
                  Suivant
                </button>
              } @else {
                <button
                  type="submit"
                  [disabled]="bienForm.invalid || isSubmitting"
                  class="btn-primary"
                >
                  @if (isSubmitting) {
                    <svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enregistrement...
                  } @else {
                    {{ isEditMode ? 'Modifier' : 'Créer' }}
                  }
                </button>
              }
            </div>
          </form>
        }
      </div>
    </div>
  `,
})
export class BienFormComponent implements OnInit {
  bienForm: FormGroup;
  currentStep: number = 1;
  isEditMode: boolean = false;
  loading: boolean = false;
  isSubmitting: boolean = false;
  errorMessage: string = '';
  bienId: string | null = null;
  photos: string[] = [];
  bail: File | null = null;
  etatLieux: File[] = [];
  autresDocuments: File[] = [];

  steps = [
    { number: 1, title: 'Informations' },
    { number: 2, title: 'Adresse' },
    { number: 3, title: 'Caractéristiques' },
    { number: 4, title: 'Photos' },
    { number: 5, title: 'Documents' }
  ];

  constructor(
    private fb: FormBuilder,
    private biensService: BiensService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.bienForm = this.fb.group({
      titre: ['', Validators.required],
      typeBien: ['', Validators.required],
      description: [''],
      adresse: this.fb.group({
        quartier: ['', Validators.required],
        ville: ['', Validators.required],
        adresseComplete: ['']
      }),
      surface: ['', [Validators.required, Validators.min(1)]],
      nbPieces: ['', [Validators.required, Validators.min(0)]],
      loyer: ['', [Validators.required, Validators.min(0)]],
      charges: [0],
      statut: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.bienId = this.route.snapshot.paramMap.get('id');
    if (this.bienId) {
      this.isEditMode = true;
      this.loadBien(this.bienId);
    }
  }

  /**
   * Charge un bien existant pour modification
   */
  loadBien(id: string): void {
    this.loading = true;
    this.biensService.getBienById(id).subscribe({
      next: (bien: Bien) => {
        this.bienForm.patchValue({
          titre: bien.titre,
          typeBien: bien.typeBien,
          description: bien.description || '',
          adresse: bien.adresse,
          surface: bien.surface,
          nbPieces: bien.nbPieces,
          loyer: bien.loyer,
          charges: bien.charges || 0,
          statut: bien.statut
        });
        this.photos = bien.photos || [];
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement du bien:', error);
        this.errorMessage = 'Erreur lors du chargement du bien';
        this.loading = false;
      }
    });
  }

  /**
   * Passe à l'étape suivante
   */
  nextStep(): void {
    if (this.currentStep < this.steps.length) {
      this.currentStep++;
    }
  }

  /**
   * Revient à l'étape précédente
   */
  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  /**
   * Vérifie si l'étape actuelle est valide
   */
  isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 1:
        return (this.bienForm.get('titre')?.valid ?? false) && (this.bienForm.get('typeBien')?.valid ?? false);
      case 2:
        return (this.bienForm.get('adresse.quartier')?.valid ?? false) && (this.bienForm.get('adresse.ville')?.valid ?? false);
      case 3:
        return (this.bienForm.get('surface')?.valid ?? false) &&
               (this.bienForm.get('nbPieces')?.valid ?? false) &&
               (this.bienForm.get('loyer')?.valid ?? false) &&
               (this.bienForm.get('statut')?.valid ?? false);
      case 4:
        return true;
      case 5:
        return true; // Documents optionnels
      default:
        return false;
    }
  }

  /**
   * Gère le changement de photos
   */
  onPhotosChange(files: UploadedFile[]): void {
    this.photos = files.map(f => f.preview);
  }

  /**
   * Gère le changement du bail
   */
  onBailChange(files: UploadedFile[]): void {
    if (files.length > 0) {
      this.bail = files[0].file;
    } else {
      this.bail = null;
    }
  }

  /**
   * Gère le changement de l'état des lieux
   */
  onEtatLieuxChange(files: UploadedFile[]): void {
    this.etatLieux = files.map(f => f.file);
  }

  /**
   * Gère le changement des autres documents
   */
  onAutresDocumentsChange(files: UploadedFile[]): void {
    this.autresDocuments = files.map(f => f.file);
  }

  /**
   * Soumet le formulaire
   */
  onSubmit(): void {
    if (this.bienForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const bienData = this.bienForm.value;

    // Créer FormData pour l'upload des fichiers
    const formData = new FormData();
    formData.append('titre', bienData.titre);
    formData.append('typeBien', bienData.typeBien);
    formData.append('description', bienData.description || '');
    formData.append('surface', bienData.surface.toString());
    formData.append('nbPieces', bienData.nbPieces.toString());
    formData.append('loyer', bienData.loyer.toString());
    formData.append('charges', (bienData.charges || 0).toString());
    formData.append('statut', bienData.statut);
    formData.append('quartier', bienData.adresse.quartier);
    formData.append('ville', bienData.adresse.ville);
    formData.append('adresseComplete', bienData.adresse.adresseComplete || '');
    
    // Ajouter les photos
    this.photos.forEach((photo, index) => {
      formData.append(`photos[${index}]`, photo);
    });

    // Ajouter les documents
    if (this.bail) {
      formData.append('bail', this.bail);
    }
    this.etatLieux.forEach((file, index) => {
      formData.append(`etatLieux[${index}]`, file);
    });
    this.autresDocuments.forEach((file, index) => {
      formData.append(`autresDocuments[${index}]`, file);
    });

    if (this.isEditMode && this.bienId) {
      this.biensService.updateBien(this.bienId, formData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/dashboard/biens']);
        },
        error: (error: any) => {
          this.isSubmitting = false;
          this.errorMessage = error.error?.message || 'Erreur lors de la modification du bien';
        }
      });
    } else {
      this.biensService.createBien(formData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/dashboard/biens']);
        },
        error: (error: any) => {
          this.isSubmitting = false;
          this.errorMessage = error.error?.message || 'Erreur lors de la création du bien';
        }
      });
    }
  }
}
