import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { BiensService } from '../../services/biens.service';
import { Bien, PropertyType, CreateBienRequest } from '@core/models/bien.model';
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
          <button routerLink="/dashboard/biens" class="btn-secondary">Annuler</button>
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
                  class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors"
                  [class]="currentStep >= step.number ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'"
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
                  <div class="w-16 h-1 mx-2 transition-colors" [class]="currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'"></div>
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
          <lok-alerte type="error" [message]="errorMessage" class="mb-4 block"></lok-alerte>
        }

        <!-- Formulaire -->
        @if (loading) {
          <lok-skeleton type="card"></lok-skeleton>
        } @else {
          <form [formGroup]="bienForm" (ngSubmit)="onSubmit()" class="space-y-6">

            <!-- Étape 1 : Type et description -->
            @if (currentStep === 1) {
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Type de bien</h2>
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Type de bien *</label>
                    <select formControlName="type" class="input-field">
                      <option value="">Sélectionnez un type</option>
                      <option value="VILLA">Villa</option>
                      <option value="APARTMENT">Appartement</option>
                      <option value="STUDIO">Studio</option>
                      <option value="COMMERCIAL">Local commercial / Bureau</option>
                    </select>
                    @if (bienForm.get('type')?.touched && bienForm.get('type')?.invalid) {
                      <p class="text-red-500 text-xs mt-1">Le type est requis</p>
                    }
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      formControlName="description"
                      class="input-field"
                      rows="4"
                      placeholder="Décrivez votre bien (optionnel)..."
                    ></textarea>
                  </div>
                </div>
              </div>
            }

            <!-- Étape 2 : Adresse -->
            @if (currentStep === 2) {
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Adresse</h2>
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Quartier *</label>
                    <input
                      type="text"
                      formControlName="neighborhood"
                      class="input-field"
                      placeholder="Ex : Adewui, Bé, Tokoin…"
                    />
                    @if (bienForm.get('neighborhood')?.touched && bienForm.get('neighborhood')?.invalid) {
                      <p class="text-red-500 text-xs mt-1">Le quartier est requis</p>
                    }
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Ville *</label>
                    <select formControlName="city" class="input-field">
                      <option value="">Sélectionnez une ville</option>
                      <option>Lomé</option>
                      <option>Sokodé</option>
                      <option>Kara</option>
                      <option>Atakpamé</option>
                      <option>Kpalimé</option>
                      <option>Dapaong</option>
                      <option>Tsévié</option>
                      <option>Aného</option>
                    </select>
                    @if (bienForm.get('city')?.touched && bienForm.get('city')?.invalid) {
                      <p class="text-red-500 text-xs mt-1">La ville est requise</p>
                    }
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Adresse complète</label>
                    <input
                      type="text"
                      formControlName="address"
                      class="input-field"
                      placeholder="Ex : 12 Rue des Cocotiers, Lomé"
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
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Surface (m²) *</label>
                    <input
                      type="number"
                      formControlName="surfaceArea"
                      class="input-field"
                      placeholder="Ex : 85"
                      min="1"
                    />
                    @if (bienForm.get('surfaceArea')?.touched && bienForm.get('surfaceArea')?.invalid) {
                      <p class="text-red-500 text-xs mt-1">La surface est requise (min. 1 m²)</p>
                    }
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Nombre de pièces</label>
                    <input
                      type="number"
                      formControlName="roomsCount"
                      class="input-field"
                      placeholder="Ex : 3"
                      min="1"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Loyer mensuel (FCFA) *</label>
                    <input
                      type="number"
                      formControlName="monthlyRent"
                      class="input-field"
                      placeholder="Ex : 100 000"
                      min="1"
                    />
                    @if (bienForm.get('monthlyRent')?.touched && bienForm.get('monthlyRent')?.invalid) {
                      <p class="text-red-500 text-xs mt-1">Le loyer est requis</p>
                    }
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Charges mensuelles (FCFA)</label>
                    <input
                      type="number"
                      formControlName="monthlyCharges"
                      class="input-field"
                      placeholder="Ex : 15 000"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            }

            <!-- Étape 4 : Photos -->
            @if (currentStep === 4) {
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Photos</h2>
                @if (isEditMode && !bienId) {
                  <p class="text-sm text-gray-500 mb-3">Vous pourrez ajouter des photos après la création.</p>
                } @else {
                  <lok-upload
                    accept="image/*"
                    [maxSize]="5"
                    [multiple]="true"
                    [maxFiles]="10"
                    (filesChange)="onPhotosChange($event)"
                  ></lok-upload>
                  <p class="text-xs text-gray-500 mt-2">JPG, PNG (max 5 Mo par photo, max 10 photos)</p>
                }
              </div>
            }

            <!-- Étape 5 : Documents -->
            @if (currentStep === 5) {
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Documents</h2>
                <div class="space-y-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">État des lieux (PDF/Photos)</label>
                    <lok-upload
                      accept=".pdf,image/*"
                      [maxSize]="10"
                      [multiple]="true"
                      [maxFiles]="5"
                      (filesChange)="onEtatLieuxChange($event)"
                    ></lok-upload>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Titre de propriété (PDF)</label>
                    <lok-upload
                      accept=".pdf"
                      [maxSize]="10"
                      [multiple]="false"
                      [maxFiles]="1"
                      (filesChange)="onTitreChange($event)"
                    ></lok-upload>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Autres documents</label>
                    <lok-upload
                      accept=".pdf,.doc,.docx,image/*"
                      [maxSize]="10"
                      [multiple]="true"
                      [maxFiles]="5"
                      (filesChange)="onAutresDocumentsChange($event)"
                    ></lok-upload>
                  </div>
                </div>
              </div>
            }

            <!-- Navigation -->
            <div class="flex justify-between">
              <button
                type="button"
                (click)="previousStep()"
                [disabled]="currentStep === 1"
                class="btn-secondary"
                [class.opacity-50]="currentStep === 1"
              >
                Précédent
              </button>

              @if (currentStep < steps.length) {
                <button
                  type="button"
                  (click)="nextStep()"
                  [disabled]="!isCurrentStepValid()"
                  class="btn-primary"
                  [class.opacity-50]="!isCurrentStepValid()"
                >
                  Suivant
                </button>
              } @else {
                <button
                  type="submit"
                  [disabled]="bienForm.invalid || isSubmitting"
                  class="btn-primary"
                  [class.opacity-50]="bienForm.invalid || isSubmitting"
                >
                  @if (isSubmitting) {
                    <span class="flex items-center gap-2">
                      <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Enregistrement…
                    </span>
                  } @else {
                    {{ isEditMode ? 'Enregistrer les modifications' : 'Créer le bien' }}
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
  currentStep = 1;
  isEditMode = false;
  loading = false;
  isSubmitting = false;
  errorMessage = '';
  bienId: string | null = null;

  photoFiles: File[] = [];
  etatLieuxFiles: File[] = [];
  titreFiles: File[] = [];
  autresDocumentsFiles: File[] = [];

  steps = [
    { number: 1, title: 'Type' },
    { number: 2, title: 'Adresse' },
    { number: 3, title: 'Loyer' },
    { number: 4, title: 'Photos' },
    { number: 5, title: 'Documents' },
  ];

  constructor(
    private fb: FormBuilder,
    private biensService: BiensService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.bienForm = this.fb.group({
      type:           ['', Validators.required],
      description:    [''],
      neighborhood:   ['', Validators.required],
      city:           ['', Validators.required],
      address:        [''],
      surfaceArea:    ['', [Validators.required, Validators.min(1)]],
      roomsCount:     [null],
      monthlyRent:    ['', [Validators.required, Validators.min(1)]],
      monthlyCharges: [0, Validators.min(0)],
    });
  }

  ngOnInit(): void {
    this.bienId = this.route.snapshot.paramMap.get('id');
    if (this.bienId) {
      this.isEditMode = true;
      this.loadBien(this.bienId);
    }
  }

  loadBien(id: string): void {
    this.loading = true;
    this.biensService.getBienById(id).subscribe({
      next: (bien: Bien) => {
        this.bienForm.patchValue({
          type:           bien.type,
          description:    bien.description ?? '',
          neighborhood:   bien.neighborhood,
          city:           bien.city,
          address:        bien.address,
          surfaceArea:    bien.surfaceArea,
          roomsCount:     bien.roomsCount ?? null,
          monthlyRent:    bien.monthlyRent,
          monthlyCharges: bien.monthlyCharges,
        });
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Erreur lors du chargement du bien';
        this.loading = false;
      },
    });
  }

  nextStep(): void {
    if (this.currentStep < this.steps.length) this.currentStep++;
  }

  previousStep(): void {
    if (this.currentStep > 1) this.currentStep--;
  }

  isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 1: return this.bienForm.get('type')?.valid ?? false;
      case 2: return (this.bienForm.get('neighborhood')?.valid ?? false) && (this.bienForm.get('city')?.valid ?? false);
      case 3: return (this.bienForm.get('surfaceArea')?.valid ?? false) && (this.bienForm.get('monthlyRent')?.valid ?? false);
      default: return true;
    }
  }

  onPhotosChange(files: UploadedFile[]): void {
    this.photoFiles = files.map((f) => f.file);
  }

  onEtatLieuxChange(files: UploadedFile[]): void {
    this.etatLieuxFiles = files.map((f) => f.file);
  }

  onTitreChange(files: UploadedFile[]): void {
    this.titreFiles = files.map((f) => f.file);
  }

  onAutresDocumentsChange(files: UploadedFile[]): void {
    this.autresDocumentsFiles = files.map((f) => f.file);
  }

  onSubmit(): void {
    if (this.bienForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    const v = this.bienForm.value;
    const dto: CreateBienRequest = {
      type:           v.type as PropertyType,
      address:        v.address || `${v.neighborhood}, ${v.city}`,
      neighborhood:   v.neighborhood,
      city:           v.city,
      surfaceArea:    Number(v.surfaceArea),
      roomsCount:     v.roomsCount ? Number(v.roomsCount) : undefined,
      monthlyRent:    Number(v.monthlyRent),
      monthlyCharges: Number(v.monthlyCharges) || 0,
      description:    v.description || undefined,
    };

    if (this.isEditMode && this.bienId) {
      this.biensService.updateBien(this.bienId, dto).subscribe({
        next: () => this.afterSave(),
        error: (err: any) => this.handleError(err),
      });
    } else {
      this.biensService.createBien(dto).subscribe({
        next: (bien: Bien) => {
          // Après création, upload les photos et documents si présents
          this.uploadMedia(bien.id);
        },
        error: (err: any) => this.handleError(err),
      });
    }
  }

  private uploadMedia(bienId: string): void {
    const uploads: Promise<void>[] = [];

    if (this.photoFiles.length > 0) {
      uploads.push(
        new Promise<void>((res) =>
          this.biensService.addPhotos(bienId, this.photoFiles).subscribe({ next: () => res(), error: () => res() }),
        ),
      );
    }
    if (this.etatLieuxFiles.length > 0) {
      uploads.push(
        new Promise<void>((res) =>
          this.biensService.addDocuments(bienId, 'STATE_OF_PLAY', this.etatLieuxFiles).subscribe({ next: () => res(), error: () => res() }),
        ),
      );
    }
    if (this.titreFiles.length > 0) {
      uploads.push(
        new Promise<void>((res) =>
          this.biensService.addDocuments(bienId, 'PROPERTY_TITLE', this.titreFiles).subscribe({ next: () => res(), error: () => res() }),
        ),
      );
    }

    Promise.all(uploads).then(() => this.afterSave());
  }

  private afterSave(): void {
    this.isSubmitting = false;
    this.router.navigate(['/dashboard/biens']);
  }

  private handleError(err: any): void {
    this.isSubmitting = false;
    this.errorMessage = err.error?.message || 'Une erreur est survenue';
  }
}
