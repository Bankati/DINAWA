import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { HttpErrorResponse } from "@angular/common/http";
import { BiensService } from "../../services/biens.service";
import { Bien, StatutBien } from "@core/models/bien.model";
import { LokBadgeStatutComponent } from "../../../../shared/components/lok-badge-statut/lok-badge-statut.component";
import { LokMontantFcfaComponent } from "../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component";
import { LokSkeletonComponent } from "../../../../shared/components/lok-skeleton/lok-skeleton.component";
import { LokConfirmModalComponent } from "../../../../shared/components/lok-confirm-modal/lok-confirm-modal.component";
import { LokAlerteComponent } from "../../../../shared/components/lok-alerte/lok-alerte.component";
import { extractErrorMessage } from "@core/utils/http-error.util";

@Component({
  selector: "app-bien-detail",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LokBadgeStatutComponent,
    LokMontantFcfaComponent,
    LokSkeletonComponent,
    LokConfirmModalComponent,
    LokAlerteComponent,
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button
              routerLink="/dashboard/biens"
              class="p-2 text-gray-600 hover:text-primary transition-colors"
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">
                {{ bien?.titre || "Détail du bien" }}
              </h1>
              <p class="text-sm text-gray-600">
                Informations détaillées du bien
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              (click)="editBien()"
              class="btn-secondary flex items-center gap-2"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Modifier
            </button>
            <button
              (click)="showDeleteModal = true"
              class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Supprimer
            </button>
          </div>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="p-6 max-w-6xl mx-auto">
        @if (loading) {
          <lok-skeleton type="card"></lok-skeleton>
        } @else if (bien) {
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Colonne principale -->
            <div class="lg:col-span-2 space-y-6">
              <!-- Photos -->
              <div
                class="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              >
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Photos</h2>
                @if (bien.photos && bien.photos.length > 0) {
                  <div class="grid grid-cols-2 gap-4">
                    @for (photo of bien.photos; track photo) {
                      <div
                        class="aspect-video bg-gray-200 rounded-lg flex items-center justify-center"
                      >
                        <svg
                          class="w-12 h-12 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    }
                  </div>
                } @else {
                  <div
                    class="aspect-video bg-gray-200 rounded-lg flex items-center justify-center"
                  >
                    <p class="text-gray-500">Aucune photo disponible</p>
                  </div>
                }
              </div>

              <!-- Description -->
              <div
                class="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              >
                <h2 class="text-lg font-semibold text-gray-900 mb-4">
                  Description
                </h2>
                <p class="text-gray-700">
                  {{ bien.description || "Aucune description" }}
                </p>
              </div>

              <!-- Caractéristiques -->
              <div
                class="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              >
                <h2 class="text-lg font-semibold text-gray-900 mb-4">
                  Caractéristiques
                </h2>
                <div class="grid grid-cols-2 gap-4">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center"
                    >
                      <svg
                        class="w-5 h-5 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                        />
                      </svg>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600">Surface</p>
                      <p class="font-semibold text-gray-900">
                        {{ bien.surface }} m²
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center"
                    >
                      <svg
                        class="w-5 h-5 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600">Pièces</p>
                      <p class="font-semibold text-gray-900">
                        {{ bien.nbPieces }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center"
                    >
                      <svg
                        class="w-5 h-5 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600">Type</p>
                      <p class="font-semibold text-gray-900">
                        {{ bien.typeBien }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center"
                    >
                      <svg
                        class="w-5 h-5 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600">Date d'ajout</p>
                      <p class="font-semibold text-gray-900">
                        {{ bien.dateCreation | date: "dd/MM/yyyy" }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Colonne latérale -->
            <div class="space-y-6">
              <!-- Statut et loyer -->
              <div
                class="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              >
                <div class="flex items-center justify-between mb-4">
                  <h2 class="text-lg font-semibold text-gray-900">Statut</h2>
                  <lok-badge-statut [statut]="bien.statut"></lok-badge-statut>
                </div>
                <div class="space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600">Loyer mensuel</span>
                    <lok-montant-fcfa
                      [montant]="bien.loyer"
                      size="lg"
                      color="primary"
                    ></lok-montant-fcfa>
                  </div>
                  @if (bien.charges) {
                    <div class="flex justify-between items-center">
                      <span class="text-gray-600">Charges</span>
                      <lok-montant-fcfa
                        [montant]="bien.charges"
                        size="sm"
                      ></lok-montant-fcfa>
                    </div>
                  }
                  <div class="border-t pt-3 flex justify-between items-center">
                    <span class="font-semibold text-gray-900"
                      >Total mensuel</span
                    >
                    <lok-montant-fcfa
                      [montant]="bien.loyer + (bien.charges || 0)"
                      size="lg"
                      color="primary"
                    ></lok-montant-fcfa>
                  </div>
                </div>
              </div>

              <!-- Adresse -->
              <div
                class="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              >
                <h2 class="text-lg font-semibold text-gray-900 mb-4">
                  Adresse
                </h2>
                <div class="space-y-2">
                  <div class="flex items-start gap-3">
                    <svg
                      class="w-5 h-5 text-gray-400 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <div>
                      <p class="font-medium text-gray-900">
                        {{ bien.adresse.quartier }}
                      </p>
                      <p class="text-sm text-gray-600">
                        {{ bien.adresse.ville }}
                      </p>
                      @if (bien.adresse.adresseComplete) {
                        <p class="text-sm text-gray-500">
                          {{ bien.adresse.adresseComplete }}
                        </p>
                      }
                    </div>
                  </div>
                </div>
              </div>

              <!-- Actions rapides -->
              <div
                class="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              >
                <h2 class="text-lg font-semibold text-gray-900 mb-4">
                  Actions rapides
                </h2>
                <div class="space-y-2">
                  @if (bien.statut === StatutBien.VACANT) {
                    <button
                      (click)="changerStatut(StatutBien.OCCUPE)"
                      class="w-full btn-secondary text-left flex items-center gap-2"
                    >
                      <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                        />
                      </svg>
                      Marquer comme occupé
                    </button>
                  }
                  @if (bien.statut === StatutBien.OCCUPE) {
                    <button
                      (click)="changerStatut(StatutBien.VACANT)"
                      class="w-full btn-secondary text-left flex items-center gap-2"
                    >
                      <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Marquer comme vacant
                    </button>
                  }
                  <button
                    (click)="editBien()"
                    class="w-full btn-secondary text-left flex items-center gap-2"
                  >
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Modifier les informations
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Modal de confirmation de suppression -->
        @if (showDeleteModal) {
          <lok-confirm-modal
            titre="Supprimer le bien"
            message="Êtes-vous sûr de vouloir supprimer ce bien ? Cette action est irréversible."
            confirmLabel="Supprimer"
            cancelLabel="Annuler"
            (confirm)="deleteBien()"
            (cancelled)="showDeleteModal = false"
          ></lok-confirm-modal>
        }

        <!-- Alerte -->
        @if (errorMessage) {
          <lok-alerte type="error" [message]="errorMessage"></lok-alerte>
        }
      </div>
    </div>
  `,
})
export class BienDetailComponent implements OnInit {
  bien: Bien | null = null;
  loading: boolean = true;

  StatutBien = StatutBien; // Pour l'accès dans le template
  showDeleteModal: boolean = false;
  errorMessage: string = "";
  bienId: string = "";

  private readonly biensService = inject(BiensService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.bienId = this.route.snapshot.paramMap.get("id") || "";
    if (this.bienId) {
      this.loadBien();
    }
  }

  /**
   * Charge les détails du bien
   */
  loadBien(): void {
    this.loading = true;
    this.biensService.getBienById(this.bienId).subscribe({
      next: (bien: Bien) => {
        this.bien = bien;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error("Erreur lors du chargement du bien:", error);
        this.errorMessage = "Erreur lors du chargement du bien";
        this.loading = false;
      },
    });
  }

  /**
   * Modifie le bien
   */
  editBien(): void {
    void this.router.navigate(["/dashboard/biens", this.bienId, "edit"]);
  }

  /**
   * Supprime le bien
   */
  deleteBien(): void {
    this.biensService.deleteBien(this.bienId).subscribe({
      next: () => {
        this.showDeleteModal = false;
        void this.router.navigate(["/dashboard/biens"]);
      },
      error: (error: HttpErrorResponse) => {
        console.error("Erreur lors de la suppression du bien:", error);
        this.errorMessage = extractErrorMessage(
          error,
          "Erreur lors de la suppression du bien",
        );
        this.showDeleteModal = false;
      },
    });
  }

  /**
   * Change le statut du bien
   */
  changerStatut(nouveauStatut: StatutBien): void {
    if (this.bien) {
      this.biensService.changerStatut(this.bienId, nouveauStatut).subscribe({
        next: (updatedBien: Bien) => {
          this.bien = updatedBien;
        },
        error: (error: HttpErrorResponse) => {
          console.error("Erreur lors du changement de statut:", error);
          this.errorMessage = extractErrorMessage(
            error,
            "Erreur lors du changement de statut",
          );
        },
      });
    }
  }
}
