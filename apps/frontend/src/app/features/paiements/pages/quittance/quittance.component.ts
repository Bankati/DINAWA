import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PaiementsService } from '../../services/paiements.service';
import { Paiement } from '@core/models/paiement.model';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokMontantFcfaComponent } from '../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-quittance',
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
            <h1 class="text-2xl font-bold text-gray-900">Quittance de loyer</h1>
            <p class="text-sm text-gray-600">Document officiel de paiement</p>
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
      <div class="p-6 max-w-4xl mx-auto">
        <!-- Alerte d'erreur -->
        @if (errorMessage) {
          <lok-alerte type="error" [message]="errorMessage"></lok-alerte>
        }

        <!-- Quittance -->
        @if (loading) {
          <div class="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
            <div class="animate-pulse space-y-4">
              <div class="h-8 bg-gray-200 rounded w-3/4"></div>
              <div class="h-4 bg-gray-200 rounded w-1/2"></div>
              <div class="h-4 bg-gray-200 rounded w-1/3"></div>
              <div class="h-32 bg-gray-200 rounded mt-6"></div>
            </div>
          </div>
        } @else if (paiement) {
          <div class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <!-- En-tête de la quittance -->
            <div class="bg-gradient-to-r from-primary to-primary-dark text-white p-8">
              <div class="flex justify-between items-start">
                <div>
                  <h2 class="text-3xl font-bold mb-2">WARAH</h2>
                  <p class="text-white/80">Plateforme de Gestion Locative Immobilière</p>
                </div>
                <div class="text-right">
                  <p class="font-semibold">Quittance N° {{ paiement.id }}</p>
                  <p class="text-sm text-white/80">Date: {{ paiement.datePaiement | date:'dd/MM/yyyy' }}</p>
                </div>
              </div>
            </div>

            <!-- Contenu de la quittance -->
            <div class="p-8 space-y-6">
              <!-- Informations du propriétaire -->
              <div class="border-b border-gray-200 pb-4">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">PROPRIÉTAIRE</h3>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p class="text-gray-500">Nom</p>
                    <p class="font-medium">{{ proprietaireNom }}</p>
                  </div>
                  <div>
                    <p class="text-gray-500">Téléphone</p>
                    <p class="font-medium">{{ proprietaireTelephone }}</p>
                  </div>
                </div>
              </div>

              <!-- Informations du locataire -->
              <div class="border-b border-gray-200 pb-4">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">LOCATAIRE</h3>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p class="text-gray-500">Nom</p>
                    <p class="font-medium">{{ locataireNom }}</p>
                  </div>
                  <div>
                    <p class="text-gray-500">Téléphone</p>
                    <p class="font-medium">{{ locataireTelephone }}</p>
                  </div>
                </div>
              </div>

              <!-- Informations du bien -->
              <div class="border-b border-gray-200 pb-4">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">BIEN IMMOBILIER</h3>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p class="text-gray-500">Titre</p>
                    <p class="font-medium">{{ bienTitre }}</p>
                  </div>
                  <div>
                    <p class="text-gray-500">Adresse</p>
                    <p class="font-medium">{{ bienAdresse }}</p>
                  </div>
                </div>
              </div>

              <!-- Détails du paiement -->
              <div class="bg-gray-50 rounded-lg p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">DÉTAILS DU PAIEMENT</h3>
                <div class="space-y-3">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Période concernée</span>
                    <span class="font-medium">{{ paiement.dateEcheance | date:'MMMM yyyy' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Montant dû</span>
                    <span class="font-medium">
                      <lok-montant-fcfa [montant]="paiement.montantEcheance"></lok-montant-fcfa>
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Montant payé</span>
                    <span class="font-medium">
                      <lok-montant-fcfa [montant]="paiement.montant"></lok-montant-fcfa>
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Mode de paiement</span>
                    <span class="font-medium">{{ getModePaiementLabel(paiement.modePaiement) }}</span>
                  </div>
                  @if (paiement.numeroTransaction) {
                    <div class="flex justify-between">
                      <span class="text-gray-600">N° de transaction</span>
                      <span class="font-medium">{{ paiement.numeroTransaction }}</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Signature -->
              <div class="grid grid-cols-2 gap-8 pt-4">
                <div class="text-center">
                  <p class="text-sm text-gray-500 mb-2">Signature du propriétaire</p>
                  <div class="border-t-2 border-gray-300 pt-2">
                    <p class="text-xs text-gray-400">À signer électroniquement</p>
                  </div>
                </div>
                <div class="text-center">
                  <p class="text-sm text-gray-500 mb-2">Signature du locataire</p>
                  <div class="border-t-2 border-gray-300 pt-2">
                    <p class="text-xs text-gray-400">À signer électroniquement</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pied de page -->
            <div class="bg-gray-100 px-8 py-4 text-center text-sm text-gray-600">
              <p>Document généré automatiquement par WARAH - Plateforme de Gestion Locative Immobilière</p>
              <p class="mt-1">Ce document fait foi de paiement</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-6 flex gap-4 justify-center">
            <button
              (click)="downloadPDF()"
              [disabled]="isDownloading"
              class="btn-primary flex items-center gap-2"
            >
              @if (isDownloading) {
                <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Téléchargement...
              } @else {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Télécharger PDF
              }
            </button>
            <button
              (click)="sendByEmail()"
              [disabled]="isSending"
              class="btn-secondary flex items-center gap-2"
            >
              @if (isSending) {
                <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Envoi en cours...
              } @else {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                Envoyer par email
              }
            </button>
            <button
              (click)="shareWhatsApp()"
              class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class QuittanceComponent implements OnInit {
  paiement: Paiement | null = null;
  loading: boolean = false;
  errorMessage: string = '';
  isDownloading: boolean = false;
  isSending: boolean = false;
  
  // Données mockées pour l'affichage
  proprietaireNom: string = 'Jean Kouassi';
  proprietaireTelephone: string = '+228 90 01 02 03';
  locataireNom: string = 'Paul Mensah';
  locataireTelephone: string = '+228 91 02 23 45';
  bienTitre: string = 'Appartement Lomé Centre';
  bienAdresse: string = '123 Rue de la Paix, Lomé';

  constructor(
    private paiementsService: PaiementsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const paiementId = this.route.snapshot.paramMap.get('id');
    if (paiementId) {
      this.loadPaiement(paiementId);
    } else {
      this.errorMessage = 'ID de paiement non trouvé';
      setTimeout(() => {
        this.router.navigate(['/dashboard/paiements']);
      }, 3000);
    }
  }

  /**
   * Charge les détails du paiement
   */
  loadPaiement(id: string): void {
    this.loading = true;
    this.paiementsService.getPaiementById(id).subscribe({
      next: (paiement: Paiement) => {
        this.paiement = paiement;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement du paiement:', error);
        this.errorMessage = 'Erreur lors du chargement du paiement';
        this.loading = false;
      }
    });
  }

  /**
   * Retourne le label du mode de paiement
   */
  getModePaiementLabel(mode: string): string {
    const labels: Record<string, string> = {
      'T_MONEY': 'T-Money',
      'FLOOZ': 'Flooz',
      'ESPECES': 'Espèces',
      'CHEQUE': 'Chèque',
      'VIREMENT': 'Virement bancaire'
    };
    return labels[mode] || mode;
  }

  /**
   * Télécharge la quittance en PDF
   */
  downloadPDF(): void {
    this.isDownloading = true;
    
    // Simulation de téléchargement PDF
    setTimeout(() => {
      this.isDownloading = false;
      alert('Quittance téléchargée avec succès !');
    }, 2000);
  }

  /**
   * Envoie la quittance par email
   */
  sendByEmail(): void {
    this.isSending = true;
    
    // Simulation d'envoi par email
    setTimeout(() => {
      this.isSending = false;
      alert('Quittance envoyée par email avec succès !');
    }, 2000);
  }

  /**
   * Partage la quittance via WhatsApp
   */
  shareWhatsApp(): void {
    const message = `Quittance de loyer N°${this.paiement?.id} - Montant: ${this.paiement?.montant} FCFA`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }
}
