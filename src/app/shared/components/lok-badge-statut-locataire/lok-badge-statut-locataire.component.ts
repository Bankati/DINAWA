import { Component, Input, computed } from '@angular/core';
import { LeaseStatus, LEASE_STATUS_LABELS } from '../../../core/models/locataire.model';

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
  @Input({ required: true }) statut!: LeaseStatus;

  labelStatut = computed(() => LEASE_STATUS_LABELS[this.statut] ?? this.statut);

  badgeClasses = computed(() => {
    switch (this.statut) {
      case 'ACTIVE':     return 'bg-green-100 text-green-800';
      case 'EXPIRED':    return 'bg-gray-100 text-gray-800';
      case 'TERMINATED': return 'bg-red-100 text-red-800';
      default:           return 'bg-gray-100 text-gray-800';
    }
  });

  dotClasses = computed(() => {
    switch (this.statut) {
      case 'ACTIVE':     return 'bg-green-500';
      case 'EXPIRED':    return 'bg-gray-500';
      case 'TERMINATED': return 'bg-red-500';
      default:           return 'bg-gray-500';
    }
  });
}
