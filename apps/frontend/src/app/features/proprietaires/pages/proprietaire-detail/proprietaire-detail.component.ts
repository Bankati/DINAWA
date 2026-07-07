import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ProprietairesService } from '../../services/proprietaires.service';
import { Proprietaire, StatutProprietaire } from '@core/models/proprietaire.model';
import { LokBadgeStatutProprietaireComponent } from '../../../../shared/components/lok-badge-statut-proprietaire/lok-badge-statut-proprietaire.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';

@Component({
  selector: 'app-proprietaire-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LokBadgeStatutProprietaireComponent,
    LokSkeletonComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button
              (click)="goBack()"
              class="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Détail du propriétaire</h1>
              <p class="text-sm text-gray-600">Informations complètes du propriétaire</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              (click)="editProprietaire()"
              class="btn-secondary flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Modifier
            </button>
            <button
              (click)="deleteProprietaire()"
              class="btn-danger flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Supprimer
            </button>
          </div>
        </div>
      </div>

      <!-- Contenu -->
      @if (loading) {
        <lok-skeleton type="card"></lok-skeleton>
      } @else if (proprietaire) {
        <div class="max-w-6xl mx-auto px-6 py-8">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Colonne principale -->
            <div class="lg:col-span-2 space-y-6">
              <!-- Informations personnelles -->
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h2>
                <div class="flex items-start gap-6">
                  <div class="flex-shrink-0 w-20 h-20 bg-primary-light rounded-full flex items-center justify-center text-primary font-bold text-2xl">
                    {{ proprietaire.prenoms.charAt(0) }}{{ proprietaire.nom.charAt(0) }}
                  </div>
                  <div class="flex-1">
                    <h3 class="text-xl font-semibold text-gray-900">{{ proprietaire.prenoms }} {{ proprietaire.nom }}</h3>
                    <div class="mt-4 space-y-3">
                      <div class="flex items-center gap-3">
                        <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                        </svg>
                        <a [href]="'tel:' + proprietaire.telephone" class="text-primary hover:underline">{{ proprietaire.telephone }}</a>
                      </div>
                      @if (proprietaire.email) {
                        <div class="flex items-center gap-3">
                          <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                          </svg>
                          <a [href]="'mailto:' + proprietaire.email" class="text-primary hover:underline">{{ proprietaire.email }}</a>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              </div>

              <!-- Adresse -->
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Adresse</h2>
                <div class="space-y-2">
                  <div class="flex items-center gap-3">
                    <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <span class="text-gray-700">{{ proprietaire.adresse.quartier }}, {{ proprietaire.adresse.ville }}</span>
                  </div>
                  @if (proprietaire.adresse.adresseComplete) {
                    <div class="flex items-center gap-3">
                      <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                      </svg>
                      <span class="text-gray-700">{{ proprietaire.adresse.adresseComplete }}</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Pièce d'identité -->
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Pièce d'identité</h2>
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Type</span>
                    <span class="font-medium text-gray-900">{{ getPieceIdentiteType() }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Numéro</span>
                    <span class="font-medium text-gray-900">{{ proprietaire.pieceIdentite.numero }}</span>
                  </div>
                  @if (proprietaire.pieceIdentite.dateExpiration) {
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-gray-600">Date d'expiration</span>
                      <span class="font-medium text-gray-900">{{ proprietaire.pieceIdentite.dateExpiration | date:'dd/MM/yyyy' }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Colonne latérale -->
            <div class="space-y-6">
              <!-- Statut et biens -->
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div class="mb-4">
                  <span class="text-sm text-gray-600">Statut</span>
                  <div class="mt-2">
                    <lok-badge-statut-proprietaire [statut]="proprietaire.statut"></lok-badge-statut-proprietaire>
                  </div>
                </div>
                <div class="pt-4 border-t border-gray-200">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Nombre de biens</span>
                    <span class="text-2xl font-bold text-gray-900">{{ proprietaire.nbBiens }}</span>
                  </div>
                </div>
              </div>

              <!-- Date d'inscription -->
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Date d'inscription</h2>
                <div class="flex items-center gap-3">
                  <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <span class="text-gray-900 font-medium">{{ proprietaire.dateCreation | date:'dd MMMM yyyy' }}</span>
                </div>
              </div>

              <!-- Actions rapides -->
              <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
                <div class="space-y-3">
                  <button
                    (click)="viewBiens()"
                    class="w-full btn-secondary text-sm"
                  >
                    Voir les biens
                  </button>
                  <button
                    (click)="createAnnonce()"
                    class="w-full btn-primary text-sm"
                  >
                    Créer une annonce
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ProprietaireDetailComponent implements OnInit {
  proprietaire: Proprietaire | null = null;
  loading: boolean = true;

  constructor(
    private proprietairesService: ProprietairesService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadProprietaire(id);
      }
    });
  }

  loadProprietaire(id: string): void {
    this.loading = true;
    this.proprietairesService.getProprietaireById(id).subscribe({
      next: (data) => {
        this.proprietaire = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  getPieceIdentiteType(): string {
    if (!this.proprietaire) return '';
    switch (this.proprietaire.pieceIdentite.type) {
      case 'CNI':
        return 'Carte Nationale d\'Identité';
      case 'PASSEPORT':
        return 'Passeport';
      case 'CARTE_RESIDENCE':
        return 'Carte de Résidence';
      default:
        return this.proprietaire.pieceIdentite.type;
    }
  }

  goBack(): void {
    this.router.navigate(['/proprietaires']);
  }

  editProprietaire(): void {
    if (this.proprietaire) {
      this.router.navigate(['/proprietaires', this.proprietaire.id, 'edit']);
    }
  }

  deleteProprietaire(): void {
    if (this.proprietaire && confirm('Êtes-vous sûr de vouloir supprimer ce propriétaire ?')) {
      this.proprietairesService.deleteProprietaire(this.proprietaire.id).subscribe({
        next: () => {
          this.router.navigate(['/proprietaires']);
        }
      });
    }
  }

  viewBiens(): void {
    this.router.navigate(['/biens']);
  }

  createAnnonce(): void {
    this.router.navigate(['/annonces/new']);
  }
}
