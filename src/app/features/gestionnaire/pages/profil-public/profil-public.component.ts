import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokUploadComponent, UploadedFile } from '../../../../shared/components/lok-upload/lok-upload.component';
import { LokTelephoneTogoComponent } from '../../../../shared/components/lok-telephone-togo/lok-telephone-togo.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { CommonModule } from '@angular/common';
import { GestionnaireService, ProfilGestionnaire } from '../../services/gestionnaire.service';

@Component({
  selector: 'app-profil-public',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LokAlerteComponent,
    LokUploadComponent,
    LokTelephoneTogoComponent,
    LokSkeletonComponent
  ],
  styles: `
    /* Global SVG Icon Sizing Fix */
    svg {
      width: 24px !important;
      height: 24px !important;
      flex-shrink: 0;
    }
  `,
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Profil Public Gestionnaire</h1>
            <p class="text-sm text-gray-600">Gérez votre profil visible par les propriétaires</p>
          </div>
          <button
            routerLink="/gestionnaire/dashboard"
            class="btn-secondary"
          >
            Retour
          </button>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="p-6 max-w-4xl mx-auto">
        <!-- Alerte d'erreur -->
        @if (errorMessage) {
          <lok-alerte type="error" [message]="errorMessage"></lok-alerte>
        }

        <!-- Alerte de succès -->
        @if (successMessage) {
          <lok-alerte type="success" [message]="successMessage"></lok-alerte>
        }

        <!-- Aperçu du profil -->
        @if (loadingProfil) {
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <lok-skeleton type="text"></lok-skeleton>
          </div>
        }
        @if (!loadingProfil && profil) {
        <div class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          <!-- En-tête du profil -->
          <div class="bg-gradient-to-r from-primary to-primary-dark text-white p-8">
            <div class="flex items-center gap-6">
              <div class="relative">
                <div class="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold">
                  {{ profil.prenom[0] }}{{ profil.nom[0] }}
                </div>
                @if (profil.verifie) {
                  <div class="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                }
              </div>
              <div>
                <h2 class="text-2xl font-bold">{{ profil.prenom }} {{ profil.nom }}</h2>
                <p class="text-white/80">{{ profil.specialite }}</p>
                <div class="flex items-center gap-2 mt-2">
                  @if (profil.verifie) {
                    <span class="bg-green-500/20 text-green-100 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      Vérifié
                    </span>
                  }
                  <span class="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-medium">
                    {{ profil.biensGeres }} biens gérés
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Informations du profil -->
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p class="text-sm text-gray-500">Téléphone</p>
                <p class="font-medium text-gray-900">{{ profil.telephone }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500">Email</p>
                <p class="font-medium text-gray-900">{{ profil.email }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500">Zone d'intervention</p>
                <p class="font-medium text-gray-900">{{ (profil.zoneIntervention ?? []).join(', ') }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500">Tarifs</p>
                <p class="font-medium text-gray-900">{{ profil.tarifs }}</p>
              </div>
            </div>

            <div class="mt-6">
              <p class="text-sm text-gray-500 mb-2">Description</p>
              <p class="text-gray-700">{{ profil.description }}</p>
            </div>

            <div class="mt-6">
              <p class="text-sm text-gray-500 mb-2">Références</p>
              <div class="space-y-2">
                @for (ref of profil.references; track ref) {
                  <div class="bg-gray-50 rounded-lg p-3">
                    <p class="font-medium text-gray-900">{{ ref.proprietaire }}</p>
                    <p class="text-sm text-gray-600">{{ ref.bien }}</p>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
        } <!-- fin @if profil -->

        <!-- Formulaire d'édition -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Modifier le profil</h2>
          
          <form [formGroup]="profilForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- Photo de profil -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Photo de profil</label>
              <lok-upload
                accept="image/*"
                [maxSize]="5"
                [multiple]="false"
                [maxFiles]="1"
                (filesChange)="onPhotoChange($event)"
              ></lok-upload>
              <p class="text-xs text-gray-500 mt-1">JPG, PNG (max 5 Mo)</p>
            </div>

            <!-- Prénom et Nom -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                <input
                  type="text"
                  formControlName="prenom"
                  class="input-field"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                <input
                  type="text"
                  formControlName="nom"
                  class="input-field"
                />
              </div>
            </div>

            <!-- Spécialité -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Spécialité</label>
              <input
                type="text"
                formControlName="specialite"
                class="input-field"
                placeholder="Ex: Gestion résidentielle, Gestion commerciale"
              />
            </div>

            <!-- Téléphone -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
              <lok-telephone-togo
                formControlName="telephone"
                [showError]="true"
              ></lok-telephone-togo>
            </div>

            <!-- Zone d'intervention -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Zone d'intervention</label>
              <select
                formControlName="zoneIntervention"
                class="input-field"
                multiple
              >
                <option value="Lomé">Lomé</option>
                <option value="Sokodé">Sokodé</option>
                <option value="Kara">Kara</option>
                <option value="Atakpamé">Atakpamé</option>
                <option value="Kpalimé">Kpalimé</option>
                <option value="Dapaong">Dapaong</option>
                <option value="Tsévié">Tsévié</option>
                <option value="Aného">Aného</option>
              </select>
              <p class="text-xs text-gray-500 mt-1">Maintenez Ctrl pour sélectionner plusieurs zones</p>
            </div>

            <!-- Tarifs -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tarifs pratiqués</label>
              <select
                formControlName="tarifs"
                class="input-field"
              >
                <option value="pourcentage">Pourcentage du loyer (5-10%)</option>
                <option value="forfait">Forfait mensuel</option>
                <option value="mixte">Mixte (pourcentage + forfait)</option>
              </select>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                formControlName="description"
                class="input-field"
                rows="4"
                placeholder="Décrivez votre expérience, vos services et votre approche de gestion..."
              ></textarea>
            </div>

            <!-- Références -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Références</label>
              <textarea
                formControlName="references"
                class="input-field"
                rows="3"
                placeholder="Listez vos références (propriétaires pour lesquels vous avez travaillé)"
              ></textarea>
            </div>

            <!-- Documents de vérification -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Documents de vérification</label>
              <lok-upload
                accept=".pdf,image/*"
                [maxSize]="10"
                [multiple]="true"
                [maxFiles]="5"
                (filesChange)="onDocumentsChange($event)"
              ></lok-upload>
              <p class="text-xs text-gray-500 mt-1">Pièce d'identité, certificats, attestations (max 10 Mo par fichier)</p>
            </div>

            <!-- Bouton submit -->
            <button
              type="submit"
              [disabled]="profilForm.invalid || isSaving"
              class="btn-primary"
            >
              @if (isSaving) {
                <span class="flex items-center gap-2">
                  <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enregistrement...
                </span>
              } @else {
                Enregistrer les modifications
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class ProfilPublicComponent implements OnInit {
  profilForm: FormGroup;
  isSaving = false;
  loadingProfil = false;
  errorMessage = '';
  successMessage = '';
  photo: File | null = null;
  documents: File[] = [];
  profil: ProfilGestionnaire | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private gestionnaireService: GestionnaireService
  ) {
    this.profilForm = this.fb.group({
      prenom: ['', Validators.required],
      nom: ['', Validators.required],
      specialite: ['', Validators.required],
      telephone: [''],
      zoneIntervention: [[]],
      tarifs: ['', Validators.required],
      description: ['', Validators.required],
      references: ['']
    });
  }

  ngOnInit(): void {
    this.chargerProfil();
  }

  private chargerProfil(): void {
    this.loadingProfil = true;
    this.gestionnaireService.getProfil().subscribe({
      next: (data) => {
        this.profil = data;
        this.loadingProfil = false;
        this.profilForm.patchValue({
          prenom: data.prenom,
          nom: data.nom,
          specialite: data.specialite,
          telephone: data.telephone ?? '',
          zoneIntervention: data.zoneIntervention ?? [],
          tarifs: data.tarifs,
          description: data.description,
          references: (data.references ?? []).map(r => `${r.proprietaire} - ${r.bien}`).join('\n')
        });
      },
      error: () => { this.loadingProfil = false; }
    });
  }

  onPhotoChange(files: UploadedFile[]): void {
    if (files.length > 0) this.photo = files[0].file;
  }

  onDocumentsChange(files: UploadedFile[]): void {
    this.documents = files.map(f => f.file);
  }

  onSubmit(): void {
    if (this.profilForm.invalid) return;

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const partiel: Partial<ProfilGestionnaire> = {
      prenom: this.profilForm.value.prenom,
      nom: this.profilForm.value.nom,
      specialite: this.profilForm.value.specialite,
      telephone: this.profilForm.value.telephone,
      zoneIntervention: this.profilForm.value.zoneIntervention,
      tarifs: this.profilForm.value.tarifs,
      description: this.profilForm.value.description
    };

    this.gestionnaireService.sauvegarderProfil(partiel).subscribe({
      next: (profilMisAJour) => {
        this.profil = profilMisAJour;
        this.isSaving = false;
        this.successMessage = 'Profil mis à jour avec succès !';
        setTimeout(() => { this.successMessage = ''; }, 3000);
      },
      error: () => {
        this.isSaving = false;
        this.errorMessage = 'Erreur lors de la mise à jour du profil';
      }
    });
  }
}
