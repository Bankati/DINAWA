import { Component } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { LokAlerteComponent } from "../../../../shared/components/lok-alerte/lok-alerte.component";
import { LokMontantFcfaComponent } from "../../../../shared/components/lok-montant-fcfa/lok-montant-fcfa.component";
import { CommonModule } from "@angular/common";

export type PlanAbonnement = "starter" | "pro" | "premium";

export interface Plan {
  id: PlanAbonnement;
  nom: string;
  prix: number;
  periode: string;
  fonctionnalites: string[];
  populaire: boolean;
}

@Component({
  selector: "app-abonnements",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LokAlerteComponent,
    LokMontantFcfaComponent,
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Nos Abonnements</h1>
            <p class="text-sm text-gray-600">
              Choisissez le plan adapté à vos besoins
            </p>
          </div>
          <button routerLink="/dashboard" class="btn-secondary">Retour</button>
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

        <!-- Abonnement actuel -->
        @if (abonnementActuel) {
          <div
            class="bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl p-6 mb-8"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-white/80 text-sm">Votre abonnement actuel</p>
                <h2 class="text-2xl font-bold mb-1">
                  {{ abonnementActuel.plan }}
                </h2>
                <p class="text-white/80">
                  Expire le {{ abonnementActuel.dateFin | date: "dd/MM/yyyy" }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-3xl font-bold">
                  <lok-montant-fcfa
                    [montant]="abonnementActuel.prix"
                  ></lok-montant-fcfa>
                </p>
                <p class="text-white/80">/{{ abonnementActuel.periode }}</p>
              </div>
            </div>
          </div>
        }

        <!-- Offre de lancement -->
        <div
          class="bg-secondary-50 border border-secondary text-secondary-800 rounded-xl p-4 mb-8 flex items-center gap-3"
        >
          <svg
            class="w-6 h-6 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          <p class="text-sm font-medium">
            Offre de lancement : 3 mois gratuits pendant la phase bêta, puis
            -50% sur le forfait Starter pendant 3 mois (1 000 FCFA/mois).
            Changement de forfait gratuit à tout moment.
          </p>
        </div>

        <!-- Plans d'abonnement -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          @for (plan of plans; track plan.id) {
            <div
              [class]="
                plan.populaire
                  ? 'border-primary ring-2 ring-primary scale-105'
                  : 'border-gray-200'
              "
              [class.bg-white]="!plan.populaire"
              [class.bg-gray-50]="plan.populaire"
              class="rounded-xl p-6 border-2 shadow-sm transition-all"
            >
              @if (plan.populaire) {
                <div
                  class="bg-primary text-white text-center py-1 rounded-full text-sm font-semibold mb-4"
                >
                  Plus populaire
                </div>
              }

              <div class="text-center mb-6">
                <h3 class="text-xl font-bold text-gray-900 mb-2">
                  {{ plan.nom }}
                </h3>
                <div class="mb-2">
                  <span class="text-4xl font-bold text-gray-900">
                    <lok-montant-fcfa [montant]="plan.prix"></lok-montant-fcfa>
                  </span>
                  <span class="text-gray-600">/{{ plan.periode }}</span>
                </div>
              </div>

              <ul class="space-y-3 mb-6">
                @for (
                  fonctionnalite of plan.fonctionnalites;
                  track fonctionnalite
                ) {
                  <li class="flex items-center gap-2">
                    <svg
                      class="w-5 h-5 text-green-600 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    <span class="text-sm text-gray-700">{{
                      fonctionnalite
                    }}</span>
                  </li>
                }
              </ul>

              <button
                (click)="selectionnerPlan(plan.id)"
                [disabled]="isSubscribing"
                [class]="plan.populaire ? 'btn-primary' : 'btn-secondary'"
                class="w-full"
              >
                @if (isSubscribing && selectedPlan === plan.id) {
                  <span class="flex items-center justify-center gap-2">
                    <svg
                      class="animate-spin h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      ></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Traitement...
                  </span>
                } @else {
                  {{
                    abonnementActuel?.plan === plan.nom
                      ? "Changer de plan"
                      : "S'abonner"
                  }}
                }
              </button>
            </div>
          }
        </div>

        <!-- Comparaison des fonctionnalités -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">
              Comparaison des fonctionnalités
            </h2>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="bg-gray-50">
                  <th
                    class="px-6 py-3 text-left text-sm font-semibold text-gray-900"
                  >
                    Fonctionnalité
                  </th>
                  <th
                    class="px-6 py-3 text-center text-sm font-semibold text-gray-900"
                  >
                    Starter
                  </th>
                  <th
                    class="px-6 py-3 text-center text-sm font-semibold text-primary"
                  >
                    Pro
                  </th>
                  <th
                    class="px-6 py-3 text-center text-sm font-semibold text-gray-900"
                  >
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                @for (
                  fonctionnalite of fonctionnalitesComparaison;
                  track fonctionnalite.nom
                ) {
                  <tr>
                    <td class="px-6 py-4 text-sm text-gray-900">
                      {{ fonctionnalite.nom }}
                    </td>
                    <td class="px-6 py-4 text-center">
                      @if (fonctionnalite.starter) {
                        <svg
                          class="w-5 h-5 text-green-600 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 13l4 4L19 7"
                          ></path>
                        </svg>
                      } @else {
                        <span class="text-gray-400">-</span>
                      }
                    </td>
                    <td class="px-6 py-4 text-center">
                      @if (fonctionnalite.pro) {
                        <svg
                          class="w-5 h-5 text-green-600 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 13l4 4L19 7"
                          ></path>
                        </svg>
                      } @else {
                        <span class="text-gray-400">-</span>
                      }
                    </td>
                    <td class="px-6 py-4 text-center">
                      @if (fonctionnalite.premium) {
                        <svg
                          class="w-5 h-5 text-green-600 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 13l4 4L19 7"
                          ></path>
                        </svg>
                      } @else {
                        <span class="text-gray-400">-</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- FAQ -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">
              Questions fréquentes
            </h2>
          </div>

          <div class="divide-y divide-gray-200">
            @for (faq of faqs; track faq.question) {
              <div class="p-6">
                <h3 class="font-medium text-gray-900 mb-2">
                  {{ faq.question }}
                </h3>
                <p class="text-sm text-gray-600">{{ faq.reponse }}</p>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AbonnementsComponent {
  plans: Plan[] = [
    {
      id: "starter",
      nom: "Starter",
      prix: 2000,
      periode: "mois",
      fonctionnalites: [
        "Jusqu'à 5 biens gérés",
        "Collecte des loyers T-Money / Flooz",
        "Quittances PDF automatiques",
        "Rappels et alertes impayés",
        "Tableau de bord basique",
      ],
      populaire: false,
    },
    {
      id: "pro",
      nom: "Pro",
      prix: 5000,
      periode: "mois",
      fonctionnalites: [
        "Jusqu'à 15 biens gérés",
        "Toutes les fonctionnalités Starter",
        "Contrats de bail PDF",
        "Historique exportable PDF/Excel",
        "Annonces de biens vacants",
        "Fréquences de paiement (mensuelle, trimestrielle, semestrielle)",
      ],
      populaire: true,
    },
    {
      id: "premium",
      nom: "Premium Gestionnaire",
      prix: 10000,
      periode: "mois",
      fonctionnalites: [
        "Biens gérés illimités",
        "Toutes les fonctionnalités Pro",
        "Espace gestionnaire professionnel",
        "Portefeuille de mandats",
        "Rapports mensuels automatiques aux mandants",
        "Profil vérifié dans l'annuaire WARAH",
        "Support prioritaire",
      ],
      populaire: false,
    },
  ];

  fonctionnalitesComparaison = [
    { nom: "Nombre de biens gérés", starter: true, pro: true, premium: true },
    {
      nom: "Collecte loyers T-Money/Flooz",
      starter: true,
      pro: true,
      premium: true,
    },
    {
      nom: "Quittances PDF automatiques",
      starter: true,
      pro: true,
      premium: true,
    },
    {
      nom: "Rappels et alertes impayés",
      starter: true,
      pro: true,
      premium: true,
    },
    { nom: "Contrats de bail PDF", starter: false, pro: true, premium: true },
    {
      nom: "Historique exportable PDF/Excel",
      starter: false,
      pro: true,
      premium: true,
    },
    { nom: "Annonces biens vacants", starter: false, pro: true, premium: true },
    {
      nom: "Gestion fréquences de paiement",
      starter: false,
      pro: true,
      premium: true,
    },
    {
      nom: "Espace gestionnaire professionnel",
      starter: false,
      pro: false,
      premium: true,
    },
    {
      nom: "Portefeuille de mandats",
      starter: false,
      pro: false,
      premium: true,
    },
    {
      nom: "Rapports mensuels aux mandants",
      starter: false,
      pro: false,
      premium: true,
    },
    {
      nom: "Profil vérifié annuaire WARAH",
      starter: false,
      pro: false,
      premium: true,
    },
    { nom: "Support prioritaire", starter: false, pro: false, premium: true },
    { nom: "Nombre de locataires", starter: true, pro: true, premium: true },
  ];

  faqs = [
    {
      question: "Puis-je changer d'abonnement à tout moment ?",
      reponse:
        "Oui, la migration vers un forfait supérieur est gratuite et sans pénalité, à tout moment.",
    },
    {
      question: "Y a-t-il un engagement de durée ?",
      reponse:
        "Non, tous nos abonnements sont sans engagement et sans frais de résiliation.",
    },
    {
      question: "WARAH prend-il une commission sur mes loyers ?",
      reponse:
        "Non. Le forfait est fixe chaque mois, quel que soit le nombre de loyers collectés. 100 % des loyers encaissés vous reviennent intégralement.",
    },
    {
      question: "Comment puis-je payer mon abonnement ?",
      reponse:
        "Le règlement de l'abonnement se fait par mobile money, via T-Money (Togocom) ou Flooz (Moov Africa).",
    },
  ];

  abonnementActuel: {
    plan: string;
    prix: number;
    periode: string;
    dateFin: Date;
  } = {
    plan: "Starter",
    prix: 2000,
    periode: "mois",
    dateFin: new Date("2026-12-31"),
  };

  selectedPlan: PlanAbonnement | null = null;
  isSubscribing: boolean = false;
  errorMessage: string = "";
  successMessage: string = "";

  /**
   * Sélectionne un plan d'abonnement
   */
  selectionnerPlan(planId: PlanAbonnement): void {
    this.selectedPlan = planId;
    this.isSubscribing = true;
    this.errorMessage = "";
    this.successMessage = "";

    // Simulation de souscription
    setTimeout(() => {
      const plan = this.plans.find((p) => p.id === planId);
      if (plan) {
        this.abonnementActuel = {
          plan: plan.nom,
          prix: plan.prix,
          periode: plan.periode,
          dateFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        };

        this.successMessage = `Abonnement ${plan.nom} activé avec succès !`;

        setTimeout(() => {
          this.successMessage = "";
        }, 3000);
      }

      this.isSubscribing = false;
      this.selectedPlan = null;
    }, 2000);
  }
}
