import { Component, Input, computed } from '@angular/core';
import { StatutLitige } from '../../../core/models/admin.model';

@Component({
  selector: 'lok-badge-statut-litige',
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
export class LokBadgeStatutLitigeComponent {
  @Input({ required: true }) statut!: StatutLitige;

  labelStatut = computed(() => {
    switch (this.statut) {
      case StatutLitige.OUVERT:
        return 'OUVERT';
      case StatutLitige.EN_COURS:
        return 'EN COURS';
      case StatutLitige.RESOLU:
        return 'RÉSOLU';
      case StatutLitige.REJETE:
        return 'REJETÉ';
      default:
        return '';
    }
  });

  badgeClasses = computed(() => {
    switch (this.statut) {
      case StatutLitige.OUVERT:
        return 'bg-red-100 text-red-800';
      case StatutLitige.EN_COURS:
        return 'bg-orange-100 text-orange-800';
      case StatutLitige.RESOLU:
        return 'bg-green-100 text-green-800';
      case StatutLitige.REJETE:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  });

  dotClasses = computed(() => {
    switch (this.statut) {
      case StatutLitige.OUVERT:
        return 'bg-red-500';
      case StatutLitige.EN_COURS:
        return 'bg-orange-500';
      case StatutLitige.RESOLU:
        return 'bg-green-500';
      case StatutLitige.REJETE:
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  });
}
