import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PaiementsService } from '../../services/paiements.service';
import { Paiement, StatutPaiement } from '@core/models/paiement.model';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokMontantFcfaComponent } from '../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rappels-alertes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LokAlerteComponent,
    LokMontantFcfaComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Rappels et Alertes</h1>
            <p class="text-sm text-gray-600">Gérez les notifications de paiement</p>
          </div>
          <button
            routerLink="/dashboard/paiements"
            class="btn-secondary"
          >
            Retour
          </button>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="p-6 max-w-6xl mx-auto">
        <!-- Alerte d'erreur -->
        @if (errorMessage) {
          <lok-alerte type="error" [message]="errorMessage"></lok-alerte>
        }

        <!-- Alerte de succès -->
        @if (successMessage) {
          <lok-alerte type="success" [message]="successMessage"></lok-alerte>
        }

        <!-- Statistiques -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Total impayés</p>
            <p class="text-3xl font-bold text-red-600">{{ statistiques.impayes }}</p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">En retard</p>
            <p class="text-3xl font-bold text-orange-600">{{ statistiques.enRetard }}</p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Rappels envoyés</p>
            <p class="text-3xl font-bold text-blue-600">{{ statistiques.rappelsEnvoyes }}</p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Taux de réponse</p>
            <p class="text-3xl font-bold text-green-600">{{ statistiques.tauxReponse }}%</p>
          </div>
        </div>

        <!-- Configuration des rappels automatiques -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Configuration des rappels automatiques</h2>
          
          <form [formGroup]="rappelConfigForm" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Rappel avant échéance -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Rappel avant échéance (jours)</label>
                <select
                  formControlName="rappelAvantEcheance"
                  class="input-field"
                >
                  <option value="0">Désactivé</option>
                  <option value="1">1 jour avant</option>
                  <option value="3">3 jours avant</option>
                  <option value="5">5 jours avant</option>
                  <option value="7">7 jours avant</option>
                </select>
              </div>

              <!-- Rappel après échéance -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Rappel après échéance (jours)</label>
                <select
                  formControlName="rappelApresEcheance"
                  class="input-field"
                >
                  <option value="0">Désactivé</option>
                  <option value="1">1 jour après</option>
                  <option value="3">3 jours après</option>
                  <option value="5">5 jours après</option>
                  <option value="7">7 jours après</option>
                </select>
              </div>

              <!-- Fréquence des rappels -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Fréquence des rappels</label>
                <select
                  formControlName="frequenceRappels"
                  class="input-field"
                >
                  <option value="quotidien">Quotidien</option>
                  <option value="hebdomadaire">Hebdomadaire</option>
                  <option value="mensuel">Mensuel</option>
                </select>
              </div>

              <!-- Canaux de notification -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Canaux de notification</label>
                <div class="space-y-2">
                  <label class="flex items-center">
                    <input type="checkbox" formControlName="notificationEmail" class="mr-2">
                    <span>Email</span>
                  </label>
                  <label class="flex items-center">
                    <input type="checkbox" formControlName="notificationSMS" class="mr-2">
                    <span>SMS</span>
                  </label>
                  <label class="flex items-center">
                    <input type="checkbox" formControlName="notificationWhatsApp" class="mr-2">
                    <span>WhatsApp</span>
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              [disabled]="rappelConfigForm.invalid || isSavingConfig"
              class="btn-primary"
            >
              @if (isSavingConfig) {
                <span class="flex items-center gap-2">
                  <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enregistrement...
                </span>
              } @else {
                Enregistrer la configuration
              }
            </button>
          </form>
        </div>

        <!-- Liste des paiements avec alertes -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">Paiements nécessitant une attention</h2>
          </div>
          
          @if (loading) {
            <div class="p-6 text-center text-gray-500">
              Chargement...
            </div>
          } @else if (paiementsAvecAlertes.length === 0) {
            <div class="p-6 text-center text-gray-500">
              Aucun paiement ne nécessite d'attention
            </div>
          } @else {
            <div class="divide-y divide-gray-200">
              @for (paiement of paiementsAvecAlertes; track paiement.id) {
                <div class="p-6 hover:bg-gray-50 transition-colors">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-3 mb-2">
                        <span
                          [class]="getStatutBadgeClass(paiement.statut)"
                          class="px-3 py-1 rounded-full text-xs font-medium"
                        >
                          {{ getStatutLabel(paiement.statut) }}
                        </span>
                        <span class="text-sm text-gray-600">
                          Échéance: {{ paiement.dateEcheance | date:'dd/MM/yyyy' }}
                        </span>
                      </div>
                      
                      <h3 class="font-semibold text-gray-900 mb-1">
                        {{ getBienTitre(paiement.bienId) }}
                      </h3>
                      <p class="text-sm text-gray-600 mb-2">
                        Locataire: {{ getLocataireNom(paiement.locataireId) }}
                      </p>
                      <p class="font-semibold text-gray-900">
                        <lok-montant-fcfa [montant]="paiement.montantEcheance"></lok-montant-fcfa>
                      </p>
                    </div>
                    
                    <div class="flex gap-2 ml-4">
                      <button
                        (click)="envoyerRappel(paiement.id)"
                        [disabled]="isSendingRappel"
                        class="btn-primary text-sm px-4 py-2"
                      >
                        @if (isSendingRappel) {
                          Envoi...
                        } @else {
                          Rappeler
                        }
                      </button>
                      <button
                        routerLink="/dashboard/paiements/{{ paiement.id }}"
                        class="btn-secondary text-sm px-4 py-2"
                      >
                        Détails
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Historique des rappels -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 mt-6">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">Historique des rappels</h2>
          </div>
          
          @if (historiqueRappels.length === 0) {
            <div class="p-6 text-center text-gray-500">
              Aucun rappel envoyé récemment
            </div>
          } @else {
            <div class="divide-y divide-gray-200">
              @for (rappel of historiqueRappels; track rappel.id) {
                <div class="p-6">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-gray-900">{{ rappel.destinataire }}</p>
                      <p class="text-sm text-gray-600">{{ rappel.message }}</p>
                      <p class="text-xs text-gray-500 mt-1">{{ rappel.date | date:'dd/MM/yyyy HH:mm' }}</p>
                    </div>
                    <span
                      [class]="rappel.statut === 'envoye' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                      class="px-3 py-1 rounded-full text-xs font-medium"
                    >
                      {{ rappel.statut === 'envoye' ? 'Envoyé' : 'Échoué' }}
                    </span>
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
export class RappelsAlertesComponent implements OnInit {
  rappelConfigForm: FormGroup;
  paiementsAvecAlertes: Paiement[] = [];
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  isSavingConfig: boolean = false;
  isSendingRappel: boolean = false;
  
  statistiques = {
    impayes: 0,
    enRetard: 0,
    rappelsEnvoyes: 12,
    tauxReponse: 75
  };

  historiqueRappels = [
    {
      id: '1',
      destinataire: 'Paul Mensah',
      message: 'Rappel de loyer pour Appartement Lomé Centre',
      date: new Date('2024-06-20T10:30:00'),
      statut: 'envoye'
    },
    {
      id: '2',
      destinataire: 'Kofi Adzo',
      message: 'Alerte impayé pour Villa Sokodé',
      date: new Date('2024-06-19T14:15:00'),
      statut: 'envoye'
    },
    {
      id: '3',
      destinataire: 'Mawunyo Koffi',
      message: 'Rappel de loyer pour Studio Kara',
      date: new Date('2024-06-18T09:00:00'),
      statut: 'echoue'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private paiementsService: PaiementsService,
    private router: Router
  ) {
    this.rappelConfigForm = this.fb.group({
      rappelAvantEcheance: ['3'],
      rappelApresEcheance: ['1'],
      frequenceRappels: ['quotidien'],
      notificationEmail: [true],
      notificationSMS: [true],
      notificationWhatsApp: [false]
    });
  }

  ngOnInit(): void {
    this.loadPaiementsAvecAlertes();
  }

  /**
   * Charge les paiements nécessitant une attention
   */
  loadPaiementsAvecAlertes(): void {
    this.loading = true;
    this.paiementsService.getImpayes().subscribe({
      next: (paiements: Paiement[]) => {
        this.paiementsAvecAlertes = paiements;
        this.statistiques.impayes = paiements.filter(p => p.statut === StatutPaiement.IMPAYE).length;
        this.statistiques.enRetard = paiements.filter(p => p.statut === StatutPaiement.EN_RETARD).length;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement des paiements:', error);
        this.errorMessage = 'Erreur lors du chargement des paiements';
        this.loading = false;
      }
    });
  }

  /**
   * Enregistre la configuration des rappels
   */
  onSubmitConfig(): void {
    if (this.rappelConfigForm.invalid) {
      return;
    }

    this.isSavingConfig = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Simulation de sauvegarde
    setTimeout(() => {
      this.isSavingConfig = false;
      this.successMessage = 'Configuration enregistrée avec succès !';
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    }, 1000);
  }

  /**
   * Envoie un rappel pour un paiement
   */
  envoyerRappel(paiementId: string): void {
    this.isSendingRappel = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.paiementsService.envoyerRappel(paiementId).subscribe({
      next: () => {
        this.isSendingRappel = false;
        this.successMessage = 'Rappel envoyé avec succès !';
        
        // Ajouter à l'historique
        const paiement = this.paiementsAvecAlertes.find(p => p.id === paiementId);
        if (paiement) {
          this.historiqueRappels.unshift({
            id: Math.random().toString(36).substr(2, 9),
            destinataire: this.getLocataireNom(paiement.locataireId),
            message: `Rappel de loyer pour ${this.getBienTitre(paiement.bienId)}`,
            date: new Date(),
            statut: 'envoye'
          });
          this.statistiques.rappelsEnvoyes++;
        }
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error: any) => {
        this.isSendingRappel = false;
        this.errorMessage = error.error?.message || 'Erreur lors de l\'envoi du rappel';
      }
    });
  }

  /**
   * Retourne le titre du bien (mock)
   */
  getBienTitre(bienId: string): string {
    const titres: Record<string, string> = {
      '1': 'Appartement Lomé Centre',
      '2': 'Villa Sokodé',
      '3': 'Studio Kara',
      '4': 'Bureau Kpalimé',
      '5': 'Local Commercial Lomé'
    };
    return titres[bienId] || 'Bien inconnu';
  }

  /**
   * Retourne le nom du locataire (mock)
   */
  getLocataireNom(locataireId: string): string {
    const noms: Record<string, string> = {
      '1': 'Paul Mensah',
      '2': 'Kofi Adzo',
      '3': 'Mawunyo Koffi',
      '4': 'Yao Komlan',
      '5': 'Afi Agbessi'
    };
    return noms[locataireId] || 'Locataire inconnu';
  }

  /**
   * Retourne la classe du badge de statut
   */
  getStatutBadgeClass(statut: StatutPaiement): string {
    const classes: Record<StatutPaiement, string> = {
      [StatutPaiement.PAYE]: 'bg-green-100 text-green-800',
      [StatutPaiement.PARTIEL]: 'bg-yellow-100 text-yellow-800',
      [StatutPaiement.IMPAYE]: 'bg-red-100 text-red-800',
      [StatutPaiement.EN_RETARD]: 'bg-orange-100 text-orange-800'
    };
    return classes[statut] || 'bg-gray-100 text-gray-800';
  }

  /**
   * Retourne le label du statut
   */
  getStatutLabel(statut: StatutPaiement): string {
    const labels: Record<StatutPaiement, string> = {
      [StatutPaiement.PAYE]: 'Payé',
      [StatutPaiement.PARTIEL]: 'Partiel',
      [StatutPaiement.IMPAYE]: 'Impayé',
      [StatutPaiement.EN_RETARD]: 'En retard'
    };
    return labels[statut] || statut;
  }
}
