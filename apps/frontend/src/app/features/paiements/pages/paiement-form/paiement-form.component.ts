import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { PaiementsService, PaiementRequest } from '../../services/paiements.service';
import { FrequencePaiement, ModePaiement } from '@core/models/paiement.model';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-paiement-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LokAlerteComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Enregistrer un paiement</h1>
            <p class="text-sm text-gray-600">Enregistrez un nouveau paiement de loyer</p>
          </div>
          <button
            routerLink="/dashboard/paiements"
            class="btn-secondary"
          >
            Annuler
          </button>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="p-6 max-w-2xl mx-auto">
        <!-- Alerte d'erreur -->
        @if (errorMessage) {
          <lok-alerte type="error" [message]="errorMessage"></lok-alerte>
        }

        <!-- Formulaire -->
        <form [formGroup]="paiementForm" (ngSubmit)="onSubmit()" class="space-y-6">
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Informations du paiement</h2>
            
            <div class="space-y-4">
              <!-- Locataire -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Locataire *</label>
                <select
                  formControlName="locataireId"
                  class="input-field"
                >
                  <option value="">Sélectionnez un locataire</option>
                  <option value="1">Locataire #1 - Kofi Mensah</option>
                  <option value="2">Locataire #2 - Awa Kouassi</option>
                  <option value="3">Locataire #3 - Yao Agbogba</option>
                  <option value="4">Locataire #4 - Mawunyo Togbe</option>
                  <option value="5">Locataire #5 - Komla Amouzou</option>
                </select>
                @if (paiementForm.get('locataireId')?.touched && paiementForm.get('locataireId')?.invalid) {
                  <p class="text-red-500 text-xs mt-1">Le locataire est requis</p>
                }
              </div>

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
                @if (paiementForm.get('bienId')?.touched && paiementForm.get('bienId')?.invalid) {
                  <p class="text-red-500 text-xs mt-1">Le bien est requis</p>
                }
              </div>

              <!-- Montant -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Montant payé (FCFA) *</label>
                <input
                  type="number"
                  formControlName="montant"
                  class="input-field"
                  placeholder="Ex: 100000"
                />
                @if (paiementForm.get('montant')?.touched && paiementForm.get('montant')?.invalid) {
                  <p class="text-red-500 text-xs mt-1">Le montant est requis</p>
                }
              </div>

              <!-- Montant de l'échéance -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Montant de l'échéance (FCFA) *</label>
                <input
                  type="number"
                  formControlName="montantEcheance"
                  class="input-field"
                  placeholder="Ex: 100000"
                />
                @if (paiementForm.get('montantEcheance')?.touched && paiementForm.get('montantEcheance')?.invalid) {
                  <p class="text-red-500 text-xs mt-1">Le montant de l'échéance est requis</p>
                }
                @if (paiementForm.get('montant')?.value && paiementForm.get('montantEcheance')?.value) {
                  <p class="text-xs mt-1" [class.text-green-600]="paiementForm.get('montant')?.value >= paiementForm.get('montantEcheance')?.value" [class.text-orange-600]="paiementForm.get('montant')?.value < paiementForm.get('montantEcheance')?.value">
                    @if (paiementForm.get('montant')?.value >= paiementForm.get('montantEcheance')?.value) {
                      Paiement complet
                    } @else {
                      Paiement partiel (reste: {{ paiementForm.get('montantEcheance')?.value - paiementForm.get('montant')?.value }} FCFA)
                    }
                  </p>
                }
              </div>

              <!-- Fréquence -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Fréquence *</label>
                <select
                  formControlName="frequence"
                  class="input-field"
                >
                  <option value="">Sélectionnez une fréquence</option>
                  <option value="MENSUEL">Mensuel</option>
                  <option value="TRIMESTRIEL">Trimestriel</option>
                  <option value="SEMESTRIEL">Semestriel</option>
                  <option value="ANNUEL">Annuel</option>
                </select>
                @if (paiementForm.get('frequence')?.touched && paiementForm.get('frequence')?.invalid) {
                  <p class="text-red-500 text-xs mt-1">La fréquence est requise</p>
                }
              </div>

              <!-- Date de paiement -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Date de paiement *</label>
                <input
                  type="date"
                  formControlName="datePaiement"
                  class="input-field"
                />
                @if (paiementForm.get('datePaiement')?.touched && paiementForm.get('datePaiement')?.invalid) {
                  <p class="text-red-500 text-xs mt-1">La date de paiement est requise</p>
                }
              </div>

              <!-- Date d'échéance -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Date d'échéance *</label>
                <input
                  type="date"
                  formControlName="dateEcheance"
                  class="input-field"
                />
                @if (paiementForm.get('dateEcheance')?.touched && paiementForm.get('dateEcheance')?.invalid) {
                  <p class="text-red-500 text-xs mt-1">La date d'échéance est requise</p>
                }
              </div>

              <!-- Mode de paiement -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Mode de paiement *</label>
                <select
                  formControlName="modePaiement"
                  class="input-field"
                >
                  <option value="">Sélectionnez un mode</option>
                  <option value="T_MONEY">T-Money</option>
                  <option value="FLOOZ">Flooz</option>
                  <option value="ESPECES">Espèces</option>
                </select>
                @if (paiementForm.get('modePaiement')?.touched && paiementForm.get('modePaiement')?.invalid) {
                  <p class="text-red-500 text-xs mt-1">Le mode de paiement est requis</p>
                }
              </div>

              <!-- Numéro de transaction -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Numéro de transaction</label>
                <input
                  type="text"
                  formControlName="numeroTransaction"
                  class="input-field"
                  placeholder="Ex: TM123456"
                />
                <p class="text-xs text-gray-500 mt-1">Obligatoire pour T-Money et Flooz</p>
              </div>
            </div>
          </div>

          <!-- Boutons -->
          <div class="flex justify-end gap-3">
            <button
              type="button"
              routerLink="/dashboard/paiements"
              class="btn-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              [disabled]="paiementForm.invalid || isSubmitting"
              class="btn-primary"
            >
              @if (isSubmitting) {
                <svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enregistrement...
              } @else {
                Enregistrer le paiement
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class PaiementFormComponent implements OnInit {
  paiementForm: FormGroup;
  isSubmitting: boolean = false;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private paiementsService: PaiementsService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.paiementForm = this.fb.group({
      locataireId: ['', Validators.required],
      bienId: ['', Validators.required],
      montant: ['', [Validators.required, Validators.min(0)]],
      montantEcheance: ['', [Validators.required, Validators.min(0)]],
      frequence: ['', Validators.required],
      datePaiement: ['', Validators.required],
      dateEcheance: ['', Validators.required],
      modePaiement: ['', Validators.required],
      numeroTransaction: ['']
    });
  }

  ngOnInit(): void {
    // Pré-remplir la date de paiement avec aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    this.paiementForm.patchValue({
      datePaiement: today
    });
  }

  /**
   * Soumet le formulaire
   */
  onSubmit(): void {
    if (this.paiementForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const paiementData: PaiementRequest = {
      locataireId: this.paiementForm.value.locataireId,
      bienId: this.paiementForm.value.bienId,
      montant: this.paiementForm.value.montant,
      montantEcheance: this.paiementForm.value.montantEcheance,
      frequence: this.paiementForm.value.frequence as FrequencePaiement,
      datePaiement: new Date(this.paiementForm.value.datePaiement),
      dateEcheance: new Date(this.paiementForm.value.dateEcheance),
      modePaiement: this.paiementForm.value.modePaiement as ModePaiement,
      numeroTransaction: this.paiementForm.value.numeroTransaction
    };

    this.paiementsService.createPaiement(paiementData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/dashboard/paiements']);
      },
      error: (error: any) => {
        this.isSubmitting = false;
        this.errorMessage = error.error?.message || 'Erreur lors de l\'enregistrement du paiement';
      }
    });
  }
}
