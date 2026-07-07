import { Component, Input, computed } from '@angular/core';
import { StatutBien } from '../../../core/models/bien.model';

@Component({
  selector: 'lok-badge-statut',
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
export class LokBadgeStatutComponent {
  @Input({ required: true }) statut!: StatutBien;

  /**
   * Retourne le label affiché pour le statut
   */
  labelStatut = computed(() => {
    switch (this.statut) {
      case StatutBien.OCCUPE:
        return 'OCCUPÉ';
      case StatutBien.VACANT:
        return 'VACANT';
      case StatutBien.EN_TRAVAUX:
        return 'EN TRAVAUX';
      case StatutBien.ARCHIVE:
        return 'ARCHIVÉ';
      default:
        return '';
    }
  });

  /**
   * Retourne les classes CSS pour le badge
   */
  badgeClasses = computed(() => {
    switch (this.statut) {
      case StatutBien.OCCUPE:
        return 'bg-green-100 text-green-800';
      case StatutBien.VACANT:
        return 'bg-blue-100 text-blue-800';
      case StatutBien.EN_TRAVAUX:
        return 'bg-orange-100 text-orange-800';
      case StatutBien.ARCHIVE:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  });

  /**
   * Retourne les classes CSS pour le point coloré
   */
  dotClasses = computed(() => {
    switch (this.statut) {
      case StatutBien.OCCUPE:
        return 'bg-green-500';
      case StatutBien.VACANT:
        return 'bg-blue-500';
      case StatutBien.EN_TRAVAUX:
        return 'bg-orange-500';
      case StatutBien.ARCHIVE:
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  });
}

/*
 * Exemple d'utilisation :
 * 
 * <lok-badge-statut [statut]="bien.statut"></lok-badge-statut>
 * 
 * Avec un statut OCCUPE :
 * <lok-badge-statut [statut]="StatutBien.OCCUPE"></lok-badge-statut>
 */
