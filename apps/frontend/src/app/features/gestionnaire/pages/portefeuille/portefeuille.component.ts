import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokMontantFcfaComponent } from '../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-portefeuille',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LokAlerteComponent,
    LokMontantFcfaComponent
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
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Total mandats</p>
            <p class="text-3xl font-bold text-gray-900">{{ statistiques.totalMandats }}</p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Mandats actifs</p>
            <p class="text-3xl font-bold text-green-600">{{ statistiques.mandatsActifs }}</p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Revenus mensuels</p>
            <p class="text-3xl font-bold text-primary">
              <lok-montant-fcfa [montant]="statistiques.revenusMensuels"></lok-montant-fcfa>
            </p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Commissions</p>
            <p class="text-3xl font-bold text-orange-600">
              <lok-montant-fcfa [montant]="statistiques.commissions"></lok-montant-fcfa>
            </p>
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
            class="btn-secondary"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Exporter
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
                  <label class="block text-sm font-medium text-gray-700 mb-2">Propriétaire</label>
                  <input
                    type="text"
                    formControlName="proprietaire"
                    class="input-field"
                    placeholder="Nom du propriétaire"
                  />
                </div>

                <!-- Bien -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Bien</label>
                  <input
                    type="text"
                    formControlName="bien"
                    class="input-field"
                    placeholder="Adresse du bien"
                  />
                </div>

                <!-- Type de mandat -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Type de mandat</label>
                  <select
                    formControlName="typeMandat"
                    class="input-field"
                  >
                    <option value="gestion_complete">Gestion complète</option>
                    <option value="location_seule">Location seule</option>
                    <option value="encaissement">Encaissement loyers</option>
                  </select>
                </div>

                <!-- Durée -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Durée</label>
                  <select
                    formControlName="duree"
                    class="input-field"
                  >
                    <option value="1_an">1 an</option>
                    <option value="2_ans">2 ans</option>
                    <option value="3_ans">3 ans</option>
                    <option value="indetermine">Durée indéterminée</option>
                  </select>
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

                <!-- Loyer mensuel -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Loyer mensuel (FCFA)</label>
                  <input
                    type="number"
                    formControlName="loyerMensuel"
                    class="input-field"
                    placeholder="Ex: 100000"
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
                          [class]="mandat.statut === 'actif' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
                          class="px-3 py-1 rounded-full text-xs font-medium"
                        >
                          {{ mandat.statut === 'actif' ? 'Actif' : 'Bientôt expiré' }}
                        </span>
                        <span class="text-sm text-gray-600">
                          {{ mandat.typeMandat }}
                        </span>
                      </div>
                      
                      <h3 class="font-semibold text-gray-900 mb-1">{{ mandat.bien }}</h3>
                      <p class="text-sm text-gray-600 mb-2">Propriétaire: {{ mandat.proprietaire }}</p>
                      
                      <div class="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p class="text-gray-500">Loyer</p>
                          <p class="font-medium">
                            <lok-montant-fcfa [montant]="mandat.loyerMensuel"></lok-montant-fcfa>/mois
                          </p>
                        </div>
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
                        routerLink="/biens/{{ mandat.bienId }}"
                        class="btn-secondary text-sm px-4 py-2"
                      >
                        Détails
                      </button>
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

        <!-- Historique des mandats -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 mt-6">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">Historique des mandats</h2>
          </div>
          
          @if (historique.length === 0) {
            <div class="p-6 text-center text-gray-500">
              Aucun mandat terminé
            </div>
          } @else {
            <div class="divide-y divide-gray-200">
              @for (mandat of historique; track mandat.id) {
                <div class="p-4 flex items-center justify-between">
                  <div>
                    <p class="font-medium text-gray-900">{{ mandat.bien }}</p>
                    <p class="text-sm text-gray-600">{{ mandat.proprietaire }} • Terminé le {{ mandat.dateFin | date:'dd/MM/yyyy' }}</p>
                  </div>
                  <span class="text-gray-500 text-sm">
                    <lok-montant-fcfa [montant]="mandat.totalCommissions"></lok-montant-fcfa> gagnés
                  </span>
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
  showAddMandatForm: boolean = false;
  isAdding: boolean = false;
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  statistiques = {
    totalMandats: 15,
    mandatsActifs: 12,
    revenusMensuels: 1250000,
    commissions: 100000
  };

  mandats = [
    {
      id: '1',
      proprietaire: 'M. Adzo Kofi',
      bien: 'Villa Sokodé',
      typeMandat: 'Gestion complète',
      duree: '3_ans',
      commission: 8,
      loyerMensuel: 150000,
      dateDebut: new Date('2023-01-01'),
      dateFin: new Date('2026-01-01'),
      statut: 'actif',
      bienId: '2'
    },
    {
      id: '2',
      proprietaire: 'Mme Afi Agbessi',
      bien: 'Appartement Lomé Centre',
      typeMandat: 'Gestion complète',
      duree: 'indetermine',
      commission: 10,
      loyerMensuel: 100000,
      dateDebut: new Date('2022-06-01'),
      dateFin: new Date('2025-06-01'),
      statut: 'actif',
      bienId: '1'
    },
    {
      id: '3',
      proprietaire: 'M. Yao Komlan',
      bien: 'Bureau Kpalimé',
      typeMandat: 'Location seule',
      duree: '1_an',
      commission: 5,
      loyerMensuel: 125000,
      dateDebut: new Date('2024-01-01'),
      dateFin: new Date('2024-12-31'),
      statut: 'expire',
      bienId: '4'
    }
  ];

  historique = [
    {
      id: 'h1',
      proprietaire: 'M. Koffi Mensah',
      bien: 'Studio Atakpamé',
      dateFin: new Date('2023-12-31'),
      totalCommissions: 45000
    },
    {
      id: 'h2',
      proprietaire: 'Mme Akossiwa',
      bien: 'Chambre Tsévié',
      dateFin: new Date('2023-11-30'),
      totalCommissions: 30000
    }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.mandatForm = this.fb.group({
      proprietaire: ['', Validators.required],
      bien: ['', Validators.required],
      typeMandat: ['gestion_complete', Validators.required],
      duree: ['1_an', Validators.required],
      commission: ['', [Validators.required, Validators.min(0), Validators.max(20)]],
      loyerMensuel: ['', [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {}

  /**
   * Ajoute un nouveau mandat
   */
  addMandat(): void {
    if (this.mandatForm.invalid) {
      return;
    }

    this.isAdding = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Simulation d'ajout
    setTimeout(() => {
      this.isAdding = false;
      this.successMessage = 'Mandat ajouté avec succès !';
      
      const dureeAnnees = this.mandatForm.value.duree === 'indetermine' ? 3 : 
                         parseInt(this.mandatForm.value.duree);
      
      this.mandats.unshift({
        id: Math.random().toString(36).substr(2, 9),
        proprietaire: this.mandatForm.value.proprietaire,
        bien: this.mandatForm.value.bien,
        typeMandat: this.mandatForm.value.typeMandat.replace('_', ' '),
        duree: this.mandatForm.value.duree,
        commission: this.mandatForm.value.commission,
        loyerMensuel: this.mandatForm.value.loyerMensuel,
        dateDebut: new Date(),
        dateFin: new Date(Date.now() + dureeAnnees * 365 * 24 * 60 * 60 * 1000),
        statut: 'actif',
        bienId: 'new'
      });
      
      this.statistiques.totalMandats++;
      this.statistiques.mandatsActifs++;
      this.statistiques.revenusMensuels += this.mandatForm.value.loyerMensuel;
      this.statistiques.commissions += Math.round(this.mandatForm.value.loyerMensuel * this.mandatForm.value.commission / 100);
      
      this.showAddMandatForm = false;
      this.mandatForm.reset();
      
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    }, 1500);
  }

  /**
   * Renouvelle un mandat
   */
  renouvelerMandat(mandatId: string): void {
    const mandat = this.mandats.find(m => m.id === mandatId);
    if (mandat) {
      mandat.dateFin = new Date(mandat.dateFin.getTime() + 365 * 24 * 60 * 60 * 1000);
      this.successMessage = 'Mandat renouvelé avec succès !';
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    }
  }

  /**
   * Exporte le portefeuille
   */
  exporterPortefeuille(): void {
    alert('Export du portefeuille en cours...');
  }
}
