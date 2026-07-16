import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { CommonModule } from '@angular/common';
import { GestionnaireService, Mandat, MandatRequest } from '../../services/gestionnaire.service';

@Component({
  selector: 'app-portefeuille',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LokAlerteComponent
  ],
  styles: `
    /* Global SVG Icon Sizing Fix */
    svg {
      width: 24px !important;
      height: 24px !important;
      flex-shrink: 0;
    }

    .portefeuille-container svg {
      width: 24px !important;
      height: 24px !important;
    }
  `,
  template: `
    <div class="min-h-screen bg-gray-50 portefeuille-container">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Portefeuille de Mandats</h1>
            <p class="text-sm text-gray-600">Gérez vos mandats de gestion immobilière</p>
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
      <div class="p-6 max-w-7xl mx-auto">
        <!-- Alerte d'erreur -->
        @if (errorMessage) {
          <lok-alerte type="error" [message]="errorMessage"></lok-alerte>
        }

        <!-- Alerte de succès -->
        @if (successMessage) {
          <lok-alerte type="success" [message]="successMessage"></lok-alerte>
        }

        <!-- Statistiques du portefeuille -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Total mandats</p>
            <p class="text-3xl font-bold text-gray-900">{{ mandats.length }}</p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Mandats actifs</p>
            <p class="text-3xl font-bold text-green-600">{{ mandatsActifsCount }}</p>
          </div>
        </div>

        <!-- Actions rapides -->
        <div class="flex gap-4 mb-6">
          <button
            (click)="showAddMandatForm = !showAddMandatForm"
            class="btn-primary"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Nouveau mandat
          </button>
          <button
            (click)="exporterPortefeuille()"
            [disabled]="isExporting"
            class="btn-secondary"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            {{ isExporting ? 'Export en cours...' : 'Exporter PDF' }}
          </button>
        </div>

        <!-- Formulaire d'ajout de mandat -->
        @if (showAddMandatForm) {
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Nouveau mandat de gestion</h2>
            
            <form [formGroup]="mandatForm" (ngSubmit)="addMandat()" class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Propriétaire -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Nom du propriétaire</label>
                  <input
                    type="text"
                    formControlName="proprietaireNom"
                    class="input-field"
                    placeholder="Nom complet"
                  />
                </div>

                <!-- Téléphone propriétaire -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Téléphone propriétaire</label>
                  <input
                    type="tel"
                    formControlName="proprietaireTelephone"
                    class="input-field"
                    placeholder="+228 XX XX XX XX"
                  />
                </div>

                <!-- Bien -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Bien immobilier</label>
                  <input
                    type="text"
                    formControlName="bienTitre"
                    class="input-field"
                    placeholder="Titre ou adresse du bien"
                  />
                </div>

                <!-- Commission -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Commission (%)</label>
                  <input
                    type="number"
                    formControlName="commission"
                    class="input-field"
                    placeholder="Ex: 8"
                    min="0"
                    max="20"
                  />
                </div>

                <!-- Date début -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
                  <input
                    type="date"
                    formControlName="dateDebut"
                    class="input-field"
                  />
                </div>

                <!-- Date fin -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
                  <input
                    type="date"
                    formControlName="dateFin"
                    class="input-field"
                  />
                </div>
              </div>

              <div class="flex gap-4">
                <button
                  type="submit"
                  [disabled]="mandatForm.invalid || isAdding"
                  class="btn-primary"
                >
                  @if (isAdding) {
                    Ajout en cours...
                  } @else {
                    Ajouter le mandat
                  }
                </button>
                <button
                  type="button"
                  (click)="showAddMandatForm = false"
                  class="btn-secondary"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        }

        <!-- Liste des mandats -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">Mandats en cours</h2>
            <div class="flex gap-2">
              <select class="input-field text-base py-2">
                <option value="tous">Tous les mandats</option>
                <option value="actifs">Actifs</option>
                <option value="expires">Bientôt expirés</option>
              </select>
            </div>
          </div>
          
          @if (loading) {
            <div class="p-6 text-center text-gray-500">
              Chargement...
            </div>
          } @else if (mandats.length === 0) {
            <div class="p-6 text-center text-gray-500">
              Aucun mandat en cours
            </div>
          } @else {
            <div class="divide-y divide-gray-200">
              @for (mandat of mandats; track mandat.id) {
                <div class="p-6 hover:bg-gray-50 transition-colors">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-3 mb-2">
                        <span
                          [class]="mandat.statut === 'actif' ? 'bg-green-100 text-green-800' : mandat.statut === 'expire' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'"
                          class="px-3 py-1 rounded-full text-xs font-medium"
                        >
                          {{ mandat.statut === 'actif' ? 'Actif' : mandat.statut === 'expire' ? 'Expiré' : 'Suspendu' }}
                        </span>
                      </div>

                      <h3 class="font-semibold text-gray-900 mb-1">{{ mandat.bienTitre }}</h3>
                      <p class="text-sm text-gray-600 mb-2">Propriétaire : {{ mandat.proprietaireNom }} — {{ mandat.proprietaireTelephone }}</p>

                      <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p class="text-gray-500">Commission</p>
                          <p class="font-medium">{{ mandat.commission }}%</p>
                        </div>
                        <div>
                          <p class="text-gray-500">Expiration</p>
                          <p class="font-medium">{{ mandat.dateFin | date:'dd/MM/yyyy' }}</p>
                        </div>
                      </div>
                    </div>

                    <div class="flex gap-2 ml-4">
                      <button
                        (click)="renouvelerMandat(mandat.id)"
                        class="btn-primary text-sm px-4 py-2"
                      >
                        Renouveler
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>

      </div>
    </div>
  `,
})
export class PortefeuilleComponent implements OnInit {
  mandatForm: FormGroup;
  showAddMandatForm = false;
  isAdding = false;
  loading = false;
  isExporting = false;
  errorMessage = '';
  successMessage = '';
  mandats: Mandat[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private gestionnaireService: GestionnaireService
  ) {
    this.mandatForm = this.fb.group({
      proprietaireNom: ['', Validators.required],
      proprietaireTelephone: ['', Validators.required],
      bienTitre: ['', Validators.required],
      commission: ['', [Validators.required, Validators.min(0), Validators.max(20)]],
      dateDebut: ['', Validators.required],
      dateFin: ['', Validators.required]
    });
  }

  get mandatsActifsCount(): number {
    return this.mandats.filter(m => m.statut === 'actif').length;
  }

  ngOnInit(): void {
    this.chargerMandats();
  }

  private chargerMandats(): void {
    this.loading = true;
    this.gestionnaireService.getMandats().subscribe({
      next: (data) => { this.mandats = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  addMandat(): void {
    if (this.mandatForm.invalid) return;

    this.isAdding = true;
    this.errorMessage = '';
    this.successMessage = '';

    const req: MandatRequest = {
      proprietaireNom: this.mandatForm.value.proprietaireNom,
      proprietaireTelephone: this.mandatForm.value.proprietaireTelephone,
      bienTitre: this.mandatForm.value.bienTitre,
      commission: this.mandatForm.value.commission,
      dateDebut: new Date(this.mandatForm.value.dateDebut),
      dateFin: new Date(this.mandatForm.value.dateFin)
    };

    this.gestionnaireService.ajouterMandat(req).subscribe({
      next: (mandat) => {
        this.mandats.unshift(mandat);
        this.isAdding = false;
        this.successMessage = 'Mandat ajouté avec succès !';
        this.showAddMandatForm = false;
        this.mandatForm.reset();
        setTimeout(() => { this.successMessage = ''; }, 3000);
      },
      error: () => {
        this.isAdding = false;
        this.errorMessage = 'Erreur lors de l\'ajout du mandat';
      }
    });
  }

  renouvelerMandat(mandatId: string): void {
    this.gestionnaireService.renouvelerMandat(mandatId).subscribe({
      next: (mandatMisAJour) => {
        const idx = this.mandats.findIndex(m => m.id === mandatId);
        if (idx !== -1) this.mandats[idx] = mandatMisAJour;
        this.successMessage = 'Mandat renouvelé avec succès !';
        setTimeout(() => { this.successMessage = ''; }, 3000);
      }
    });
  }

  exporterPortefeuille(): void {
    this.isExporting = true;
    this.gestionnaireService.exporterPortefeuille('pdf').subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'portefeuille.pdf';
        a.click();
        URL.revokeObjectURL(url);
        this.isExporting = false;
      },
      error: () => { this.isExporting = false; }
    });
  }
}
