import { Component, Input, computed } from '@angular/core';
import { StatutCompte } from '../../../core/models/admin.model';

@Component({
  selector: 'lok-badge-statut-compte',
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
export class LokBadgeStatutCompteComponent {
  @Input({ required: true }) statut!: StatutCompte;

  labelStatut = computed(() => {
    switch (this.statut) {
      case StatutCompte.ACTIF:
        return 'ACTIF';
      case StatutCompte.SUSPENDU:
        return 'SUSPENDU';
      case StatutCompte.EN_ATTENTE:
        return 'EN ATTENTE';
      default:
        return '';
    }
  });

  badgeClasses = computed(() => {
    switch (this.statut) {
      case StatutCompte.ACTIF:
        return 'bg-green-100 text-green-800';
      case StatutCompte.SUSPENDU:
        return 'bg-red-100 text-red-800';
      case StatutCompte.EN_ATTENTE:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  });

  dotClasses = computed(() => {
    switch (this.statut) {
      case StatutCompte.ACTIF:
        return 'bg-green-500';
      case StatutCompte.SUSPENDU:
        return 'bg-red-500';
      case StatutCompte.EN_ATTENTE:
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  });
}
