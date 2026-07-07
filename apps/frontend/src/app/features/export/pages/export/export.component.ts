import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-export',
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
            <h1 class="text-2xl font-bold text-gray-900">Export de Données</h1>
            <p class="text-sm text-gray-600">Exportez vos données en PDF ou Excel</p>
          </div>
          <button
            routerLink="/dashboard"
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

        <!-- Formulaire d'export -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Configurer l'export</h2>
          
          <form [formGroup]="exportForm" (ngSubmit)="exporterDonnees()" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Type de données -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Type de données</label>
                <select
                  formControlName="typeDonnees"
                  class="input-field"
                >
                  <option value="biens">Biens immobiliers</option>
                  <option value="locataires">Locataires</option>
                  <option value="paiements">Paiements</option>
                  <option value="contrats">Contrats de bail</option>
                  <option value="rapports">Rapports globaux</option>
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
                  <option value="excel">Excel (XLSX)</option>
                  <option value="csv">CSV</option>
                </select>
              </div>

              <!-- Période -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Période</label>
                <select
                  formControlName="periode"
                  class="input-field"
                >
                  <option value="tout">Tout l'historique</option>
                  <option value="ce_mois">Ce mois</option>
                  <option value="ce_trimestre">Ce trimestre</option>
                  <option value="cette_annee">Cette année</option>
                  <option value="personnalise">Personnalisé</option>
                </select>
              </div>

              <!-- Date début (si personnalisé) -->
              @if (exportForm.value.periode === 'personnalise') {
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
                  <input
                    type="date"
                    formControlName="dateDebut"
                    class="input-field"
                  />
                </div>
              }

              <!-- Date fin (si personnalisé) -->
              @if (exportForm.value.periode === 'personnalise') {
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
                  <input
                    type="date"
                    formControlName="dateFin"
                    class="input-field"
                  />
                </div>
              }
            </div>

            <!-- Champs à inclure -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Champs à inclure</label>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                <label class="flex items-center">
                  <input type="checkbox" formControlName="champs.informationsGenerales" class="mr-2">
                  <span class="text-sm">Informations générales</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" formControlName="champs.financiers" class="mr-2">
                  <span class="text-sm">Données financières</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" formControlName="champs.documents" class="mr-2">
                  <span class="text-sm">Documents</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" formControlName="champs.historique" class="mr-2">
                  <span class="text-sm">Historique</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              [disabled]="exportForm.invalid || isExporting"
              class="btn-primary"
            >
              @if (isExporting) {
                <span class="flex items-center gap-2">
                  <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Export en cours...
                </span>
              } @else {
                <span class="flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Exporter
                </span>
              }
            </button>
          </form>
        </div>

        <!-- Exports récents -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">Exports récents</h2>
          </div>
          
          @if (exportsRecents.length === 0) {
            <div class="p-6 text-center text-gray-500">
              Aucun export récent
            </div>
          } @else {
            <div class="divide-y divide-gray-200">
              @for (export of exportsRecents; track export.id) {
                <div class="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div class="flex items-center gap-4">
                    <div
                      [class]="export.format === 'pdf' ? 'bg-red-100 text-red-600' : export.format === 'excel' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'"
                      class="w-10 h-10 rounded-lg flex items-center justify-center"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">{{ export.titre }}</p>
                      <p class="text-sm text-gray-600">{{ export.date | date:'dd/MM/yyyy HH:mm' }} • {{ export.format.toUpperCase() }}</p>
                    </div>
                  </div>
                  
                  <div class="flex gap-2">
                    <button
                      (click)="telechargerExport(export.id)"
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
                      (click)="supprimerExport(export.id)"
                      class="text-gray-400 hover:text-red-600"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Modèles d'export -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 mt-6">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">Modèles d'export</h2>
          </div>
          
          <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              (click)="utiliserModele('rapport_mensuel')"
              class="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors text-left"
            >
              <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <span class="font-medium text-gray-900">Rapport mensuel</span>
              </div>
              <p class="text-sm text-gray-600">Export complet des données du mois</p>
            </button>

            <button
              (click)="utiliserModele('etats_financiers')"
              class="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors text-left"
            >
              <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <span class="font-medium text-gray-900">États financiers</span>
              </div>
              <p class="text-sm text-gray-600">Revenus, dépenses et bénéfices</p>
            </button>

            <button
              (click)="utiliserModele('inventaire')"
              class="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors text-left"
            >
              <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                  </svg>
                </div>
                <span class="font-medium text-gray-900">Inventaire biens</span>
              </div>
              <p class="text-sm text-gray-600">Liste complète des biens</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ExportComponent implements OnInit {
  exportForm: FormGroup;
  isExporting: boolean = false;
  isDownloading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  exportsRecents = [
    {
      id: '1',
      titre: 'Rapport mensuel - Juin 2024',
      typeDonnees: 'rapports',
      format: 'pdf',
      date: new Date('2024-06-30T10:00:00')
    },
    {
      id: '2',
      titre: 'États financiers - T2 2024',
      typeDonnees: 'paiements',
      format: 'excel',
      date: new Date('2024-06-28T14:30:00')
    },
    {
      id: '3',
      titre: 'Inventaire biens',
      typeDonnees: 'biens',
      format: 'excel',
      date: new Date('2024-06-25T09:15:00')
    }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.exportForm = this.fb.group({
      typeDonnees: ['biens', Validators.required],
      format: ['pdf', Validators.required],
      periode: ['ce_mois', Validators.required],
      dateDebut: [''],
      dateFin: [''],
      champs: this.fb.group({
        informationsGenerales: [true],
        financiers: [true],
        documents: [false],
        historique: [false]
      })
    });
  }

  ngOnInit(): void {}

  /**
   * Exporte les données
   */
  exporterDonnees(): void {
    if (this.exportForm.invalid) {
      return;
    }

    this.isExporting = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Simulation d'export
    setTimeout(() => {
      this.isExporting = false;
      this.successMessage = 'Export généré avec succès !';
      
      const typeDonnees = this.exportForm.value.typeDonnees;
      const format = this.exportForm.value.format;
      const periode = this.exportForm.value.periode;
      
      const periodeLabels: Record<string, string> = {
        'tout': 'Tout',
        'ce_mois': 'Ce mois',
        'ce_trimestre': 'Ce trimestre',
        'cette_annee': 'Cette année',
        'personnalise': 'Personnalisé'
      };

      const typeLabels: Record<string, string> = {
        'biens': 'Biens',
        'locataires': 'Locataires',
        'paiements': 'Paiements',
        'contrats': 'Contrats',
        'rapports': 'Rapports'
      };

      this.exportsRecents.unshift({
        id: Math.random().toString(36).substr(2, 9),
        titre: `${typeLabels[typeDonnees]} - ${periodeLabels[periode]}`,
        typeDonnees: typeDonnees,
        format: format,
        date: new Date()
      });
      
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    }, 2000);
  }

  /**
   * Télécharge un export
   */
  telechargerExport(exportId: string): void {
    this.isDownloading = true;
    
    // Simulation de téléchargement
    setTimeout(() => {
      this.isDownloading = false;
      alert('Export téléchargé avec succès !');
    }, 1500);
  }

  /**
   * Supprime un export
   */
  supprimerExport(exportId: string): void {
    this.exportsRecents = this.exportsRecents.filter(e => e.id !== exportId);
  }

  /**
   * Utilise un modèle d'export
   */
  utiliserModele(modele: string): void {
    switch (modele) {
      case 'rapport_mensuel':
        this.exportForm.patchValue({
          typeDonnees: 'rapports',
          format: 'pdf',
          periode: 'ce_mois',
          champs: {
            informationsGenerales: true,
            financiers: true,
            documents: true,
            historique: true
          }
        });
        break;
      case 'etats_financiers':
        this.exportForm.patchValue({
          typeDonnees: 'paiements',
          format: 'excel',
          periode: 'ce_trimestre',
          champs: {
            informationsGenerales: false,
            financiers: true,
            documents: false,
            historique: true
          }
        });
        break;
      case 'inventaire':
        this.exportForm.patchValue({
          typeDonnees: 'biens',
          format: 'excel',
          periode: 'tout',
          champs: {
            informationsGenerales: true,
            financiers: true,
            documents: false,
            historique: false
          }
        });
        break;
    }
  }
}
