import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokMontantFcfaComponent } from '../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-locataire-dashboard',
  standalone: true,
  imports: [
    CommonModule,
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
            <h1 class="text-2xl font-bold text-gray-900">Mon Espace Locataire</h1>
            <p class="text-sm text-gray-600">Gérez votre location facilement</p>
          </div>
          <button
            routerLink="/auth/login"
            class="btn-secondary"
          >
            Déconnexion
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

        <!-- Informations du locataire -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {{ locataire.prenom[0] }}{{ locataire.nom[0] }}
            </div>
            <div>
              <h2 class="text-xl font-bold text-gray-900">{{ locataire.prenom }} {{ locataire.nom }}</h2>
              <p class="text-sm text-gray-600">{{ locataire.email }}</p>
              <p class="text-sm text-gray-600">{{ locataire.telephone }}</p>
            </div>
          </div>
        </div>

        <!-- Mon logement -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">Mon logement</h2>
          </div>
          
          <div class="p-6">
            <div class="flex items-start gap-4">
              <div class="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
              </div>
              
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900 text-lg mb-2">{{ logement.titre }}</h3>
                <p class="text-sm text-gray-600 mb-4">{{ logement.adresse }}</p>
                
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p class="text-gray-500">Loyer</p>
                    <p class="font-semibold">
                      <lok-montant-fcfa [montant]="logement.loyer"></lok-montant-fcfa>/mois
                    </p>
                  </div>
                  <div>
                    <p class="text-gray-500">Charges</p>
                    <p class="font-semibold">
                      <lok-montant-fcfa [montant]="logement.charges"></lok-montant-fcfa>/mois
                    </p>
                  </div>
                  <div>
                    <p class="text-gray-500">Date d'entrée</p>
                    <p class="font-semibold">{{ logement.dateEntree | date:'dd/MM/yyyy' }}</p>
                  </div>
                  <div>
                    <p class="text-gray-500">Fin de bail</p>
                    <p class="font-semibold">{{ logement.finBail | date:'dd/MM/yyyy' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Paiements -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div class="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">Mes paiements</h2>
            <button
              routerLink="/paiements/nouveau"
              class="btn-primary text-sm"
            >
              Effectuer un paiement
            </button>
          </div>
          
          <div class="divide-y divide-gray-200">
            @for (paiement of paiements; track paiement.id) {
              <div class="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div>
                  <p class="font-medium text-gray-900">{{ paiement.periode }}</p>
                  <p class="text-sm text-gray-600">Échéance: {{ paiement.dateEcheance | date:'dd/MM/yyyy' }}</p>
                </div>
                
                <div class="text-right">
                  <p class="font-semibold text-gray-900">
                    <lok-montant-fcfa [montant]="paiement.montant"></lok-montant-fcfa>
                  </p>
                  <span
                    [class]="paiement.statut === 'paye' ? 'bg-green-100 text-green-800' : paiement.statut === 'en_retard' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'"
                    class="px-2 py-1 rounded text-xs font-medium"
                  >
                    {{ paiement.statut === 'paye' ? 'Payé' : paiement.statut === 'en_retard' ? 'En retard' : 'En attente' }}
                  </span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Actions rapides -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            routerLink="/paiements/nouveau"
            class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-primary transition-colors text-left"
          >
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <p class="font-semibold text-gray-900">Payer mon loyer</p>
                <p class="text-sm text-gray-600">Effectuer un paiement</p>
              </div>
            </div>
          </button>

          <button
            routerLink="/notifications/messagerie"
            class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-primary transition-colors text-left"
          >
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
              </div>
              <div>
                <p class="font-semibold text-gray-900">Contacter propriétaire</p>
                <p class="text-sm text-gray-600">Envoyer un message</p>
              </div>
            </div>
          </button>

          <button
            routerLink="/locataire"
            class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-primary transition-colors text-left"
          >
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div>
                <p class="font-semibold text-gray-900">Mon contrat</p>
                <p class="text-sm text-gray-600">Voir mon bail</p>
              </div>
            </div>
          </button>
        </div>

        <!-- Demandes -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">Mes demandes</h2>
          </div>
          
          @if (demandes.length === 0) {
            <div class="p-6 text-center text-gray-500">
              Aucune demande en cours
            </div>
          } @else {
            <div class="divide-y divide-gray-200">
              @for (demande of demandes; track demande.id) {
                <div class="p-4 flex items-center justify-between">
                  <div>
                    <p class="font-medium text-gray-900">{{ demande.titre }}</p>
                    <p class="text-sm text-gray-600">{{ demande.date | date:'dd/MM/yyyy' }}</p>
                  </div>
                  <span
                    [class]="demande.statut === 'en_cours' ? 'bg-yellow-100 text-yellow-800' : demande.statut === 'resolu' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                    class="px-2 py-1 rounded text-xs font-medium"
                  >
                    {{ demande.statut === 'en_cours' ? 'En cours' : demande.statut === 'resolu' ? 'Résolu' : 'Nouveau' }}
                  </span>
                </div>
              }
            </div>
          }
          
          <div class="p-4 border-t border-gray-200">
            <button
              (click)="showNewDemande = true"
              class="btn-primary w-full"
            >
              Nouvelle demande
            </button>
          </div>
        </div>

        <!-- Modal nouvelle demande -->
        @if (showNewDemande) {
          <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Nouvelle demande</h2>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Type de demande</label>
                  <select class="input-field">
                    <option value="maintenance">Maintenance / Réparation</option>
                    <option value="renouvellement">Renouvellement de bail</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea class="input-field" rows="4" placeholder="Décrivez votre demande..."></textarea>
                </div>

                <div class="flex gap-4">
                  <button
                    (click)="envoyerDemande()"
                    class="btn-primary flex-1"
                  >
                    Envoyer
                  </button>
                  <button
                    (click)="showNewDemande = false"
                    class="btn-secondary flex-1"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class LocataireDashboardComponent implements OnInit {
  locataire = {
    prenom: 'Paul',
    nom: 'Mensah',
    email: 'paul.mensah@email.com',
    telephone: '+228 91 02 23 45'
  };

  logement = {
    titre: 'Appartement Lomé Centre',
    adresse: '123 Rue de la Paix, Lomé',
    loyer: 100000,
    charges: 15000,
    dateEntree: new Date('2024-01-01'),
    finBail: new Date('2025-01-01')
  };

  paiements = [
    {
      id: '1',
      periode: 'Juin 2024',
      dateEcheance: new Date('2024-06-01'),
      montant: 115000,
      statut: 'paye'
    },
    {
      id: '2',
      periode: 'Juillet 2024',
      dateEcheance: new Date('2024-07-01'),
      montant: 115000,
      statut: 'en_attente'
    },
    {
      id: '3',
      periode: 'Août 2024',
      dateEcheance: new Date('2024-08-01'),
      montant: 115000,
      statut: 'en_attente'
    }
  ];

  demandes = [
    {
      id: '1',
      titre: 'Réparation robinet cuisine',
      date: new Date('2024-06-15'),
      statut: 'en_cours'
    }
  ];

  showNewDemande: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(private router: Router) {}

  ngOnInit(): void {}

  /**
   * Envoie une nouvelle demande
   */
  envoyerDemande(): void {
    this.showNewDemande = false;
    this.successMessage = 'Demande envoyée avec succès !';
    
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }
}
