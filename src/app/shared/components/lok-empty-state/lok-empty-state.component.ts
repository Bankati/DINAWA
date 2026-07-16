import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'lok-empty-state',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
      <!-- Illustration -->
      <div class="mb-6">
        <svg 
          class="w-24 h-24 text-gray-300 mx-auto" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          @switch (icon) {
            @case ('bien') {
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            }
            @case ('paiement') {
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
            }
            @case ('locataire') {
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            }
            @case ('document') {
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            }
            @case ('search') {
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            }
            @case ('default') {
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
            }
          }
        </svg>
      </div>

      <!-- Titre -->
      <h3 class="text-xl font-semibold text-gray-900 mb-2">{{ titre }}</h3>

      <!-- Description -->
      <p class="text-gray-600 mb-6 max-w-md">{{ description }}</p>

      <!-- Bouton d'action -->
      @if (ctaLabel && ctaAction) {
        <button
          (click)="ctaAction.emit()"
          class="btn-primary"
        >
          {{ ctaLabel }}
        </button>
      }
    </div>
  `,
})
export class LokEmptyStateComponent {
  @Input() titre: string = 'Aucune donnée';
  @Input() description: string = 'Il n\'y a aucune donnée à afficher pour le moment.';
  @Input() ctaLabel?: string;
  @Input() icon: 'bien' | 'paiement' | 'locataire' | 'document' | 'search' | 'default' = 'default';
  @Output() ctaAction = new EventEmitter<void>();

  /**
   * Émet l'événement d'action lorsque le bouton CTA est cliqué
   */
  onAction(): void {
    this.ctaAction.emit();
  }
}

/*
 * Exemple d'utilisation :
 * 
 * État vide pour les biens :
 * <lok-empty-state 
 *   titre="Aucun bien ajouté"
 *   description="Commencez par ajouter votre premier bien immobilier."
 *   ctaLabel="Ajouter un bien"
 *   icon="bien"
 *   (ctaAction)="addBien()"
 * ></lok-empty-state>
 * 
 * État vide pour les paiements :
 * <lok-empty-state 
 *   titre="Aucun paiement enregistré"
 *   description="Les paiements apparaîtront ici une fois enregistrés."
 *   icon="paiement"
 * ></lok-empty-state>
 * 
 * État vide simple :
 * <lok-empty-state 
 *   titre="Aucun résultat"
 *   description="Aucun résultat trouvé pour votre recherche."
 *   icon="search"
 * ></lok-empty-state>
 */
