import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rapports',
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

              <!-- Format -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Format</label>
                <select
                  formControlName="format"
                  class="input-field"
                >
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
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
          
          @if (rapports.length === 0) {
            <div class="p-6 text-center text-gray-500">
              Aucun rapport généré récemment
            </div>
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
                      <p class="text-sm text-gray-600">{{ rapport.periode }} • {{ rapport.format }}</p>
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

        <!-- Statistiques de rapports -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Rapports ce mois</p>
            <p class="text-3xl font-bold text-gray-900">{{ statistiques.ceMois }}</p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Total rapports</p>
            <p class="text-3xl font-bold text-gray-900">{{ statistiques.total }}</p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Dernier rapport</p>
            <p class="text-lg font-semibold text-gray-900">{{ statistiques.dernier }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class RapportsComponent implements OnInit {
  rapportForm: FormGroup;
  isGenerating: boolean = false;
  isDownloading: boolean = false;
  isSending: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  rapports = [
    {
      id: '1',
      titre: 'Rapport global - Juin 2024',
      periode: 'Juin 2024',
      format: 'PDF',
      date: new Date('2024-06-30')
    },
    {
      id: '2',
      titre: 'Rapport revenus - Mai 2024',
      periode: 'Mai 2024',
      format: 'PDF',
      date: new Date('2024-05-31')
    },
    {
      id: '3',
      titre: 'Rapport occupations - Avril 2024',
      periode: 'Avril 2024',
      format: 'Excel',
      date: new Date('2024-04-30')
    }
  ];

  statistiques = {
    ceMois: 3,
    total: 24,
    dernier: '30 Juin 2024'
  };

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    const currentDate = new Date();
    this.rapportForm = this.fb.group({
      mois: [currentDate.getMonth() + 1, Validators.required],
      annee: [currentDate.getFullYear(), Validators.required],
      typeRapport: ['global', Validators.required],
      format: ['pdf', Validators.required]
    });
  }

  ngOnInit(): void {}

  /**
   * Génère un rapport
   */
  genererRapport(): void {
    if (this.rapportForm.invalid) {
      return;
    }

    this.isGenerating = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Simulation de génération
    setTimeout(() => {
      this.isGenerating = false;
      this.successMessage = 'Rapport généré avec succès !';
      
      // Ajouter à la liste des rapports
      const mois = this.rapportForm.value.mois;
      const annee = this.rapportForm.value.annee;
      const type = this.rapportForm.value.typeRapport;
      const format = this.rapportForm.value.format;
      
      const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      
      this.rapports.unshift({
        id: Math.random().toString(36).substr(2, 9),
        titre: `Rapport ${type} - ${moisNoms[mois - 1]} ${annee}`,
        periode: `${moisNoms[mois - 1]} ${annee}`,
        format: format.toUpperCase(),
        date: new Date()
      });
      
      this.statistiques.ceMois++;
      this.statistiques.total++;
      
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    }, 2000);
  }

  /**
   * Télécharge un rapport
   */
  telechargerRapport(rapportId: string): void {
    this.isDownloading = true;
    
    // Simulation de téléchargement
    setTimeout(() => {
      this.isDownloading = false;
      alert('Rapport téléchargé avec succès !');
    }, 1500);
  }

  /**
   * Envoie un rapport par email
   */
  envoyerRapport(rapportId: string): void {
    this.isSending = true;
    
    // Simulation d'envoi
    setTimeout(() => {
      this.isSending = false;
      alert('Rapport envoyé par email avec succès !');
    }, 1500);
  }
}
