import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormsModule,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
} from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import {
  ProprietairesService,
  ProprietaireRequest,
} from "../../services/proprietaires.service";
import { LokSkeletonComponent } from "../../../../shared/components/lok-skeleton/lok-skeleton.component";
import { toDateInputValue } from "@core/utils/date.util";

@Component({
  selector: "app-proprietaire-form",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    LokSkeletonComponent,
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">
              {{
                isEditMode ? "Modifier le propriétaire" : "Nouveau propriétaire"
              }}
            </h1>
            <p class="text-sm text-gray-600">
              {{
                isEditMode
                  ? "Modifiez les informations du propriétaire"
                  : "Ajoutez un nouveau propriétaire"
              }}
            </p>
          </div>
          <button
            (click)="goBack()"
            class="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Formulaire -->
      @if (loading) {
        <lok-skeleton type="card"></lok-skeleton>
      } @else {
        <div class="max-w-4xl mx-auto px-6 py-8">
          <form [formGroup]="proprietaireForm" (ngSubmit)="onSubmit()">
            <!-- Informations personnelles -->
            <div
              class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6"
            >
              <h2 class="text-lg font-semibold text-gray-900 mb-4">
                Informations personnelles
              </h2>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Nom -->
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 mb-2"
                    for="proprietaire-nom"
                    >Nom *</label
                  >
                  <input
                    id="proprietaire-nom"
                    type="text"
                    formControlName="nom"
                    class="input-field"
                    placeholder="Ex: Mensah"
                  />
                  @if (
                    proprietaireForm.get("nom")?.touched &&
                    proprietaireForm.get("nom")?.invalid
                  ) {
                    <p class="text-red-500 text-xs mt-1">Le nom est requis</p>
                  }
                </div>

                <!-- Prénoms -->
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 mb-2"
                    for="proprietaire-prenoms"
                    >Prénoms *</label
                  >
                  <input
                    id="proprietaire-prenoms"
                    type="text"
                    formControlName="prenoms"
                    class="input-field"
                    placeholder="Ex: Kofi"
                  />
                  @if (
                    proprietaireForm.get("prenoms")?.touched &&
                    proprietaireForm.get("prenoms")?.invalid
                  ) {
                    <p class="text-red-500 text-xs mt-1">
                      Les prénoms sont requis
                    </p>
                  }
                </div>

                <!-- Email -->
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 mb-2"
                    for="proprietaire-email"
                    >Email</label
                  >
                  <input
                    id="proprietaire-email"
                    type="email"
                    formControlName="email"
                    class="input-field"
                    placeholder="Ex: kofi.mensah@email.com"
                  />
                </div>

                <!-- Téléphone -->
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 mb-2"
                    for="proprietaire-telephone"
                    >Téléphone *</label
                  >
                  <input
                    id="proprietaire-telephone"
                    type="tel"
                    formControlName="telephone"
                    class="input-field"
                    placeholder="Ex: +22890123456"
                  />
                  @if (
                    proprietaireForm.get("telephone")?.touched &&
                    proprietaireForm.get("telephone")?.invalid
                  ) {
                    <p class="text-red-500 text-xs mt-1">
                      Le téléphone est requis
                    </p>
                  }
                </div>
              </div>
            </div>

            <!-- Adresse -->
            <div
              class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6"
            >
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Adresse</h2>

              <div
                class="grid grid-cols-1 md:grid-cols-2 gap-4"
                formGroupName="adresse"
              >
                <!-- Quartier -->
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 mb-2"
                    for="proprietaire-quartier"
                    >Quartier *</label
                  >
                  <input
                    id="proprietaire-quartier"
                    type="text"
                    formControlName="quartier"
                    class="input-field"
                    placeholder="Ex: Centre"
                  />
                  @if (
                    proprietaireForm.get("adresse.quartier")?.touched &&
                    proprietaireForm.get("adresse.quartier")?.invalid
                  ) {
                    <p class="text-red-500 text-xs mt-1">
                      Le quartier est requis
                    </p>
                  }
                </div>

                <!-- Ville -->
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 mb-2"
                    for="proprietaire-ville"
                    >Ville *</label
                  >
                  <select
                    id="proprietaire-ville"
                    formControlName="ville"
                    class="input-field"
                  >
                    <option value="">Sélectionner</option>
                    <option value="Lomé">Lomé</option>
                    <option value="Sokodé">Sokodé</option>
                    <option value="Kara">Kara</option>
                    <option value="Kpalimé">Kpalimé</option>
                    <option value="Atakpamé">Atakpamé</option>
                    <option value="Dapaong">Dapaong</option>
                  </select>
                  @if (
                    proprietaireForm.get("adresse.ville")?.touched &&
                    proprietaireForm.get("adresse.ville")?.invalid
                  ) {
                    <p class="text-red-500 text-xs mt-1">
                      La ville est requise
                    </p>
                  }
                </div>

                <!-- Adresse complète -->
                <div class="md:col-span-2">
                  <label
                    class="block text-sm font-medium text-gray-700 mb-2"
                    for="proprietaire-adresse-complete"
                    >Adresse complète</label
                  >
                  <input
                    id="proprietaire-adresse-complete"
                    type="text"
                    formControlName="adresseComplete"
                    class="input-field"
                    placeholder="Ex: Rue du Commerce, Lomé"
                  />
                </div>
              </div>
            </div>

            <!-- Pièce d'identité -->
            <div
              class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6"
            >
              <h2 class="text-lg font-semibold text-gray-900 mb-4">
                Pièce d'identité
              </h2>

              <div
                class="grid grid-cols-1 md:grid-cols-2 gap-4"
                formGroupName="pieceIdentite"
              >
                <!-- Type -->
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 mb-2"
                    for="proprietaire-piece-type"
                    >Type *</label
                  >
                  <select
                    id="proprietaire-piece-type"
                    formControlName="type"
                    class="input-field"
                  >
                    <option value="">Sélectionner</option>
                    <option value="CNI">Carte Nationale d'Identité</option>
                    <option value="PASSEPORT">Passeport</option>
                    <option value="CARTE_RESIDENCE">Carte de Résidence</option>
                  </select>
                  @if (
                    proprietaireForm.get("pieceIdentite.type")?.touched &&
                    proprietaireForm.get("pieceIdentite.type")?.invalid
                  ) {
                    <p class="text-red-500 text-xs mt-1">Le type est requis</p>
                  }
                </div>

                <!-- Numéro -->
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 mb-2"
                    for="proprietaire-piece-numero"
                    >Numéro *</label
                  >
                  <input
                    id="proprietaire-piece-numero"
                    type="text"
                    formControlName="numero"
                    class="input-field"
                    placeholder="Ex: 1234567890123"
                  />
                  @if (
                    proprietaireForm.get("pieceIdentite.numero")?.touched &&
                    proprietaireForm.get("pieceIdentite.numero")?.invalid
                  ) {
                    <p class="text-red-500 text-xs mt-1">
                      Le numéro est requis
                    </p>
                  }
                </div>

                <!-- Date d'expiration -->
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 mb-2"
                    for="proprietaire-piece-expiration"
                    >Date d'expiration</label
                  >
                  <input
                    id="proprietaire-piece-expiration"
                    type="date"
                    formControlName="dateExpiration"
                    class="input-field"
                  />
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-4">
              <button
                type="submit"
                [disabled]="proprietaireForm.invalid || submitting"
                class="btn-primary flex-1"
              >
                @if (submitting) {
                  <span class="flex items-center justify-center gap-2">
                    <svg
                      class="w-5 h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      ></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Enregistrement...
                  </span>
                } @else {
                  {{ isEditMode ? "Mettre à jour" : "Créer le propriétaire" }}
                }
              </button>
              <button type="button" (click)="goBack()" class="btn-secondary">
                Annuler
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class ProprietaireFormComponent implements OnInit {
  // Type inféré depuis fb.nonNullable.group() — jamais annoter en
  // `FormGroup` nu (voir /review frontend).
  proprietaireForm: ReturnType<ProprietaireFormComponent["buildForm"]>;
  isEditMode: boolean = false;
  proprietaireId: string = "";
  loading: boolean = false;
  submitting: boolean = false;

  private readonly fb = inject(FormBuilder);
  private readonly proprietairesService = inject(ProprietairesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    this.proprietaireForm = this.buildForm();
  }

  private buildForm() {
    return this.fb.nonNullable.group({
      nom: ["", Validators.required],
      prenoms: ["", Validators.required],
      email: [""],
      telephone: ["", Validators.required],
      adresse: this.fb.nonNullable.group({
        quartier: ["", Validators.required],
        ville: ["", Validators.required],
        adresseComplete: [""],
      }),
      pieceIdentite: this.fb.nonNullable.group({
        type: [
          "" as ProprietaireRequest["pieceIdentite"]["type"] | "",
          Validators.required,
        ],
        numero: ["", Validators.required],
        dateExpiration: [""],
      }),
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get("id");
      if (id) {
        this.isEditMode = true;
        this.proprietaireId = id;
        this.loadProprietaire(id);
      }
    });
  }

  loadProprietaire(id: string): void {
    this.loading = true;
    this.proprietairesService.getProprietaireById(id).subscribe({
      next: (proprietaire) => {
        this.proprietaireForm.patchValue({
          nom: proprietaire.nom,
          prenoms: proprietaire.prenoms,
          email: proprietaire.email,
          telephone: proprietaire.telephone,
          adresse: proprietaire.adresse,
          pieceIdentite: {
            ...proprietaire.pieceIdentite,
            dateExpiration: toDateInputValue(
              proprietaire.pieceIdentite.dateExpiration,
            ),
          },
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onSubmit(): void {
    if (this.proprietaireForm.invalid) return;

    this.submitting = true;
    const formValue = this.proprietaireForm.getRawValue();
    const proprietaireRequest: ProprietaireRequest = {
      ...formValue,
      pieceIdentite: {
        ...formValue.pieceIdentite,
        type: formValue.pieceIdentite
          .type as ProprietaireRequest["pieceIdentite"]["type"],
        dateExpiration: formValue.pieceIdentite.dateExpiration
          ? new Date(formValue.pieceIdentite.dateExpiration)
          : undefined,
      },
    };

    if (this.isEditMode) {
      this.proprietairesService
        .updateProprietaire(this.proprietaireId, proprietaireRequest)
        .subscribe({
          next: () => {
            this.submitting = false;
            void this.router.navigate(["/proprietaires"]);
          },
          error: () => {
            this.submitting = false;
          },
        });
    } else {
      this.proprietairesService
        .createProprietaire(proprietaireRequest)
        .subscribe({
          next: () => {
            this.submitting = false;
            void this.router.navigate(["/proprietaires"]);
          },
          error: () => {
            this.submitting = false;
          },
        });
    }
  }

  goBack(): void {
    void this.router.navigate(["/proprietaires"]);
  }
}
