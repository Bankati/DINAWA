import { Component, Input, computed } from '@angular/core';
import { StatutAnnonce } from '../../../core/models/annonce.model';

@Component({
  selector: 'lok-badge-statut-annonce',
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
export class LokBadgeStatutAnnonceComponent {
  @Input({ required: true }) statut!: StatutAnnonce;

  labelStatut = computed(() => {
    switch (this.statut) {
      case StatutAnnonce.ACTIVE:
        return 'ACTIVE';
      case StatutAnnonce.RESERVEE:
        return 'RÉSERVÉE';
      case StatutAnnonce.VENDUE:
        return 'VENDUE/LOUÉE';
      case StatutAnnonce.EXPIREE:
        return 'EXPIRÉE';
      default:
        return '';
    }
  });

  badgeClasses = computed(() => {
    switch (this.statut) {
      case StatutAnnonce.ACTIVE:
        return 'bg-green-100 text-green-800';
      case StatutAnnonce.RESERVEE:
        return 'bg-yellow-100 text-yellow-800';
      case StatutAnnonce.VENDUE:
        return 'bg-blue-100 text-blue-800';
      case StatutAnnonce.EXPIREE:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  });

  dotClasses = computed(() => {
    switch (this.statut) {
      case StatutAnnonce.ACTIVE:
        return 'bg-green-500';
      case StatutAnnonce.RESERVEE:
        return 'bg-yellow-500';
      case StatutAnnonce.VENDUE:
        return 'bg-blue-500';
      case StatutAnnonce.EXPIREE:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  });
}
