import { Component, Input, computed } from '@angular/core';
import { StatutProprietaire } from '../../../core/models/proprietaire.model';

@Component({
  selector: 'lok-badge-statut-proprietaire',
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
export class LokBadgeStatutProprietaireComponent {
  @Input({ required: true }) statut!: StatutProprietaire;

  labelStatut = computed(() => {
    switch (this.statut) {
      case StatutProprietaire.ACTIF:
        return 'ACTIF';
      case StatutProprietaire.INACTIF:
        return 'INACTIF';
      case StatutProprietaire.SUSPENDU:
        return 'SUSPENDU';
      default:
        return '';
    }
  });

  badgeClasses = computed(() => {
    switch (this.statut) {
      case StatutProprietaire.ACTIF:
        return 'bg-green-100 text-green-800';
      case StatutProprietaire.INACTIF:
        return 'bg-gray-100 text-gray-800';
      case StatutProprietaire.SUSPENDU:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  });

  dotClasses = computed(() => {
    switch (this.statut) {
      case StatutProprietaire.ACTIF:
        return 'bg-green-500';
      case StatutProprietaire.INACTIF:
        return 'bg-gray-500';
      case StatutProprietaire.SUSPENDU:
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  });
}
