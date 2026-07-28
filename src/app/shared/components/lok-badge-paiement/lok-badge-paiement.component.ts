import { Component, Input, computed } from '@angular/core';
import { PaymentStatus, PAYMENT_STATUS_LABELS } from '../../../core/models/payment.model';
import { StatutPaiement } from '../../../core/models/paiement.model';

// Le tableau de bord principal (dashboard.service.ts) consomme encore l'ancien
// statut français dérivé côté client (aucune route /dashboard réelle) — ce
// badge accepte donc les deux jeux de valeurs plutôt que de dupliquer le
// composant. Le module paiements réel n'utilise que PaymentStatus.
export type BadgePaiementStatut = PaymentStatus | StatutPaiement;

const LEGACY_LABELS: Record<StatutPaiement, string> = {
  [StatutPaiement.PAYE]: 'Payé',
  [StatutPaiement.PARTIEL]: 'Partiel',
  [StatutPaiement.EN_RETARD]: 'En retard',
  [StatutPaiement.IMPAYE]: 'Impayé',
  [StatutPaiement.ATTENDU]: 'Attendu',
};

@Component({
  selector: 'lok-badge-paiement',
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
export class LokBadgePaiementComponent {
  @Input({ required: true }) statut!: BadgePaiementStatut;

  label = computed(() => PAYMENT_STATUS_LABELS[this.statut as PaymentStatus] ?? LEGACY_LABELS[this.statut as StatutPaiement] ?? this.statut);

  badgeClasses = computed(() => {
    switch (this.statut) {
      case 'PAID':
      case StatutPaiement.PAYE:
        return 'bg-green-100 text-green-800';
      case 'PARTIAL':
      case StatutPaiement.PARTIEL:
        return 'bg-yellow-100 text-yellow-800';
      case 'LATE':
      case StatutPaiement.EN_RETARD:
        return 'bg-orange-100 text-orange-800';
      case 'OVERDUE':
      case StatutPaiement.IMPAYE:
        return 'bg-red-100 text-red-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PENDING_CONFIRMATION':
        return 'bg-blue-50 text-blue-700';
      case StatutPaiement.ATTENDU:
        return 'bg-blue-50 text-blue-700';
      case 'PENDING':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  });

  dotClasses = computed(() => {
    switch (this.statut) {
      case 'PAID':
      case StatutPaiement.PAYE:
        return 'bg-green-500';
      case 'PARTIAL':
      case StatutPaiement.PARTIEL:
        return 'bg-yellow-500';
      case 'LATE':
      case StatutPaiement.EN_RETARD:
        return 'bg-orange-500';
      case 'OVERDUE':
      case StatutPaiement.IMPAYE:
        return 'bg-red-500';
      case 'REJECTED':
        return 'bg-red-500';
      case 'PENDING_CONFIRMATION':
        return 'bg-blue-400';
      case StatutPaiement.ATTENDU:
        return 'bg-blue-400';
      case 'PENDING':
      default:
        return 'bg-gray-500';
    }
  });
}
