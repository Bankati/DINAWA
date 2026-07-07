import { Component, Input, computed } from '@angular/core';
import { StatutLocataire } from '../../../core/models/locataire.model';

@Component({
  selector: 'lok-badge-statut-locataire',
  standalone: true,
  template: `
    <span 
      [class]="badgeClasses()"
      class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold min-h-[28px]"
    >
      <span [class]="dotClasses()" class="w-2 h-2 rounded-full mr-2"></span>
      {{ labelStatut() }}
    </span>
  `,
})
export class LokBadgeStatutLocataireComponent {
  @Input({ required: true }) statut!: StatutLocataire;

  /**
   * Retourne le label affiché pour le statut
   */
  labelStatut = computed(() => {
    switch (this.statut) {
      case StatutLocataire.ACTIF:
        return 'ACTIF';
      case StatutLocataire.INACTIF:
        return 'INACTIF';
      case StatutLocataire.EN_RETARD:
        return 'EN RETARD';
      default:
        return '';
    }
  });

  /**
   * Retourne les classes CSS pour le badge
   */
  badgeClasses = computed(() => {
    switch (this.statut) {
      case StatutLocataire.ACTIF:
        return 'bg-green-100 text-green-800';
      case StatutLocataire.INACTIF:
        return 'bg-gray-100 text-gray-800';
      case StatutLocataire.EN_RETARD:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  });

  /**
   * Retourne les classes CSS pour le point coloré
   */
  dotClasses = computed(() => {
    switch (this.statut) {
      case StatutLocataire.ACTIF:
        return 'bg-green-500';
      case StatutLocataire.INACTIF:
        return 'bg-gray-500';
      case StatutLocataire.EN_RETARD:
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  });
}
