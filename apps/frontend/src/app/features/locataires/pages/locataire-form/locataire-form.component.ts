import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { LocatairesService, LocataireRequest } from '../../services/locataires.service';
import { Locataire, StatutLocataire } from '@core/models/locataire.model';
import { LokTelephoneTogoComponent } from '../../../../shared/components/lok-telephone-togo/lok-telephone-togo.component';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-locataire-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LokTelephoneTogoComponent,
    LokAlerteComponent,
    LokSkeletonComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ isEditMode ? 'Modifier le locataire' : 'Ajouter un locataire' }}</h1>
            <p class="text-sm text-gray-600">{{ isEditMode ? 'Modifiez les informations du locataire' : 'Remplissez les informations pour ajouter un nouveau locataire' }}</p>
          </div>
          <button
            routerLink="/locataires"
            class="btn-secondary"
          >
            Annuler
          </button>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="p-6 max-w-4xl mx-auto">
        <!-- Alerte d'erreur -->
        @if (errorMessage) {
          <lok-alerte type="error" [message]="errorMessage"></lok-alerte>
        }

        <!-- Formulaire -->
        @if (loading) {
          <lok-skeleton type="card"></lok-skeleton>
        } @else {
          <form [formGroup]="locataireForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- Informations personnelles -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h2>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Nom -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                  <input
                    type="text"
                    formControlName="nom"
                    class="input-field"
                    placeholder="Ex: Mensah"
                  />
                  @if (locataireForm.get('nom')?.touched && locataireForm.get('nom')?.invalid) {
                    <p class="text-red-500 text-xs mt-1">Le nom est requis</p>
                  }
                </div>

                <!-- Prénoms -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Prénoms *</label>
                  <input
                    type="text"
                    formControlName="prenoms"
                    class="input-field"
                    placeholder="Ex: Kofi"
                  />
                  @if (locataireForm.get('prenoms')?.touched && locataireForm.get('prenoms')?.invalid) {
                    <p class="text-red-500 text-xs mt-1">Les prénoms sont requis</p>
                  }
                </div>

                <!-- Email -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    formControlName="email"
                    class="input-field"
                    placeholder="Ex: kofi.mensah@email.com"
                  />
                </div>

                <!-- Téléphone -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Téléphone *</label>
                  <lok-telephone-togo
                    formControlName="telephone"
                  ></lok-telephone-togo>
                  @if (locataireForm.get('telephone')?.touched && locataireForm.get('telephone')?.invalid) {
                    <p class="text-red-500 text-xs mt-1">Le téléphone est requis</p>
                  }
                </div>

                <!-- Date de naissance -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Date de naissance</label>
                  <input
                    type="date"
                    formControlName="dateNaissance"
                    class="input-field"
                  />
                </div>
              </div>
            </div>

            <!-- Adresse -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Adresse</h2>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Quartier -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Quartier *</label>
                  <input
                    type="text"
                    formControlName="adresse.quartier"
                    class="input-field"
                    placeholder="Ex: Centre"
                  />
                  @if (locataireForm.get('adresse.quartier')?.touched && locataireForm.get('adresse.quartier')?.invalid) {
                    <p class="text-red-500 text-xs mt-1">Le quartier est requis</p>
                  }
                </div>

                <!-- Ville -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Ville *</label>
                  <select
                    formControlName="adresse.ville"
                    class="input-field"
                  >
                    <option value="">Sélectionnez une ville</option>
                    <option value="Lomé">Lomé</option>
                    <option value="Sokodé">Sokodé</option>
                    <option value="Kara">Kara</option>
                    <option value="Atakpamé">Atakpamé</option>
                    <option value="Kpalimé">Kpalimé</option>
                  </select>
                  @if (locataireForm.get('adresse.ville')?.touched && locataireForm.get('adresse.ville')?.invalid) {
                    <p class="text-red-500 text-xs mt-1">La ville est requise</p>
                  }
                </div>

                <!-- Adresse complète -->
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Adresse complète</label>
                  <input
                    type="text"
                    formControlName="adresse.adresseComplete"
                    class="input-field"
                    placeholder="Ex: 123 Rue de la Paix, Lomé"
                  />
                </div>
              </div>
            </div>

            <!-- Pièce d'identité -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Pièce d'identité</h2>
              
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- Type -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                  <select
                    formControlName="pieceIdentite.type"
                    class="input-field"
                  >
                    <option value="">Sélectionnez</option>
                    <option value="CNI">CNI</option>
                    <option value="PASSEPORT">Passeport</option>
                    <option value="CARTE_RESIDENCE">Carte de résidence</option>
                  </select>
                  @if (locataireForm.get('pieceIdentite.type')?.touched && locataireForm.get('pieceIdentite.type')?.invalid) {
                    <p class="text-red-500 text-xs mt-1">Le type est requis</p>
                  }
                </div>

                <!-- Numéro -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Numéro *</label>
                  <input
                    type="text"
                    formControlName="pieceIdentite.numero"
                    class="input-field"
                    placeholder="Ex: 1234567890123"
                  />
                  @if (locataireForm.get('pieceIdentite.numero')?.touched && locataireForm.get('pieceIdentite.numero')?.invalid) {
                    <p class="text-red-500 text-xs mt-1">Le numéro est requis</p>
                  }
                </div>

                <!-- Date d'expiration -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Date d'expiration</label>
                  <input
                    type="date"
                    formControlName="pieceIdentite.dateExpiration"
                    class="input-field"
                  />
                </div>
              </div>
            </div>

            <!-- Bail -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Informations du bail</h2>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Bien -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Bien *</label>
                  <select
                    formControlName="bienId"
                    class="input-field"
                  >
                    <option value="">Sélectionnez un bien</option>
                    <option value="1">Appartement Lomé Centre</option>
                    <option value="2">Villa Sokodé</option>
                    <option value="3">Studio Kara</option>
                    <option value="4">Bureau Kpalimé</option>
                    <option value="5">Local Commercial Lomé</option>
                  </select>
                  @if (locataireForm.get('bienId')?.touched && locataireForm.get('bienId')?.invalid) {
                    <p class="text-red-500 text-xs mt-1">Le bien est requis</p>
                  }
                </div>

                <!-- Date de début -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Date de début du bail *</label>
                  <input
                    type="date"
                    formControlName="dateDebutBail"
                    class="input-field"
                  />
                  @if (locataireForm.get('dateDebutBail')?.touched && locataireForm.get('dateDebutBail')?.invalid) {
                    <p class="text-red-500 text-xs mt-1">La date de début est requise</p>
                  }
                </div>

                <!-- Date de fin -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Date de fin du bail</label>
                  <input
                    type="date"
                    formControlName="dateFinBail"
                    class="input-field"
                  />
                </div>

                <!-- Caution -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Caution (FCFA)</label>
                  <input
                    type="number"
                    formControlName="caution"
                    class="input-field"
                    placeholder="Ex: 200000"
                  />
                </div>
              </div>
            </div>

            <!-- Garant -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Informations du garant (optionnel)</h2>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Nom du garant -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Nom du garant</label>
                  <input
                    type="text"
                    formControlName="garantNom"
                    class="input-field"
                    placeholder="Ex: Yao Mensah"
                  />
                </div>

                <!-- Téléphone du garant -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Téléphone du garant</label>
                  <input
                    type="text"
                    formControlName="garantTelephone"
                    class="input-field"
                    placeholder="Ex: +228 91 00 00 01"
                  />
                </div>
              </div>
            </div>

            <!-- Boutons -->
            <div class="flex justify-end gap-3">
              <button
                type="button"
                routerLink="/locataires"
                class="btn-secondary"
              >
                Annuler
              </button>
              <button
                type="submit"
                [disabled]="locataireForm.invalid || isSubmitting"
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
            </div>
          </form>
        }
      </div>
    </div>
  `,
})
export class LocataireFormComponent implements OnInit {
  locataireForm: FormGroup;
  isEditMode: boolean = false;
  loading: boolean = false;
  isSubmitting: boolean = false;
  errorMessage: string = '';
  locataireId: string | null = null;
  telephone: string = '';

  constructor(
    private fb: FormBuilder,
    private locatairesService: LocatairesService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.locataireForm = this.fb.group({
      nom: ['', Validators.required],
      prenoms: ['', Validators.required],
      email: [''],
      telephone: ['', Validators.required],
      dateNaissance: [''],
      adresse: this.fb.group({
        quartier: ['', Validators.required],
        ville: ['', Validators.required],
        adresseComplete: ['']
      }),
      pieceIdentite: this.fb.group({
        type: ['', Validators.required],
        numero: ['', Validators.required],
        dateExpiration: ['']
      }),
      bienId: ['', Validators.required],
      dateDebutBail: ['', Validators.required],
      dateFinBail: [''],
      caution: [''],
      garantNom: [''],
      garantTelephone: ['']
    });
  }

  ngOnInit(): void {
    this.locataireId = this.route.snapshot.paramMap.get('id');
    if (this.locataireId) {
      this.isEditMode = true;
      this.loadLocataire(this.locataireId);
    }
  }

  /**
   * Charge un locataire existant pour modification
   */
  loadLocataire(id: string): void {
    this.loading = true;
    this.locatairesService.getLocataireById(id).subscribe({
      next: (locataire: Locataire) => {
        this.locataireForm.patchValue({
          nom: locataire.nom,
          prenoms: locataire.prenoms,
          email: locataire.email,
          telephone: locataire.telephone,
          dateNaissance: locataire.dateNaissance,
          adresse: locataire.adresse,
          pieceIdentite: locataire.pieceIdentite,
          bienId: locataire.bienId,
          dateDebutBail: locataire.dateDebutBail,
          dateFinBail: locataire.dateFinBail,
          caution: locataire.caution,
          garantNom: locataire.garantNom,
          garantTelephone: locataire.garantTelephone
        });
        this.telephone = locataire.telephone;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement du locataire:', error);
        this.errorMessage = 'Erreur lors du chargement du locataire';
        this.loading = false;
      }
    });
  }

  /**
   * Gère le changement de téléphone
   */
  onTelephoneChange(value: string): void {
    this.locataireForm.patchValue({ telephone: value });
  }

  /**
   * Soumet le formulaire
   */
  onSubmit(): void {
    if (this.locataireForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const locataireData: LocataireRequest = {
      nom: this.locataireForm.value.nom,
      prenoms: this.locataireForm.value.prenoms,
      email: this.locataireForm.value.email,
      telephone: this.locataireForm.value.telephone,
      adresse: this.locataireForm.value.adresse,
      dateNaissance: this.locataireForm.value.dateNaissance ? new Date(this.locataireForm.value.dateNaissance) : undefined,
      pieceIdentite: this.locataireForm.value.pieceIdentite,
      bienId: this.locataireForm.value.bienId,
      dateDebutBail: new Date(this.locataireForm.value.dateDebutBail),
      dateFinBail: this.locataireForm.value.dateFinBail ? new Date(this.locataireForm.value.dateFinBail) : undefined,
      caution: this.locataireForm.value.caution,
      garantNom: this.locataireForm.value.garantNom,
      garantTelephone: this.locataireForm.value.garantTelephone
    };

    if (this.isEditMode && this.locataireId) {
      this.locatairesService.updateLocataire(this.locataireId, locataireData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/locataires']);
        },
        error: (error: any) => {
          this.isSubmitting = false;
          this.errorMessage = error.error?.message || 'Erreur lors de la modification du locataire';
        }
      });
    } else {
      this.locatairesService.createLocataire(locataireData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/locataires']);
        },
        error: (error: any) => {
          this.isSubmitting = false;
          this.errorMessage = error.error?.message || 'Erreur lors de la création du locataire';
        }
      });
    }
  }
}
