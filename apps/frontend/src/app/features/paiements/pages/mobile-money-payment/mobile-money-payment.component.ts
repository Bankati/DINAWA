import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, Validators, ReactiveFormsModule } from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { HttpErrorResponse } from "@angular/common/http";
import { PaiementsService } from "../../services/paiements.service";
import { LokAlerteComponent } from "../../../../shared/components/lok-alerte/lok-alerte.component";
import { LokMontantFcfaComponent } from "../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component";
import { CommonModule } from "@angular/common";
import { extractErrorMessage } from "@core/utils/http-error.util";

export type MobileMoneyProvider = "tmoney" | "flooz";

@Component({
  selector: "app-mobile-money-payment",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LokAlerteComponent,
    LokMontantFcfaComponent,
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">
              Paiement Mobile Money
            </h1>
            <p class="text-sm text-gray-600">
              Payez votre loyer via T-Money ou Flooz
            </p>
          </div>
          <button routerLink="/dashboard/paiements" class="btn-secondary">
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

        <!-- Alerte de succès -->
        @if (successMessage) {
          <lok-alerte type="success" [message]="successMessage"></lok-alerte>
        }

        <!-- Récapitulatif du paiement -->
        <div
          class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6"
        >
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            Récapitulatif du paiement
          </h2>

          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600">Bien</span>
              <span class="font-medium">{{ bienTitre }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Période</span>
              <span class="font-medium">{{ periode }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Montant dû</span>
              <span class="font-bold text-lg">
                <lok-montant-fcfa [montant]="montantDu"></lok-montant-fcfa>
              </span>
            </div>
          </div>
        </div>

        <!-- Sélection du fournisseur -->
        <div
          class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6"
        >
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            Choisissez votre opérateur
          </h2>

          <div class="grid grid-cols-2 gap-4">
            <button
              type="button"
              (click)="selectProvider('tmoney')"
              [class]="
                selectedProvider === 'tmoney'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary'
                  : 'border-gray-200 hover:border-gray-300'
              "
              class="border-2 rounded-xl p-6 flex flex-col items-center transition-all"
            >
              <div
                class="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mb-3"
              >
                <span class="text-2xl font-bold text-yellow-900">T</span>
              </div>
              <span class="font-semibold text-gray-900">T-Money</span>
              <span class="text-xs text-gray-500 mt-1">Togocom</span>
            </button>

            <button
              type="button"
              (click)="selectProvider('flooz')"
              [class]="
                selectedProvider === 'flooz'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary'
                  : 'border-gray-200 hover:border-gray-300'
              "
              class="border-2 rounded-xl p-6 flex flex-col items-center transition-all"
            >
              <div
                class="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mb-3"
              >
                <span class="text-2xl font-bold text-white">F</span>
              </div>
              <span class="font-semibold text-gray-900">Flooz</span>
              <span class="text-xs text-gray-500 mt-1">Moov Africa</span>
            </button>
          </div>
        </div>

        <!-- Formulaire de paiement -->
        @if (selectedProvider) {
          <div
            class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6"
          >
            <h2 class="text-lg font-semibold text-gray-900 mb-4">
              Paiement via
              {{ selectedProvider === "tmoney" ? "T-Money" : "Flooz" }}
            </h2>

            <form
              [formGroup]="paymentForm"
              (ngSubmit)="onSubmit()"
              class="space-y-4"
            >
              <!-- Numéro de téléphone -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 mb-2"
                  for="mobile-money-telephone"
                >
                  Numéro
                  {{ selectedProvider === "tmoney" ? "T-Money" : "Flooz" }} *
                </label>
                <input
                  id="mobile-money-telephone"
                  type="tel"
                  formControlName="telephone"
                  class="input-field"
                  placeholder="Ex: 90 01 02 03"
                  maxlength="15"
                  (input)="formatTelephone($event)"
                />
                @if (
                  paymentForm.get("telephone")?.touched &&
                  paymentForm.get("telephone")?.invalid
                ) {
                  <p class="text-red-500 text-xs mt-1">
                    @if (paymentForm.get("telephone")?.errors?.["required"]) {
                      Le numéro est requis
                    } @else {
                      Numéro invalide
                    }
                  </p>
                }
              </div>

              <!-- Code PIN (simulé) -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 mb-2"
                  for="mobile-money-pin"
                  >Code PIN *</label
                >
                <input
                  id="mobile-money-pin"
                  type="password"
                  formControlName="pin"
                  class="input-field"
                  placeholder="••••"
                  maxlength="4"
                />
                @if (
                  paymentForm.get("pin")?.touched &&
                  paymentForm.get("pin")?.invalid
                ) {
                  <p class="text-red-500 text-xs mt-1">
                    @if (paymentForm.get("pin")?.errors?.["required"]) {
                      Le code PIN est requis
                    } @else {
                      Le code PIN doit contenir 4 chiffres
                    }
                  </p>
                }
              </div>

              <!-- Montant (lecture seule) -->
              <div>
                <span class="block text-sm font-medium text-gray-700 mb-2"
                  >Montant à payer</span
                >
                <div class="input-field bg-gray-50 text-gray-700 font-semibold">
                  <lok-montant-fcfa [montant]="montantDu"></lok-montant-fcfa>
                </div>
              </div>

              <!-- Bouton de paiement -->
              <button
                type="submit"
                [disabled]="paymentForm.invalid || isProcessing"
                class="btn-primary w-full"
              >
                @if (isProcessing) {
                  <svg
                    class="animate-spin h-5 w-5 mr-2"
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
                  Traitement en cours...
                } @else {
                  Payer
                  <lok-montant-fcfa [montant]="montantDu"></lok-montant-fcfa>
                }
              </button>
            </form>
          </div>
        }

        <!-- Informations de sécurité -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-start">
            <svg
              class="w-5 h-5 text-blue-600 mt-0.5 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <div>
              <p class="text-sm text-blue-800 font-medium">Paiement sécurisé</p>
              <p class="text-sm text-blue-600 mt-1">
                Vos informations de paiement sont cryptées et ne sont jamais
                stockées sur nos serveurs. Le paiement est traité directement
                via
                {{ selectedProvider === "tmoney" ? "Togocom" : "Moov Africa" }}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class MobileMoneyPaymentComponent implements OnInit {
  // Type inféré depuis fb.nonNullable.group() — jamais annoter en
  // `FormGroup` nu (voir /review frontend).
  paymentForm: ReturnType<MobileMoneyPaymentComponent["buildForm"]>;
  selectedProvider: MobileMoneyProvider | null = null;
  isProcessing: boolean = false;
  errorMessage: string = "";
  successMessage: string = "";
  bienId: string | null = null;
  bienTitre: string = "";
  periode: string = "";
  montantDu: number = 0;

  private readonly fb = inject(FormBuilder);
  private readonly paiementsService = inject(PaiementsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    this.paymentForm = this.buildForm();
  }

  private buildForm() {
    return this.fb.nonNullable.group({
      telephone: [
        "",
        [Validators.required, Validators.pattern(/^[0-9]{8,15}$/)],
      ],
      pin: ["", [Validators.required, Validators.pattern(/^[0-9]{4}$/)]],
    });
  }

  ngOnInit(): void {
    // Récupérer les paramètres depuis les query params
    this.bienId = this.route.snapshot.queryParamMap.get("bienId");
    this.bienTitre =
      this.route.snapshot.queryParamMap.get("bienTitre") || "Bien inconnu";
    this.periode =
      this.route.snapshot.queryParamMap.get("periode") ||
      "Période non spécifiée";
    this.montantDu = parseInt(
      this.route.snapshot.queryParamMap.get("montant") || "0",
      10,
    );

    if (!this.bienId || this.montantDu === 0) {
      this.errorMessage =
        "Informations de paiement manquantes. Veuillez réessayer.";
      setTimeout(() => {
        void this.router.navigate(["/dashboard/paiements"]);
      }, 3000);
    }
  }

  /**
   * Sélectionne le fournisseur de mobile money
   */
  selectProvider(provider: MobileMoneyProvider): void {
    this.selectedProvider = provider;
    this.errorMessage = "";
    this.successMessage = "";
  }

  /**
   * Formate le numéro de téléphone
   */
  formatTelephone(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value.replace(/[^0-9]/g, "");
    target.value = value;
    this.paymentForm.patchValue({ telephone: value });
  }

  /**
   * Soumet le paiement
   */
  onSubmit(): void {
    if (this.paymentForm.invalid || !this.selectedProvider || !this.bienId) {
      return;
    }

    this.isProcessing = true;
    this.errorMessage = "";
    this.successMessage = "";

    const formValue = this.paymentForm.getRawValue();
    const paymentData = {
      bienId: this.bienId,
      provider: this.selectedProvider,
      telephone: formValue.telephone,
      pin: formValue.pin,
      montant: this.montantDu,
      periode: this.periode,
    };

    this.paiementsService.processMobileMoneyPayment(paymentData).subscribe({
      next: () => {
        this.isProcessing = false;
        this.successMessage =
          "Paiement effectué avec succès ! Votre quittance sera générée automatiquement.";

        // Rediriger vers la liste des paiements après 3 secondes
        setTimeout(() => {
          void this.router.navigate(["/dashboard/paiements"]);
        }, 3000);
      },
      error: (error: HttpErrorResponse) => {
        this.isProcessing = false;
        this.errorMessage = extractErrorMessage(
          error,
          "Erreur lors du paiement. Veuillez réessayer.",
        );
      },
    });
  }
}
