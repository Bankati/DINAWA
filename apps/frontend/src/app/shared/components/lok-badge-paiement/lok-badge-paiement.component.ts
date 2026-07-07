import { Component, Input, computed } from '@angular/core';
import { StatutPaiement } from '../../../core/models/paiement.model';

@Component({
  selector: 'lok-badge-paiement',
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
export class LokBadgePaiementComponent {
  @Input({ required: true }) statut!: StatutPaiement;

  /**
   * Retourne le label affiché pour le statut de paiement
   */
  labelStatut = computed(() => {
    switch (this.statut) {
      case StatutPaiement.PAYE:
        return 'PAYÉ';
      case StatutPaiement.PARTIEL:
        return 'PARTIEL';
      case StatutPaiement.EN_RETARD:
        return 'EN RETARD';
      case StatutPaiement.IMPAYE:
        return 'IMPAYÉ';
      default:
        return '';
    }
  });

  /**
   * Retourne les classes CSS pour le badge
   */
  badgeClasses = computed(() => {
    switch (this.statut) {
      case StatutPaiement.PAYE:
        return 'bg-green-100 text-green-800';
      case StatutPaiement.PARTIEL:
        return 'bg-yellow-100 text-yellow-800';
      case StatutPaiement.EN_RETARD:
        return 'bg-orange-100 text-orange-800';
      case StatutPaiement.IMPAYE:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  });

  /**
   * Retourne les classes CSS pour le point coloré
   */
  dotClasses = computed(() => {
    switch (this.statut) {
      case StatutPaiement.PAYE:
        return 'bg-green-500';
      case StatutPaiement.PARTIEL:
        return 'bg-yellow-500';
      case StatutPaiement.EN_RETARD:
        return 'bg-orange-500';
      case StatutPaiement.IMPAYE:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  });
}

/*
 * Exemple d'utilisation :
 * 
 * <lok-badge-paiement [statut]="paiement.statut"></lok-badge-paiement>
 * 
 * Avec un statut PAYÉ :
 * <lok-badge-paiement [statut]="StatutPaiement.PAYE"></lok-badge-paiement>
 */
