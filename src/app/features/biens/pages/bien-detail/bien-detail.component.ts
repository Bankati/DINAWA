import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { BiensService } from '../../services/biens.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Bien, PropertyStatus, PROPERTY_TYPE_LABELS, PROPERTY_STATUS_LABELS } from '@core/models/bien.model';
import { LokBadgeStatutComponent } from '../../../../shared/components/lok-badge-statut/lok-badge-statut.component';
import { LokMontantFcfaComponent } from '../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokConfirmModalComponent } from '../../../../shared/components/lok-confirm-modal/lok-confirm-modal.component';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';

@Component({
  selector: 'app-bien-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
            <button routerLink="/dashboard/biens" class="p-2 text-gray-600 hover:text-primary transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">{{ bien ? typeLabel(bien.type) + ' — ' + bien.neighborhood : 'Détail du bien' }}</h1>
              <p class="text-sm text-gray-600">Informations détaillées du bien</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button (click)="editBien()" class="btn-secondary flex items-center gap-2">
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
              Archiver
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
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Photos</h2>
                @if (bien.photos && bien.photos.length > 0) {
                  <div class="grid grid-cols-2 gap-4">
                    @for (photo of bien.photos; track photo.id) {
                      <img [src]="photo.url" [alt]="bien.neighborhood" class="aspect-video object-cover rounded-lg w-full">
                    }
                  </div>
                } @else {
                  <div class="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <p class="text-gray-400">Aucune photo disponible</p>
                  </div>
                }
              </div>

              <!-- Description -->
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Description</h2>
                <p class="text-gray-700">{{ bien.description || 'Aucune description renseignée' }}</p>
              </div>

              <!-- Caractéristiques -->
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Caractéristiques</h2>
                <div class="grid grid-cols-2 gap-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                      </svg>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600">Surface</p>
                      <p class="font-semibold text-gray-900">{{ bien.surfaceArea }} m²</p>
                    </div>
                  </div>
                  @if (bien.roomsCount) {
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                      </div>
                      <div>
                        <p class="text-sm text-gray-600">Pièces</p>
                        <p class="font-semibold text-gray-900">{{ bien.roomsCount }}</p>
                      </div>
                    </div>
                  }
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                      </svg>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600">Type</p>
                      <p class="font-semibold text-gray-900">{{ typeLabel(bien.type) }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <div>
                      <p class="text-sm text-gray-600">Date d'ajout</p>
                      <p class="font-semibold text-gray-900">{{ bien.createdAt | date:'dd/MM/yyyy' }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Colonne latérale -->
            <div class="space-y-6">
              <!-- Statut et loyer -->
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div class="flex items-center justify-between mb-4">
                  <h2 class="text-lg font-semibold text-gray-900">Statut</h2>
                  <lok-badge-statut [statut]="bien.status"></lok-badge-statut>
                </div>
                <div class="space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600">Loyer mensuel</span>
                    <lok-montant-fcfa [montant]="bien.monthlyRent" size="lg" color="primary"></lok-montant-fcfa>
                  </div>
                  @if (bien.monthlyCharges) {
                    <div class="flex justify-between items-center">
                      <span class="text-gray-600">Charges</span>
                      <lok-montant-fcfa [montant]="bien.monthlyCharges" size="sm"></lok-montant-fcfa>
                    </div>
                  }
                  <div class="border-t pt-3 flex justify-between items-center">
                    <span class="font-semibold text-gray-900">Total mensuel</span>
                    <lok-montant-fcfa [montant]="bien.monthlyRent + (bien.monthlyCharges || 0)" size="lg" color="primary"></lok-montant-fcfa>
                  </div>
                </div>
              </div>

              <!-- Adresse -->
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Adresse</h2>
                <div class="flex items-start gap-3">
                  <svg class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <div>
                    <p class="font-medium text-gray-900">{{ bien.neighborhood }}</p>
                    <p class="text-sm text-gray-600">{{ bien.city }}</p>
                    @if (bien.address) {
                      <p class="text-sm text-gray-500">{{ bien.address }}</p>
                    }
                  </div>
                </div>
              </div>

              <!-- Actions rapides -->
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
                <div class="space-y-2">
                  @if (bien.status === 'VACANT') {
                    <!-- Inviter un locataire -->
                    <button (click)="showInviteModal = true" class="w-full btn-primary text-left flex items-center gap-2">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                      </svg>
                      Inviter un locataire
                    </button>
                    <!-- Créer un bail -->
                    <a [routerLink]="['/dashboard/bails/nouveau']" [queryParams]="{ propertyId: bienId }"
                      class="w-full btn-secondary text-left flex items-center gap-2 no-underline">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      Créer un bail
                    </a>
                    <button (click)="changerStatut('OCCUPIED')" class="w-full btn-secondary text-left flex items-center gap-2">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Marquer comme occupé
                    </button>
                  }
                  @if (bien.status === 'OCCUPIED') {
                    <button (click)="changerStatut('VACANT')" class="w-full btn-secondary text-left flex items-center gap-2">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                      </svg>
                      Marquer comme vacant
                    </button>
                  }
                  <button (click)="editBien()" class="w-full btn-secondary text-left flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    Modifier les informations
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

        @if (showDeleteModal) {
          <lok-confirm-modal
            titre="Archiver le bien"
            message="Êtes-vous sûr de vouloir archiver ce bien ? Le bien sera marqué comme archivé et n'apparaîtra plus dans les listes actives."
            confirmLabel="Archiver"
            cancelLabel="Annuler"
            (confirm)="deleteBien()"
            (cancel)="showDeleteModal = false"
          ></lok-confirm-modal>
        }

        @if (errorMessage) {
          <lok-alerte type="error" [message]="errorMessage"></lok-alerte>
        }
      </div>
    </div>

    <!-- Modale invitation locataire -->
    @if (showInviteModal) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
          <h2 class="text-lg font-bold text-gray-900 mb-1">Inviter un locataire</h2>
          <p class="text-sm text-gray-500 mb-4">Un email d'invitation sera envoyé au locataire.</p>

          @if (inviteError()) {
            <lok-alerte type="error" [message]="inviteError()"></lok-alerte>
          }
          @if (inviteSuccess()) {
            <lok-alerte type="success" message="Invitation envoyée avec succès ! Le locataire recevra un lien pour activer son compte."></lok-alerte>
          }

          @if (!inviteSuccess()) {
            <div class="space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Prénom *</label>
                  <input [(ngModel)]="invite.firstName" type="text" class="input-sm" placeholder="Jean">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
                  <input [(ngModel)]="invite.lastName" type="text" class="input-sm" placeholder="Dupont">
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                <input [(ngModel)]="invite.email" type="email" class="input-sm" placeholder="locataire@email.com">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Téléphone</label>
                <input [(ngModel)]="invite.phone" type="tel" class="input-sm" placeholder="+228 XX XX XX XX">
              </div>
            </div>
          }

          <div class="flex gap-3 justify-end mt-5">
            <button class="btn-secondary" (click)="closeInviteModal()">Fermer</button>
            @if (!inviteSuccess()) {
              <button class="btn-primary-sm"
                [disabled]="!invite.firstName || !invite.lastName || !invite.email || inviteLoading()"
                (click)="envoyerInvitation()">
                @if (inviteLoading()) { Envoi… } @else { Envoyer l'invitation }
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .btn-primary { background: #0F4C81; color: white; border: none; border-radius: .625rem;
      padding: .625rem 1.25rem; font-size: .875rem; font-weight: 600; cursor: pointer; transition: background .2s; }
    .btn-primary:hover { background: #0A2650; }
    .btn-primary-sm { background: #0F4C81; color: white; border: none; border-radius: .5rem;
      padding: .5rem 1rem; font-size: .875rem; font-weight: 600; cursor: pointer; transition: background .2s; }
    .btn-primary-sm:hover:not(:disabled) { background: #0A2650; }
    .btn-primary-sm:disabled { opacity: .5; cursor: not-allowed; }
    .btn-secondary { border: 1.5px solid #d1d5db; border-radius: .5rem;
      padding: .5rem .875rem; font-weight: 500; color: #374151; background: white;
      cursor: pointer; transition: border-color .2s; display: inline-flex; align-items: center; }
    .btn-secondary:hover { border-color: #0F4C81; color: #0F4C81; }
    .no-underline { text-decoration: none; }
    .input-sm { width: 100%; border: 1.5px solid #d1d5db; border-radius: .5rem; padding: .5rem .75rem;
      font-size: .875rem; outline: none; transition: border-color .2s; }
    .input-sm:focus { border-color: #0F4C81; }
  `],
})
export class BienDetailComponent implements OnInit {
  bien: Bien | null = null;
  loading = true;
  showDeleteModal = false;
  showInviteModal = false;
  errorMessage = '';
  bienId = '';

  // Invitation locataire
  inviteLoading = signal(false);
  inviteError = signal('');
  inviteSuccess = signal(false);
  invite = { firstName: '', lastName: '', email: '', phone: '' };

  readonly LABELS = PROPERTY_STATUS_LABELS;

  constructor(
    private biensService: BiensService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.bienId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.bienId) {
      this.loadBien();
    }
  }

  loadBien(): void {
    this.loading = true;
    this.biensService.getBienById(this.bienId).subscribe({
      next: (bien) => {
        this.bien = bien;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Erreur lors du chargement du bien';
        this.loading = false;
      },
    });
  }

  typeLabel(type: string): string {
    return PROPERTY_TYPE_LABELS[type as keyof typeof PROPERTY_TYPE_LABELS] ?? type;
  }

  editBien(): void {
    this.router.navigate(['/dashboard/biens', this.bienId, 'edit']);
  }

  deleteBien(): void {
    this.biensService.deleteBien(this.bienId).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.router.navigate(['/dashboard/biens']);
      },
      error: (error: any) => {
        this.errorMessage = error.error?.message || 'Erreur lors de l\'archivage du bien';
        this.showDeleteModal = false;
      },
    });
  }

  changerStatut(nouveauStatut: PropertyStatus): void {
    if (!this.bien) return;
    this.biensService.updateBien(this.bienId, { status: nouveauStatut }).subscribe({
      next: (updatedBien) => {
        this.bien = updatedBien;
      },
      error: (error: any) => {
        this.errorMessage = error.error?.message || 'Erreur lors du changement de statut';
      },
    });
  }

  envoyerInvitation(): void {
    if (!this.invite.firstName || !this.invite.lastName || !this.invite.email) return;
    this.inviteLoading.set(true);
    this.inviteError.set('');
    this.authService.inviteTenant({
      propertyId: this.bienId,
      email:      this.invite.email,
      phone:      this.invite.phone || '',
      firstName:  this.invite.firstName,
      lastName:   this.invite.lastName,
    }).subscribe({
      next: () => {
        this.inviteLoading.set(false);
        this.inviteSuccess.set(true);
      },
      error: (err: any) => {
        this.inviteLoading.set(false);
        this.inviteError.set(err.error?.message || 'Erreur lors de l\'invitation.');
      },
    });
  }

  closeInviteModal(): void {
    this.showInviteModal = false;
    this.inviteSuccess.set(false);
    this.inviteError.set('');
    this.invite = { firstName: '', lastName: '', email: '', phone: '' };
  }
}
