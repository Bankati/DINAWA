import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { LocatairesService } from '../../services/locataires.service';
import { Locataire, StatutLocataire } from '@core/models/locataire.model';
import { LokBadgeStatutLocataireComponent } from '../../../../shared/components/lok-badge-statut-locataire/lok-badge-statut-locataire.component';
import { LokMontantFcfaComponent } from '../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokConfirmModalComponent } from '../../../../shared/components/lok-confirm-modal/lok-confirm-modal.component';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';

@Component({
  selector: 'app-locataire-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LokBadgeStatutLocataireComponent,
    LokMontantFcfaComponent,
    LokSkeletonComponent,
    LokConfirmModalComponent,
    LokAlerteComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button
              routerLink="/locataires"
              class="p-2 text-gray-600 hover:text-primary transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">{{ locataire?.prenoms }} {{ locataire?.nom || 'Détail du locataire' }}</h1>
              <p class="text-sm text-gray-600">Informations détaillées du locataire</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              (click)="editLocataire()"
              class="btn-secondary flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Modifier
            </button>
            <button
              (click)="showDeleteModal = true"
              class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
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
        } @else if (locataire) {
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Colonne principale -->
            <div class="lg:col-span-2 space-y-6">
              <!-- Informations personnelles -->
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h2>
                
                <div class="flex items-start gap-4 mb-6">
                  <div class="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center text-primary text-2xl font-bold">
                    {{ locataire.prenoms.charAt(0) }}{{ locataire.nom.charAt(0) }}
                  </div>
                  <div>
                    <h3 class="text-xl font-semibold text-gray-900">{{ locataire.prenoms }} {{ locataire.nom }}</h3>
                    <p class="text-gray-600">{{ locataire.email || 'Pas d\'email' }}</p>
                    <lok-badge-statut-locataire [statut]="locataire.statut"></lok-badge-statut-locataire>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <p class="text-sm text-gray-600">Téléphone</p>
                    <p class="font-medium text-gray-900">{{ locataire.telephone }}</p>
                  </div>
                  <div>
                    <p class="text-sm text-gray-600">Date de naissance</p>
                    <p class="font-medium text-gray-900">{{ locataire.dateNaissance | date:'dd/MM/yyyy' }}</p>
                  </div>
                </div>
              </div>

              <!-- Adresse -->
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Adresse</h2>
                <div class="flex items-start gap-3">
                  <svg class="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <div>
                    <p class="font-medium text-gray-900">{{ locataire.adresse.quartier }}</p>
                    <p class="text-sm text-gray-600">{{ locataire.adresse.ville }}</p>
                    @if (locataire.adresse.adresseComplete) {
                      <p class="text-sm text-gray-500">{{ locataire.adresse.adresseComplete }}</p>
                    }
                  </div>
                </div>
              </div>

              <!-- Pièce d'identité -->
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Pièce d'identité</h2>
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <p class="text-sm text-gray-600">Type</p>
                    <p class="font-medium text-gray-900">{{ locataire.pieceIdentite.type }}</p>
                  </div>
                  <div>
                    <p class="text-sm text-gray-600">Numéro</p>
                    <p class="font-medium text-gray-900">{{ locataire.pieceIdentite.numero }}</p>
                  </div>
                  <div>
                    <p class="text-sm text-gray-600">Expiration</p>
                    <p class="font-medium text-gray-900">{{ locataire.pieceIdentite.dateExpiration | date:'dd/MM/yyyy' }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Colonne latérale -->
            <div class="space-y-6">
              <!-- Bail -->
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Informations du bail</h2>
                <div class="space-y-3">
                  <div>
                    <p class="text-sm text-gray-600">Bien occupé</p>
                    <p class="font-medium text-gray-900">Bien #{{ locataire.bienId }}</p>
                  </div>
                  <div>
                    <p class="text-sm text-gray-600">Date de début</p>
                    <p class="font-medium text-gray-900">{{ locataire.dateDebutBail | date:'dd/MM/yyyy' }}</p>
                  </div>
                  @if (locataire.dateFinBail) {
                    <div>
                      <p class="text-sm text-gray-600">Date de fin</p>
                      <p class="font-medium text-gray-900">{{ locataire.dateFinBail | date:'dd/MM/yyyy' }}</p>
                    </div>
                  }
                  @if (locataire.caution) {
                    <div>
                      <p class="text-sm text-gray-600">Caution</p>
                      <lok-montant-fcfa [montant]="locataire.caution" size="sm"></lok-montant-fcfa>
                    </div>
                  }
                </div>
              </div>

              <!-- Garant -->
              @if (locataire.garantNom || locataire.garantTelephone) {
                <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h2 class="text-lg font-semibold text-gray-900 mb-4">Garant</h2>
                  <div class="space-y-2">
                    @if (locataire.garantNom) {
                      <div>
                        <p class="text-sm text-gray-600">Nom</p>
                        <p class="font-medium text-gray-900">{{ locataire.garantNom }}</p>
                      </div>
                    }
                    @if (locataire.garantTelephone) {
                      <div>
                        <p class="text-sm text-gray-600">Téléphone</p>
                        <p class="font-medium text-gray-900">{{ locataire.garantTelephone }}</p>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Actions rapides -->
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
                <div class="space-y-2">
                  <button
                    (click)="editLocataire()"
                    class="w-full btn-secondary text-left flex items-center gap-2"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    Modifier les informations
                  </button>
                  @if (locataire.statut === StatutLocataire.ACTIF) {
                    <button
                      (click)="changerStatut(StatutLocataire.INACTIF)"
                      class="w-full btn-secondary text-left flex items-center gap-2"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Désactiver le compte
                    </button>
                  }
                  @if (locataire.statut === StatutLocataire.INACTIF) {
                    <button
                      (click)="changerStatut(StatutLocataire.ACTIF)"
                      class="w-full btn-secondary text-left flex items-center gap-2"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                      </svg>
                      Réactiver le compte
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Modal de confirmation de suppression -->
        @if (showDeleteModal) {
          <lok-confirm-modal
            titre="Supprimer le locataire"
            message="Êtes-vous sûr de vouloir supprimer ce locataire ? Cette action est irréversible."
            confirmLabel="Supprimer"
            cancelLabel="Annuler"
            (confirm)="deleteLocataire()"
            (cancel)="showDeleteModal = false"
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
export class LocataireDetailComponent implements OnInit {
  locataire: Locataire | null = null;
  loading: boolean = true;

  StatutLocataire = StatutLocataire; // Pour l'accès dans le template
  showDeleteModal: boolean = false;
  errorMessage: string = '';
  locataireId: string = '';

  constructor(
    private locatairesService: LocatairesService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.locataireId = this.route.snapshot.paramMap.get('id') || '';
    if (this.locataireId) {
      this.loadLocataire();
    }
  }

  /**
   * Charge les détails du locataire
   */
  loadLocataire(): void {
    this.loading = true;
    this.locatairesService.getLocataireById(this.locataireId).subscribe({
      next: (locataire: Locataire) => {
        this.locataire = locataire;
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
   * Modifie le locataire
   */
  editLocataire(): void {
    this.router.navigate(['/locataires', this.locataireId, 'edit']);
  }

  /**
   * Supprime le locataire
   */
  deleteLocataire(): void {
    this.locatairesService.deleteLocataire(this.locataireId).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.router.navigate(['/locataires']);
      },
      error: (error: any) => {
        console.error('Erreur lors de la suppression du locataire:', error);
        this.errorMessage = error.error?.message || 'Erreur lors de la suppression du locataire';
        this.showDeleteModal = false;
      }
    });
  }

  /**
   * Change le statut du locataire
   */
  changerStatut(nouveauStatut: StatutLocataire): void {
    if (this.locataire) {
      this.locatairesService.changerStatut(this.locataireId, nouveauStatut).subscribe({
        next: (updatedLocataire: Locataire) => {
          this.locataire = updatedLocataire;
        },
        error: (error: any) => {
          console.error('Erreur lors du changement de statut:', error);
          this.errorMessage = error.error?.message || 'Erreur lors du changement de statut';
        }
      });
    }
  }
}
