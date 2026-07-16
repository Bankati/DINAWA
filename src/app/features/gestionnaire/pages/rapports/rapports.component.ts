import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokSkeletonComponent } from '../../../../shared/components/lok-skeleton/lok-skeleton.component';
import { LokEmptyStateComponent } from '../../../../shared/components/lok-empty-state/lok-empty-state.component';
import { CommonModule } from '@angular/common';
import { GestionnaireService, Rapport, RapportRequest } from '../../services/gestionnaire.service';

@Component({
  selector: 'app-rapports',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LokAlerteComponent,
    LokSkeletonComponent,
    LokEmptyStateComponent
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
            <h1 class="text-2xl font-bold text-gray-900">Rapports Mensuels</h1>
            <p class="text-sm text-gray-600">Générez et téléchargez vos rapports de gestion.</p>
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

        <!-- Formulaire de génération de rapport -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Générer un rapport</h2>
          
          <form [formGroup]="rapportForm" (ngSubmit)="genererRapport()" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Mois -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Mois</label>
                <select
                  formControlName="mois"
                  class="input-field"
                >
                  <option value="1">Janvier</option>
                  <option value="2">Février</option>
                  <option value="3">Mars</option>
                  <option value="4">Avril</option>
                  <option value="5">Mai</option>
                  <option value="6">Juin</option>
                  <option value="7">Juillet</option>
                  <option value="8">Août</option>
                  <option value="9">Septembre</option>
                  <option value="10">Octobre</option>
                  <option value="11">Novembre</option>
                  <option value="12">Décembre</option>
                </select>
              </div>

              <!-- Année -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Année</label>
                <select
                  formControlName="annee"
                  class="input-field"
                >
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                </select>
              </div>

              <!-- Type de rapport -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Type de rapport</label>
                <select
                  formControlName="typeRapport"
                  class="input-field"
                >
                  <option value="global">Rapport global</option>
                  <option value="revenus">Rapport revenus</option>
                  <option value="occupations">Rapport occupations</option>
                  <option value="depenses">Rapport dépenses</option>
                  <option value="biens">Rapport par bien</option>
                </select>
              </div>

            </div>

            <button
              type="submit"
              [disabled]="rapportForm.invalid || isGenerating"
              class="btn-primary"
            >
              @if (isGenerating) {
                <span class="flex items-center gap-2">
                  <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Génération en cours...
                </span>
              } @else {
                Générer le rapport
              }
            </button>
          </form>
        </div>

        <!-- Rapports récents -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">Rapports récents</h2>
          </div>
          
          @if (loadingRapports) {
            <div class="p-6">
              <lok-skeleton type="text"></lok-skeleton>
            </div>
          } @else if (rapports.length === 0) {
            <lok-empty-state
              icon="document"
              titre="Aucun rapport"
              description="Générez votre premier rapport ci-dessus"
            ></lok-empty-state>
          } @else {
            <div class="divide-y divide-gray-200">
              @for (rapport of rapports; track rapport.id) {
                <div class="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">{{ rapport.titre }}</p>
                      <p class="text-sm text-gray-600">{{ rapport.periode }} • {{ rapport.type }}</p>
                    </div>
                  </div>
                  
                  <div class="flex gap-2">
                    <button
                      (click)="telechargerRapport(rapport.id)"
                      [disabled]="isDownloading"
                      class="btn-primary text-sm px-4 py-2"
                    >
                      @if (isDownloading) {
                        Téléchargement...
                      } @else {
                        Télécharger
                      }
                    </button>
                    <button
                      (click)="envoyerRapport(rapport.id)"
                      [disabled]="isSending"
                      class="btn-secondary text-sm px-4 py-2"
                    >
                      @if (isSending) {
                        Envoi...
                      } @else {
                        Envoyer
                      }
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Compteur rapports -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mt-6">
          <p class="text-sm text-gray-600">Total rapports générés</p>
          <p class="text-3xl font-bold text-gray-900">{{ rapports.length }}</p>
        </div>
      </div>
    </div>
  `,
})
export class RapportsComponent implements OnInit {
  rapportForm: FormGroup;
  rapports: Rapport[] = [];
  isGenerating = false;
  isDownloading = false;
  isSending = false;
  loadingRapports = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private gestionnaireService: GestionnaireService
  ) {
    const now = new Date();
    this.rapportForm = this.fb.group({
      mois: [String(now.getMonth() + 1), Validators.required],
      annee: [String(now.getFullYear()), Validators.required],
      typeRapport: ['global', Validators.required],
      includeDetails: [false]
    });
  }

  ngOnInit(): void {
    this.chargerRapports();
  }

  private chargerRapports(): void {
    this.loadingRapports = true;
    this.gestionnaireService.getRapports().subscribe({
      next: (data) => { this.rapports = data; this.loadingRapports = false; },
      error: () => { this.loadingRapports = false; }
    });
  }

  genererRapport(): void {
    if (this.rapportForm.invalid) return;

    this.isGenerating = true;
    this.errorMessage = '';
    this.successMessage = '';

    const req: RapportRequest = {
      mois: this.rapportForm.value.mois,
      annee: this.rapportForm.value.annee,
      type: this.rapportForm.value.typeRapport,
      includeDetails: this.rapportForm.value.includeDetails
    };

    this.gestionnaireService.genererRapport(req).subscribe({
      next: (rapport) => {
        this.rapports.unshift(rapport);
        this.isGenerating = false;
        this.successMessage = 'Rapport généré avec succès !';
        setTimeout(() => { this.successMessage = ''; }, 3000);
      },
      error: () => {
        this.isGenerating = false;
        this.errorMessage = 'Erreur lors de la génération du rapport';
      }
    });
  }

  telechargerRapport(rapportId: string): void {
    this.isDownloading = true;
    this.gestionnaireService.telechargerRapport(rapportId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport-${rapportId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.isDownloading = false;
        this.successMessage = 'Rapport téléchargé !';
        setTimeout(() => { this.successMessage = ''; }, 3000);
      },
      error: () => { this.isDownloading = false; }
    });
  }

  envoyerRapport(rapportId: string): void {
    this.isSending = true;
    this.gestionnaireService.envoyerRapportParEmail(rapportId).subscribe({
      next: () => {
        this.isSending = false;
        this.successMessage = 'Rapport envoyé par email !';
        const rapport = this.rapports.find(r => r.id === rapportId);
        if (rapport) rapport.statut = 'envoye';
        setTimeout(() => { this.successMessage = ''; }, 3000);
      },
      error: () => { this.isSending = false; }
    });
  }
}
