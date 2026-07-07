import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

export type NotificationType = 'paiement' | 'bien' | 'contrat' | 'maintenance' | 'systeme';

export interface Notification {
  id: string;
  type: NotificationType;
  titre: string;
  message: string;
  date: Date;
  lu: boolean;
  priorite: 'haute' | 'moyenne' | 'basse';
  lien?: string;
}

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Historique des Notifications</h1>
            <p class="text-sm text-gray-600">Consultez toutes vos notifications</p>
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
        <!-- Filtres -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <form [formGroup]="filterForm" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Type de notification -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  formControlName="type"
                  class="input-field"
                  (change)="applyFilters()"
                >
                  <option value="tous">Tous</option>
                  <option value="paiement">Paiement</option>
                  <option value="bien">Bien</option>
                  <option value="contrat">Contrat</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="systeme">Système</option>
                </select>
              </div>

              <!-- Priorité -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                <select
                  formControlName="priorite"
                  class="input-field"
                  (change)="applyFilters()"
                >
                  <option value="toutes">Toutes</option>
                  <option value="haute">Haute</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="basse">Basse</option>
                </select>
              </div>

              <!-- Statut de lecture -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  formControlName="statut"
                  class="input-field"
                  (change)="applyFilters()"
                >
                  <option value="tous">Tous</option>
                  <option value="non_lu">Non lus</option>
                  <option value="lu">Lus</option>
                </select>
              </div>
            </div>

            <div class="flex gap-4">
              <button
                type="button"
                (click)="markAllAsRead()"
                class="btn-secondary text-sm"
              >
                Tout marquer comme lu
              </button>
              <button
                type="button"
                (click)="clearFilters()"
                class="text-gray-600 text-sm hover:underline"
              >
                Réinitialiser les filtres
              </button>
            </div>
          </form>
        </div>

        <!-- Statistiques -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Total</p>
            <p class="text-3xl font-bold text-gray-900">{{ statistiques.total }}</p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Non lus</p>
            <p class="text-3xl font-bold text-primary">{{ statistiques.nonLus }}</p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Haute priorité</p>
            <p class="text-3xl font-bold text-red-600">{{ statistiques.hautePriorite }}</p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p class="text-sm text-gray-600">Cette semaine</p>
            <p class="text-3xl font-bold text-green-600">{{ statistiques.cetteSemaine }}</p>
          </div>
        </div>

        <!-- Liste des notifications -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">Notifications</h2>
            <p class="text-sm text-gray-600">{{ notificationsFiltrees.length }} notification(s)</p>
          </div>
          
          @if (loading) {
            <div class="p-6 text-center text-gray-500">
              Chargement...
            </div>
          } @else if (notificationsFiltrees.length === 0) {
            <div class="p-6 text-center text-gray-500">
              Aucune notification trouvée
            </div>
          } @else {
            <div class="divide-y divide-gray-200">
              @for (notification of notificationsFiltrees; track notification.id) {
                <div
                  [class.bg-blue-50]="!notification.lu"
                  class="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  (click)="marquerCommeLu(notification.id)"
                >
                  <div class="flex items-start gap-4">
                    <!-- Icône selon le type -->
                    <div
                      [class]="getTypeIconClass(notification.type)"
                      class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>

                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        @if (!notification.lu) {
                          <span class="w-2 h-2 bg-primary rounded-full"></span>
                        }
                        <span
                          [class]="getPrioriteBadgeClass(notification.priorite)"
                          class="px-2 py-0.5 rounded text-xs font-medium"
                        >
                          {{ notification.priorite }}
                        </span>
                        <span class="text-xs text-gray-500">
                          {{ notification.date | date:'dd/MM/yyyy HH:mm' }}
                        </span>
                      </div>
                      
                      <h3 class="font-semibold text-gray-900 mb-1">{{ notification.titre }}</h3>
                      <p class="text-sm text-gray-600">{{ notification.message }}</p>
                      
                      @if (notification.lien) {
                        <a
                          [routerLink]="notification.lien"
                          class="text-primary text-sm font-medium hover:underline mt-2 inline-block"
                          (click)="$event.stopPropagation()"
                        >
                          Voir détails →
                        </a>
                      }
                    </div>

                    <!-- Actions -->
                    <div class="flex gap-2">
                      <button
                        (click)="supprimerNotification(notification.id)"
                        class="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
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
export class HistoriqueComponent implements OnInit {
  filterForm: FormGroup;
  loading: boolean = false;
  notifications: Notification[] = [];
  notificationsFiltrees: Notification[] = [];

  statistiques = {
    total: 0,
    nonLus: 0,
    hautePriorite: 0,
    cetteSemaine: 0
  };

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.filterForm = this.fb.group({
      type: ['tous'],
      priorite: ['toutes'],
      statut: ['tous']
    });
  }

  ngOnInit(): void {
    this.loadNotifications();
  }

  /**
   * Charge les notifications
   */
  loadNotifications(): void {
    this.loading = true;
    
    // Simulation de chargement
    setTimeout(() => {
      this.notifications = [
        {
          id: '1',
          type: 'paiement',
          titre: 'Paiement reçu',
          message: 'Paul Mensah a payé son loyer pour Juin 2024',
          date: new Date('2024-06-20T10:30:00'),
          lu: false,
          priorite: 'haute',
          lien: '/paiements/1'
        },
        {
          id: '2',
          type: 'bien',
          titre: 'Nouvelle demande de visite',
          message: 'Kofi Adzo souhaite visiter le Studio Kara',
          date: new Date('2024-06-19T14:15:00'),
          lu: false,
          priorite: 'moyenne',
          lien: '/biens/3'
        },
        {
          id: '3',
          type: 'contrat',
          titre: 'Contrat expire bientôt',
          message: 'Le bail de Mawunyo Koffi expire dans 15 jours',
          date: new Date('2024-06-18T09:00:00'),
          lu: true,
          priorite: 'haute',
          lien: '/contrats/2'
        },
        {
          id: '4',
          type: 'maintenance',
          titre: 'Maintenance requise',
          message: 'Réparation de la plomberie nécessaire pour Villa Sokodé',
          date: new Date('2024-06-17T16:45:00'),
          lu: true,
          priorite: 'moyenne',
          lien: '/biens/2'
        },
        {
          id: '5',
          type: 'paiement',
          titre: 'Rappel de loyer',
          message: 'Yao Komlan n\'a pas encore payé son loyer',
          date: new Date('2024-06-15T08:00:00'),
          lu: true,
          priorite: 'haute',
          lien: '/paiements/4'
        },
        {
          id: '6',
          type: 'systeme',
          titre: 'Mise à jour système',
          message: 'Nouvelle fonctionnalité disponible : Rapports PDF',
          date: new Date('2024-06-10T11:20:00'),
          lu: true,
          priorite: 'basse'
        }
      ];
      
      this.notificationsFiltrees = [...this.notifications];
      this.updateStatistiques();
      this.loading = false;
    }, 500);
  }

  /**
   * Applique les filtres
   */
  applyFilters(): void {
    const type = this.filterForm.value.type;
    const priorite = this.filterForm.value.priorite;
    const statut = this.filterForm.value.statut;

    this.notificationsFiltrees = this.notifications.filter(notification => {
      if (type !== 'tous' && notification.type !== type) return false;
      if (priorite !== 'toutes' && notification.priorite !== priorite) return false;
      if (statut === 'non_lu' && notification.lu) return false;
      if (statut === 'lu' && !notification.lu) return false;
      return true;
    });
  }

  /**
   * Réinitialise les filtres
   */
  clearFilters(): void {
    this.filterForm.patchValue({
      type: 'tous',
      priorite: 'toutes',
      statut: 'tous'
    });
    this.applyFilters();
  }

  /**
   * Marque une notification comme lue
   */
  marquerCommeLu(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.lu = true;
      this.updateStatistiques();
      this.applyFilters();
    }
  }

  /**
   * Marque toutes les notifications comme lues
   */
  markAllAsRead(): void {
    this.notifications.forEach(n => n.lu = true);
    this.updateStatistiques();
    this.applyFilters();
  }

  /**
   * Supprime une notification
   */
  supprimerNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.applyFilters();
    this.updateStatistiques();
  }

  /**
   * Met à jour les statistiques
   */
  updateStatistiques(): void {
    this.statistiques.total = this.notifications.length;
    this.statistiques.nonLus = this.notifications.filter(n => !n.lu).length;
    this.statistiques.hautePriorite = this.notifications.filter(n => n.priorite === 'haute').length;
    
    const uneSemaine = 7 * 24 * 60 * 60 * 1000;
    const maintenant = new Date();
    this.statistiques.cetteSemaine = this.notifications.filter(
      n => maintenant.getTime() - n.date.getTime() < uneSemaine
    ).length;
  }

  /**
   * Retourne la classe de l'icône selon le type
   */
  getTypeIconClass(type: NotificationType): string {
    const classes: Record<NotificationType, string> = {
      paiement: 'bg-green-100 text-green-600',
      bien: 'bg-blue-100 text-blue-600',
      contrat: 'bg-purple-100 text-purple-600',
      maintenance: 'bg-orange-100 text-orange-600',
      systeme: 'bg-gray-100 text-gray-600'
    };
    return classes[type];
  }

  /**
   * Retourne la classe du badge de priorité
   */
  getPrioriteBadgeClass(priorite: string): string {
    const classes: Record<string, string> = {
      haute: 'bg-red-100 text-red-800',
      moyenne: 'bg-yellow-100 text-yellow-800',
      basse: 'bg-gray-100 text-gray-800'
    };
    return classes[priorite] || 'bg-gray-100 text-gray-800';
  }
}
