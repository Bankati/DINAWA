import { Component, Input, computed } from '@angular/core';
import { PropertyStatus, PROPERTY_STATUS_LABELS } from '../../../core/models/bien.model';

// Badge universel pour le statut d'un bien — valeurs alignées sur PropertyStatus Prisma
@Component({
  selector: 'lok-badge-statut',
  standalone: true,
  template: `
    <span
      [class]="badgeClasses()"
      class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold min-h-[28px]"
    >
      <span [class]="dotClasses()" class="w-2 h-2 rounded-full mr-2"></span>
      {{ label() }}
    </span>
  `,
})
export class LokBadgeStatutComponent {
  @Input({ required: true }) statut!: PropertyStatus;

  label = computed(() => PROPERTY_STATUS_LABELS[this.statut] ?? this.statut);

  badgeClasses = computed(() => {
    switch (this.statut) {
      case 'OCCUPIED':  return 'bg-green-100 text-green-800';
      case 'VACANT':    return 'bg-blue-100 text-blue-800';
      case 'RENOVATION':return 'bg-orange-100 text-orange-800';
      case 'ARCHIVED':  return 'bg-gray-100 text-gray-800';
      default:          return 'bg-gray-100 text-gray-800';
    }
  });

  dotClasses = computed(() => {
    switch (this.statut) {
      case 'OCCUPIED':  return 'bg-green-500';
      case 'VACANT':    return 'bg-blue-500';
      case 'RENOVATION':return 'bg-orange-500';
      case 'ARCHIVED':  return 'bg-gray-500';
      default:          return 'bg-gray-500';
    }
  });
}
